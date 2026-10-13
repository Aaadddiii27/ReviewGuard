from typing import List, Dict, Optional
from app.schemas.finding import Finding, FindingSeverity
from app.schemas.review import ReviewSummary, SeverityDistribution
from datetime import datetime


class SummaryBuilder:
    @staticmethod
    def build(
        files_changed_count: int,
        active_findings: List[Finding],
        raw_findings_count: int,
        duplicates_suppressed: int,
        ai_summaries: List[str],
        duration_ms: int,
        engine_used: str,
        stage_latencies: Optional[Dict[str, int]] = None,
        errors: Optional[List[str]] = None
    ) -> ReviewSummary:
        # Calculate severity distribution
        distribution = SeverityDistribution()
        for f in active_findings:
            if f.severity == FindingSeverity.CRITICAL:
                distribution.CRITICAL += 1
            elif f.severity == FindingSeverity.HIGH:
                distribution.HIGH += 1
            elif f.severity == FindingSeverity.MEDIUM:
                distribution.MEDIUM += 1
            elif f.severity == FindingSeverity.LOW:
                distribution.LOW += 1

        # Extract top key concerns
        key_concerns: List[str] = []
        # Sort active findings by severity
        sorted_findings = sorted(
            active_findings,
            key=lambda x: (
                0 if x.severity == FindingSeverity.CRITICAL else
                1 if x.severity == FindingSeverity.HIGH else
                2 if x.severity == FindingSeverity.MEDIUM else 3
            )
        )
        for f in sorted_findings[:4]:
            key_concerns.append(f"[{f.severity.value}] {f.title} ({f.file}{f':{f.line}' if f.line else ''})")

        # Synthesize overall review summary text
        summary_lines = []
        if distribution.CRITICAL > 0:
            summary_lines.append(f"🚨 Identified {distribution.CRITICAL} CRITICAL issue(s) that must be addressed immediately before merge.")
        elif distribution.HIGH > 0:
            summary_lines.append(f"⚠️ Identified {distribution.HIGH} HIGH severity finding(s) impacting security or reliability.")
        elif len(active_findings) > 0:
            summary_lines.append(f"ℹ️ Code changes look mostly solid with {len(active_findings)} advisory suggestion(s).")
        elif errors:
            err_msg = errors[0] if len(errors) == 1 else f"{len(errors)} errors: {errors[0]}"
            summary_lines.append(f"⚠️ Review Incomplete: AI review analysis encountered an error or timeout ({err_msg}). No issues identified by static analysis, but automated review could not be fully verified.")
        else:
            summary_lines.append("✅ Clean review: No actionable security, bug, or quality issues detected in the modified code.")

        # Add brief detail from AI synthesis if available
        filtered_ai_summaries = [s.strip() for s in ai_summaries if s.strip()]
        if filtered_ai_summaries:
            summary_lines.append(filtered_ai_summaries[0])

        summary_text = " ".join(summary_lines)
        error_details = "; ".join(errors) if errors else None

        return ReviewSummary(
            files_changed_count=files_changed_count,
            findings_count=len(active_findings),
            raw_findings_count=raw_findings_count,
            duplicates_suppressed=duplicates_suppressed,
            severity_distribution=distribution,
            summary_text=summary_text,
            key_concerns=key_concerns,
            human_approval_reminder="⚠️ AI IS STRICTLY ADVISORY. A human reviewer must verify and approve this Pull Request.",
            review_duration_ms=duration_ms,
            stage_latencies=stage_latencies or {},
            error_details=error_details,
            engine_used=engine_used,
            created_at=datetime.utcnow()
        )
