# 🐙 ReviewGuard GitHub App Setup Guide

## 1. Overview

ReviewGuard connects to GitHub using either:
1. **GitHub App (Recommended for SaaS/Enterprise):** Granular permissions, organization-level installation, short-lived tokens.
2. **Personal Access Token (Dev / Prototyping):** Simple token with `repo` scope.

---

## 2. Registering a GitHub App

### Step 1: Create the App
1. Navigate to **GitHub Settings** -> **Developer Settings** -> **GitHub Apps** -> **New GitHub App**.
2. **Name:** `ReviewGuard-AI`
3. **Homepage URL:** `https://your-domain.com` (or `http://localhost:3000` for development).
4. **Webhook URL:** `https://your-domain.com/api/v1/webhooks/github`
5. **Webhook Secret:** Generate a strong secret and set `GITHUB_WEBHOOK_SECRET=<secret>` in your `.env`.

### Step 2: Configure Permissions
| Permission | Access | Rationale |
| :--- | :--- | :--- |
| **Pull Requests** | Read & Write | Required to read PR diffs and post inline advisory comments |
| **Repository Contents** | Read-Only | Required to fetch HEAD file content for accurate AST parsing |
| **Issues** | Read & Write | Optional: post review summary notifications to PR issue timeline |
| **Metadata** | Read-Only | Default required GitHub metadata |

### Step 3: Subscribe to Events
Under **Subscribe to events**, select:
- [x] **Pull request** (opened, synchronize, reopened)
- [x] **Pull request review comment** (optional, for conversation threading)

### Step 4: Generate Private Key & App ID
1. Note your **App ID** and copy it into `.env`: `GITHUB_APP_ID=<app-id>`.
2. Scroll to **Private keys** and click **Generate a private key**.
3. Save the downloaded `.pem` file to `backend/certs/github_app.pem`.
4. Set `GITHUB_APP_PRIVATE_KEY_PATH=backend/certs/github_app.pem` in `.env`.

### Step 5: Install on Repositories
1. In the GitHub App settings, click **Install App**.
2. Select target organization or repositories you wish ReviewGuard to monitor.

---

## 3. Alternative: Using a Personal Access Token (PAT)

For local development or private evaluation:
1. Generate a classic PAT or fine-grained token with `repo` scope.
2. Set `GITHUB_TOKEN=ghp_...` in `.env` or input it directly in the ReviewGuard **Settings** page in the web dashboard.
3. Add a webhook manually to your repository:
   - Payload URL: `http://<your-server-ip>:8000/api/v1/webhooks/github`
   - Content type: `application/json`
   - Secret: Match `GITHUB_WEBHOOK_SECRET`
   - Events: `Pull requests`
