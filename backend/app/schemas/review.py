from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
from .finding import Finding, FindingSeverity


class SeverityDistribution(BaseModel):
    CRITICAL: int = 0
    HIGH: int = 0
    MEDIUM: int = 0
    LOW: int = 0


class ReviewSummary(BaseModel):
    files_changed_count: int = 0
    findings_count: int = 0
    raw_findings_count: int = 0
    duplicates_suppressed: int = 0
    severity_distribution: SeverityDistribution = Field(default_factory=SeverityDistribution)
    summary_text: str = ""
    key_concerns: List[str] = Field(default_factory=list)
    human_approval_reminder: str = "⚠️ AI-generated advisory feedback. Human approval is strictly required before merge."
    review_duration_ms: int = 0
    stage_latencies: Dict[str, int] = Field(default_factory=dict)
    error_details: Optional[str] = None
    engine_used: str = "qwen2.5-coder:1.5b"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ReviewRequest(BaseModel):
    repository: str = Field(..., description="Repository full name, e.g., 'owner/repo'")
    pr_number: Optional[int] = None
    commit_sha: Optional[str] = None
    pr_title: Optional[str] = None
    pr_description: Optional[str] = None
    diff_text: Optional[str] = None
    post_comments_to_github: bool = Field(default=False, description="Whether to post review comments back to GitHub PR")
    github_token: Optional[str] = None


class ChangedFile(BaseModel):
    filename: str
    old_filename: Optional[str] = None
    status: str = "modified" # added, modified, removed
    additions: int = 0
    deletions: int = 0
    changes: int = 0
    patch: Optional[str] = None


class ReviewResult(BaseModel):
    id: str
    repository: str
    pr_number: Optional[int] = None
    commit_sha: Optional[str] = None
    pr_title: Optional[str] = None
    status: str = "COMPLETED" # COMPLETED, PARTIAL, FAILED
    error_details: Optional[str] = None
    summary: ReviewSummary
    findings: List[Finding] = Field(default_factory=list)
    suppressed_findings: List[Finding] = Field(default_factory=list)
    files_reviewed: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
