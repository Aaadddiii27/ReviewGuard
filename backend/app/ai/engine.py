from typing import List, Tuple
from app.ai.base import BaseAIProvider
from app.ai.ollama_provider import OllamaReviewProvider
from app.ai.gemini_provider import GeminiReviewProvider
from app.ai.mock_provider import MockReviewProvider
from app.core.config import settings
from app.schemas.finding import Finding
from app.core.logging import logger


class AIReviewEngine:
    def __init__(self, provider_name: str = None):
        name = (provider_name or settings.AI_PROVIDER).lower()
        self.provider_name = name
        
        if name == "gemini":
            self.provider = GeminiReviewProvider()
        elif name == "mock":
            self.provider = MockReviewProvider()
        else: # default ollama
            self.provider = OllamaReviewProvider()

    async def review_file_diff(
        self,
        file_path: str,
        annotated_diff: str,
        pr_title: str = "",
        pr_description: str = ""
    ) -> Tuple[str, List[Finding]]:
        """Reviews a single file diff using the active AI provider, with graceful fallback handling."""
        try:
            summary, findings = await self.provider.review_diff(file_path, annotated_diff, pr_title, pr_description)
            return summary, findings
        except Exception as e:
            logger.error(f"Error executing AI review with provider {self.provider_name}: {e}")
            # Fallback to mock if test environment
            if settings.ENVIRONMENT in ("test", "ci"):
                logger.info("Falling back to MockReviewProvider in test/ci environment.")
                return await MockReviewProvider().review_diff(file_path, annotated_diff, pr_title, pr_description)
            return "", []
