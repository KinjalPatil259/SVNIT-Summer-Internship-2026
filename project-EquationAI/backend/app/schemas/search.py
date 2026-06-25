"""
EquationAI — Search Schemas
"""

from typing import List
from pydantic import BaseModel


class SemanticSearchRequest(BaseModel):
    query: str


class SemanticSearchResult(BaseModel):
    equation: str
    category: str
    similarity_score: float
    explanation: str


class SemanticSearchResponse(BaseModel):
    results: List[SemanticSearchResult]
