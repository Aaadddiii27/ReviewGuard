import re
from typing import List, Set
from app.analysis.languages.base import BaseLanguageAnalyzer
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource


class JavaAnalyzer(BaseLanguageAnalyzer):
    def analyze(self, file_path: str, code_content: str, modified_lines: Set[int]) -> List[Finding]:
        findings: List[Finding] = []
        lines = code_content.splitlines()

        for idx, line in enumerate(lines, start=1):
            if modified_lines and idx not in modified_lines:
                continue

            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                continue

            # SQL Injection via Statement executeQuery / executeUpdate
            if re.search(r'\.(?:executeQuery|executeUpdate|execute)\s*\(.*\+.*user', line, re.IGNORECASE) or \
               re.search(r'createStatement\(\)\.(?:executeQuery|execute)\s*\(.*\+', line):
                findings.append(Finding(
                    title="SQL Injection via concatenated JDBC Statement",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.CRITICAL,
                    confidence=0.95,
                    file=file_path,
                    line=idx,
                    description="Dynamic SQL statement created via string concatenation inside JDBC query execution.",
                    why_it_matters="Allows attackers to manipulate query structures, bypass security controls, and read/modify database tables.",
                    recommendation="Use `PreparedStatement` with parameterized placeholders (`?`) instead of string concatenation.",
                    source=FindingSource.STATIC_AST
                ))

            # Command injection
            if "Runtime.getRuntime().exec" in line and "+" in line:
                findings.append(Finding(
                    title="Command Injection via `Runtime.getRuntime().exec`",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.HIGH,
                    confidence=0.92,
                    file=file_path,
                    line=idx,
                    description="Concatenating unverified input into system runtime execution.",
                    why_it_matters="Enables execution of unauthorized shell commands on the host server.",
                    recommendation="Use `ProcessBuilder` with an explicit list of command tokens.",
                    source=FindingSource.STATIC_AST
                ))

        return findings
