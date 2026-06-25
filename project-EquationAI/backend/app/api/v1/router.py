"""
EquationAI — V1 Router Aggregator
Mounts all v1 API route modules under /api/v1.
"""

from fastapi import APIRouter
from app.api.v1 import auth, upload, convert, handwriting, search, history, export, stats, health

router = APIRouter(prefix="/api/v1")

# Mount all sub-routers
router.include_router(auth.router)
router.include_router(upload.router)
router.include_router(convert.router)
router.include_router(handwriting.router)
router.include_router(search.router)
router.include_router(history.router)
router.include_router(export.router)
router.include_router(stats.router)
router.include_router(health.router)
