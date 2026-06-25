"""
EquationAI — Health Check Routes
System health and readiness endpoints.
"""

import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.ocr_service import ocr_service
from app.config import get_settings

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health")
async def health_check():
    """Basic health check — verifies the API is responsive."""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "environment": settings.FASTAPI_ENV,
        "timestamp": time.time(),
    }


@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check — includes database, OCR model, and search engine status."""
    checks = {
        "api": "ok",
        "database": "unknown",
        "ocr_model": "not_loaded",
        "search_engine": "unknown",
    }

    # Database check
    try:
        db.execute("SELECT 1" if hasattr(db, 'execute') else None)
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)[:100]}"

    # OCR model check
    checks["ocr_model"] = "loaded" if ocr_service.is_loaded else "not_loaded (lazy)"

    # Search engine check
    try:
        from app.vector_db.chroma_manager import chroma_manager
        checks["search_engine"] = "chromadb" if chroma_manager.is_available else "fallback"
    except Exception:
        checks["search_engine"] = "unavailable"

    all_ok = all(v in ("ok", "loaded", "not_loaded (lazy)", "chromadb", "fallback") for v in checks.values())

    return {
        "status": "healthy" if all_ok else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.FASTAPI_ENV,
        "checks": checks,
        "timestamp": time.time(),
    }
