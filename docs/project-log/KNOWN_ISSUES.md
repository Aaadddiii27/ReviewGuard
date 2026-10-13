# ReviewGuard — Known Issues & Operational Considerations

## 1. External Credentials Required for Live Production Services
- **GitHub App / Personal Access Token:**
  - Live posting of comments back to github.com requires `GITHUB_TOKEN` or `GITHUB_APP_ID` with private key.
  - ReviewGuard handles missing credentials gracefully in local mode by keeping reviews in the database and web dashboard without throwing uncaught network errors.
- **Google Gemini API Key:**
  - Required only when selecting `gemini` provider instead of local `ollama` or offline `mock`.
- **Production PostgreSQL:**
  - For enterprise high-concurrency environments, configure `DATABASE_URL` with PostgreSQL credentials instead of the default local SQLite.

## 2. Model Sizing Considerations
- The default local model is `qwen2.5-coder:1.5b`. While fast and resource-efficient (running on 4GB VRAM), larger models like `qwen2.5-coder:7b` or `gemini-2.5-flash` provide higher reasoning fidelity for extremely subtle architectural race conditions.

## 3. Large File Diff Limits
- Diffs exceeding 1,500 modified lines per file are truncated by default (`MAX_DIFF_LINES_PER_FILE`) to prevent GPU / LLM context-window exhaustion and excessive memory consumption.
