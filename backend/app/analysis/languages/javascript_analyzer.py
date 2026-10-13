import re
from typing import List, Set
from app.analysis.languages.base import BaseLanguageAnalyzer
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource


class JavaScriptAnalyzer(BaseLanguageAnalyzer):
    def analyze(self, file_path: str, code_content: str, modified_lines: Set[int]) -> List[Finding]:
        findings: List[Finding] = []
        lines = code_content.splitlines()

        for idx, line in enumerate(lines, start=1):
            if modified_lines and idx not in modified_lines:
                continue

            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                continue

            # 1. Dangerous eval
            if re.search(r'\beval\s*\(', line):
                findings.append(Finding(
                    title="Dangerous use of `eval()` in JavaScript",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.CRITICAL,
                    confidence=0.97,
                    file=file_path,
                    line=idx,
                    description="Direct use of `eval()` executes arbitrary strings with caller privileges.",
                    why_it_matters="Input passed to `eval()` allows Cross-Site Scripting (XSS) or Remote Code Execution in Node.js environments.",
                    recommendation="Avoid `eval()`. Use `JSON.parse()` for data or safe lookup maps for function dispatching.",
                    source=FindingSource.STATIC_AST
                ))

            # 2. React dangerouslySetInnerHTML
            if "dangerouslySetInnerHTML" in line:
                findings.append(Finding(
                    title="Unsanitized HTML injection via `dangerouslySetInnerHTML`",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.HIGH,
                    confidence=0.93,
                    file=file_path,
                    line=idx,
                    description="Setting raw inner HTML bypasses React's built-in XSS protections.",
                    why_it_matters="If content contains untrusted user input, malicious scripts can execute in users' browser sessions.",
                    recommendation="Sanitize HTML content with DOMPurify before rendering, or prefer standard React JSX elements.",
                    source=FindingSource.STATIC_AST
                ))

            # 3. Node child_process.exec with template literals or concatenation
            if re.search(r'exec\s*\(\s*[`\'"].*\$\{', line) or re.search(r'exec\s*\(.*\+', line):
                if any(pkg in code_content for pkg in ("child_process", "exec")):
                    findings.append(Finding(
                        title="Potential Command Injection in `child_process.exec`",
                        category=FindingCategory.SECURITY,
                        severity=FindingSeverity.CRITICAL,
                        confidence=0.94,
                        file=file_path,
                        line=idx,
                        description="External command string is constructed using variable interpolation in `exec()`.",
                        why_it_matters="Attackers can inject shell separators (`&`, `;`, `|`) to execute unintended host commands.",
                        recommendation="Use `execFile` or `spawn` with an array of arguments, or pass `shell: false`.",
                        source=FindingSource.STATIC_AST
                    ))

            # 4. Weak pseudo-random number generator for security tokens
            if "Math.random()" in line and any(k in line.lower() for k in ("token", "secret", "session", "key", "auth", "nonce", "salt")):
                findings.append(Finding(
                    title="Insecure randomness using `Math.random()` for cryptographic context",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.HIGH,
                    confidence=0.91,
                    file=file_path,
                    line=idx,
                    description="`Math.random()` is not cryptographically secure and produces predictable pseudorandom sequences.",
                    why_it_matters="Predictable tokens can be forged or anticipated by attackers, leading to account takeover or session hijacking.",
                    recommendation="Use the Web Crypto API (`crypto.getRandomValues()`) or Node.js `crypto.randomBytes()`.",
                    source=FindingSource.STATIC_AST
                ))

            # 5. Hardcoded credentials
            if re.search(r'(?:apiKey|api_key|secret|password|authToken)\s*[:=]\s*["\'][a-zA-Z0-9_\-]{12,}["\']', line, re.IGNORECASE):
                findings.append(Finding(
                    title="Potential hardcoded credential or secret key",
                    category=FindingCategory.SECURITY,
                    severity=FindingSeverity.HIGH,
                    confidence=0.89,
                    file=file_path,
                    line=idx,
                    description="Plaintext credential or token appears directly committed in client or server JavaScript.",
                    why_it_matters="Secrets in client-side bundles are publicly readable by any user; server-side secrets can be exposed via git history.",
                    recommendation="Move sensitive keys to server-side environment variables (`process.env.SECRET`).",
                    source=FindingSource.STATIC_AST
                ))

        return findings
