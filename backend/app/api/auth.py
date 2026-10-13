import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.database import get_db, DBUser, DBWorkspace, DBWorkspaceMember, DBSettings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    workspace_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    is_active: bool


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    role: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    workspaces: List[WorkspaceResponse]
    active_workspace: Optional[WorkspaceResponse] = None


@router.post("/register", response_model=AuthResponse)
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user and automatically creates their personal default workspace."""
    existing = db.query(DBUser).filter(DBUser.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user_id = str(uuid.uuid4())
    user = DBUser(
        id=user_id,
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name or req.email.split("@")[0].capitalize(),
        is_active=True
    )
    db.add(user)

    # Create default workspace
    ws_id = str(uuid.uuid4())
    ws_name = req.workspace_name or f"{user.full_name}'s Workspace"
    ws_slug = f"ws-{user_id[:8]}"
    workspace = DBWorkspace(
        id=ws_id,
        name=ws_name,
        slug=ws_slug,
        owner_id=user_id
    )
    db.add(workspace)

    member = DBWorkspaceMember(
        id=str(uuid.uuid4()),
        workspace_id=ws_id,
        user_id=user_id,
        role="OWNER"
    )
    db.add(member)

    # Initialize default settings for workspace
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
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    ws_resp = WorkspaceResponse(id=workspace.id, name=workspace.name, slug=workspace.slug, role="OWNER")

    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active),
        workspaces=[ws_resp],
        active_workspace=ws_resp
    )


@router.post("/login", response_model=AuthResponse)
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates user credentials and returns JWT access token with associated workspaces."""
    user = db.query(DBUser).filter(DBUser.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended."
        )

    # Query user's workspaces
    memberships = db.query(DBWorkspaceMember).filter(DBWorkspaceMember.user_id == user.id).all()
    workspaces = []
    for m in memberships:
        ws = db.query(DBWorkspace).filter(DBWorkspace.id == m.workspace_id).first()
        if ws:
            workspaces.append(WorkspaceResponse(id=ws.id, name=ws.name, slug=ws.slug, role=m.role))

    token = create_access_token({"sub": user.id, "email": user.email})
    active_ws = workspaces[0] if workspaces else None

    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active),
        workspaces=workspaces,
        active_workspace=active_ws
    )


@router.get("/me", response_model=AuthResponse)
def get_current_user_profile(user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns profile and workspace details for the authenticated user."""
    memberships = db.query(DBWorkspaceMember).filter(DBWorkspaceMember.user_id == user.id).all()
    workspaces = []
    for m in memberships:
        ws = db.query(DBWorkspace).filter(DBWorkspace.id == m.workspace_id).first()
        if ws:
            workspaces.append(WorkspaceResponse(id=ws.id, name=ws.name, slug=ws.slug, role=m.role))

    token = create_access_token({"sub": user.id, "email": user.email})
    active_ws = workspaces[0] if workspaces else None

    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active),
        workspaces=workspaces,
        active_workspace=active_ws
    )
