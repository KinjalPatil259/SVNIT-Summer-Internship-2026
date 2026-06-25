"""
EquationAI — Handwriting Schemas
"""

from pydantic import BaseModel


class HandwritingRequest(BaseModel):
    image: str  # base64-encoded PNG image from canvas


class HandwritingResponse(BaseModel):
    latex: str
    mathml: str
    processing_time_ms: int
