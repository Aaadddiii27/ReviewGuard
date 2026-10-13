import pytest
from app.diff.parser import DiffParser
from app.analysis.static_analyzer import StaticAnalysisManager
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource, FindingStatus
from app.deduplication.engine import DeduplicationEngine


def test_chained_sql_injection_concatenation_detected():
    """Regression test for user-reported bug:
    query = 'SELECT * FROM accounts WHERE user = ' + username + ' AND pass = ' + password
    ReviewGuard must detect this SQL injection with CRITICAL severity.
    """
    test_diff = """diff --git a/app/login.py b/app/login.py
index 0000000..1111111 100644
--- a/app/login.py
+++ b/app/login.py
@@ -1,3 +1,6 @@
 def authenticate(username, password):
+    query = "SELECT * FROM accounts WHERE user = '" + username + "' AND pass = '" + password + "'"
+    return query
"""
    parser = DiffParser()
    parsed = parser.parse_patch(test_diff)
    mgr = StaticAnalysisManager()

    findings = []
    for f in parsed.files:
        code = parsed.get_reconstructed_file_content(f.filename)
        mod_lines = parsed.modified_lines_by_file.get(f.filename, set())
        is_part = parsed.is_likely_incomplete(code)
        findings.extend(mgr.analyze_file(f.filename, code, mod_lines, is_part))

    assert len(findings) >= 1
    sqli = [f for f in findings if "SQL" in f.title]
    assert len(sqli) == 1
    assert sqli[0].severity == FindingSeverity.CRITICAL
    assert sqli[0].line == 2


def test_off_by_one_loop_detected():
    """Regression test:
    for i in range(n + 1):
        print(tokens[i])
    Must be detected as Off-by-One Array Index Loop.
    """
    test_diff = """diff --git a/app/search.py b/app/search.py
index 0000000..1111111 100644
--- a/app/search.py
+++ b/app/search.py
@@ -1,4 +1,7 @@
 def process_tokens(tokens):
+    n = len(tokens)
+    for i in range(n + 1):
+        print(tokens[i])
"""
    parser = DiffParser()
    parsed = parser.parse_patch(test_diff)
    mgr = StaticAnalysisManager()

    findings = []
    for f in parsed.files:
        code = parsed.get_reconstructed_file_content(f.filename)
        mod_lines = parsed.modified_lines_by_file.get(f.filename, set())
        is_part = parsed.is_likely_incomplete(code)
        findings.extend(mgr.analyze_file(f.filename, code, mod_lines, is_part))

    assert len(findings) >= 1
    obo = [f for f in findings if "Off-by-One" in f.title]
    assert len(obo) == 1
    assert obo[0].severity == FindingSeverity.MEDIUM


def test_javascript_unsafe_nested_dereference_detected():
    """Regression test:
    return user.profile.name.toUpperCase();
    Must be detected as potential null/undefined dereference bug.
    """
    test_diff = """diff --git a/src/profile.js b/src/profile.js
index 0000000..1111111 100644
--- a/src/profile.js
+++ b/src/profile.js
@@ -1,3 +1,5 @@
 function getDisplayName(user) {
+    return user.profile.name.toUpperCase();
 }
"""
    parser = DiffParser()
    parsed = parser.parse_patch(test_diff)
    mgr = StaticAnalysisManager()

    findings = []
    for f in parsed.files:
        code = parsed.get_reconstructed_file_content(f.filename)
        mod_lines = parsed.modified_lines_by_file.get(f.filename, set())
        findings.extend(mgr.analyze_file(f.filename, code, mod_lines, False))

    assert len(findings) >= 1
    null_findings = [f for f in findings if "Dereference" in f.title or "nested property" in f.title.lower()]
    assert len(null_findings) == 1
    assert null_findings[0].category == FindingCategory.BUG


