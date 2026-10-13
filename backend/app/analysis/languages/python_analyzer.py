import ast
import re
from typing import List, Set, Optional
from app.analysis.languages.base import BaseLanguageAnalyzer
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource


class PythonASTVisitor(ast.NodeVisitor):
    def __init__(self, file_path: str, modified_lines: Set[int]):
        self.file_path = file_path
        self.modified_lines = modified_lines
        self.findings: List[Finding] = []

    def _is_relevant_line(self, lineno: Optional[int]) -> bool:
        if not lineno:
            return True
        if not self.modified_lines:
            return True
        return lineno in self.modified_lines

    def visit_Call(self, node: ast.Call):
        lineno = getattr(node, "lineno", None)
        
        # 1. Dangerous eval / exec
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name in ("eval", "exec"):
                if self._is_relevant_line(lineno):
                    self.findings.append(Finding(
                        title=f"Dangerous use of dynamic execution `{func_name}()`",
                        category=FindingCategory.SECURITY,
                        severity=FindingSeverity.CRITICAL,
                        confidence=0.98,
                        file=self.file_path,
                        line=lineno,
                        description=f"Direct invocation of `{func_name}()` allows arbitrary code execution if inputs can be influenced.",
                        why_it_matters="Execution of arbitrary strings can lead to complete server compromise or Remote Code Execution (RCE).",
                        recommendation=f"Avoid `{func_name}()`. Use safe parsing libraries like `ast.literal_eval()` or predefined dispatcher dictionaries.",
                        source=FindingSource.STATIC_AST
                    ))

            # 2. Subprocess shell=True / os.system
            if func_name in ("system", "popen"):
                if self._is_relevant_line(lineno):
                    self.findings.append(Finding(
                        title="Insecure command execution",
                        category=FindingCategory.SECURITY,
                        severity=FindingSeverity.HIGH,
                        confidence=0.92,
                        file=self.file_path,
                        line=lineno,
                        description=f"`os.{func_name}` runs commands through the system shell, vulnerable to command injection.",
                        why_it_matters="Attackers can inject shell metacharacters (e.g. `; rm -rf`) into parameters.",
                        recommendation="Use `subprocess.run([...], shell=False)` with arguments passed as an explicit array.",
                        source=FindingSource.STATIC_AST
                    ))

        # Check for cursor.execute SQL injection
        if isinstance(node.func, ast.Attribute):
            attr_name = node.func.attr
            if attr_name in ("execute", "raw", "executemany"):
                if node.args:
                    first_arg = node.args[0]
                    is_sql_injection = False
                    
                    if isinstance(first_arg, (ast.BinOp, ast.JoinedStr)):
                        is_sql_injection = True
                    elif isinstance(first_arg, ast.Call) and isinstance(first_arg.func, ast.Attribute) and first_arg.func.attr == "format":
                        is_sql_injection = True

                    if is_sql_injection and self._is_relevant_line(lineno):
                        self.findings.append(Finding(
                            title="Potential SQL Injection in database query",
                            category=FindingCategory.SECURITY,
                            severity=FindingSeverity.CRITICAL,
                            confidence=0.96,
                            file=self.file_path,
                            line=lineno,
                            description=f"Raw SQL query is formatted dynamically in `{attr_name}()` instead of using parameterized queries.",
                            why_it_matters="SQL injection allows attackers to bypass authentication, exfiltrate confidential data, or tamper with database records.",
                            recommendation="Use parameterized queries with placeholders (e.g., `execute('SELECT * FROM users WHERE id = %s', (user_id,))`).",
                            source=FindingSource.STATIC_AST
                        ))

        # Subprocess shell=True keyword check
        for kw in node.keywords:
            if kw.arg == "shell":
                if isinstance(kw.value, ast.Constant) and kw.value.value is True:
                    if self._is_relevant_line(lineno):
                        self.findings.append(Finding(
                            title="Command Injection hazard with `shell=True`",
                            category=FindingCategory.SECURITY,
                            severity=FindingSeverity.HIGH,
                            confidence=0.95,
                            file=self.file_path,
                            line=lineno,
                            description="`shell=True` invokes the system shell, increasing susceptibility to command injection attacks.",
                            why_it_matters="Parameters containing spaces or shell metacharacters can alter execution flow.",
                            recommendation="Set `shell=False` and pass executable arguments as a list of strings.",
                            source=FindingSource.STATIC_AST
                        ))

        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        lineno = getattr(node, "lineno", None)
        # Check mutable default arguments
        for default in node.args.defaults:
            if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                def_lineno = getattr(default, "lineno", lineno)
                if self._is_relevant_line(def_lineno):
                    self.findings.append(Finding(
                        title=f"Mutable default argument in function `{node.name}`",
                        category=FindingCategory.BUG,
                        severity=FindingSeverity.MEDIUM,
                        confidence=0.99,
                        file=self.file_path,
                        line=def_lineno,
                        description=f"Default argument in `{node.name}` is initialized to a mutable data structure.",
                        why_it_matters="In Python, default arguments are evaluated once at function definition time. Mutations persist across subsequent calls causing subtle state contamination bugs.",
                        recommendation="Set the default argument to `None` and initialize the mutable object inside the function body.",
                        source=FindingSource.STATIC_AST
                    ))
        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler):
        lineno = getattr(node, "lineno", None)
        # Check bare except: or except Exception: pass
        if node.type is None or (isinstance(node.type, ast.Name) and node.type.id in ("Exception", "BaseException")):
            if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                if self._is_relevant_line(lineno):
                    self.findings.append(Finding(
                        title="Silent exception swallowing (`except: pass`)",
                        category=FindingCategory.QUALITY,
                        severity=FindingSeverity.MEDIUM,
                        confidence=0.94,
                        file=self.file_path,
                        line=lineno,
                        description="Exceptions are caught and suppressed without logging or recovery handling.",
                        why_it_matters="Silently discarding exceptions hides critical application crashes and makes debugging production failures nearly impossible.",
                        recommendation="Catch specific exceptions and log the error context or re-raise if unrecoverable.",
                        source=FindingSource.STATIC_AST
                    ))
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        lineno = getattr(node, "lineno", None)
        
        # 1. SQL string formatting in assignment (e.g. query = "SELECT ..." % var)
        is_dynamic_sql = False
        if isinstance(node.value, ast.BinOp) and isinstance(node.value.op, (ast.Mod, ast.Add)):
            # Check left operand for SQL statement
            left_str = ""
            if isinstance(node.value.left, ast.Constant) and isinstance(node.value.left.value, str):
                left_str = node.value.left.value.upper()
            if any(k in left_str for k in ("SELECT ", "INSERT ", "UPDATE ", "DELETE ", "DROP ", "WHERE ")):
                is_dynamic_sql = True
        elif isinstance(node.value, ast.JoinedStr): # f-string
            parts = [getattr(p, "value", "") for p in node.value.values if isinstance(p, ast.Constant)]
            joined = " ".join(parts).upper()
            if any(k in joined for k in ("SELECT ", "INSERT ", "UPDATE ", "DELETE ", "DROP ", "WHERE ")):
                is_dynamic_sql = True

        if is_dynamic_sql and self._is_relevant_line(lineno):
            self.findings.append(Finding(
                title="SQL Injection hazard via formatted query string",
                category=FindingCategory.SECURITY,
                severity=FindingSeverity.CRITICAL,
                confidence=0.95,
                file=self.file_path,
                line=lineno,
                description="SQL query string is constructed via string interpolation/formatting.",
                why_it_matters="Formatting SQL queries dynamically with user inputs exposes the database to SQL injection attacks.",
                recommendation="Use parameterized queries with query parameters (placeholders).",
                source=FindingSource.STATIC_AST
            ))

        # 2. Hardcoded secrets detection
        for target in node.targets:
            if isinstance(target, ast.Name):
                var_name = target.id.lower()
                if any(k in var_name for k in ("password", "secret_key", "api_key", "auth_token", "jwt_secret")):
                    if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                        secret_val = node.value.value.strip()
                        if len(secret_val) > 4 and secret_val not in ("true", "false", "none", "", "test", "dummy"):
                            if self._is_relevant_line(lineno):
                                self.findings.append(Finding(
                                    title=f"Hardcoded sensitive secret `{target.id}`",
                                    category=FindingCategory.SECURITY,
                                    severity=FindingSeverity.HIGH,
                                    confidence=0.91,
                                    file=self.file_path,
                                    line=lineno,
                                    description=f"Plaintext secret or credential assigned directly to `{target.id}`.",
                                    why_it_matters="Hardcoded secrets in source control can be leaked or harvested, compromising external services and accounts.",
                                    recommendation="Store credentials in environment variables or a secure secret manager (e.g. AWS Secrets Manager, Azure Key Vault).",
                                    source=FindingSource.STATIC_AST
                                ))
        self.generic_visit(node)


