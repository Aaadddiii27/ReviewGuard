from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import uuid
import hashlib


class FindingCategory(str, Enum):
    SECURITY = "SECURITY"
    BUG = "BUG"
    PERFORMANCE = "PERFORMANCE"
    QUALITY = "QUALITY"
    STYLE = "STYLE"


class FindingSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class FindingSource(str, Enum):
    AI = "AI"
    STATIC_BANDIT = "STATIC_BANDIT"
    STATIC_AST = "STATIC_AST"
    HYBRID = "HYBRID"


class FindingStatus(str, Enum):
    OPEN = "OPEN"
    SUPPRESSED = "SUPPRESSED"
    RESOLVED = "RESOLVED"


class Finding(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., description="Short, concise headline of the issue")
    category: FindingCategory = Field(..., description="Category: SECURITY, BUG, PERFORMANCE, QUALITY, STYLE")
    severity: FindingSeverity = Field(..., description="Severity level: CRITICAL, HIGH, MEDIUM, LOW")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    file: str = Field(..., description="Relative file path in repository")
    line: Optional[int] = Field(None, description="Primary line number of the issue in the new code")
    start_line: Optional[int] = Field(None, description="Start line for multi-line findings")
    end_line: Optional[int] = Field(None, description="End line for multi-line findings")
    side: str = Field(default="RIGHT", description="Diff side: RIGHT for added/modified lines")
    description: str = Field(..., description="Detailed description of what the problem is")
    why_it_matters: str = Field(..., description="Architectural or business impact of this issue")
    recommendation: str = Field(..., description="Clear actionable guidance or suggested fix")
    evidence: Optional[str] = Field(None, description="Code snippet demonstrating the issue")
    fingerprint: Optional[str] = Field(None, description="Deterministic hash for deduplication and tracking")
    source: FindingSource = Field(default=FindingSource.AI, description="Source: AI, STATIC_BANDIT, STATIC_AST, HYBRID")
    status: FindingStatus = Field(default=FindingStatus.OPEN, description="Status: OPEN, SUPPRESSED, RESOLVED")
    suppressed_by: Optional[str] = Field(None, description="ID of primary finding if suppressed as duplicate")
    similarity_score: Optional[float] = Field(None, description="Similarity score with the primary finding if duplicate")

    def generate_fingerprint(self) -> str:
        """Generates a deterministic hash representing this finding's core attributes."""
        raw = f"{self.file}:{self.line or 0}:{self.category.value}:{self.title.lower().strip()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def model_post_init(self, __context: Any) -> None:
        if not self.fingerprint:
            self.fingerprint = self.generate_fingerprint()


class RawAIFinding(BaseModel):
    """Raw format expected from LLM output before validation & normalization."""
    title: str
    category: str
    severity: str
    confidence: float = 0.85
    line: Optional[int] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    description: str
    why_it_matters: str
    recommendation: str
    evidence: Optional[str] = None
