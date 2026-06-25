"""
EquationAI — Upload Schemas
"""

from typing import List, Optional
from pydantic import BaseModel


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
    validation: Optional["ValidationResult"] = None
    extracted_equations: Optional[List[str]] = None
    extraction_method: Optional[str] = None  # "text", "ocr", or "hybrid"


class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggested_fix: Optional[str] = None


# Resolve forward reference
UploadResponse.model_rebuild()
