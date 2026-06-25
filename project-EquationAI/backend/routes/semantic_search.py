from fastapi import APIRouter, HTTPException
from models.schemas import SemanticSearchRequest, SemanticSearchResponse
from services.semantic_search_service import SemanticSearchService

router = APIRouter(prefix="/api", tags=["Semantic Search"])

@router.post("/semantic-search", response_model=SemanticSearchResponse)
async def query_semantic_equations(request: SemanticSearchRequest):
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Search query parameter cannot be empty.")
    
    try:
        response = await SemanticSearchService.perform_search(request.query)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Semantic search query execution encountered an error: {str(e)}"
        )
