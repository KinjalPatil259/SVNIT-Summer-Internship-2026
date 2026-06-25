"""
EquationAI — Application Configuration
Environment-based configuration using Pydantic Settings.
"""

import os
from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    # ── Application ──
    APP_NAME: str = "EquationAI"
    APP_VERSION: str = "2.0.0"
    FASTAPI_ENV: str = "development"
    DEBUG: bool = True
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # ── CORS ──
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Database ──
    DATABASE_URL: str = "sqlite:///./equations.db"

    # ── JWT Authentication ──
    SECRET_KEY: str = "equationai-secret-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── File Storage ──
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: List[str] = ["png", "jpg", "jpeg", "pdf", "docx"]
    FILE_CLEANUP_TTL_HOURS: int = 24

    # ── Vector DB ──
    CHROMA_DB_PATH: str = "./vector_db/data"
    CHROMA_COLLECTION_NAME: str = "equations_collection"

    # ── Logging ──
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/equationai.log"

    # ── OCR Model ──
    OCR_MODEL_LAZY_LOAD: bool = True

    @property
    def is_development(self) -> bool:
        return self.FASTAPI_ENV.lower() == "development"

    @property
    def is_production(self) -> bool:
        return self.FASTAPI_ENV.lower() == "production"

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — reloads only on process restart."""
    return Settings()
