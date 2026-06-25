"""
EquationAI — Conversion Schemas
"""

from typing import Optional, List
from pydantic import BaseModel


class LatexToMathmlRequest(BaseModel):
    latex: str


class LatexToMathmlResponse(BaseModel):
    mathml: str
    processing_time_ms: int
    validation: Optional["ValidationResult"] = None


class MathmlToLatexRequest(BaseModel):
    mathml: str


class MathmlToLatexResponse(BaseModel):
    latex: str
    processing_time_ms: int


class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggested_fix: Optional[str] = None


# Resolve forward references
LatexToMathmlResponse.model_rebuild()