class PythonAnalyzer(BaseLanguageAnalyzer):
    def analyze(
        self,
        file_path: str,
        code_content: str,
        modified_lines: Set[int],
        is_partial_reconstruction: bool = False,
    ) -> List[Finding]:
        """Run AST-based analysis on Python source code.

        Args:
            file_path: Path of the file being analysed (used for reporting).
            code_content: Source text to parse.
            modified_lines: Set of line numbers that were changed in the diff.
                            When non-empty, findings outside this set are
                            suppressed so only diff-relevant issues are returned.
            is_partial_reconstruction: When ``True`` the code was assembled from
                sparse diff hunks and is not a syntactically complete file.  In
                this case a ``SyntaxError`` from ``ast.parse`` is an artefact of
                the reconstruction, NOT a real bug in the PR.  The finding is
                suppressed to avoid false positives.  All other visitors still
                run against the portions of code that were successfully parsed
                (``ast.parse`` raises immediately on the first error, so the
                visitor simply receives an empty tree for broken reconstructions
                and produces no further output — which is the safe behaviour).
        """
        findings: List[Finding] = []
        try:
            tree = ast.parse(code_content, filename=file_path)
            visitor = PythonASTVisitor(file_path, modified_lines)
            visitor.visit(tree)
            findings.extend(visitor.findings)
        except SyntaxError as e:
            # --- False-positive guard -----------------------------------
            # If the code is a sparse diff reconstruction the blank-line
            # padding inserted by get_reconstructed_file_content() makes
            # valid Python look syntactically broken.  Suppress the finding
            # in that case; it does not reflect real code in the PR.
            if is_partial_reconstruction:
                return findings  # Silently drop — not a real error
            # ------------------------------------------------------------
            line_no = getattr(e, "lineno", None)
            if not modified_lines or (line_no and line_no in modified_lines):
                findings.append(Finding(
                    title="Python Syntax Error in patch",
                    category=FindingCategory.BUG,
                    severity=FindingSeverity.CRITICAL,
                    confidence=1.0,
                    file=file_path,
                    line=line_no,
                    description=f"Code syntax error: {str(e)}",
                    why_it_matters="Syntax errors prevent code execution and cause immediate runtime crashes upon module import.",
                    recommendation="Fix the Python syntax error before merging.",
                    source=FindingSource.STATIC_AST
                ))

        return findings
