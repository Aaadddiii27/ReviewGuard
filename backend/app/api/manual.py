import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.schemas.review import ReviewRequest, ReviewResult
from app.review.orchestrator import ReviewOrchestrator
from app.core.logging import logger

router = APIRouter(prefix="/manual", tags=["Manual Code Review"])


class ManualSnippetRequest(BaseModel):
    filename: str = "snippet.py"
    code: str
    repository_label: Optional[str] = "manual/sandbox"
    ai_provider: Optional[str] = None


@router.post("/snippet", response_model=ReviewResult)
async def review_manual_snippet(
    payload: ManualSnippetRequest,
    db: Session = Depends(get_db)
):
    """Reviews pasted code snippets without requiring GitHub integration."""
    if not payload.code or not payload.code.strip():
        raise HTTPException(status_code=400, detail="Code snippet cannot be empty.")

    # Construct synthetic unified diff representing newly added code
    lines = payload.code.splitlines()
    diff_lines = [
        f"diff --git a/{payload.filename} b/{payload.filename}",
        "new file mode 100644",
        "--- /dev/null",
        f"+++ b/{payload.filename}",
        f"@@ -0,0 +1,{len(lines)} @@"
    ]
    for line in lines:
        diff_lines.append(f"+{line}")
    synthetic_diff = "\n".join(diff_lines)

    req = ReviewRequest(
        repository=payload.repository_label or "manual/snippet",
        pr_title=f"Manual review: {payload.filename}",
        diff_text=synthetic_diff
    )

    orchestrator = ReviewOrchestrator(ai_provider=payload.ai_provider)
    result = await orchestrator.execute_review(req, db=db)
    return result


@router.post("/upload", response_model=ReviewResult)
async def review_uploaded_file(
    file: UploadFile = File(...),
    ai_provider: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Reviews an uploaded source code or diff/patch file."""
    content_bytes = await file.read()
    if len(content_bytes) > 2 * 1024 * 1024: # 2MB limit
        raise HTTPException(status_code=400, detail="Uploaded file exceeds 2MB limit.")

    try:
        content_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid UTF-8 text file.")

    filename = file.filename or "uploaded_code.py"
    
    # Check if uploaded file is already a unified diff / patch
    if filename.endswith(".diff") or filename.endswith(".patch") or content_text.startswith("diff --git"):
        diff_text = content_text
    else:
        # Construct synthetic diff for single source file
        lines = content_text.splitlines()
        diff_lines = [
            f"diff --git a/{filename} b/{filename}",
            "new file mode 100644",
            "--- /dev/null",
            f"+++ b/{filename}",
            f"@@ -0,0 +1,{len(lines)} @@"
        ]
        for line in lines:
            diff_lines.append(f"+{line}")
        diff_text = "\n".join(diff_lines)

    req = ReviewRequest(
        repository=f"manual/{filename}",
        pr_title=f"Manual file review: {filename}",
        diff_text=diff_text
    )

    orchestrator = ReviewOrchestrator(ai_provider=ai_provider)
    result = await orchestrator.execute_review(req, db=db)
    return result
