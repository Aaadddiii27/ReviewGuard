import pytest
from app.schemas.finding import Finding, FindingCategory, FindingSeverity
from app.severity.engine import SeverityEngine

def test_severity_calibration_upgrade():
    # Model mistakenly proposed LOW for SQL injection
    finding = Finding(
        title="Unparameterized SQL query",
        category=FindingCategory.SECURITY,
        severity=FindingSeverity.LOW,
        confidence=0.9,
        file="login.py",
        line=10,
        description="User input is concatenated into SQL query string.",
        why_it_matters="Potential SQL injection vulnerability",
        recommendation="Use parameterized query"
    )
    
    calibrated = SeverityEngine.apply_to_finding(finding)
    assert calibrated.severity == FindingSeverity.CRITICAL

def test_severity_calibration_downgrade():
    # Model mistakenly proposed CRITICAL for a variable naming suggestion
    finding = Finding(
        title="Inconsistent variable naming convention",
        category=FindingCategory.STYLE,
        severity=FindingSeverity.CRITICAL,
        confidence=0.8,
        file="utils.py",
        line=12,
        description="The variable name is unclear and does not follow snake_case.",
        why_it_matters="Reduces code readability.",
        recommendation="Rename to snake_case"
    )
    
    calibrated = SeverityEngine.apply_to_finding(finding)
    assert calibrated.severity == FindingSeverity.LOW
