from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
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

    async def _process_webhook_review():
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
            # Create a separate session for background task
            from app.models.database import SessionLocal
            with SessionLocal() as bg_db:
                orchestrator = ReviewOrchestrator()
                result = await orchestrator.execute_review(review_req, db=bg_db)
                
                # Post comments to GitHub
                await gh_client.post_review(
                    repo=repo,
                    pr_number=pr_num,
                    commit_sha=commit_sha,
                    summary=result.summary,
                    findings=result.findings
                )
        except Exception as e:
            logger.error(f"Error handling webhook review for {repo} #{pr_num}: {e}")

    background_tasks.add_task(_process_webhook_review)

    return {
        "status": "accepted",
        "repository": repo,
        "pr_number": pr_num,
        "action": pr_data["action"]
    }
