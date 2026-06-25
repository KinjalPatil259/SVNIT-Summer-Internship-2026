"""
EquationAI — Application Factory
FastAPI app creation with middleware, routers, lifecycle, and backward compatibility.
"""
import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.database import create_tables, SessionLocal
from app.core.logging_config import setup_logging, get_logger
from app.core.exceptions import register_exception_handlers
from app.core.middleware import RequestIDMiddleware, RequestLoggingMiddleware
from app.api.v1.router import router as v1_router

settings = get_settings()
logger = get_logger("main")


# ═══════════════════════════════════════════════════
#  Application Lifespan (Startup / Shutdown)
# ═══════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events for the application."""
    # ── STARTUP ──
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} ({settings.FASTAPI_ENV})")

    # Create database tables
    create_tables()
    logger.info("Database tables created/verified.")

    # Migrate legacy history if exists
    try:
        from app.services.history_service import migrate_legacy_history
        db = SessionLocal()
        try:
            migrated = migrate_legacy_history(db)
            if migrated > 0:
                logger.info(f"Migrated {migrated} legacy history entries.")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Legacy history migration skipped: {e}")

    # Ensure upload directory exists
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs("logs", exist_ok=True)

    logger.info("Application startup complete.")

    yield  # ── Application running ──

    # ── SHUTDOWN ──
    logger.info("Application shutting down...")

    # Cleanup old uploaded files
    try:
        from app.services.file_service import cleanup_old_files
        cleaned = cleanup_old_files()
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} old uploaded files.")
    except Exception:
        pass

    logger.info("Shutdown complete.")


# ═══════════════════════════════════════════════════
#  Create FastAPI Application
# ═══════════════════════════════════════════════════

def create_app() -> FastAPI:
    """Factory function to create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.APP_NAME,
        description=(
            "AI-Powered Mathematical Equation Processing Platform. "
            "Upload images, convert between LaTeX and MathML, recognize handwriting, "
            "and search equations semantically."
        ),
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS Middleware ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS + ["*"],  # Allow all in dev
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Custom Middleware ──
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # ── Exception Handlers ──
    register_exception_handlers(app)

    # ── V1 API Routes ──
    app.include_router(v1_router)

    # ═══════════════════════════════════════════════════
    #  Backward-Compatible Route Aliases
    #  (Preserves /api/* endpoints from old main.py)
    # ═══════════════════════════════════════════════════

    # Import v1 route handlers directly for aliasing
    from app.api.v1 import upload as upload_mod
    from app.api.v1 import convert as convert_mod
    from app.api.v1 import handwriting as hw_mod
    from app.api.v1 import search as search_mod
    from app.api.v1 import history as history_mod
    from app.api.v1 import stats as stats_mod
    from app.api.v1 import health as health_mod

    # Legacy compatible router
    from fastapi import APIRouter
    legacy_router = APIRouter(prefix="/api", tags=["Legacy (Backward Compatible)"])

    # Health
    legacy_router.add_api_route("/health", health_mod.health_check, methods=["GET"])
    legacy_router.add_api_route("/health/detailed", health_mod.detailed_health_check, methods=["GET"])

    # Upload
    legacy_router.add_api_route("/upload", upload_mod.process_equation_upload, methods=["POST"])

    # Conversion
    legacy_router.add_api_route(
        "/convert/latex-to-mathml",
        convert_mod.convert_latex_to_mathml_endpoint,
        methods=["POST"],
    )
    legacy_router.add_api_route(
        "/convert/mathml-to-latex",
        convert_mod.convert_mathml_to_latex_endpoint,
        methods=["POST"],
    )

    # Handwriting
    legacy_router.add_api_route(
        "/handwriting/recognize",
        hw_mod.recognize_handwriting,
        methods=["POST"],
    )

    # Semantic Search
    legacy_router.add_api_route(
        "/semantic-search",
        search_mod.query_semantic_equations,
        methods=["POST"],
    )

    # History
    legacy_router.add_api_route("/history", history_mod.get_history, methods=["GET"])
    legacy_router.add_api_route("/history", history_mod.create_history_entry, methods=["POST"])
    legacy_router.add_api_route("/history/{entry_id}", history_mod.delete_history_entry, methods=["DELETE"])
    legacy_router.add_api_route("/history", history_mod.clear_all_history, methods=["DELETE"])

    # Stats
    legacy_router.add_api_route("/stats", stats_mod.get_stats, methods=["GET"])

    app.include_router(legacy_router)

    return app


# ── Create the app instance ──
app = create_app()
