"""
EquationAI — File Service
Secure file upload handling, validation, sanitization, and storage management.
"""

import os
import re
import uuid
import time
import shutil
from typing import Optional
from fastapi import UploadFile
from app.config import get_settings
from app.core.exceptions import FileSizeError, FileTypeError
from app.core.logging_config import get_logger

logger = get_logger("file_service")
settings = get_settings()

# MIME type whitelist
MIME_WHITELIST = {
    "image/png", "image/jpeg", "image/jpg",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal and special characters from filename."""
    # Take only the basename
    filename = os.path.basename(filename)
    # Remove anything that isn't alphanumeric, dot, dash, or underscore
    filename = re.sub(r'[^\w\-.]', '_', filename)
    return filename


def _get_extension(filename: str) -> str:
    """Extract and lowercase the file extension."""
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


async def save_upload(file: UploadFile) -> tuple:
    """
    Validate, sanitize, and save an uploaded file.
    Returns (file_path: str, original_filename: str).
    Raises FileSizeError or FileTypeError on validation failure.
    """
    original_name = file.filename or "unknown"
    ext = _get_extension(original_name)

    # ── Extension validation ──
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise FileTypeError(ext, settings.ALLOWED_EXTENSIONS)

    # ── Read file bytes ──
    file_bytes = await file.read()

    # ── Size validation ──
    if len(file_bytes) > settings.max_file_size_bytes:
        raise FileSizeError(settings.MAX_FILE_SIZE_MB)

    # ── MIME type check (basic) ──
    content_type = file.content_type or ""
    if content_type and content_type not in MIME_WHITELIST:
        logger.warning(f"Suspicious MIME type: {content_type} for file: {original_name}")

    # ── Generate unique filename ──
    safe_name = _sanitize_filename(original_name)
    unique_name = f"{uuid.uuid4().hex[:12]}_{safe_name}"

    # ── Ensure upload directory exists ──
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    # ── Save file ──
    file_path = os.path.join(upload_dir, unique_name)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    logger.info(f"Saved upload: {unique_name} ({len(file_bytes)} bytes)")
    return file_path, original_name, file_bytes


def cleanup_old_files(max_age_hours: Optional[int] = None) -> int:
    """Remove uploaded files older than max_age_hours. Returns count deleted."""
    max_age = max_age_hours or settings.FILE_CLEANUP_TTL_HOURS
    upload_dir = settings.UPLOAD_DIR

    if not os.path.exists(upload_dir):
        return 0

    now = time.time()
    cutoff = now - (max_age * 3600)
    deleted = 0

    for filename in os.listdir(upload_dir):
        filepath = os.path.join(upload_dir, filename)
        if os.path.isfile(filepath):
            try:
                if os.path.getmtime(filepath) < cutoff:
                    os.remove(filepath)
                    deleted += 1
            except Exception as e:
                logger.error(f"Failed to delete old file {filename}: {e}")

    if deleted > 0:
        logger.info(f"Cleaned up {deleted} old files from {upload_dir}")
    return deleted


def delete_file(file_path: str) -> bool:
    """Delete a specific file. Returns True if successful."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
    except Exception as e:
        logger.error(f"Failed to delete file {file_path}: {e}")
    return False
