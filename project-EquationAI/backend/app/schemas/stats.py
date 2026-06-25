"""
EquationAI — Stats Schemas
"""

from typing import List
from pydantic import BaseModel


class DailyStatEntry(BaseModel):
    day: str
    count: int


class StatsResponse(BaseModel):
    total_equations: int
    upload_count: int
    converter_count: int
    handwriting_count: int
    active_formats: int
    weekly_stats: List[DailyStatEntry]
    avg_processing_time_ms: int = 0
    success_rate: float = 100.0
