import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import SessionLocal, DBReview

client = TestClient(app)


def test_webhook_rejects_non_pr_event():
    res = client.post(
        "/api/v1/webhooks/github",
        json={"action": "created"},
        headers={"X-GitHub-Event": "push"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ignored"


def test_webhook_handles_pull_request_event():
    payload = {
        "action": "opened",
        "pull_request": {
            "number": 42,
            "title": "Add payment authentication",
            "body": "PR description",
            "head": {"sha": "fedcba9876543210"}
        },
        "repository": {
            "full_name": "acme/billing-service"
        }
    }
    res = client.post(
        "/api/v1/webhooks/github",
        json=payload,
        headers={"X-GitHub-Event": "pull_request"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("accepted", "already_reviewed")
    assert data["repository"] == "acme/billing-service"
    assert data["pr_number"] == 42


def test_webhook_idempotency_on_repeated_delivery():
    import uuid
    rev_id = f"rev_{uuid.uuid4().hex}"
    commit_sha = f"sha_{uuid.uuid4().hex[:12]}"
    repo = "acme/idempotent-repo"

    # Seed an already completed review in DB
    with SessionLocal() as db:
        rev = DBReview(
            id=rev_id,
            repository_name=repo,
            pr_number=99,
            commit_sha=commit_sha,
            status="COMPLETED",
            summary_text="Already reviewed"
        )
        db.add(rev)
        db.commit()

    payload = {
        "action": "synchronize",
        "pull_request": {
            "number": 99,
            "title": "Idempotent PR",
            "head": {"sha": commit_sha}
        },
        "repository": {
            "full_name": repo
        }
    }

    # Second delivery
    res = client.post(
        "/api/v1/webhooks/github",
        json=payload,
        headers={"X-GitHub-Event": "pull_request"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "already_reviewed"
    assert data["review_id"] == rev_id
