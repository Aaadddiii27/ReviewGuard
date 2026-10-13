from pathlib import Path
import json

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.database import (
    get_db,
    DBReview,
    DBFinding,
    DBRepository,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def get_analytics_overview(db: Session = Depends(get_db)):
    """Compute high-level aggregated review, severity, and efficiency metrics."""

    total_reviews = db.query(func.count(DBReview.id)).scalar() or 0

    total_active_findings = (
        db.query(func.sum(DBReview.findings_count)).scalar() or 0
    )

    total_suppressed = (
        db.query(func.sum(DBReview.duplicates_suppressed)).scalar() or 0
    )

    raw_findings = (
        db.query(func.sum(DBReview.raw_findings_count)).scalar()
        or (total_active_findings + total_suppressed)
    )

    crit_count = (
        db.query(func.sum(DBReview.critical_count)).scalar() or 0
    )

    high_count = (
        db.query(func.sum(DBReview.high_count)).scalar() or 0
    )

    med_count = (
        db.query(func.sum(DBReview.medium_count)).scalar() or 0
    )

    low_count = (
        db.query(func.sum(DBReview.low_count)).scalar() or 0
    )

    avg_latency = (
        db.query(func.avg(DBReview.duration_ms)).scalar() or 0
    )

    # Category distribution from active findings
    cat_counts = (
        db.query(DBFinding.category, func.count(DBFinding.id))
        .filter(DBFinding.status == "OPEN")
        .group_by(DBFinding.category)
        .all()
    )

    category_distribution = {
        category: count
        for category, count in cat_counts
    }

    suppression_rate = (
        round((total_suppressed / raw_findings) * 100, 1)
        if raw_findings > 0
        else 0.0
    )

    # Estimated senior engineering hours saved.
    # Assumption: approximately 25 minutes (0.42 hours) saved per review.
    estimated_hours_saved = round(total_reviews * 0.42, 1)

    return {
        "total_reviews": total_reviews,
        "total_findings": total_active_findings,
        "raw_findings": raw_findings,
        "duplicates_suppressed": total_suppressed,
        "suppression_rate_pct": suppression_rate,
        "avg_latency_ms": int(avg_latency),
        "estimated_hours_saved": estimated_hours_saved,
        "severity_distribution": {
            "CRITICAL": crit_count,
            "HIGH": high_count,
            "MEDIUM": med_count,
            "LOW": low_count,
        },
        "category_distribution": category_distribution,
    }


@router.get("/benchmark")
def get_benchmark_results():
    """Return the latest benchmark evaluation results."""

    # analytics.py is located at:
    #
    # ReviewGuard/
    #   backend/
    #     app/
    #       api/
    #         analytics.py
    #
    # We search the parent directories for:
    #
    # evaluation/results/latest.json
    #
    # This is more robust than assuming a fixed number of parents.

    current_file = Path(__file__).resolve()

    results_path = None

    for parent in current_file.parents:
        candidate = (
            parent
            / "evaluation"
            / "results"
            / "latest.json"
        )

        if candidate.exists():
            results_path = candidate
            break

    if results_path is None:
        return {
            "status": "unavailable",
            "message": (
                "Benchmark results file not found. "
                "Expected evaluation/results/latest.json."
            ),
        }

    try:
        with results_path.open("r", encoding="utf-8") as f:
            results = json.load(f)

        return results

    except json.JSONDecodeError as exc:
        return {
            "status": "error",
            "message": f"Invalid JSON in benchmark results: {exc}",
        }

    except Exception as exc:
        return {
            "status": "error",
            "message": f"Failed to read benchmark results: {exc}",
        }