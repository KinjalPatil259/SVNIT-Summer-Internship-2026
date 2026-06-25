"""
EquationAI — Analytics Service
Tracks events and computes dashboard-ready statistics.
"""

import json
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.analytics import AnalyticsEvent
from app.core.logging_config import get_logger

logger = get_logger("analytics_service")


def track_event(
    db: Session,
    event_type: str,
    user_id: Optional[int] = None,
    metadata: Optional[dict] = None,
    processing_time_ms: Optional[int] = None,
) -> None:
    """Fire-and-forget event tracking. Logs to database."""
    try:
        event = AnalyticsEvent(
            event_type=event_type,
            user_id=user_id,
            metadata_json=json.dumps(metadata) if metadata else None,
            processing_time_ms=processing_time_ms,
        )
        db.add(event)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to track analytics event: {e}")


def get_event_counts(db: Session, event_type: Optional[str] = None) -> dict:
    """Get aggregate event counts, optionally filtered by type."""
    query = db.query(
        AnalyticsEvent.event_type,
        func.count(AnalyticsEvent.id).label("count"),
    )

    if event_type:
        query = query.filter(AnalyticsEvent.event_type == event_type)

    results = query.group_by(AnalyticsEvent.event_type).all()
    return {r.event_type: r.count for r in results}
