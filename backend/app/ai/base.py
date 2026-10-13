import json
import re
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple
from app.schemas.finding import Finding, RawAIFinding, FindingCategory, FindingSeverity, FindingSource
from app.core.logging import logger


def extract_json_payload(raw_text: str) -> Dict[str, Any]:
    """Extracts and parses JSON from raw LLM output, handling markdown blocks and stray characters."""
    if not raw_text or not raw_text.strip():
        return {"summary": "", "findings": []}
        
    cleaned = raw_text.strip()
    
    # Check for markdown code fences: ```json ... ```
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned)
    if match:
        cleaned = match.group(1).strip()
        
    # Find outer bracket/brace if any prefix exists
    first_brace = cleaned.find('{')
    last_brace = cleaned.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        cleaned = cleaned[first_brace:last_brace + 1]

    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            return {"summary": "", "findings": data}
        if isinstance(data, dict):
            # Normalize findings key
            if "findings" not in data and "issues" in data:
                data["findings"] = data["issues"]
            elif "findings" not in data:
                data["findings"] = []
            return data
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to decode LLM JSON: {e}. Raw content: {raw_text[:200]}")
        
    return {"summary": "", "findings": []}


class BaseAIProvider(ABC):
    @abstractmethod
    async def review_diff(self, file_path: str, annotated_diff: str, pr_title: str = "", pr_description: str = "") -> Tuple[str, List[Finding]]:
        """Reviews the annotated diff and returns (summary_text, list_of_findings)."""
        pass
