import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.database import get_db, DBSettings, DBWorkspace
from app.core.dependencies import get_current_user_optional

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsUpdate(BaseModel):
    workspace_id: Optional[str] = None
    ai_provider: Optional[str] = Field("ollama", description="ollama, gemini, or mock")
    auto_review_enabled: Optional[bool] = True
    post_comments_to_github: Optional[bool] = False
    severity_threshold: Optional[str] = Field("LOW", description="CRITICAL, HIGH, MEDIUM, LOW")
    deduplication_threshold: Optional[float] = Field(0.78, ge=0.0, le=1.0)


class SettingsResponse(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    ai_provider: str
    auto_review_enabled: bool
    post_comments_to_github: bool
    severity_threshold: str
    deduplication_threshold: float
    updated_at: Optional[str] = None


@router.get("", response_model=SettingsResponse)
def get_settings(workspace_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves persisted settings for the requested workspace, or global default."""
    settings_rec = None
    if workspace_id:
        settings_rec = db.query(DBSettings).filter(DBSettings.workspace_id == workspace_id).first()
    
    if not settings_rec:
        # Fall back to first available or create default
        settings_rec = db.query(DBSettings).first()

    if not settings_rec:
        # Create global default row
        settings_rec = DBSettings(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id or "default",
            ai_provider="ollama",
            auto_review_enabled=True,
            post_comments_to_github=False,
            severity_threshold="LOW",
            deduplication_threshold=0.78
        )
        db.add(settings_rec)
        db.commit()
        db.refresh(settings_rec)

    return SettingsResponse(
        id=settings_rec.id,
        workspace_id=settings_rec.workspace_id,
        ai_provider=settings_rec.ai_provider,
        auto_review_enabled=settings_rec.auto_review_enabled,
        post_comments_to_github=settings_rec.post_comments_to_github,
        severity_threshold=settings_rec.severity_threshold,
        deduplication_threshold=settings_rec.deduplication_threshold,
        updated_at=settings_rec.updated_at.isoformat() if settings_rec.updated_at else None
    )


@router.put("", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    """Persists updated configuration into the database."""
    settings_rec = None
    if payload.workspace_id:
        settings_rec = db.query(DBSettings).filter(DBSettings.workspace_id == payload.workspace_id).first()
    
    if not settings_rec:
        settings_rec = db.query(DBSettings).first()

    if not settings_rec:
        settings_rec = DBSettings(
            id=str(uuid.uuid4()),
            workspace_id=payload.workspace_id or "default",
            ai_provider=payload.ai_provider or "ollama",
            auto_review_enabled=payload.auto_review_enabled if payload.auto_review_enabled is not None else True,
            post_comments_to_github=payload.post_comments_to_github if payload.post_comments_to_github is not None else False,
            severity_threshold=payload.severity_threshold or "LOW",
            deduplication_threshold=payload.deduplication_threshold if payload.deduplication_threshold is not None else 0.78
        )
        db.add(settings_rec)
    else:
        if payload.ai_provider is not None:
            settings_rec.ai_provider = payload.ai_provider
        if payload.auto_review_enabled is not None:
            settings_rec.auto_review_enabled = payload.auto_review_enabled
        if payload.post_comments_to_github is not None:
            settings_rec.post_comments_to_github = payload.post_comments_to_github
        if payload.severity_threshold is not None:
            settings_rec.severity_threshold = payload.severity_threshold
        if payload.deduplication_threshold is not None:
            settings_rec.deduplication_threshold = payload.deduplication_threshold

    db.commit()
    db.refresh(settings_rec)

    return SettingsResponse(
        id=settings_rec.id,
        workspace_id=settings_rec.workspace_id,
        ai_provider=settings_rec.ai_provider,
        auto_review_enabled=settings_rec.auto_review_enabled,
        post_comments_to_github=settings_rec.post_comments_to_github,
        severity_threshold=settings_rec.severity_threshold,
        deduplication_threshold=settings_rec.deduplication_threshold,
        updated_at=settings_rec.updated_at.isoformat() if settings_rec.updated_at else None
    )
