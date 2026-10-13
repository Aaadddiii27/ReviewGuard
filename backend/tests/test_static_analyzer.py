import pytest
from app.analysis.static_analyzer import StaticAnalysisManager
from app.analysis.languages.python_analyzer import PythonAnalyzer
from app.diff.parser import ParsedDiff
from app.schemas.finding import FindingSeverity, FindingCategory

def test_python_ast_sqli_and_mutable_defaults():
    code = """
def search_user(username, filters=[]):
    query = "SELECT * FROM users WHERE name = '%s'" % username
    cursor.execute(query)
"""
    manager = StaticAnalysisManager()
    findings = manager.analyze_file("auth/db.py", code, modified_lines={2, 3, 4})
    
    titles = [f.title for f in findings]
    severities = [f.severity for f in findings]
    
    # Check mutable default argument was caught
    assert any("Mutable default argument" in t for t in titles)
    # Check SQL injection in cursor.execute was caught
    assert any("SQL Injection" in t for t in titles)
    assert FindingSeverity.CRITICAL in severities

def test_javascript_eval_and_innerhtml():
    code = """
function render(userInput) {
    eval(userInput);
    element.innerHTML = userInput;
}
"""
    manager = StaticAnalysisManager()
    findings = manager.analyze_file("web/component.js", code, modified_lines={3})
    
    titles = [f.title for f in findings]
    assert any("eval()" in t for t in titles)
    assert any(f.severity == FindingSeverity.CRITICAL for f in findings)


# ---------------------------------------------------------------------------
# New tests: SyntaxError false-positive suppression
# ---------------------------------------------------------------------------

def test_sparse_reconstruction_suppresses_syntax_error():
    """
    When code is a sparse diff reconstruction (large blank-line gaps between
    real lines), ast.parse raises SyntaxError on the padding.  The static
    analyser must NOT report a SyntaxError finding in this case.
    """
    # Simulate a sparse reconstruction: a small hunk at line 40
    # Everything before it is blank (the padding from get_reconstructed_file_content).
    sparse_code = "\n" * 39 + "def foo(x):\n    return x * 2\n"
    # Manually break it so ast.parse would fail if we didn't suppress
    sparse_broken = "\n" * 39 + "def foo(x\n    return x * 2\n"

    manager = StaticAnalysisManager()
    findings = manager.analyze_file(
        "app/utils.py",
        sparse_broken,
        modified_lines={40, 41},
        is_partial_reconstruction=True,
    )

    syntax_findings = [f for f in findings if "Syntax Error" in f.title]
    assert len(syntax_findings) == 0, (
        "SyntaxError finding should be suppressed for sparse diff reconstruction, "
        f"but got: {syntax_findings}"
    )


def test_real_syntax_error_in_complete_file_is_reported():
    """
    When the code is a complete Python file (not a reconstruction) and it
    contains a genuine syntax error, the finding must still be reported.
    """
    broken_code = "def foo(\n    return 42\n"  # genuine syntax error

    manager = StaticAnalysisManager()
    findings = manager.analyze_file(
        "app/broken.py",
        broken_code,
        modified_lines={1, 2},
        is_partial_reconstruction=False,  # complete file
    )

    syntax_findings = [f for f in findings if "Syntax Error" in f.title]
    assert len(syntax_findings) >= 1, (
        "Genuine SyntaxError in a complete file must produce a finding."
    )
    assert any(f.severity == FindingSeverity.CRITICAL for f in syntax_findings)


def test_is_likely_incomplete_detects_sparse_reconstruction():
    """ParsedDiff.is_likely_incomplete() should flag sparse reconstructions."""
    # Dense normal file — should NOT be flagged
    normal_code = "def foo():\n    pass\n\n\ndef bar():\n    return 1\n"
    assert ParsedDiff.is_likely_incomplete(normal_code) is False

    # Sparse reconstruction: 40 blank lines then a few lines of code
    sparse_code = "\n" * 40 + "def foo():\n    pass\n"
    assert ParsedDiff.is_likely_incomplete(sparse_code) is True

    # Empty string — should not crash
    assert ParsedDiff.is_likely_incomplete("") is False
