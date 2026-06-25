"""
EquationAI — Conversion Database Model
Stores equation processing history: uploads, conversions, and handwriting recognitions.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Conversion(Base):
    __tablename__ = "conversions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(String(36), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Equation data
    latex = Column(Text, nullable=False, default="")
    mathml = Column(Text, nullable=False, default="")

    # Source tracking
    source = Column(String(30), nullable=False, default="upload")  # upload, converter, handwriting
    file_name = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)

    # Processing metadata
    processing_time_ms = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default="success")  # success, failed
    error_message = Column(Text, nullable=True)

    # Category / classification
    category = Column(String(100), nullable=True)
    explanation = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="conversions")

    # Indexes for common queries
    __table_args__ = (
        Index("ix_conversions_source_created", "source", "created_at"),
        Index("ix_conversions_user_created", "user_id", "created_at"),
    )

    def __repr__(self):
        return f"<Conversion(id={self.id}, source='{self.source}', status='{self.status}')>"

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses (backward compatible with old JSON format)."""
        return {
            "id": self.uuid,
            "latex": self.latex or "",
            "mathml": self.mathml or "",
            "source": self.source,
            "fileName": self.file_name,
            "timestamp": self.created_at.isoformat() if self.created_at else "",
            "processing_time_ms": self.processing_time_ms,
            "status": self.status,
            "category": self.category,
        }
