import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import init_db

client = TestClient(app)

SAMPLE_DIFF = """diff --git a/services/user_service.py b/services/user_service.py
index 0000000..1111111 100644
--- a/services/user_service.py
+++ b/services/user_service.py
@@ -1,5 +1,8 @@
+import os
+
 def delete_account(user_id):
-    pass
+    # Raw SQL execution
+    cursor.execute("DELETE FROM accounts WHERE id = " + str(user_id))
"""

def setup_module():
    init_db()

def test_health_and_readiness_endpoints():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    
    res = client.get("/ready")
    assert res.status_code == 200
    assert "database" in res.json()

def test_trigger_review_and_retrieve_details():
    payload = {
        "repository": "acme/payment-gateway",
        "pr_number": 101,
        "commit_sha": "a1b2c3d4e5f67890",
        "pr_title": "feat: Allow account deletion",
        "pr_description": "Implements self-service account deletion endpoint",
        "diff_text": SAMPLE_DIFF,
        "post_comments_to_github": False
    }

    res = client.post("/api/v1/reviews/trigger", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["repository"] == "acme/payment-gateway"
    assert data["pr_number"] == 101
    assert data["summary"]["findings_count"] >= 1
    assert data["summary"]["severity_distribution"]["CRITICAL"] >= 1

    review_id = data["id"]

    # Verify retrieval by review_id
    detail_res = client.get(f"/api/v1/reviews/{review_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == review_id
    assert len(detail_data["findings"]) >= 1

    # Verify analytics reflects this review
    analytics_res = client.get("/api/v1/analytics/overview")
    assert analytics_res.status_code == 200
    overview = analytics_res.json()
    assert overview["total_reviews"] >= 1
    assert overview["severity_distribution"]["CRITICAL"] >= 1
