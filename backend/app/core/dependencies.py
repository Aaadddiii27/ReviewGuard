from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.models.database import get_db, DBUser, DBWorkspace, DBWorkspaceMember
from app.core.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Optional[DBUser]:
    """Retrieves authenticated user from Bearer JWT if provided, or None."""
    if not credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(DBUser).filter(DBUser.id == user_id, DBUser.is_active == True).first()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> DBUser:
    """Enforces authentication and returns current user, or raises 401."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    user = db.query(DBUser).filter(DBUser.id == user_id, DBUser.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def verify_workspace_access(
    workspace_id: str,
    user: DBUser,
    db: Session,
    min_role: Optional[str] = None
) -> DBWorkspace:
    """Ensures user is a member of the workspace with sufficient role, preventing cross-tenant access."""
    membership = (
        db.query(DBWorkspaceMember)
        .filter(
            DBWorkspaceMember.workspace_id == workspace_id,
            DBWorkspaceMember.user_id == user.id
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this workspace"
        )
    
    if min_role and min_role.upper() == "ADMIN":
        if membership.role not in ("OWNER", "ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrative privileges required"
            )
            
    workspace = db.query(DBWorkspace).filter(DBWorkspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace
