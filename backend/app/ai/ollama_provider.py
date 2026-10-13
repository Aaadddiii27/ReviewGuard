import httpx
from typing import List, Tuple
from app.ai.base import BaseAIProvider, extract_json_payload
from app.ai.prompts import SYSTEM_REVIEW_PROMPT, build_diff_user_prompt
from app.schemas.finding import Finding, FindingCategory, FindingSeverity, FindingSource
from app.core.config import settings
from app.core.logging import logger


class OllamaReviewProvider(BaseAIProvider):
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT_SECONDS

    async def review_diff(self, file_path: str, annotated_diff: str, pr_title: str = "", pr_description: str = "") -> Tuple[str, List[Finding]]:
        user_prompt = build_diff_user_prompt(file_path, annotated_diff, pr_title, pr_description)
        
        payload = {
            "model": self.model,
            "system": SYSTEM_REVIEW_PROMPT,
            "prompt": user_prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.9
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                res.raise_for_status()
                data = res.json()
                raw_response = data.get("response", "")
                
            parsed = extract_json_payload(raw_response)
            summary = parsed.get("summary", "")
            raw_findings = parsed.get("findings", [])
            
            validated_findings: List[Finding] = []
            for item in raw_findings:
                if not isinstance(item, dict):
                    continue
                try:
                    # Category normalization
                    cat_raw = str(item.get("category", "QUALITY")).upper()
                    try:
                        category = FindingCategory(cat_raw)
                    except ValueError:
                        category = FindingCategory.QUALITY

                    # Severity normalization
                    sev_raw = str(item.get("severity", "MEDIUM")).upper()
                    try:
                        severity = FindingSeverity(sev_raw)
                    except ValueError:
                        severity = FindingSeverity.MEDIUM

                    title_lower = str(item.get("title", "")).lower()
                    desc_lower = str(item.get("description", "")).lower()

                    # Guard against AI model returning praise / security confirmation as a defect
                    if any(phrase in title_lower for phrase in ("secure parameterized", "safe query", "properly parameterized", "safe from sql", "secure implementation", "clean implementation")) or \
                       ("safe from" in desc_lower and "prevent" in desc_lower and "secure" in desc_lower and "vulnerability" not in desc_lower):
                        logger.info(f"Filtered out AI positive praise / confirmation: {title_lower}")
                        continue

                    finding = Finding(
                        title=str(item.get("title", "Review Finding")),
                        category=category,
                        severity=severity,
                        confidence=float(item.get("confidence", 0.85)),
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
                    validated_findings.append(finding)
                except Exception as ex:
                    logger.warning(f"Error parsing individual AI finding: {ex}")

            return summary, validated_findings

        except Exception as e:
            logger.error(f"Ollama review call failed for {file_path}: {e}")
            raise RuntimeError(f"Ollama call failed: {e}") from e
