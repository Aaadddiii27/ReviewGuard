import re
from typing import List, Set
from app.analysis.languages.base import BaseLanguageAnalyzer
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource


class CppAnalyzer(BaseLanguageAnalyzer):
    def analyze(self, file_path: str, code_content: str, modified_lines: Set[int]) -> List[Finding]:
        findings: List[Finding] = []
        lines = code_content.splitlines()

        for idx, line in enumerate(lines, start=1):
            if modified_lines and idx not in modified_lines:
                continue

            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                continue

            # Insecure C standard library functions prone to buffer overflow
            if re.search(r'\bgets\s*\(', line):
                findings.append(Finding(
                    title="Critical Buffer Overflow hazard using `gets()`",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.CRITICAL,
                    confidence=0.99,
                    file=file_path,
                    line=idx,
                    description="The `gets()` function provides no bounds checking and is inherently vulnerable to stack buffer overflows.",
                    why_it_matters="Buffer overflows can corrupt stack memory and allow arbitrary code execution.",
                    recommendation="Replace `gets()` with `fgets()` or `std::getline` with explicit buffer size constraints.",
                    source=FindingSource.STATIC_AST
                ))

            if re.search(r'\b(?:strcpy|strcat)\s*\(', line):
                findings.append(Finding(
                    title="Unbounded string copy function (`strcpy` / `strcat`)",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.HIGH,
                    confidence=0.93,
                    file=file_path,
                    line=idx,
                    description="`strcpy` and `strcat` do not verify destination buffer bounds.",
                    why_it_matters="Writing past array bounds can cause segmentation faults or exploitable memory corruption.",
                    recommendation="Use `strncpy`, `strncat`, `snprintf`, or modern `std::string` operations.",
                    source=FindingSource.STATIC_AST
                ))

            if re.search(r'\bsystem\s*\(', line):
                findings.append(Finding(
                    title="Unsafe shell execution via `system()`",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.HIGH,
                    confidence=0.88,
                    file=file_path,
                    line=idx,
                    description="`system()` invokes a command processor with environment-dependent behavior.",
                    why_it_matters="Susceptible to command injection if argument contains user-controlled input.",
                    recommendation="Use platform-specific execution APIs (such as `CreateProcess` or `execve`) with explicit arguments.",
                    source=FindingSource.STATIC_AST
                ))

        return findings
