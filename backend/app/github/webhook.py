import hmac
import hashlib
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger


class WebhookValidator:
    @staticmethod
    def verify_signature(payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        """Verifies GitHub HMAC SHA-256 webhook signature."""
        secret = settings.GITHUB_WEBHOOK_SECRET
        if not secret:
            # If no secret configured, accept webhook (development mode)
            return True
            
        if not signature_header:
            return False
            
        sha_name, signature = signature_header.split("=")
        if sha_name != "sha256":
            return False
            
        mac = hmac.new(secret.encode("utf-8"), msg=payload_bytes, digestmod=hashlib.sha256)
        return hmac.compare_digest(mac.hexdigest(), signature)

    @staticmethod
    def parse_pr_event(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extracts PR parameters from GitHub pull_request webhook payload."""
        action = payload.get("action")
        if action not in ("opened", "synchronize", "reopened"):
            logger.info(f"Ignoring PR event action: {action}")
            return None

        pr = payload.get("pull_request")
        repo = payload.get("repository")

        if not pr or not repo:
            return None

        return {
            "action": action,
            "repository": repo.get("full_name"),
            "pr_number": pr.get("number"),
            "commit_sha": pr.get("head", {}).get("sha"),
            "pr_title": pr.get("title"),
            "pr_description": pr.get("body"),
            "author": pr.get("user", {}).get("login"),
            "html_url": pr.get("html_url"),
            "diff_url": pr.get("diff_url"),
        }
