from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ──────────────────────────────────────────────
#  Upload & Similarity Models
# ──────────────────────────────────────────────

class SimilarityResult(BaseModel):
    id: str
    title: str
    latex: str
    confidence: float
    source: str

class UploadResponse(BaseModel):
    id: str
    latex: str
    mathml: str
    similarity_results: List[SimilarityResult]
    processing_time_ms: int
    extracted_equations: Optional[List[str]] = None
    extraction_method: Optional[str] = None


# ──────────────────────────────────────────────
#  Semantic Search Models
# ──────────────────────────────────────────────

class SemanticSearchRequest(BaseModel):
    query: str

class SemanticSearchResult(BaseModel):
    equation: str
    category: str
    similarity_score: float
    explanation: str

class SemanticSearchResponse(BaseModel):
    results: List[SemanticSearchResult]


# ──────────────────────────────────────────────
#  History Models
# ──────────────────────────────────────────────

class HistoryEntry(BaseModel):
    id: str
    latex: str
    mathml: str = ""
    source: str  # 'upload', 'converter', 'handwriting'
    fileName: Optional[str] = None
    timestamp: str

class HistoryCreateRequest(BaseModel):
    latex: str
    mathml: str = ""
    source: str  # 'upload', 'converter', 'handwriting'
    fileName: Optional[str] = None

class HistoryListResponse(BaseModel):
    entries: List[HistoryEntry]
    total: int


# ──────────────────────────────────────────────
#  Stats / Overview Models
# ──────────────────────────────────────────────

class DailyStatEntry(BaseModel):
    day: str
    count: int

class StatsResponse(BaseModel):
    total_equations: int
    upload_count: int
    converter_count: int
    handwriting_count: int
    active_formats: int
    weekly_stats: List[DailyStatEntry]


# ──────────────────────────────────────────────
#  Handwriting Recognition Models
# ──────────────────────────────────────────────

class HandwritingRequest(BaseModel):
    image: str  # base64-encoded PNG image from canvas

class HandwritingResponse(BaseModel):
    latex: str
    mathml: str
    processing_time_ms: int
