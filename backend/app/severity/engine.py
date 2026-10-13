import re
from typing import List, Tuple
from app.schemas.finding import Finding, FindingCategory, FindingSeverity


class SeverityRule:
    def __init__(self, name: str, category: FindingCategory, target_severity: FindingSeverity, patterns: List[str], reason: str):
        self.name = name
        self.category = category
        self.target_severity = target_severity
        self.patterns = [re.compile(p, re.IGNORECASE) for p in patterns]
        self.reason = reason

    def matches(self, text: str) -> bool:
        return any(p.search(text) for p in self.patterns)


RULES: List[SeverityRule] = [
    # CRITICAL RULES
    SeverityRule(
        name="Remote Code Execution",
        category=FindingCategory.SECURITY,
        target_severity=FindingSeverity.CRITICAL,
        patterns=[r"remote code execution", r"\brce\b", r"\beval\(", r"\bexec\(", r"arbitrary code execution"],
        reason="Allows arbitrary code execution on the host machine or container."
    ),
    SeverityRule(
        name="SQL Injection",
        category=FindingCategory.SECURITY,
        target_severity=FindingSeverity.CRITICAL,
        patterns=[r"sql injection", r"concatenated into sql", r"unparameterized query", r"sqli"],
        reason="Direct database tampering, authentication bypass, or data exfiltration."
    ),
    SeverityRule(
        name="Buffer Overflow",
        category=FindingCategory.SECURITY,
        target_severity=FindingSeverity.CRITICAL,
        patterns=[r"buffer overflow", r"\bgets\(", r"stack smash"],
        reason="Direct memory corruption and stack smashing."
    ),

    # HIGH RULES
    SeverityRule(
        name="Hardcoded Secret",
        category=FindingCategory.SECURITY,
        target_severity=FindingSeverity.HIGH,
        patterns=[r"hardcoded secret", r"hardcoded password", r"hardcoded credential", r"api key in source", r"bearer token"],
        reason="Secrets committed to version control can be harvested and abused."
    ),
    SeverityRule(
        name="Command Injection",
        category=FindingCategory.SECURITY,
        target_severity=FindingSeverity.HIGH,
        patterns=[r"command injection", r"shell=True", r"child_process\.exec", r"system\("],
        reason="Enables execution of unauthorized shell commands."
    ),
    SeverityRule(
        name="Cross-Site Scripting (XSS)",
        category=FindingCategory.SECURITY,
        target_severity=FindingSeverity.HIGH,
        patterns=[r"cross-site scripting", r"\bxss\b", r"dangerouslySetInnerHTML", r"document\.write"],
        reason="Allows malicious script injection in user browsers."
    ),
    SeverityRule(
        name="Unsafe Deserialization",
        category=FindingCategory.SECURITY,
        target_severity=FindingSeverity.HIGH,
        patterns=[r"unsafe deserialization", r"pickle\.load", r"yaml\.load\("],
        reason="Deserialization of untrusted payloads can lead to arbitrary object instantiation."
    ),

    # MEDIUM RULES
    SeverityRule(
        name="Mutable Default Argument",
        category=FindingCategory.BUG,
        target_severity=FindingSeverity.MEDIUM,
        patterns=[r"mutable default argument", r"mutable parameter", r"state leakage across calls"],
        reason="Causes unexpected state retention across repeated function invocations."
    ),
    SeverityRule(
        name="Weak Randomness",
        category=FindingCategory.SECURITY,
        target_severity=FindingSeverity.MEDIUM,
        patterns=[r"math\.random", r"weak randomness", r"insecure random"],
        reason="Predictable pseudorandom numbers used for security or identifier purposes."
    ),
    SeverityRule(
        name="Silent Exception Swallowing",
        category=FindingCategory.QUALITY,
        target_severity=FindingSeverity.MEDIUM,
        patterns=[r"silent exception", r"except: pass", r"swallowing exception"],
        reason="Hides bugs and makes root cause analysis in production impossible."
    ),

    # LOW RULES
    SeverityRule(
        name="Naming & Style Nitpicks",
        category=FindingCategory.STYLE,
        target_severity=FindingSeverity.LOW,
        patterns=[r"naming convention", r"variable name", r"unclear name", r"typo in name", r"pascalcase", r"camelcase"],
        reason="Code style or naming clarity issue with zero functional or security impact."
    ),
]


class SeverityEngine:
    """Validates, calibrates, and normalizes finding severity to prevent AI hallucinated classifications."""

    @staticmethod
    def validate_and_calibrate(finding: Finding) -> Tuple[FindingSeverity, str]:
        combined_text = f"{finding.title} {finding.description} {finding.why_it_matters} {finding.recommendation}"

        # Check explicit rules
        for rule in RULES:
            if rule.matches(combined_text):
                # If rule is more severe than AI proposed, upgrade
                # Or if AI hallucinated CRITICAL for a style/naming issue, downgrade!
                return rule.target_severity, f"Calibrated via Severity Rule: {rule.name} ({rule.reason})"

        # Fallback to category baseline
        if finding.category == FindingCategory.STYLE:
            return FindingSeverity.LOW, "Style findings are constrained to LOW severity."

        return finding.severity, "Maintained original model severity classification."

    @classmethod
    def apply_to_finding(cls, finding: Finding) -> Finding:
        calibrated_sev, explanation = cls.validate_and_calibrate(finding)
        finding.severity = calibrated_sev
        return finding
