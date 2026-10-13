import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db, DBUser, DBWorkspace, DBWorkspaceMember, DBSettings
from app.core.dependencies import get_current_user, verify_workspace_access

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


class WorkspaceCreate(BaseModel):
    name: str
    slug: Optional[str] = None


class MemberResponse(BaseModel):
    user_id: str
    email: str
    full_name: Optional[str] = None
    role: str


class WorkspaceDetail(BaseModel):
    id: str
    name: str
    slug: str
    owner_id: str
    members: List[MemberResponse]


@router.get("", response_model=List[dict])
def list_user_workspaces(user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lists all workspaces the current user belongs to."""
    memberships = db.query(DBWorkspaceMember).filter(DBWorkspaceMember.user_id == user.id).all()
    results = []
    for m in memberships:
        ws = db.query(DBWorkspace).filter(DBWorkspace.id == m.workspace_id).first()
        if ws:
            results.append({
                "id": ws.id,
                "name": ws.name,
                "slug": ws.slug,
                "role": m.role,
                "created_at": ws.created_at.isoformat() if ws.created_at else None
            })
    return results


@router.post("", response_model=dict)
def create_workspace(req: WorkspaceCreate, user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creates a new workspace and makes the authenticated user its OWNER."""
    slug = req.slug or req.name.lower().replace(" ", "-")[:30]
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while db.query(DBWorkspace).filter(DBWorkspace.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    ws_id = str(uuid.uuid4())
    workspace = DBWorkspace(
        id=ws_id,
        name=req.name,
        slug=slug,
        owner_id=user.id
    )
    db.add(workspace)

    member = DBWorkspaceMember(
        id=str(uuid.uuid4()),
        workspace_id=ws_id,
        user_id=user.id,
        role="OWNER"
    )
    db.add(member)

    # Initialize settings
    settings_rec = DBSettings(
        id=str(uuid.uuid4()),
        workspace_id=ws_id,
        ai_provider="ollama",
        auto_review_enabled=True,
        post_comments_to_github=False,
        severity_threshold="LOW",
        deduplication_threshold=0.78
    )
    db.add(settings_rec)

    db.commit()
    return {
        "id": workspace.id,
        "name": workspace.name,
        "slug": workspace.slug,
        "role": "OWNER"
    }


@router.get("/{workspace_id}", response_model=WorkspaceDetail)
def get_workspace_details(workspace_id: str, user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieves workspace details and team members with cross-tenant isolation enforcement."""
    ws = verify_workspace_access(workspace_id, user, db)
    memberships = db.query(DBWorkspaceMember).filter(DBWorkspaceMember.workspace_id == workspace_id).all()
    members_data = []
    for m in memberships:
        u = db.query(DBUser).filter(DBUser.id == m.user_id).first()
        if u:
            members_data.append(MemberResponse(
                user_id=u.id,
                email=u.email,
                full_name=u.full_name,
                role=m.role
            ))
    return WorkspaceDetail(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        owner_id=ws.owner_id,
        members=members_data
    )
