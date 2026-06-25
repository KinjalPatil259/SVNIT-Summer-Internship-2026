"""
EquationAI — History API Routes
CRUD endpoints for managing equation conversion history.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models.schemas import (
    HistoryEntry,
    HistoryCreateRequest,
    HistoryListResponse,
)
from services.history_service import history_service

router = APIRouter(prefix="/api", tags=["History"])


@router.get("/history", response_model=HistoryListResponse)
async def get_history(
    source: Optional[str] = Query(None, description="Filter by source: upload, converter, handwriting"),
    search: Optional[str] = Query(None, description="Search by LaTeX content or filename"),
):
    """Retrieve all history entries with optional filtering."""
    entries = history_service.get_all(source=source, search=search)

    # Convert dicts to HistoryEntry models
    history_entries = [
        HistoryEntry(
            id=e["id"],
            latex=e.get("latex", ""),
            mathml=e.get("mathml", ""),
            source=e.get("source", "upload"),
            fileName=e.get("fileName"),
            timestamp=e.get("timestamp", ""),
        )
        for e in entries
    ]

    return HistoryListResponse(entries=history_entries, total=len(history_entries))


@router.post("/history", response_model=HistoryEntry, status_code=201)
async def create_history_entry(request: HistoryCreateRequest):
    """Add a new history entry."""
    if not request.latex and not request.mathml:
        raise HTTPException(status_code=400, detail="At least one of 'latex' or 'mathml' must be provided.")

    entry = history_service.add_entry(
        latex=request.latex,
        mathml=request.mathml,
        source=request.source,
        file_name=request.fileName,
    )

    return HistoryEntry(
        id=entry["id"],
        latex=entry["latex"],
        mathml=entry["mathml"],
        source=entry["source"],
        fileName=entry["fileName"],
        timestamp=entry["timestamp"],
    )


@router.delete("/history/{entry_id}")
async def delete_history_entry(entry_id: str):
    """Delete a single history entry by ID."""
    deleted = history_service.delete_entry(entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"History entry '{entry_id}' not found.")
    return {"message": "Entry deleted", "id": entry_id}


@router.delete("/history")
async def clear_all_history():
    """Clear all history entries."""
    history_service.clear_all()
    return {"message": "All history cleared"}
