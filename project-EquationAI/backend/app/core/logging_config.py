"""
EquationAI — Centralized Logging Configuration
Structured logging with request ID tracking, file + console output.
"""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from app.config import get_settings


def setup_logging() -> None:
    """Configure the application-wide logging system."""
    settings = get_settings()
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # ── Root Logger ──
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers to avoid duplicates on reload
    root_logger.handlers.clear()

    # ── Format ──
    log_format = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    detailed_format = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-25s | %(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # ── Console Handler ──
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(log_format)
    root_logger.addHandler(console_handler)

    # ── File Handler ──
    try:
        log_dir = os.path.dirname(settings.LOG_FILE)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)

        file_handler = RotatingFileHandler(
            settings.LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(detailed_format)
        root_logger.addHandler(file_handler)
    except Exception as e:
        root_logger.warning(f"Could not set up file logging: {e}")

    # ── Suppress noisy third-party loggers ──
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logging.getLogger("EquationAI").info(
        f"Logging initialized — level={settings.LOG_LEVEL}, env={settings.FASTAPI_ENV}"
    )


def get_logger(name: str) -> logging.Logger:
    """Get a named logger for a specific module."""
    return logging.getLogger(f"EquationAI.{name}")
