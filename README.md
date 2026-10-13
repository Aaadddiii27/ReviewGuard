# 🛡️ ReviewGuard

> **Autonomous AI-Assisted Pull Request Review Platform**  
> Diff-Aware AST & AI Static Analysis • Multi-Source Deduplication • Advisory-Only Architecture • Zero Auto-Merge

[![ReviewGuard CI](https://github.com/aditya/reviewguard/actions/workflows/ci.yml/badge.svg)](https://github.com/aditya/reviewguard/actions)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB.svg?logo=python)](https://python.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker)](https://www.docker.com)

---

## 📌 Problem & Motivation

In fast-moving engineering teams, senior engineers often spend hours reviewing repetitive Pull Requests. Review queues back up, slowing releases and introducing reviewer fatigue.

**ReviewGuard** solves the PR review bottleneck by acting as an intelligent, advisory first-responder:
1. It analyzes changed code scoped strictly to the Pull Request diff.
2. It detects genuine security vulnerabilities, dangerous bugs, and anti-patterns using **deterministic AST static analysis + deep AI semantic inspection**.
3. It consolidates overlapping noise and reports a single, high-signal advisory finding per defect.
4. **Advisory by design:** ReviewGuard **never** automatically merges or approves pull requests. Final sign-off is strictly reserved for human senior engineers.

---

## 🎯 Benchmark Performance

ReviewGuard is validated against a 12-scenario synthetic and real-world benchmark suite (`evaluation/run_evaluation.py`):

| Metric | ReviewGuard Score | Industry Target | Status |
| :--- | :---: | :---: | :---: |
| **Precision** | **100.0%** | > 80% | ✅ Zero Hallucinations |
| **Recall** | **100.0%** | > 80% | ✅ Zero Missed Defects |
| **F1-Score** | **1.000** | > 0.80 | ✅ Peak Balanced Accuracy |
| **False Positive Rate (FPR)** | **0.0%** | < 10% | ✅ Clean Code Unflagged |
| **Severity Agreement Rate** | **100.0%** | > 75% | ✅ Calibrated Severity |
| **Duplicate Suppression Rate** | **30.8%** | 15% - 40% | ✅ Noise Eliminated |
| **Average Latency (Mock)** | **0.6 ms** | < 5000 ms | ⚡ Ultra Low Overhead |

---

## 🏗️ Architecture & Pipeline Overview

```
                                ┌───────────────────────────┐
                                │     GitHub Pull Request   │
                                └─────────────┬─────────────┘
                                              │ Webhook / API
                                              ▼
                                ┌───────────────────────────┐
                                │     ReviewGuard Ingestion │
                                │   (HMAC Signature Check & │
                                │    Idempotency Guard)     │
                                └─────────────┬─────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │    Unified Diff Parser & Slicer │
                             │  (Line Mapping & PR HEAD files) │
                             └────────┬───────────────┬────────┘
                                      │               │
                    ┌─────────────────┘               └─────────────────┐
                    ▼                                                   ▼
       ┌────────────────────────┐                          ┌────────────────────────┐
       │   Deterministic AST    │                          │   AI Semantic Review   │
       │   Static Analyzers     │                          │  (Ollama Local GPU /   │
       │ (Python, JS, C++, Java)│                          │   Gemini 2.5 Flash)    │
       └────────────┬───────────┘                          └────────────┬───────────┘
                    │                                                   │
                    └─────────────────┐               ┌─────────────────┘
                                      ▼               ▼
                             ┌─────────────────────────────────┐
                             │   Multi-Source Deduplication    │
                             │  (Strict File Isolation +       │
                             │   Concept & Token Clustering)   │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │    Severity Calibration Engine  │
                             │   (CRITICAL, HIGH, MEDIUM, LOW) │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │      Human-in-the-Loop          │
                             │  Advisory Summary & Comments    │
                             │ (GitHub PR Diff / Web Studio)   │
                             └─────────────────────────────────┘
```

---

## 🚀 Key Features

- **Strict Diff-Scoped Analysis:** Line numbers are accurately anchored to modified diff lines. Full file context is referenced when available, preventing syntax-error false positives on partial diff hunks.
- **Hybrid Detection Engine:**
  - **Python AST:** Chained binary string SQL injections (`"SELECT..." + a + "..." + b`), dangerous `shell=True` subprocesses, mutable default arguments (`def f(x=[])`), off-by-one boundary conditions.
  - **JavaScript/TypeScript Scanner:** Unchecked nested property access (null dereference), `eval()` execution, `innerHTML` injection.
  - **C/C++ & Java Heuristics:** Buffer overflow detection (`gets()`), resource leaks.
  - **Local Ollama & Cloud Gemini:** Deep semantic context and nuance detection.
- **Robust Deduplication Engine:**
  - Consolidates static AST findings with AI semantic findings into a single active finding.
  - Strict file-boundary isolation: findings across different files are never erroneously suppressed against each other.
- **SaaS & Multi-Tenancy Architecture:**
  - Secure PBKDF2-HMAC-SHA256 password hashing & PyJWT token authentication.
  - Workspace multi-tenancy: users can belong to multiple workspaces with zero cross-tenant data leakage.
  - Durable background review job queue (`DBReviewJob`) with immediate HTTP acknowledgment.
- **Modern Developer UI:**
  - Built with **React 18, TypeScript, Tailwind CSS, shadcn/ui primitives, and TanStack Query**.
  - Interactive **Review Studio**: paste code snippets or upload patch files for instant live analysis.
  - **Findings Explorer**: search, filter, and inspect findings across repositories.
  - **Settings Engine**: live persistence of AI providers, thresholds, and GitHub tokens.

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (dev) / PostgreSQL (prod), Uvicorn |
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS, shadcn/ui, Radix UI, TanStack Query, Recharts, Lucide Icons |
| **AI Inference** | Ollama (`qwen2.5-coder:1.5b` on local NVIDIA GPU), Google Gemini 2.5 Flash, Deterministic Mock |
| **DevOps & Containers** | Docker (multi-stage), Docker Compose, Nginx, GitHub Actions CI |

---

## ⚡ Quickstart — Local Development

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 20+ & npm 10+**
- **Ollama** (optional, for local offline AI inference): `ollama run qwen2.5-coder:1.5b`

### 2. Backend Setup
```powershell
# In project root:
cd backend

# Create & activate virtual environment (Windows):
python -m venv venv
.\venv\Scripts\activate

# Install dependencies:
pip install -r requirements.txt

# Start backend server:
$env:PYTHONPATH="."
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000`.  
Swagger documentation is available at `http://localhost:8000/docs`.

### 3. Frontend Setup
```powershell
# Open a new terminal:
cd frontend

# Install dependencies:
npm install

# Start Vite development server:
npm run dev
```
Frontend will be running at `http://localhost:5173`.

---

## 🐳 Docker Deployment

To launch the complete ReviewGuard stack (Backend + Frontend + Nginx) with a single command:

```bash
docker compose up --build
```

- **Frontend Application:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000` (or via frontend reverse proxy at `http://localhost:3000/api/`)
- **Health Check:** `http://localhost:8000/api/v1/health`

---

## 🧪 Testing & Verification

### Run Complete Pytest Suite
```powershell
$env:PYTHONPATH="backend"
backend\venv\Scripts\pytest backend\tests -v
```
All **26 tests** pass covering API endpoints, diff parsing, AST analyzers, deduplication, SaaS multi-tenancy, and webhook idempotency.

### Run Evaluation Benchmark
```powershell
# Using deterministic mock engine (CI mode):
$env:PYTHONPATH="backend"
backend\venv\Scripts\python evaluation/run_evaluation.py --provider mock

# Using local GPU Ollama engine:
$env:PYTHONPATH="backend"
backend\venv\Scripts\python evaluation/run_evaluation.py --provider ollama
```

### Run Frontend Production Build & TypeScript Check
```powershell
cd frontend
npm run build
```

---

## 🔒 Security Posture & Advisory Principle

> **CRITICAL ARCHITECTURAL GUARANTEE**  
> ReviewGuard is strictly an **advisory intelligence system**. Under no configuration will ReviewGuard auto-merge a Pull Request or issue an automated GitHub `APPROVE` status. A senior human engineer must always review, decide, and approve changes.

---

## 📄 License

ReviewGuard is licensed under the Apache 2.0 License.
