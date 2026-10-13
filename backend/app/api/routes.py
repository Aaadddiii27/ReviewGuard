from fastapi import APIRouter
from app.api.reviews import router as reviews_router
from app.api.analytics import router as analytics_router
from app.api.findings import router as findings_router
from app.api.repos import router as repos_router
from app.api.webhooks import router as webhooks_router

api_router = APIRouter()

api_router.include_router(reviews_router)
api_router.include_router(analytics_router)
api_router.include_router(findings_router)
api_router.include_router(repos_router)
api_router.include_router(webhooks_router)
