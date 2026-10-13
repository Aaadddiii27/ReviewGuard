import httpx
from typing import Dict, Any, Optional, List
from app.schemas.finding import Finding
from app.schemas.review import ReviewSummary
from app.github.comment_builder import GitHubCommentBuilder
from app.core.config import settings
from app.core.logging import logger


class GitHubClient:
    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.GITHUB_TOKEN
        self.base_url = settings.GITHUB_API_URL.rstrip("/")
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ReviewGuard-App"
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    async def get_pull_request(self, repo: str, pr_number: int) -> Dict[str, Any]:
        """Retrieves metadata for a specific Pull Request."""
        url = f"{self.base_url}/repos/{repo}/pulls/{pr_number}"
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.get(url, headers=self.headers)
            res.raise_for_status()
            return res.json()

    async def get_pr_diff(self, repo: str, pr_number: int) -> str:
        """Retrieves the unified diff of a pull request."""
        url = f"{self.base_url}/repos/{repo}/pulls/{pr_number}"
        diff_headers = dict(self.headers)
        diff_headers["Accept"] = "application/vnd.github.v3.diff"
        
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.get(url, headers=diff_headers)
            res.raise_for_status()
            return res.text

    async def get_file_content(self, repo: str, path: str, ref: str) -> Optional[str]:
        """Retrieves the complete raw content of a file at a specific commit/ref.

        Uses the GitHub Contents API (``GET /repos/{owner}/{repo}/contents/{path}``)
        which returns a base-64 encoded payload.  The decoded string is returned
        so callers can feed it directly to AST analysis.

        Returns ``None`` if the file cannot be fetched (e.g. binary, too large,
        token absent, or any HTTP error) so that callers can gracefully fall back
        to diff reconstruction.
        """
        import base64
        if not self.token:
            return None  # Cannot call authenticated GitHub API without a token

        url = f"{self.base_url}/repos/{repo}/contents/{path.lstrip('/')}"
        params = {"ref": ref}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                res = await client.get(url, headers=self.headers, params=params)
                if res.status_code == 404:
                    logger.debug(f"File not found on GitHub: {repo}/{path}@{ref}")
                    return None
                res.raise_for_status()
                data = res.json()
                encoding = data.get("encoding", "")
                content = data.get("content", "")
                if encoding == "base64" and content:
                    return base64.b64decode(content).decode("utf-8", errors="replace")
                logger.debug(f"Unexpected encoding '{encoding}' for {repo}/{path}@{ref}")
                return None
        except Exception as e:
            logger.debug(f"Could not fetch file content from GitHub ({repo}/{path}@{ref}): {e}")
            return None

    async def post_review(
        self,
        repo: str,
        pr_number: int,
        commit_sha: str,
        summary: ReviewSummary,
        findings: List[Finding]
    ) -> Dict[str, Any]:
        """
        Posts a complete PR review using the GitHub Pull Request Review API.
        CRITICAL: event is explicitly 'COMMENT'. ReviewGuard NEVER approves or merges.
        """
        if not self.token:
            logger.warning(f"No GITHUB_TOKEN configured. Skipping review post for {repo} PR #{pr_number}.")
            return {"status": "skipped", "reason": "No GITHUB_TOKEN provided"}

        url = f"{self.base_url}/repos/{repo}/pulls/{pr_number}/reviews"
        
        # Prepare inline line comments
        comments_payload = []
        unattached_findings = []

        for f in findings:
            if f.line and f.line > 0:
                comments_payload.append({
                    "path": f.file.replace("\\", "/").lstrip("/"),
                    "line": f.line,
                    "side": f.side,
                    "body": GitHubCommentBuilder.build_inline_comment(f)
                })
            else:
                unattached_findings.append(f)

        summary_body = GitHubCommentBuilder.build_summary_comment(summary, findings)
        if unattached_findings:
            summary_body += "\n\n### 📌 File-Level / Unattached Findings\n"
            for uf in unattached_findings:
                summary_body += f"- **[{uf.severity.value}]** `{uf.file}`: {uf.title} - {uf.description}\n"

        payload = {
            "commit_id": commit_sha,
            "body": summary_body,
            "event": "COMMENT", # ADVISORY ONLY - NEVER APPROVE
            "comments": comments_payload
        }

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                res = await client.post(url, headers=self.headers, json=payload)
                res.raise_for_status()
                logger.info(f"Successfully posted PR review to {repo} PR #{pr_number}.")
                return res.json()
            except httpx.HTTPStatusError as e:
                # If inline comments failed (e.g. line not in diff range), fall back to posting summary review
                logger.warning(f"Failed to post with inline comments ({e.response.text}). Falling back to PR summary comment.")
                fallback_payload = {
                    "commit_id": commit_sha,
                    "body": summary_body + "\n\n*(Inline comment mapping fell back to summary view)*",
                    "event": "COMMENT"
                }
                res2 = await client.post(url, headers=self.headers, json=fallback_payload)
                res2.raise_for_status()
                return res2.json()
