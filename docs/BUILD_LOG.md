# ReviewGuard - Implementation Build Log

## Milestone 0: Environment Inspection & Hardware Discovery
- **Date**: 2026-09-29
- **Host System**: Windows 11 (OS build with PowerShell)
- **Hardware Profile**:
  - CPU: Intel Core i7 13th Gen
  - GPU: NVIDIA GeForce RTX 4050 Laptop GPU (6141 MiB VRAM), Driver 581.86, CUDA 13.0
  - RAM: 16 GB
  - Disk Space: 201.58 GB available on C:
- **Runtimes & Tooling Detected**:
  - Python: 3.11.x (via `py -3.11`) and 3.14.6
  - Node.js: v24.18.0
  - npm: 11.16.0
  - Git: 2.55.0
  - Ollama: Installed and running on `http://localhost:11434` with `qwen2.5-coder:1.5b`
  - Docker: CLI not currently in system PATH; container configurations (Dockerfile, docker-compose.yml, Azure Container deployment manifests) will be provided for deployment.
- **Model & AI Strategy Decision**:
  - Local GPU has 6GB VRAM. Full foundation model training from scratch is unfeasible and counterproductive.
  - Feasibility of fine-tuning: A lightweight LoRA adapter or prompt-tuning on code review pairs or using the local `qwen2.5-coder:1.5b` alongside cloud APIs (Gemini 2.5/1.5 Flash via Google GenAI SDK, or OpenAI-compatible endpoints) is the optimal dual-mode strategy.
  - The AI Review Engine will be provider-agnostic (`ReviewEngineProvider`), supporting:
    1. Local Ollama (`qwen2.5-coder:1.5b` or custom models) for zero-cost, private, offline-capable code review.
    2. Google Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`) for cloud inference.
    3. Custom / Fine-tuned adapter integration.
- **Next Milestone**: Milestone 1 - Backend Foundation & Dependencies (FastAPI, Pydantic v2, SQLAlchemy, AST/Static Analysis).

## Milestone 1: Core Backend Architecture & Engine Pipeline
- **Date**: 2026-09-29
- **Implemented Components**:
  - `backend/app/schemas/finding.py` & `review.py`: Strict Pydantic models for structured findings, severity levels, review summaries, and PR metadata.
  - `backend/app/core/config.py` & `logging.py`: Structured JSON logging and environment settings supporting SQLite & PostgreSQL.
  - `backend/app/models/database.py`: SQLAlchemy ORM schema for repositories, pull requests, reviews, and findings with cascades and indexes.
  - `backend/app/diff/parser.py`: Unified diff parser with line-mapping, diff hunk extraction, and annotated diff generator (`L<number>: <code>`).
  - `backend/app/analysis/`: Language detector and multi-language static analyzers:
    - Python AST visitor (detecting `eval`, `exec`, unparameterized SQL queries, `shell=True`, mutable default arguments, bare `except`, hardcoded credentials).
    - Bandit security scanner integration.
    - JavaScript / TypeScript analyzer (`eval`, `dangerouslySetInnerHTML`, command injection in `child_process.exec`, weak `Math.random()`, hardcoded secrets).
    - Java analyzer (JDBC statement concatenation, `Runtime.getRuntime().exec()`).
    - C/C++ analyzer (`gets()`, `strcpy()`, `strcat()`, `system()`).
  - `backend/app/ai/`: Multi-provider AI Review Engine with prompts enforcing strict JSON output:
    - `OllamaReviewProvider` running local `qwen2.5-coder:1.5b` on laptop NVIDIA RTX 4050 GPU.
    - `GeminiReviewProvider` supporting cloud Google Gemini models (`gemini-2.5-flash`).
    - `MockReviewProvider` for deterministic testing.
  - `backend/app/severity/engine.py`: Objective impact-based severity calibration rules (upgrading missed security risks to CRITICAL/HIGH and downgrading cosmetic/style nitpicks to LOW).
  - `backend/app/deduplication/engine.py`: Multi-strategy semantic deduplication combining TF-IDF cosine similarity, token Jaccard similarity, and line proximity clustering to consolidate overlapping findings.
  - `backend/app/review/orchestrator.py`: End-to-end review orchestrator and database persistence.
  - `backend/app/github/`: GitHub REST API client, webhook validator (HMAC SHA-256), and comment builder posting line-scoped advisory feedback (`event: COMMENT`).
  - `backend/app/api/`: FastAPI routes for reviews, findings search, analytics overview, repositories, webhooks, `/health`, and `/ready`.
- **Verification & Tests**:
  - Executed `pytest -v backend/tests`.
  - 9 out of 9 tests passing cleanly across diff parsing, static analysis, severity engine, deduplication suppression, and API integration.
- **Next Milestone**: Milestone 2 - Evaluation Benchmark, Dataset & Metrics.


## Milestone 2: Diff/Static-Analysis Pipeline Fix — SyntaxError False Positives
- **Date**: 2026-09-30
- **Problem Fixed**:
  `get_reconstructed_file_content()` in `parser.py` assembles sparse diff hunks padded with empty strings. When fed to `ast.parse()`, the blank-line gaps caused spurious `Python Syntax Error in patch` findings even when the actual PR source was perfectly valid.
- **Changes Implemented**:

  | File | Change |
  |---|---|
  | `backend/app/diff/parser.py` | Added `ParsedDiff.is_likely_incomplete(code)` static method — detects sparse reconstruction via blank-line ratio >30% + runs of >=5 consecutive blank lines. |
  | `backend/app/github/client.py` | Added `GitHubClient.get_file_content(repo, path, ref)` using GitHub Contents API. Returns decoded text or None on any failure. |
  | `backend/app/analysis/static_analyzer.py` | Added `is_partial_reconstruction: bool = False` param to `analyze_file()`. Forwards flag to PythonAnalyzer; skips Bandit on reconstructions. |
  | `backend/app/analysis/languages/python_analyzer.py` | Added `is_partial_reconstruction` param to `PythonAnalyzer.analyze()`. When True, SyntaxError from `ast.parse()` is silently dropped. |
  | `backend/app/review/orchestrator.py` | Priority strategy: (1) Fetch full file from GitHub Contents API at HEAD when token+SHA available. (2) Fall back to sparse reconstruction with auto-detection. (3) Always propagate `is_partial_reconstruction` flag. |
  | `backend/tests/test_static_analyzer.py` | Added 3 new tests: sparse suppression, genuine error still reported, `is_likely_incomplete()` heuristic. |

- **Design Principles**:
  - Full file analysis at HEAD gives accurate AST output. Fallback reconstruction still runs all non-SyntaxError visitors (SQLi, eval, hardcoded secrets).
  - Bandit skipped on reconstructions to prevent artefact findings.
  - Genuine SyntaxError in complete files still reported as CRITICAL.
  - GitHub line mapping preserved — findings scoped to modified_lines set regardless of analysis source.
- **Verification**: `pytest -v backend/tests` — **12 out of 12 tests passing** (+3 new tests).
- **Next Milestone**: Milestone 3 - Gemini API SDK integration, frontend verification, GitHub Action.
