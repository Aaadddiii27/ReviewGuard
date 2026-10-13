from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.database import get_db, DBRepository, DBPullRequest, DBReview

router = APIRouter(prefix="/repositories", tags=["Repositories"])


@router.get("")
def list_repositories(db: Session = Depends(get_db)):
    """Lists registered repositories with recent PR count."""
    repos = db.query(DBRepository).all()
    results = []
    for r in repos:
        pr_count = db.query(DBPullRequest).filter(DBPullRequest.repository_name == r.id).count()
        review_count = db.query(DBReview).filter(DBReview.repository_name == r.id).count()
        results.append({
            "id": r.id,
            "name": r.name,
            "default_branch": r.default_branch,
            "pr_count": pr_count,
            "review_count": review_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return results


@router.get("/{repo_id:path}/pulls")
def list_repo_prs(repo_id: str, db: Session = Depends(get_db)):
    """Lists pull requests for a given repository."""
    prs = db.query(DBPullRequest).filter(DBPullRequest.repository_name == repo_id).order_by(desc(DBPullRequest.created_at)).all()
    return [
        {
            "id": pr.id,
            "repository": pr.repository_name,
            "pr_number": pr.pr_number,
            "title": pr.title,
            "author": pr.author,
            "status": pr.status,
            "head_sha": pr.head_sha,
            "created_at": pr.created_at.isoformat() if pr.created_at else None,
        }
        for pr in prs
    ]
