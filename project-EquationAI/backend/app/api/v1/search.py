"""
EquationAI — Semantic Search Route
"""

from fastapi import APIRouter, HTTPException
from app.schemas.search import SemanticSearchRequest, SemanticSearchResponse
from app.services.search_service import SearchService
from app.core.exceptions import ValidationError

router = APIRouter(tags=["Semantic Search"])


@router.post("/semantic-search", response_model=SemanticSearchResponse)
async def query_semantic_equations(request: SemanticSearchRequest):
    """Search for mathematically similar equations using semantic similarity."""
    if not request.query or not request.query.strip():
        raise ValidationError("Search query cannot be empty.")

    response = await SearchService.semantic_search(request.query)
    return response