def test_multi_source_deduplication_collapses_to_single_active_finding():
    """Test required by spec:
    Multiple raw findings from different sources:
    Static AST finding + AI finding + semantically similar finding
    Expected:
    3 raw findings -> 1 active finding + 2 suppressed duplicates
    """
    f_static = Finding(
        title="Potential SQL Injection via formatted query string",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.CRITICAL,
        confidence=0.96,
        file="app/login.py",
        line=42,
        description="SQL query string is constructed via string concatenation with user variables.",
        why_it_matters="Allows attackers to bypass authentication and exfiltrate data.",
        recommendation="Use parameterized queries.",
        source=FindingSource.STATIC_AST
    )
    f_ai = Finding(
        title="SQL Injection Vulnerability in User Authentication",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.CRITICAL,
        confidence=0.92,
        file="app/login.py",
        line=42,
        description="User input is directly concatenated into SQL query string.",
        why_it_matters="Attackers can inject malicious SQL clauses.",
        recommendation="Sanitize input or use parameter placeholders.",
        source=FindingSource.AI
    )
    f_similar = Finding(
        title="Unsanitized SQL Input in Login Query",
        category=FindingCategory.BUG,
        severity=FindingSeverity.HIGH,
        confidence=0.88,
        file="app/login.py",
        line=43,
        description="The username parameter is appended to the SQL string without escaping.",
        why_it_matters="SQL injection hazard.",
        recommendation="Use bind parameters.",
        source=FindingSource.AI
    )

    engine = DeduplicationEngine(threshold=0.65)
    active, suppressed, stats = engine.deduplicate([f_static, f_ai, f_similar])

    assert len(active) == 1, f"Expected 1 active finding, got {len(active)}"
    assert len(suppressed) == 2, f"Expected 2 suppressed duplicates, got {len(suppressed)}"
    assert stats.raw_findings == 3
    assert stats.active_findings == 1
    assert stats.suppressed_findings == 2

    # Active finding should be the deterministic STATIC_AST finding with highest rank
    assert active[0].id == f_static.id
    assert active[0].status == FindingStatus.OPEN

    # Suppressed findings must be marked SUPPRESSED and have suppressed_by pointing to primary
    for s in suppressed:
        assert s.status == FindingStatus.SUPPRESSED
        assert s.suppressed_by == f_static.id


def test_deduplication_does_not_suppress_cross_file_issues():
    """Different files must NEVER suppress each other even if titles and descriptions match."""
    f1 = Finding(
        title="Potential SQL Injection",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.CRITICAL,
        confidence=0.95,
        file="app/auth.py",
        line=10,
        description="User input is directly concatenated into SQL query.",
        why_it_matters="SQL injection hazard.",
        recommendation="Use parameterized queries."
    )
    f2 = Finding(
        title="Potential SQL Injection",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.CRITICAL,
        confidence=0.95,
        file="app/billing.py",
        line=10,
        description="User input is directly concatenated into SQL query.",
        why_it_matters="SQL injection hazard.",
        recommendation="Use parameterized queries."
    )

    engine = DeduplicationEngine()
    active, suppressed, stats = engine.deduplicate([f1, f2])

    assert len(active) == 2, "Findings in different files must both remain active"
    assert len(suppressed) == 0


def test_deduplication_does_not_suppress_distinct_issues_in_same_file():
    """Genuinely different issues in the same file must not be suppressed."""
    f_sqli = Finding(
        title="Potential SQL Injection",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.CRITICAL,
        confidence=0.95,
        file="app/user.py",
        line=15,
        description="Direct concatenation into SQL query.",
        why_it_matters="Data exfiltration.",
        recommendation="Use parameterized queries."
    )
    f_silent_exc = Finding(
        title="Silent Exception Swallowing (`except: pass`)",
        category=FindingCategory.QUALITY,
        severity=FindingSeverity.MEDIUM,
        confidence=0.90,
        file="app/user.py",
        line=85,
        description="Exceptions caught and suppressed without logging.",
        why_it_matters="Hides production crashes.",
        recommendation="Log error."
    )

    engine = DeduplicationEngine()
    active, suppressed, stats = engine.deduplicate([f_sqli, f_silent_exc])

    assert len(active) == 2, "Distinct issues in same file must both remain active"
    assert len(suppressed) == 0
