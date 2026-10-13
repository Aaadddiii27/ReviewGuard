import pytest
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus
from app.deduplication.engine import DeduplicationEngine

def test_deduplication_suppresses_redundant_sqli_findings():
    f1 = Finding(
        title="SQL injection risk from direct concatenation",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.CRITICAL,
        confidence=0.95,
        file="auth.py",
        line=42,
        description="User input is directly concatenated into SQL.",
        why_it_matters="Allows attackers to bypass authentication.",
        recommendation="Use parameterized queries."
    )
    f2 = Finding(
        title="Unsanitized username in SQL execution",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.CRITICAL,
        confidence=0.90,
        file="auth.py",
        line=43,
        description="The username is unsanitized before SQL execution.",
        why_it_matters="Attackers can inject malicious SQL clauses.",
        recommendation="Escape or parameterize the username input."
    )
    f3 = Finding(
        title="Possible SQL injection in query builder",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.HIGH,
        confidence=0.88,
        file="auth.py",
        line=42,
        description="SQL injection may occur because username is inserted into the query.",
        why_it_matters="Data leakage potential.",
        recommendation="Use query parameters."
    )
    # Distinct finding in different location
    f4 = Finding(
        title="Silent exception swallowing",
        category=FindingCategory.QUALITY,
        severity=FindingSeverity.MEDIUM,
        confidence=0.92,
        file="auth.py",
        line=120,
        description="Except block contains only pass.",
        why_it_matters="Hides runtime errors.",
        recommendation="Log error."
    )

    engine = DeduplicationEngine(threshold=0.65)
    active, suppressed, stats = engine.deduplicate([f1, f2, f3, f4])

    assert len(active) == 2 # 1 SQLi + 1 Exception swallowing
    assert len(suppressed) == 2
    assert stats.suppressed_findings == 2
    assert stats.suppression_rate_pct == 50.0

    # Verify primary finding remains OPEN and suppressed findings are SUPPRESSED
    for f in active:
        assert f.status == FindingStatus.OPEN
    for f in suppressed:
        assert f.status == FindingStatus.SUPPRESSED
        assert f.suppressed_by is not None
