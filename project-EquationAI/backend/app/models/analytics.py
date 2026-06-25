"""
EquationAI — Analytics Event Database Model
Tracks system events for dashboard statistics and monitoring.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50), nullable=False, index=True)
    # e.g.: 'ocr_recognition', 'conversion', 'search_query', 'export', 'login', 'error'

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON string for flexible event data
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="analytics_events")

    # Indexes
    __table_args__ = (
        Index("ix_analytics_type_created", "event_type", "created_at"),
    )

    def __repr__(self):
        return f"<AnalyticsEvent(id={self.id}, type='{self.event_type}')>"
