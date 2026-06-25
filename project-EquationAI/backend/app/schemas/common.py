"""
EquationAI — Common Schemas
Shared response models used across multiple endpoints.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standardized error response schema."""
    error: bool = True
    code: str
    message: str
    timestamp: str
    details: Optional[List[str]] = None


class SuccessResponse(BaseModel):
    """Generic success response."""
    message: str
    id: Optional[str] = None


class PaginationMeta(BaseModel):
    """Pagination metadata for list responses."""
    page: int
    per_page: int
    total: int
    total_pages: int
