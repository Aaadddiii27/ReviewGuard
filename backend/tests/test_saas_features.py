import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_register_and_login_flow():
    unique_id = uuid.uuid4().hex[:8]
    email = f"engineer_{unique_id}@reviewguard.dev"
    password = "StrongPassword123!"

    # 1. Register
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Senior Reviewer",
        "workspace_name": "Engineering Core"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == email
    assert len(reg_data["workspaces"]) == 1
    assert reg_data["workspaces"][0]["name"] == "Engineering Core"
    workspace_id = reg_data["workspaces"][0]["id"]

    # 2. Duplicate registration rejected
    dup_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password
    })
    assert dup_res.status_code == 400

    # 3. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # 4. Get Profile /me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["email"] == email

    # 5. Invalid token rejected
    bad_res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert bad_res.status_code == 401


def test_workspace_isolation():
    u_id = uuid.uuid4().hex[:8]
    # User 1
    u1_res = client.post("/api/v1/auth/register", json={
        "email": f"user1_{u_id}@org-a.com",
        "password": "Password123!",
        "full_name": "User One"
    })
    token1 = u1_res.json()["access_token"]
    ws1_id = u1_res.json()["workspaces"][0]["id"]

    # User 2
    u2_res = client.post("/api/v1/auth/register", json={
        "email": f"user2_{u_id}@org-b.com",
        "password": "Password123!",
        "full_name": "User Two"
    })
    token2 = u2_res.json()["access_token"]
    ws2_id = u2_res.json()["workspaces"][0]["id"]

    # User 1 can access own workspace
    res1 = client.get(f"/api/v1/workspaces/{ws1_id}", headers={"Authorization": f"Bearer {token1}"})
    assert res1.status_code == 200

    # User 2 CANNOT access User 1's workspace (Cross-tenant forbidden)
    res_cross = client.get(f"/api/v1/workspaces/{ws1_id}", headers={"Authorization": f"Bearer {token2}"})
    assert res_cross.status_code == 403, "Cross-tenant access must be rejected with 403"


def test_settings_persistence():
    # GET settings
    get_res = client.get("/api/v1/settings")
    assert get_res.status_code == 200
    original = get_res.json()
    assert "ai_provider" in original

    # PUT settings
    put_res = client.put("/api/v1/settings", json={
        "ai_provider": "mock",
        "severity_threshold": "HIGH",
        "deduplication_threshold": 0.82
    })
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["ai_provider"] == "mock"
    assert updated["severity_threshold"] == "HIGH"
    assert updated["deduplication_threshold"] == 0.82

    # Verify genuinely persisted in DB
    verify_res = client.get("/api/v1/settings")
    assert verify_res.status_code == 200
    assert verify_res.json()["ai_provider"] == "mock"
    assert verify_res.json()["severity_threshold"] == "HIGH"


def test_manual_snippet_review():
    code_with_sqli = """def login(user, password):
    query = "SELECT * FROM users WHERE user = '" + user + "' AND pass = '" + password + "'"
    return query
"""
    res = client.post("/api/v1/manual/snippet", json={
        "filename": "auth_service.py",
        "code": code_with_sqli,
        "ai_provider": "mock"
    })
    assert res.status_code == 200
    data = res.json()
    assert "findings" in data
    assert len(data["findings"]) >= 1
    assert data["findings"][0]["severity"] == "CRITICAL"
    assert "SQL" in data["findings"][0]["title"]


def test_review_jobs_listing():
    res = client.get("/api/v1/jobs")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
