from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.database import get_db, DBReview, DBFinding, DBPullRequest, DBRepository
from app.schemas.review import ReviewRequest, ReviewResult
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingStatus, FindingSource
from app.review.orchestrator import ReviewOrchestrator
from app.github.client import GitHubClient
from app.core.logging import logger

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/trigger", response_model=ReviewResult)
async def trigger_review(
    request: ReviewRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Triggers an automated diff-aware review.
    If diff_text is omitted but repo and pr_number are provided, fetches diff from GitHub API.
    """
    github_client = GitHubClient(token=request.github_token)

    # If diff not provided directly, retrieve from GitHub
    if not request.diff_text and request.pr_number:
        try:
            diff_text = await github_client.get_pr_diff(request.repository, request.pr_number)
            request.diff_text = diff_text
            pr_data = await github_client.get_pull_request(request.repository, request.pr_number)
            request.commit_sha = request.commit_sha or pr_data.get("head", {}).get("sha")
            request.pr_title = request.pr_title or pr_data.get("title")
            request.pr_description = request.pr_description or pr_data.get("body")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to fetch PR #{request.pr_number} from GitHub: {str(e)}"
            )

    if not request.diff_text or not request.diff_text.strip():
        raise HTTPException(status_code=400, detail="No diff content available to review.")

    orchestrator = ReviewOrchestrator()
    result = await orchestrator.execute_review(request, db=db)

    # Post comments back to GitHub if requested or configured
    if request.post_comments_to_github and request.pr_number and request.commit_sha:
        async def _post_github_async():
            try:
                await github_client.post_review(
                    repo=request.repository,
                    pr_number=request.pr_number,
                    commit_sha=request.commit_sha,
                    summary=result.summary,
                    findings=result.findings
                )
                # Update DB record
                review_rec = db.query(DBReview).filter(DBReview.id == result.id).first()
                if review_rec:
                    review_rec.github_commented = True
                    db.commit()
            except Exception as ex:
                logger.error(f"Error posting review comments to GitHub: {ex}")

        background_tasks.add_task(_post_github_async)

    return result


@router.get("", response_model=List[dict])
def list_reviews(
    repository: Optional[str] = None,
    pr_number: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Lists past reviews with summary metrics."""
    query = db.query(DBReview)
    if repository:
        query = query.filter(DBReview.repository_name == repository)
    if pr_number:
        query = query.filter(DBReview.pr_number == pr_number)

    reviews = query.order_by(desc(DBReview.created_at)).offset(offset).limit(limit).all()

    return [
        {
            "id": r.id,
            "repository": r.repository_name,
            "pr_number": r.pr_number,
            "commit_sha": r.commit_sha,
            "pr_title": r.pr_title,
            "status": r.status,
            "files_changed_count": r.files_changed_count,
            "findings_count": r.findings_count,
            "raw_findings_count": r.raw_findings_count,
            "duplicates_suppressed": r.duplicates_suppressed,
            "critical_count": r.critical_count,
            "high_count": r.high_count,
            "medium_count": r.medium_count,
            "low_count": r.low_count,
            "summary_text": r.summary_text,
            "key_concerns": r.key_concerns,
            "duration_ms": r.duration_ms,
            "engine_used": r.engine_used,
            "github_commented": r.github_commented,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reviews
    ]


@router.get("/{review_id}")
def get_review_detail(review_id: str, db: Session = Depends(get_db)):
    """Retrieves complete review details including active and suppressed findings."""
    r = db.query(DBReview).filter(DBReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found.")

    findings = db.query(DBFinding).filter(DBFinding.review_id == review_id).all()

    active = []
    suppressed = []

    for f in findings:
        item = {
            "id": f.id,
            "review_id": f.review_id,
            "title": f.title,
            "category": f.category,
            "severity": f.severity,
            "confidence": f.confidence,
            "file": f.file,
            "line": f.line,
            "start_line": f.start_line,
            "end_line": f.end_line,
            "side": f.side,
            "description": f.description,
            "why_it_matters": f.why_it_matters,
            "recommendation": f.recommendation,
            "evidence": f.evidence,
            "fingerprint": f.fingerprint,
            "source": f.source,
            "status": f.status,
            "suppressed_by": f.suppressed_by,
            "similarity_score": f.similarity_score,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        if f.status == "SUPPRESSED":
            suppressed.append(item)
        else:
            active.append(item)

    return {
        "id": r.id,
        "repository": r.repository_name,
        "pr_number": r.pr_number,
        "commit_sha": r.commit_sha,
        "pr_title": r.pr_title,
        "status": r.status,
        "summary": {
            "files_changed_count": r.files_changed_count,
            "findings_count": r.findings_count,
            "raw_findings_count": r.raw_findings_count,
            "duplicates_suppressed": r.duplicates_suppressed,
            "severity_distribution": {
                "CRITICAL": r.critical_count,
                "HIGH": r.high_count,
                "MEDIUM": r.medium_count,
                "LOW": r.low_count,
            },
            "summary_text": r.summary_text,
            "key_concerns": r.key_concerns,
            "human_approval_reminder": "⚠️ AI IS STRICTLY ADVISORY. A human reviewer must verify and approve this Pull Request.",
            "review_duration_ms": r.duration_ms,
            "engine_used": r.engine_used,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        },
        "findings": active,
        "suppressed_findings": suppressed,
    }
