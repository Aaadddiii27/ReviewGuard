import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db, DBReviewJob, DBReview, SessionLocal
from app.schemas.review import ReviewRequest, ReviewResult
from app.review.orchestrator import ReviewOrchestrator
from app.core.logging import logger

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


class JobResponse(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    repository_name: str
    pr_number: Optional[int] = None
    commit_sha: Optional[str] = None
    status: str
    review_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: str
    updated_at: str


async def execute_review_job_worker(job_id: str, request: ReviewRequest):
    """Durable worker task executing the review asynchronously with state transitions."""
    logger.info(f"Background worker picked up review job {job_id} for {request.repository}")
    with SessionLocal() as db:
        job = db.query(DBReviewJob).filter(DBReviewJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found in database")
            return
        job.status = "RUNNING"
        job.updated_at = datetime.utcnow()
        db.commit()

        try:
            orchestrator = ReviewOrchestrator()
            result: ReviewResult = await orchestrator.execute_review(request, db=db)
            job.status = "COMPLETED"
            job.review_id = result.id
            job.updated_at = datetime.utcnow()
            db.commit()
            logger.info(f"Background review job {job_id} completed successfully -> review {result.id}")
        except Exception as e:
            logger.error(f"Background review job {job_id} failed: {e}")
            job.status = "FAILED"
            job.error_message = str(e)
            job.retry_count += 1
            job.updated_at = datetime.utcnow()
            db.commit()


@router.get("", response_model=List[dict])
def list_review_jobs(
    repository: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lists durable background review jobs."""
    query = db.query(DBReviewJob)
    if repository:
        query = query.filter(DBReviewJob.repository_name == repository)
    if status:
        query = query.filter(DBReviewJob.status == status.upper())
    jobs = query.order_by(DBReviewJob.created_at.desc()).limit(limit).all()

    return [
        {
            "id": j.id,
            "workspace_id": j.workspace_id,
            "repository_name": j.repository_name,
            "pr_number": j.pr_number,
            "commit_sha": j.commit_sha,
            "status": j.status,
            "review_id": j.review_id,
            "error_message": j.error_message,
            "retry_count": j.retry_count,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "updated_at": j.updated_at.isoformat() if j.updated_at else None,
        }
        for j in jobs
    ]


@router.get("/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Retrieves current execution state of a background review job."""
    job = db.query(DBReviewJob).filter(DBReviewJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "workspace_id": job.workspace_id,
        "repository_name": job.repository_name,
        "pr_number": job.pr_number,
        "commit_sha": job.commit_sha,
        "status": job.status,
        "review_id": job.review_id,
        "error_message": job.error_message,
        "retry_count": job.retry_count,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }
