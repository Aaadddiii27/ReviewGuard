import httpx
from typing import List, Tuple
from app.ai.base import BaseAIProvider, extract_json_payload
from app.ai.prompts import SYSTEM_REVIEW_PROMPT, build_diff_user_prompt
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource
from app.core.config import settings
from app.core.logging import logger


class GeminiReviewProvider(BaseAIProvider):
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def review_diff(self, file_path: str, annotated_diff: str, pr_title: str = "", pr_description: str = "") -> Tuple[str, List[Finding]]:
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. Falling back or returning empty.")
            return "", []

        user_prompt = build_diff_user_prompt(file_path, annotated_diff, pr_title, pr_description)
        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"

        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_REVIEW_PROMPT}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        try:
            async with httpx.AsyncClient(timeout=45) as client:
                res = await client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                
            candidates = data.get("candidates", [])
            if not candidates:
                return "", []
                
            raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            parsed = extract_json_payload(raw_text)
            summary = parsed.get("summary", "")
            raw_findings = parsed.get("findings", [])

            validated: List[Finding] = []
            for item in raw_findings:
                if not isinstance(item, dict):
                    continue
                try:
                    cat_raw = str(item.get("category", "QUALITY")).upper()
                    category = FindingCategory(cat_raw) if cat_raw in FindingCategory.__members__ else FindingCategory.QUALITY

                    sev_raw = str(item.get("severity", "MEDIUM")).upper()
                    severity = FindingSeverity(sev_raw) if sev_raw in FindingSeverity.__members__ else FindingSeverity.MEDIUM

                    finding = Finding(
                        title=str(item.get("title", "Review Finding")),
                        category=category,
                        severity=severity,
                        confidence=float(item.get("confidence", 0.90)),
                        file=file_path,
                        line=item.get("line"),
                        start_line=item.get("start_line"),
                        end_line=item.get("end_line"),
                        description=str(item.get("description", "")),
                        why_it_matters=str(item.get("why_it_matters", "")),
                        recommendation=str(item.get("recommendation", "")),
                        evidence=item.get("evidence"),
                        source=FindingSource.AI
                    )
                    validated.append(finding)
                except Exception as ex:
                    logger.warning(f"Error parsing Gemini finding: {ex}")

            return summary, validated

        except Exception as e:
            logger.error(f"Gemini API review call failed for {file_path}: {e}")
            return "", []
