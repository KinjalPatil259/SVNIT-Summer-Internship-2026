"""
EquationAI — Stats / Overview API Routes
Provides aggregate statistics computed from history data.
"""

from fastapi import APIRouter
from models.schemas import StatsResponse, DailyStatEntry
from services.history_service import history_service

router = APIRouter(prefix="/api", tags=["Stats"])


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Return aggregate stats for the Overview dashboard."""
    raw_stats = history_service.get_stats()

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
    )
