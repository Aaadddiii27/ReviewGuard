import os
import tempfile
import json
import subprocess
from typing import List, Set, Dict
from app.analysis.language_detector import detect_language, SupportedLanguage
from app.analysis.languages.base import BaseLanguageAnalyzer
from app.analysis.languages.python_analyzer import PythonAnalyzer
from app.analysis.languages.javascript_analyzer import JavaScriptAnalyzer
from app.analysis.languages.java_analyzer import JavaAnalyzer
from app.analysis.languages.cpp_analyzer import CppAnalyzer
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource
from app.core.logging import logger


class StaticAnalysisManager:
    def __init__(self):
        self.analyzers: Dict[SupportedLanguage, BaseLanguageAnalyzer] = {
            SupportedLanguage.PYTHON: PythonAnalyzer(),
            SupportedLanguage.JAVASCRIPT: JavaScriptAnalyzer(),
            SupportedLanguage.TYPESCRIPT: JavaScriptAnalyzer(),
            SupportedLanguage.JAVA: JavaAnalyzer(),
            SupportedLanguage.CPP: CppAnalyzer(),
        }

    def analyze_file(
        self,
        file_path: str,
        code_content: str,
        modified_lines: Set[int],
        is_partial_reconstruction: bool = False,
    ) -> List[Finding]:
        """Runs language-specific static analysis, strictly scoped to modified diff lines.

        Args:
            file_path: Path of the file (used for language detection and reporting).
            code_content: Source text to analyse.  May be a complete file or a
                sparse diff reconstruction — see ``is_partial_reconstruction``.
            modified_lines: Set of line numbers changed in the PR diff.
            is_partial_reconstruction: When ``True`` the ``code_content`` was
                assembled from sparse diff hunks and is not a complete,
                syntactically valid file.  Language-specific analysers will
                suppress SyntaxError / parse-error findings that are artefacts
                of the reconstruction rather than real bugs.  Bandit is also
                skipped because it would report errors on the padding blank
                lines.
        """
        lang = detect_language(file_path)
        if lang == SupportedLanguage.UNKNOWN:
            return []

        analyzer = self.analyzers.get(lang)
        if not analyzer:
            return []

        findings: List[Finding] = []

        # 1. Base AST / static analysis
        try:
            # PythonAnalyzer accepts is_partial_reconstruction; other analysers
            # use *kwargs or positional args so we pass it only when supported.
            from app.analysis.languages.python_analyzer import PythonAnalyzer
            if isinstance(analyzer, PythonAnalyzer):
                ast_findings = analyzer.analyze(
                    file_path, code_content, modified_lines,
                    is_partial_reconstruction=is_partial_reconstruction,
                )
            else:
                ast_findings = analyzer.analyze(file_path, code_content, modified_lines)
            findings.extend(ast_findings)
        except Exception as e:
            logger.warning(f"Error running AST analyzer for {file_path}: {e}")

        # 2. Run Bandit on Python files when content looks like a real file
        # Skip Bandit on sparse reconstructions — it would produce artefact findings.
        if lang == SupportedLanguage.PYTHON and code_content.strip() and not is_partial_reconstruction:
            bandit_findings = self._run_bandit_security_scan(file_path, code_content, modified_lines)
            findings.extend(bandit_findings)

        return findings

    def _run_bandit_security_scan(self, file_path: str, code_content: str, modified_lines: Set[int]) -> List[Finding]:
        """Runs Bandit programmatic security scanner in a temporary sandbox on the changed file."""
        findings: List[Finding] = []
        temp_file = None
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tf:
                tf.write(code_content)
                temp_file = tf.name

            # Run bandit -f json -q <temp_file>
            res = subprocess.run(
                ["bandit", "-f", "json", "-q", temp_file],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if res.stdout:
                data = json.loads(res.stdout)
                results = data.get("results", [])
                for item in results:
                    lineno = item.get("line_number")
                    if modified_lines and lineno not in modified_lines:
                        continue
                        
                    # Map bandit severity
                    b_sev = item.get("issue_severity", "MEDIUM").upper()
                    if b_sev == "HIGH":
                        sev = FindingSeverity.HIGH
                    elif b_sev == "LOW":
                        sev = FindingSeverity.LOW
                    else:
                        sev = FindingSeverity.MEDIUM

                    # Critical override for severe items like SQLi
                    test_id = item.get("test_id", "")
                    if test_id in ("B608", "B102"):
                        sev = FindingSeverity.CRITICAL

                    findings.append(Finding(
                        title=f"Bandit ({test_id}): {item.get('test_name', 'Security Issue')}",
                        category=FindingCategory.SECURITY,
                        severity=sev,
                        confidence=0.92,
                        file=file_path,
                        line=lineno,
                        description=item.get("issue_text", ""),
                        why_it_matters=f"Identified by security standard CWE/Bandit rule {test_id}.",
                        recommendation=f"Address Bandit security rule {test_id} before merging.",
                        evidence=item.get("code", "").strip(),
                        source=FindingSource.STATIC_BANDIT
                    ))
        except Exception as e:
            # Bandit scan failure should be non-blocking
            logger.debug(f"Bandit execution skipped or failed: {e}")
        finally:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception:
                    pass

        return findings
