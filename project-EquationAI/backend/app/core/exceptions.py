"""
EquationAI — Custom Exceptions & Global Error Handlers
Structured error responses for all API errors.
"""

from datetime import datetime, timezone
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from app.core.logging_config import get_logger

logger = get_logger("exceptions")


# ═══════════════════════════════════════════════════
#  Custom Exception Classes
# ═══════════════════════════════════════════════════

class AppException(Exception):
    """Base exception for all EquationAI application errors."""

    def __init__(self, message: str, code: str = "APP_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(AppException):
    """Raised when input validation fails."""

    def __init__(self, message: str, details: list = None):
        self.details = details or []
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422)


class NotFoundError(AppException):
    """Raised when a requested resource is not found."""

    def __init__(self, resource: str, identifier: str = ""):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} '{identifier}' not found"
        super().__init__(message=message, code="NOT_FOUND", status_code=404)


class AuthenticationError(AppException):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message=message, code="AUTH_ERROR", status_code=401)


class AuthorizationError(AppException):
    """Raised when the user lacks permission."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message=message, code="FORBIDDEN", status_code=403)


class ProcessingError(AppException):
    """Raised when AI model processing or conversion fails."""

    def __init__(self, message: str, operation: str = "processing"):
        super().__init__(
            message=f"{operation.capitalize()} failed: {message}",
            code="PROCESSING_ERROR",
            status_code=500,
        )


class FileSizeError(AppException):
    """Raised when uploaded file exceeds size limit."""

    def __init__(self, max_size_mb: int):
        super().__init__(
            message=f"File size exceeds maximum allowed size of {max_size_mb}MB",
            code="FILE_TOO_LARGE",
            status_code=413,
        )


class FileTypeError(AppException):
    """Raised when uploaded file type is not supported."""

    def __init__(self, file_type: str, allowed: list):
        super().__init__(
            message=f"File type '{file_type}' is not supported. Allowed: {', '.join(allowed)}",
            code="UNSUPPORTED_FILE_TYPE",
            status_code=400,
        )


# ═══════════════════════════════════════════════════
#  Structured Error Response Builder
# ═══════════════════════════════════════════════════

def _build_error_response(
    status_code: int,
    code: str,
    message: str,
    details: list = None,
) -> dict:
    """Build a standardized error response body."""
    response = {
        "error": True,
        "code": code,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if details:
        response["details"] = details
    return response


# ═══════════════════════════════════════════════════
#  Register Global Exception Handlers
# ═══════════════════════════════════════════════════

def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(
            f"AppException: {exc.code} — {exc.message} — {request.method} {request.url.path}"
        )
        details = getattr(exc, "details", None)
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_response(exc.status_code, exc.code, exc.message, details),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.warning(
            f"HTTPException: {exc.status_code} — {exc.detail} — {request.method} {request.url.path}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_build_error_response(
                exc.status_code,
                "HTTP_ERROR",
                str(exc.detail),
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled exception: {type(exc).__name__}: {str(exc)} — "
            f"{request.method} {request.url.path}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content=_build_error_response(
                500,
                "INTERNAL_ERROR",
                "An unexpected internal error occurred. Please try again later.",
            ),
        )
