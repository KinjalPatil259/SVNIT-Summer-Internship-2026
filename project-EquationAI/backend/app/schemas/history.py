"""
EquationAI — History Schemas
"""

from typing import List, Optional
from pydantic import BaseModel
from app.schemas.common import PaginationMeta


class HistoryEntry(BaseModel):
    id: str
    latex: str
    mathml: str = ""
    source: str
    fileName: Optional[str] = None
    timestamp: str
    processing_time_ms: Optional[int] = None
    status: Optional[str] = None
    category: Optional[str] = None


class HistoryCreateRequest(BaseModel):
    latex: str
    mathml: str = ""
    source: str  # 'upload', 'converter', 'handwriting'
    fileName: Optional[str] = None


class HistoryListResponse(BaseModel):
    entries: List[HistoryEntry]
    total: int
    pagination: Optional[PaginationMeta] = None
