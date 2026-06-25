"""
EquationAI — Search Service
Orchestrates semantic equation search via ChromaDB manager.
"""

import time
from app.core.logging_config import get_logger
from app.schemas.search import SemanticSearchResponse, SemanticSearchResult

logger = get_logger("search_service")


class SearchService:
    """Orchestrates search across ChromaDB and any future search backends."""

    @staticmethod
    def get_chroma_manager():
        """Lazy import to avoid circular dependency."""
        from app.vector_db.chroma_manager import chroma_manager
        return chroma_manager

    @staticmethod
    async def semantic_search(query: str, limit: int = 4) -> SemanticSearchResponse:
        """Perform a semantic search for equations matching the query."""
        start_time = time.time()
        logger.info(f"Search query: '{query}'")

        manager = SearchService.get_chroma_manager()
        raw_results = manager.search(query, limit=limit)

        results = [
            SemanticSearchResult(
                equation=r["equation"],
                category=r["category"],
                similarity_score=r["similarity_score"],
                explanation=r["explanation"],
            )
            for r in raw_results
        ]

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.info(f"Search completed in {elapsed_ms}ms — {len(results)} results")

        return SemanticSearchResponse(results=results)

    @staticmethod
    def index_equation(latex: str, category: str, explanation: str, tags: list = None):
        """Index a new equation into the search engine."""
        try:
            manager = SearchService.get_chroma_manager()
            manager.add_equation(latex, category, explanation, tags or [])
        except Exception as e:
            logger.error(f"Failed to index equation: {e}")
