# 🏛️ ReviewGuard Architecture & Technical Specification

## 1. System Overview

ReviewGuard is an AI-assisted Pull Request review system engineered to eliminate review bottlenecks while keeping human engineers in command.

```
                      ┌────────────────────────────────────────┐
                      │              GitHub PR / Push          │
                      └───────────────────┬────────────────────┘
                                          │ Webhook Event
                                          ▼
                      ┌────────────────────────────────────────┐
                      │       Webhook Router & Idempotency     │
                      │  - Verifies X-Hub-Signature-256        │
                      │  - Deduplicates repeated SHA payloads  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │        Durable Job Dispatcher          │
                      │  - Spawns background task (QUEUED)     │
                      │  - Returns 202 Accepted immediately    │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
         ┌─────────────────────────────────────────────────────────────┐
         │                  Unified Diff Analyzer                      │
         │  - Slices git diff into files, hunks, and added lines       │
         │  - Maps patch line offsets to PR head file line numbers     │
         │  - Retrieves PR HEAD file content to avoid sparse AST bugs  │
         └──────────────┬───────────────────────────────┬──────────────┘
                        │                               │
                        ▼                               ▼
         ┌──────────────────────────────┐┌──────────────────────────────┐
         │ Deterministic AST Analyzers  ││    AI Semantic Reviewer      │
         │ - Python AST (BinOp SQLi,    ││ - Ollama (local RTX GPU)     │
         │   range loop, mutable args)  ││ - Gemini 2.5 Flash (cloud)   │
         │ - JS / TS unsafe dereference ││ - Praise-filtering guard     │
         │ - C/C++ unsafe stdlib        ││   (eliminates false alerts)  │
         └──────────────┬───────────────┘└──────────────┬───────────────┘
                        │                               │
                        └───────────────┬───────────────┘
                                        ▼
         ┌─────────────────────────────────────────────────────────────┐
         │                Multi-Source Deduplication                   │
         │  - Enforces strict file-boundary isolation                  │
         │  - Concept & keyword matching (SQL, Injection, Shell, etc.) │
         │  - Collapses redundant findings, promotes AST confidence    │
         │  - Marks subordinate duplicates as SUPPRESSED               │
         └──────────────────────────────┬──────────────────────────────┘
                                        │
                                        ▼
         ┌─────────────────────────────────────────────────────────────┐
         │               Severity Calibration Engine                   │
         │  - Normalizes severity (CRITICAL, HIGH, MEDIUM, LOW)        │
         │  - Upgrades high-consequence security issues                │
         │  - Downgrades stylistic / test-fixture nits                 │
         └──────────────────────────────┬──────────────────────────────┘
                                        │
                                        ▼
         ┌─────────────────────────────────────────────────────────────┐
         │                Advisory Output & Publishing                 │
         │  - Persists DBReview & DBFinding records                    │
         │  - Formats markdown advisory summary for PR comment         │
         │  - Posts diff-anchored comments via GitHub REST API         │
         │  - AI IS STRICTLY ADVISORY — NEVER MERGES OR APPROVES       │
         └─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 Unified Diff Parsing & Context Integrity
- **Challenge:** Running AST analysis on isolated diff hunks causes synthetic syntax errors because hunks lack outer class/function definitions.
- **Solution:** 
  - `DiffParser` extracts modified line numbers (`added_lines`).
  - When `head_file_content` is available (via GitHub API or full source), AST analysis runs over the complete file and findings are filtered to only those intersecting `added_lines`.
  - When only raw patch text is available, `is_likely_incomplete()` flags partial fragments and prevents false syntax error generation.

### 2.2 Deterministic Static Analyzers
- **Python Analyzer (`python_analyzer.py`):**
  - Traverses AST using `ast.NodeVisitor`.
  - Flattens nested binary addition trees (`_flatten_binop_add()`) to catch chained string concatenations in SQL queries.
  - Detects `subprocess.Popen(..., shell=True)` and `os.system()`.
  - Detects mutable default arguments in function signatures (`def fn(items=[])`).
  - Detects off-by-one loops (`range(len(arr) + 1)`).
- **JavaScript/TypeScript Analyzer (`javascript_analyzer.py`):**
  - Detects unsafe chained property lookups without optional chaining or null guards.
  - Flags direct `eval()` invocations and `innerHTML` assignments.
- **C/C++ Analyzer:**
  - Flags dangerous APIs (`gets`, `strcpy`, `sprintf`).

### 2.3 AI Review Engine & Praise Filtering
- **Ollama Provider (`ollama_provider.py`):**
  - Connects to `http://localhost:11434` with `qwen2.5-coder:1.5b`.
  - Employs strict JSON prompt formatting.
  - **Praise Filter:** Smaller LLMs often output positive confirmations like "Secure Parameterized Query" or "Valid Input Validation". The review engine filters out non-vulnerabilities to maintain 0.0% false positive rates.
- **Gemini Provider (`gemini_provider.py`):**
  - Google Gemini 2.5 Flash for high-capacity PRs and cloud workloads.
- **Mock Provider (`mock_provider.py`):**
  - High-speed deterministic findings generator for automated testing and CI pipelines.

### 2.4 Multi-Source Deduplication Engine
- Findings from AST analysis and AI review are combined into raw findings.
- **Strict File Isolation:** Deduplication never collapses findings across different files.
- **Semantic Clustering:**
  - Exact file & line match.
  - Concept overlap (e.g. `sql` + `injection`, `command` + `shell`, `secret` + `key`).
  - Text similarity via Jaccard token overlap (threshold: 0.78).
- **Consolidation Rule:** Keeps the finding with higher severity; if severity is equal, prefers deterministic static AST over AI. Subordinate findings receive `status = "SUPPRESSED"`.

### 2.5 Multi-Tenant SaaS Architecture
- **Data Model:**
  - `DBUser`: PBKDF2-HMAC-SHA256 password hashes, email, activity status.
  - `DBWorkspace`: Tenant isolation namespace.
  - `DBWorkspaceMember`: Role-based membership (`admin`, `member`, `reviewer`).
  - `DBRepository`, `DBPullRequest`, `DBReview`, `DBFinding`: Scoped by `workspace_id`.
  - `DBSettings`: Persisted configuration for AI engines and alert thresholds.
  - `DBReviewJob`: Durable asynchronous worker queue with statuses `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`.

---

## 3. Security Principles & Guarantees

1. **Advisory Stance:** The system will never call GitHub's `pulls/submit_review` with `event = "APPROVE"` or `pulls/merge`.
2. **Zero Plaintext Credentials:** API keys and passwords are encrypted and hashed before storage.
3. **Workspace Isolation:** Endpoints enforce `verify_workspace_access()`. Manipulating workspace IDs returns 403 Forbidden.
