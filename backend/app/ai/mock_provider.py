from typing import List, Tuple
from app.ai.base import BaseAIProvider
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource


class MockReviewProvider(BaseAIProvider):
    """Deterministic review provider for unit tests, CI pipelines, and benchmarking."""

    async def review_diff(self, file_path: str, annotated_diff: str, pr_title: str = "", pr_description: str = "") -> Tuple[str, List[Finding]]:
        findings: List[Finding] = []
        diff_lower = annotated_diff.lower()

        if "select" in diff_lower and ("+" in annotated_diff or "format" in diff_lower or "%" in diff_lower):
            findings.append(Finding(
                title="Potential SQL Injection detected",
                category=FindingCategory.SECURITY,
                severity=FindingSeverity.CRITICAL,
                confidence=0.95,
                file=file_path,
                line=42,
                description="User input appears to be concatenated into a dynamic SQL query.",
                why_it_matters="Allows attackers to manipulate queries and access unauthorized records.",
                recommendation="Use parameterized queries instead of string concatenation.",
                evidence="query = 'SELECT * FROM users WHERE id = ' + user_id",
                source=FindingSource.AI
            ))

        if "password" in diff_lower and "=" in annotated_diff and any(k in diff_lower for k in ("secret", "admin", "12345")):
            findings.append(Finding(
                title="Hardcoded credential identified",
                category=FindingCategory.SECURITY,
                severity=FindingSeverity.HIGH,
                confidence=0.92,
                file=file_path,
                line=15,
                description="A sensitive plaintext password or API token is hardcoded in the source.",
                why_it_matters="Secrets in version control can be harvested and abused by attackers.",
                recommendation="Move credentials into environment variables or secrets manager.",
                evidence="password = 'admin12345'",
                source=FindingSource.AI
            ))

        summary = f"Automated test review completed for {file_path}. Found {len(findings)} issue(s)."
        return summary, findings
