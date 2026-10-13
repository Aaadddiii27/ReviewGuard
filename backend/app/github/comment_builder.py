from typing import List
from app.schemas.finding import Finding, FindingSeverity
from app.schemas.review import ReviewSummary


class GitHubCommentBuilder:
    @staticmethod
    def build_inline_comment(finding: Finding) -> str:
        """Formats an actionable inline review comment for a specific diff line."""
        badge = {
            FindingSeverity.CRITICAL: "🚨 **[CRITICAL]**",
            FindingSeverity.HIGH: "⚠️ **[HIGH]**",
            FindingSeverity.MEDIUM: "⚡ **[MEDIUM]**",
            FindingSeverity.LOW: "ℹ️ **[LOW]**",
        }.get(finding.severity, "ℹ️")

        lines = [
            f"{badge} {finding.title}",
            "",
            f"**Category:** `{finding.category.value}` | **Confidence:** `{int(finding.confidence * 100)}%` | **Source:** `{finding.source.value}`",
            "",
            finding.description,
            "",
            f"**Why it matters:** {finding.why_it_matters}",
            "",
            "**Recommended Action:**",
            f"> {finding.recommendation}",
        ]

        if finding.evidence:
            lines.extend([
                "",
                "```python" if finding.file.endswith(".py") else "```",
                finding.evidence,
                "```"
            ])

        lines.extend([
            "",
            "---",
            "🤖 *Advisory finding by ReviewGuard. Human approval required before merge.*"
        ])

        return "\n".join(lines)

    @staticmethod
    def build_summary_comment(summary: ReviewSummary, findings: List[Finding]) -> str:
        """Formats the PR-level review summary comment with metrics and human approval alert."""
        dist = summary.severity_distribution

        crit_badge = f"🔴 **Critical:** `{dist.CRITICAL}`" if dist.CRITICAL > 0 else "🟢 **Critical:** `0`"
        high_badge = f"🟠 **High:** `{dist.HIGH}`" if dist.HIGH > 0 else "⚪ **High:** `0`"
        med_badge = f"🟡 **Medium:** `{dist.MEDIUM}`" if dist.MEDIUM > 0 else "⚪ **Medium:** `0`"
        low_badge = f"🔵 **Low:** `{dist.LOW}`" if dist.LOW > 0 else "⚪ **Low:** `0`"

        lines = [
            "# 🛡️ ReviewGuard Automated Code Review",
            "",
            f"> ⚠️ **HUMAN-IN-THE-LOOP MANDATORY:** {summary.human_approval_reminder}",
            "",
            "### 📊 Review Overview",
            f"- **Files Evaluated:** `{summary.files_changed_count}`",
            f"- **Active Findings:** `{summary.findings_count}`",
            f"- **Duplicate Findings Suppressed:** `{summary.duplicates_suppressed}`",
            f"- **Review Latency:** `{summary.review_duration_ms} ms`",
            f"- **Engine:** `{summary.engine_used}`",
            "",
            "### 🎯 Severity Distribution",
            f"| {crit_badge} | {high_badge} | {med_badge} | {low_badge} |",
            "| :--- | :--- | :--- | :--- |",
            "",
            "### 📝 Executive Summary",
            summary.summary_text,
            ""
        ]

        if summary.key_concerns:
            lines.extend([
                "### 🚨 Key Attention Points",
                *[f"- {concern}" for concern in summary.key_concerns],
                ""
            ])

        lines.extend([
            "---",
            "🔍 *To inspect the full interactive findings breakdown, open the ReviewGuard Dashboard.*"
        ])

        return "\n".join(lines)
