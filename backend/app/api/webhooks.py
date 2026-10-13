from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db, DBReview
from app.github.webhook import WebhookValidator
from app.github.client import GitHubClient
from app.schemas.review import ReviewRequest
from app.review.orchestrator import ReviewOrchestrator
from app.core.logging import logger

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/github")
async def github_webhook_endpoint(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(None),
    x_hub_signature_256: str = Header(None),
    db: Session = Depends(get_db)
):
    """Handles GitHub Pull Request webhooks."""
    body_bytes = await request.body()
    
    if not WebhookValidator.verify_signature(body_bytes, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    if x_github_event != "pull_request":
        return {"status": "ignored", "reason": f"Event '{x_github_event}' is not pull_request"}

    payload = await request.json()
    pr_data = WebhookValidator.parse_pr_event(payload)
    if not pr_data:
        return {"status": "ignored", "reason": "PR action not supported or missing data"}

    repo = pr_data["repository"]
    pr_num = pr_data["pr_number"]
    commit_sha = pr_data["commit_sha"]

    logger.info(f"Received GitHub PR webhook for {repo} #{pr_num} (action={pr_data['action']})")

    # Idempotency check: Don't re-run review if already completed for this exact commit SHA
    if commit_sha:
        existing = db.query(DBReview).filter(
            DBReview.repository_name == repo,
            DBReview.pr_number == pr_num,
            DBReview.commit_sha == commit_sha,
            DBReview.status == "COMPLETED"
        ).first()
        if existing:
            logger.info(f"Idempotent skip: PR #{pr_num} at commit {commit_sha} was already reviewed ({existing.id})")
            return {
                "status": "already_reviewed",
                "repository": repo,
                "pr_number": pr_num,
                "review_id": existing.id
            }

    # Create durable background job record
    import uuid
    from app.models.database import DBReviewJob
    from app.api.jobs import execute_review_job_worker

    job_id = str(uuid.uuid4())
    job = DBReviewJob(
        id=job_id,
        repository_name=repo,
        pr_number=pr_num,
        commit_sha=commit_sha,
        status="QUEUED"
    )
    db.add(job)
    db.commit()

    async def _process_webhook_job():
        try:
            gh_client = GitHubClient()
            diff_text = await gh_client.get_pr_diff(repo, pr_num)
            review_req = ReviewRequest(
                repository=repo,
                pr_number=pr_num,
                commit_sha=commit_sha,
                pr_title=pr_data.get("pr_title"),
                pr_description=pr_data.get("pr_description"),
                diff_text=diff_text,
                post_comments_to_github=True
            )
            await execute_review_job_worker(job_id, review_req)
        except Exception as e:
            logger.error(f"Error preparing webhook review for {repo} #{pr_num}: {e}")
            from app.models.database import SessionLocal
            with SessionLocal() as err_db:
                j = err_db.query(DBReviewJob).filter(DBReviewJob.id == job_id).first()
                if j:
                    j.status = "FAILED"
                    j.error_message = str(e)
                    err_db.commit()

    background_tasks.add_task(_process_webhook_job)

    return {
        "status": "accepted",
        "job_id": job_id,
        "repository": repo,
        "pr_number": pr_num,
        "action": pr_data["action"]
    }
