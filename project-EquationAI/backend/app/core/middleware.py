"""
EquationAI — Middleware
Request logging, timing, and request ID generation.
"""

import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.logging_config import get_logger

logger = get_logger("middleware")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Generates a unique request ID for every incoming request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every request with method, path, status code, and duration."""

    # Paths to skip logging (health checks, docs, static)
    SKIP_PATHS = {"/docs", "/redoc", "/openapi.json", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip noisy paths
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        start_time = time.time()
        request_id = getattr(request.state, "request_id", "unknown")

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                f"[{request_id}] {request.method} {request.url.path} — "
                f"EXCEPTION after {duration_ms}ms: {type(exc).__name__}: {str(exc)}"
            )
            raise

        duration_ms = int((time.time() - start_time) * 1000)

        # Add timing header
        response.headers["X-Process-Time"] = f"{duration_ms}ms"

        # Log level based on status code
        status = response.status_code
        if status >= 500:
            logger.error(
                f"[{request_id}] {request.method} {request.url.path} → {status} ({duration_ms}ms)"
            )
        elif status >= 400:
            logger.warning(
                f"[{request_id}] {request.method} {request.url.path} → {status} ({duration_ms}ms)"
            )
        else:
            logger.info(
                f"[{request_id}] {request.method} {request.url.path} → {status} ({duration_ms}ms)"
            )

        return response
