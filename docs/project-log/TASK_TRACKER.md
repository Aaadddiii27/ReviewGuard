# ReviewGuard — Task Tracker

## Legend
- `NOT_STARTED` — Work not begun
- `IN_PROGRESS` — Currently being implemented
- `BLOCKED` — Waiting on external dependency
- `IMPLEMENTED_NOT_TESTED` — Code written, tests not run
- `TEST_FAILED` — Tests run and failing
- `VERIFIED` — Acceptance criteria tested and passing
- `DEFERRED_WITH_REASON` — Explicitly deferred

---

## P1 — Project Setup & Baseline

### T-001: Git initialization
- **Priority:** CRITICAL  
- **Status:** VERIFIED  
- **Files:** `.git/`, `.gitignore`  
- **Acceptance:** `git status` shows clean tracked repo  
- **Evidence:** `git init` run 2026-10-13, .gitignore created  

### T-002: .env.example creation
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `.env.example`  
- **Acceptance:** File exists with all required vars, no real secrets  

### T-003: Project log infrastructure
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `docs/project-log/`  
- **Acceptance:** All 6 log files exist and are current  

### T-004: Baseline test confirmation
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Evidence:** 12/12 pytest PASSED (2026-10-13), Vite build SUCCESS  

---

## P2 — Frontend TypeScript Migration

### T-010: Install TypeScript + shadcn/ui
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `frontend/package.json`, `frontend/tsconfig.json`  
- **Acceptance:** `npx tsc --noEmit` passes, shadcn init succeeds  

### T-011: Convert services/api.js to TypeScript
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `frontend/src/services/api.ts`  
- **Acceptance:** Typed response interfaces, no `any` for API types  

### T-012: Convert component files to TypeScript
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `frontend/src/components/*.tsx`  
- **Acceptance:** No TypeScript errors in component files  

### T-013: Convert page files to TypeScript
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `frontend/src/pages/*.tsx`  
- **Acceptance:** No TypeScript errors, routes still work  

### T-014: Integrate shadcn/ui components
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `frontend/src/components/ui/`  
- **Acceptance:** shadcn Button, Card, Badge, Table, Dialog used in at least 3 pages  

### T-015: Professional UI redesign
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Acceptance:** Light/dark theme, no hackathon branding, proper empty states  

---

## P3 — Authentication & Workspace Isolation

### T-020: Backend auth endpoints (JWT)
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `backend/app/api/auth.py`, `backend/app/core/auth.py`  
- **Acceptance:** POST /auth/register, POST /auth/login return JWT tokens  

### T-021: User model + workspace model
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `backend/app/models/database.py`  
- **Acceptance:** DBUser, DBWorkspace tables, workspace_id foreign key on all resources  

### T-022: Protected API routes
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Acceptance:** All review/findings/repo endpoints require valid JWT  

### T-023: Workspace isolation
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Acceptance:** User A cannot access User B's reviews via ID manipulation  

### T-024: Frontend auth flow
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`  
- **Acceptance:** Login/register pages work, JWT stored securely, protected routes  

---

## P4 — GitHub Integration Hardening

### T-030: GitHub App installation flow
- **Priority:** HIGH  
- **Status:** BLOCKED (needs GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY)  
- **Acceptance:** Users can install GitHub App and grant repo access  

### T-031: Webhook idempotency
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `backend/app/api/webhooks.py`  
- **Acceptance:** Duplicate webhook deliveries don't create duplicate reviews  

### T-032: Webhook signature validation
- **Priority:** HIGH  
- **Status:** IMPLEMENTED_NOT_TESTED  
- **Files:** `backend/app/github/webhook.py`  
- **Acceptance:** Invalid signatures rejected with 401  

---

## P5 — Background Job Queue

### T-040: Review job queue
- **Priority:** MEDIUM  
- **Status:** NOT_STARTED  
- **Acceptance:** Reviews queued, status tracked, retries on failure  

---

## P6 — Database Migrations (Alembic)

### T-050: Alembic initialization
- **Priority:** MEDIUM  
- **Status:** NOT_STARTED  
- **Files:** `alembic/`, `alembic.ini`  
- **Acceptance:** `alembic upgrade head` applies schema cleanly  

---

## P7 — API Quality

### T-060: Verify /api/v1/analytics/benchmark endpoint
- **Priority:** MEDIUM  
- **Status:** NOT_STARTED  
- **Files:** `backend/app/api/analytics.py`  
- **Acceptance:** BenchmarkView page loads real data  

### T-061: Settings persistence API
- **Priority:** MEDIUM  
- **Status:** NOT_STARTED  
- **Acceptance:** Settings page saves and loads real config  

### T-062: Pagination on /reviews and /findings
- **Priority:** LOW  
- **Status:** NOT_STARTED  

---

## P8 — Deployment Preparation

### T-070: Dockerfile (backend)
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `docker/Dockerfile.backend`  

### T-071: Dockerfile (frontend)
- **Priority:** HIGH  
- **Status:** NOT_STARTED  
- **Files:** `docker/Dockerfile.frontend`  

### T-072: docker-compose.yml
- **Priority:** HIGH  
- **Status:** NOT_STARTED  

### T-073: CI workflow (GitHub Actions)
- **Priority:** MEDIUM  
- **Status:** NOT_STARTED  
- **Files:** `.github/workflows/ci.yml`  

---

## P9 — Documentation

### T-080: README.md
- **Priority:** HIGH  
- **Status:** NOT_STARTED  

### T-081: docs/ARCHITECTURE.md
- **Priority:** MEDIUM  
- **Status:** NOT_STARTED  

### T-082: docs/DEPLOYMENT.md
- **Priority:** MEDIUM  
- **Status:** NOT_STARTED  

### T-083: docs/GITHUB_APP_SETUP.md
- **Priority:** MEDIUM  
- **Status:** NOT_STARTED  
