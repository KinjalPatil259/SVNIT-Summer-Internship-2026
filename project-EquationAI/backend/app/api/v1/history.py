"""
EquationAI — History Routes
CRUD endpoints for managing equation conversion history.
"""

import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user_optional
from app.models.user import User
from app.schemas.history import HistoryEntry, HistoryCreateRequest, HistoryListResponse
from app.schemas.common import PaginationMeta
from app.services import history_service
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["History"])


@router.get("/history", response_model=HistoryListResponse)
async def get_history(
    source: Optional[str] = Query(None, description="Filter by source: upload, converter, handwriting"),
    search: Optional[str] = Query(None, description="Search by LaTeX content or filename"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    """Retrieve conversion history with optional filtering and pagination."""
    entries, total = history_service.get_all(
        db=db,
        source=source,
        search=search,
        page=page,
        per_page=per_page,
        user_id=None,  # Show all entries for now (no user scoping until auth is required)
    )

    history_entries = [
        HistoryEntry(
            id=e.uuid,
            latex=e.latex or "",
            mathml=e.mathml or "",
            source=e.source or "upload",
            fileName=e.file_name,
            timestamp=e.created_at.isoformat() if e.created_at else "",
            processing_time_ms=e.processing_time_ms,
            status=e.status,
            category=e.category,
        )
        for e in entries
    ]

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return HistoryListResponse(
        entries=history_entries,
        total=total,
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.post("/history", response_model=HistoryEntry, status_code=201)
async def create_history_entry(
    request: HistoryCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    """Add a new history entry."""
    if not request.latex and not request.mathml:
        from app.core.exceptions import ValidationError
        raise ValidationError("At least one of 'latex' or 'mathml' must be provided.")

    entry = history_service.create_entry(
        db=db,
        latex=request.latex,
        mathml=request.mathml,
        source=request.source,
        file_name=request.fileName,
        user_id=user.id if user else None,
    )

    return HistoryEntry(
        id=entry.uuid,
        latex=entry.latex,
        mathml=entry.mathml,
        source=entry.source,
        fileName=entry.file_name,
        timestamp=entry.created_at.isoformat() if entry.created_at else "",
    )


@router.delete("/history/{entry_id}")
async def delete_history_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    """Delete a single history entry by ID."""
    deleted = history_service.delete_entry(db=db, entry_uuid=entry_id)
    if not deleted:
        raise NotFoundError("History entry", entry_id)
    return {"message": "Entry deleted", "id": entry_id}


@router.delete("/history")
async def clear_all_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_optional),
):
    """Clear all history entries."""
    count = history_service.clear_all(db=db)
    return {"message": f"Cleared {count} history entries"}
