from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.database import get_db, DBFinding

router = APIRouter(prefix="/findings", tags=["Findings"])


@router.get("")
def list_findings(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    file_path: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Lists findings with optional filtering by severity, category, or status."""
    query = db.query(DBFinding)
    if category:
        query = query.filter(DBFinding.category == category.upper())
    if severity:
        query = query.filter(DBFinding.severity == severity.upper())
    if status:
        query = query.filter(DBFinding.status == status.upper())
    if file_path:
        query = query.filter(DBFinding.file.contains(file_path))

    findings = query.order_by(desc(DBFinding.created_at)).offset(offset).limit(limit).all()

    return [
        {
            "id": f.id,
            "review_id": f.review_id,
            "title": f.title,
            "category": f.category,
            "severity": f.severity,
            "confidence": f.confidence,
            "file": f.file,
            "line": f.line,
            "start_line": f.start_line,
            "end_line": f.end_line,
            "side": f.side,
            "description": f.description,
            "why_it_matters": f.why_it_matters,
            "recommendation": f.recommendation,
            "evidence": f.evidence,
            "fingerprint": f.fingerprint,
            "source": f.source,
            "status": f.status,
            "suppressed_by": f.suppressed_by,
            "similarity_score": f.similarity_score,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in findings
    ]
