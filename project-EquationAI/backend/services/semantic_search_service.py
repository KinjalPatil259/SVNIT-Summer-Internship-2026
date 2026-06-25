import time
import logging
from vector_db.chroma_manager import chroma_manager
from models.schemas import SemanticSearchResponse, SemanticSearchResult

logger = logging.getLogger("SemanticSearchService")

class SemanticSearchService:
    @staticmethod
    async def perform_search(query: str) -> SemanticSearchResponse:
        start_time = time.time()
        logger.info(f"Received query: '{query}'")
        
        # Execute query retrieval via ChromaManager
        raw_results = chroma_manager.search(query, limit=4)
        
        results = []
        for res in raw_results:
            results.append(
                SemanticSearchResult(
                    equation=res["equation"],
                    category=res["category"],
                    similarity_score=res["similarity_score"],
                    explanation=res["explanation"]
                )
            )
            
        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.info(f"Search query processed in {elapsed_ms}ms, returned {len(results)} matches.")
        
        return SemanticSearchResponse(results=results)
