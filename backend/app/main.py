from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import logger
from app.models.database import init_db, engine
from app.api.routes import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database schema
    logger.info("Initializing database schema...")
    init_db()
    logger.info("ReviewGuard backend service initialized successfully.")
    yield
    # Shutdown
    logger.info("ReviewGuard backend shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ReviewGuard: Autonomous AI-Assisted Pull Request Review System. Diff-aware, advisory, and deduplicated.",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Global structured request logging
    response = await call_next(request)
    return response


@app.get("/health", tags=["Health"])
def health():
    """Liveness probe."""
    return {
        "status": "healthy",
        "service": "reviewguard",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/ready", tags=["Health"])
def readiness():
    """Readiness probe verifying database connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1") if not settings.DATABASE_URL.startswith("sqlite") else None
        db_status = "connected"
    except Exception as e:
        logger.error(f"Readiness DB check failed: {e}")
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ready" if "unhealthy" not in db_status else "degraded",
        "database": db_status,
        "ai_provider": settings.AI_PROVIDER,
        "model": settings.OLLAMA_MODEL if settings.AI_PROVIDER == "ollama" else settings.GEMINI_MODEL
    }


# Include API routes under both /api/v1 and /api for versatility
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
