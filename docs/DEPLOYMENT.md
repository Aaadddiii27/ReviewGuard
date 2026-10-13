# 🚀 ReviewGuard Deployment & Operations Guide

## 1. Overview

ReviewGuard is containerized and production-ready. It can be deployed via Docker Compose on a single virtual machine or orchestrated using Kubernetes / ECS.

---

## 2. Docker Compose Deployment (Recommended)

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2+

### Step 1: Clone & Configure
```bash
git clone https://github.com/aditya/reviewguard.git
cd reviewguard

# Copy production environment configuration:
cp .env.example .env
```

### Step 2: Configure Environment Variables
Edit `.env` with your production settings:
```ini
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=sqlite:////app/data/reviewguard.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@db:5432/reviewguard

AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen2.5-coder:1.5b

JWT_SECRET_KEY=generate_a_secure_random_64_character_hex_string_here
GITHUB_TOKEN=ghp_your_personal_access_token_or_app_token
GITHUB_WEBHOOK_SECRET=your_webhook_hmac_secret
```

### Step 3: Launch Containers
```bash
docker compose up -d --build
```

### Step 4: Verify Health
- Check backend logs: `docker compose logs -f backend`
- Check health endpoint: `curl http://localhost:8000/api/v1/health`
- Access Web UI: `http://localhost:3000`

---

## 3. Production Hardening Checklist

1. **Database:**
   - For high-volume production, switch `DATABASE_URL` from SQLite to PostgreSQL.
   - Run daily automated backups of the database volume (`backend-data`).

2. **TLS / Reverse Proxy:**
   - Place Cloudflare, AWS ALB, or an external Nginx with Let's Encrypt in front of port 3000 (frontend) and port 8000 (backend).
   - Enforce HTTPS and HSTS headers.

3. **CORS:**
   - Restrict `CORS_ORIGINS` in `.env` to your production domain(s) (e.g. `https://reviewguard.yourdomain.com`).

4. **Secrets Management:**
   - Store `JWT_SECRET_KEY` and `GITHUB_WEBHOOK_SECRET` in Docker secrets or AWS Secrets Manager / HashiCorp Vault.
   - Never commit `.env` or tokens into version control.

---

## 4. Scaling Background Review Workers

For organizations with high pull request frequency:
1. Webhooks enqueue jobs into `DBReviewJob(status="QUEUED")`.
2. Worker containers can run dedicated job polling loops via `backend/app/api/jobs.py` (`execute_review_job_worker`).
3. Scale worker replicas independently to handle spikes in PR traffic.
