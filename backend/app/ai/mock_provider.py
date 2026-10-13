from typing import List, Tuple
from app.ai.base import BaseAIProvider
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource


class MockReviewProvider(BaseAIProvider):
    """Deterministic review provider for unit tests, CI pipelines, and benchmarking."""

    async def review_diff(self, file_path: str, annotated_diff: str, pr_title: str = "", pr_description: str = "") -> Tuple[str, List[Finding]]:
        findings: List[Finding] = []
        diff_lower = annotated_diff.lower()

        # Check for actual dynamic SQL concatenation, e.g. " + " or ' + ' or % formatting or f-string
        has_dynamic_sql = False
        sql_line = None
        if "select" in diff_lower or "insert" in diff_lower or "update" in diff_lower:
            for l in annotated_diff.splitlines():
                if "select" in l.lower() or "from" in l.lower() or "where" in l.lower():
                    if (" + " in l or "' + " in l or '" + ' in l or "%" in l or ".format(" in l or 'f"' in l or "f'" in l):
                        has_dynamic_sql = True
                        # Extract annotated line number if present e.g. L42:
                        import re
                        m = re.match(r'L(\d+):', l)
                        if m:
                            sql_line = int(m.group(1))
                        break

        if has_dynamic_sql:
            findings.append(Finding(
                title="Potential SQL Injection detected",
                category=FindingCategory.SECURITY,
                severity=FindingSeverity.CRITICAL,
                confidence=0.95,
                file=file_path,
                line=sql_line or 42,
                description="User input appears to be concatenated into a dynamic SQL query.",
                why_it_matters="Allows attackers to manipulate queries and access unauthorized records.",
                recommendation="Use parameterized queries instead of string concatenation.",
                evidence="query = 'SELECT * FROM users WHERE id = ' + user_id",
                source=FindingSource.AI
            ))

        # Check for hardcoded credentials
        secret_line = None
        has_secret = False
        if "password" in diff_lower or "secret" in diff_lower or "api_key" in diff_lower:
            for l in annotated_diff.splitlines():
                l_lower = l.lower()
                if "=" in l and any(k in l_lower for k in ("password", "secret", "api_key", "admin123", "bearer")):
                    import re
                    m = re.match(r'L(\d+):', l)
                    if m:
                        secret_line = int(m.group(1))
                    has_secret = True
                    break

        if has_secret:
            findings.append(Finding(
                title="Hardcoded credential identified",
                category=FindingCategory.SECURITY,
                severity=FindingSeverity.HIGH,
                confidence=0.92,
                file=file_path,
                line=secret_line or 15,
                description="A sensitive plaintext password or API token is hardcoded in the source.",
                why_it_matters="Secrets in version control can be harvested and abused by attackers.",
                recommendation="Move credentials into environment variables or secrets manager.",
                evidence="password = 'admin12345'",
                source=FindingSource.AI
            ))

        summary = f"Automated test review completed for {file_path}. Found {len(findings)} issue(s)."
        return summary, findings
