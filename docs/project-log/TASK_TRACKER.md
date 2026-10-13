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

### T-002: .env.example creation
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `.env.example`  
- **Acceptance:** File exists with all required vars, no real secrets  

### T-003: Project log infrastructure
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `docs/project-log/`  
- **Acceptance:** All log files exist and are current  

### T-004: Baseline test confirmation
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Evidence:** 26/26 pytest PASSED, Vite build SUCCESS  

---

## P2 — Frontend TypeScript Migration

### T-010: Install TypeScript + shadcn/ui
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `frontend/package.json`, `frontend/tsconfig.json`  
- **Acceptance:** `tsc && vite build` passes cleanly, shadcn components functional  

### T-011: Convert services/api.js to TypeScript
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `frontend/src/services/api.ts`  
- **Acceptance:** Fully typed request/response interfaces, JWT bearer header handling  

### T-012: Convert component files to TypeScript
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `frontend/src/components/*.tsx`  
- **Acceptance:** Zero TypeScript errors across Navbar, Sidebar, FindingCard, etc.  

### T-013: Convert page files to TypeScript
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `frontend/src/pages/*.tsx`  
- **Acceptance:** Zero TypeScript errors across all routes  

### T-014: Integrate shadcn/ui components
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `frontend/src/components/ui/`  
- **Acceptance:** shadcn Button, Card, Badge, Table, Tabs, Sheet, Skeleton, Toaster used  

### T-015: Professional UI redesign
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Acceptance:** Sleek dark UI theme, proper empty/loading states, Review Studio, Repositories view  

---

## P3 — Authentication & Workspace Isolation

### T-020: Backend auth endpoints (JWT)
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `backend/app/api/auth.py`, `backend/app/core/security.py`  
- **Acceptance:** POST /auth/register, POST /auth/login return signed JWT tokens  
- **Evidence:** Verified in `test_saas_features.py::test_auth_register_and_login_flow`  

### T-021: User model + workspace model
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `backend/app/models/database.py`  
- **Acceptance:** DBUser, DBWorkspace, DBWorkspaceMember tables created and linked  

### T-022: Protected API routes & dependencies
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `backend/app/core/dependencies.py`  
- **Acceptance:** `get_current_user` and `verify_workspace_access` protect sensitive endpoints  

### T-023: Workspace isolation
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Evidence:** Verified in `test_saas_features.py::test_workspace_isolation` (403 on cross-tenant access)  

### T-024: Frontend auth flow
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `frontend/src/pages/LoginView.tsx`, `frontend/src/components/Navbar.tsx`  
- **Acceptance:** Sign in / Sign up tabs, token persistence, user profile display, sign out  

---

## P4 — GitHub Integration Hardening

### T-030: GitHub App installation & documentation
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `docs/GITHUB_APP_SETUP.md`, `backend/app/github/`  
- **Acceptance:** Comprehensive setup guide and payload structures defined  

### T-031: Webhook idempotency
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `backend/app/api/webhooks.py`  
- **Acceptance:** Duplicate webhook deliveries for identical commit SHA return 200 without re-processing  
- **Evidence:** Verified in `test_webhooks.py::test_webhook_idempotency_on_repeated_delivery`  

### T-032: Webhook signature validation
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `backend/app/github/webhook.py`  
- **Acceptance:** Invalid HMAC signatures rejected with 401  
- **Evidence:** Verified in `test_webhooks.py::test_webhook_handles_pull_request_event`  

---

## P5 — Background Job Queue

### T-040: Review job queue
- **Priority:** MEDIUM  
- **Status:** VERIFIED  
- **Files:** `backend/app/api/jobs.py`, `backend/app/models/database.py`  
- **Acceptance:** DBReviewJob queues reviews with QUEUED/PROCESSING/COMPLETED/FAILED lifecycle  
- **Evidence:** Verified in `test_saas_features.py::test_review_jobs_listing`  

---

## P6 — Database Migrations

### T-050: Schema auto-migration
- **Priority:** MEDIUM  
- **Status:** VERIFIED  
- **Files:** `backend/app/models/database.py` (`init_db`)  
- **Acceptance:** Safe non-destructive column additions via SQLite/PostgreSQL DDL on startup  

---

## P7 — API Quality & Detection Engine

### T-060: Benchmark & analytics endpoints
- **Priority:** MEDIUM  
- **Status:** VERIFIED  
- **Files:** `backend/app/api/analytics.py`  
- **Acceptance:** Overview and benchmark data correctly formatted and rendered  

### T-061: Settings persistence API
- **Priority:** MEDIUM  
- **Status:** VERIFIED  
- **Files:** `backend/app/api/settings.py`, `frontend/src/pages/SettingsView.tsx`  
- **Acceptance:** Settings page saves and loads real config from DB via TanStack Query  
- **Evidence:** Verified in `test_saas_features.py::test_settings_persistence`  

### T-062: Detection & Deduplication Quality
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Acceptance:** Chained binary SQLi detection, range loop fix, praise filtering on clean code  
- **Evidence:** 100% Precision, 100% Recall, F1=1.000, 0% FPR in benchmark evaluation  

---

## P8 — Deployment Preparation

### T-070: Dockerfile (backend)
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `backend/Dockerfile`  
- **Acceptance:** Python 3.11-slim, curl health check, uvicorn entrypoint  

### T-071: Dockerfile (frontend)
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `frontend/Dockerfile`, `frontend/nginx.conf`  
- **Acceptance:** Multi-stage build, Nginx Alpine, SPA routing & API reverse proxy  

### T-072: docker-compose.yml
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `docker-compose.yml`  
- **Acceptance:** Orchestrates backend, frontend, healthchecks, and data volumes  

### T-073: CI workflow (GitHub Actions)
- **Priority:** MEDIUM  
- **Status:** VERIFIED  
- **Files:** `.github/workflows/ci.yml`  
- **Acceptance:** Runs backend pytest, benchmark evaluation, and frontend build on push  

---

## P9 — Documentation

### T-080: README.md
- **Priority:** HIGH  
- **Status:** VERIFIED  
- **Files:** `README.md`  

### T-081: docs/ARCHITECTURE.md
- **Priority:** MEDIUM  
- **Status:** VERIFIED  
- **Files:** `docs/ARCHITECTURE.md`  

### T-082: docs/DEPLOYMENT.md
- **Priority:** MEDIUM  
- **Status:** VERIFIED  
- **Files:** `docs/DEPLOYMENT.md`  

### T-083: docs/GITHUB_APP_SETUP.md
- **Priority:** MEDIUM  
- **Status:** VERIFIED  
- **Files:** `docs/GITHUB_APP_SETUP.md`  
