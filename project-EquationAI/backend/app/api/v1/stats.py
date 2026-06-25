"""
EquationAI — Stats Routes
Dashboard statistics aggregated from the database.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.stats import StatsResponse, DailyStatEntry
from app.services import history_service

router = APIRouter(tags=["Stats"])


@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """Return aggregate statistics for the Overview dashboard."""
    raw_stats = history_service.get_stats(db=db)

    weekly = [
        DailyStatEntry(day=d["day"], count=d["count"])
        for d in raw_stats["weekly_stats"]
    ]

    return StatsResponse(
        total_equations=raw_stats["total_equations"],
        upload_count=raw_stats["upload_count"],
        converter_count=raw_stats["converter_count"],
        handwriting_count=raw_stats["handwriting_count"],
        active_formats=raw_stats["active_formats"],
        weekly_stats=weekly,
        avg_processing_time_ms=raw_stats["avg_processing_time_ms"],
        success_rate=raw_stats["success_rate"],
    )
