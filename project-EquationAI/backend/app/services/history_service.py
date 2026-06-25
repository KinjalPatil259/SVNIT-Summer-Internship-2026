"""
EquationAI — History Service (Database-backed)
Manages conversion history with SQLAlchemy, supporting pagination and filtering.
"""

import json
import os
import uuid as uuid_lib
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from app.models.conversion import Conversion
from app.core.logging_config import get_logger

logger = get_logger("history_service")


# ── Legacy migration path ──
LEGACY_HISTORY_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "history.json"
)


def migrate_legacy_history(db: Session) -> int:
    """Import entries from legacy data/history.json into the database. Run once on startup."""
    if not os.path.exists(LEGACY_HISTORY_FILE):
        return 0

    try:
        with open(LEGACY_HISTORY_FILE, "r", encoding="utf-8") as f:
            entries = json.load(f)

        if not isinstance(entries, list) or not entries:
            return 0

        # Check if migration already done (any records exist)
        existing_count = db.query(func.count(Conversion.id)).scalar()
        if existing_count > 0:
            logger.info("Database already has entries — skipping legacy migration.")
            return 0

        migrated = 0
        for entry in entries:
            try:
                created_at = datetime.fromisoformat(
                    entry.get("timestamp", "").replace("Z", "+00:00")
                )
            except (ValueError, TypeError):
                created_at = datetime.now(timezone.utc)

            conversion = Conversion(
                uuid=entry.get("id", str(uuid_lib.uuid4())),
                latex=entry.get("latex", ""),
                mathml=entry.get("mathml", ""),
                source=entry.get("source", "upload"),
                file_name=entry.get("fileName"),
                status="success",
                created_at=created_at,
            )
            db.add(conversion)
            migrated += 1

        db.commit()
        logger.info(f"Migrated {migrated} entries from legacy history.json to database.")
        return migrated

    except Exception as e:
        db.rollback()
        logger.error(f"Legacy history migration failed: {e}")
        return 0


def get_all(
    db: Session,
    source: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    user_id: Optional[int] = None,
) -> tuple:
    """
    Retrieve history entries with optional filtering and pagination.
    Returns (entries: list[Conversion], total: int).
    """
    query = db.query(Conversion)

    # Filters
    if user_id is not None:
        query = query.filter(Conversion.user_id == user_id)

    if source:
        query = query.filter(Conversion.source == source)

    if search:
        q = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Conversion.latex.ilike(q),
                Conversion.file_name.ilike(q),
                Conversion.category.ilike(q),
            )
        )

    # Total count before pagination
    total = query.count()

    # Order and paginate
    entries = (
        query.order_by(desc(Conversion.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return entries, total


def create_entry(
    db: Session,
    latex: str,
    mathml: str = "",
    source: str = "upload",
    file_name: Optional[str] = None,
    user_id: Optional[int] = None,
    processing_time_ms: Optional[int] = None,
    status: str = "success",
    error_message: Optional[str] = None,
    category: Optional[str] = None,
    explanation: Optional[str] = None,
) -> Conversion:
    """Create a new history entry in the database."""
    entry = Conversion(
        uuid=str(uuid_lib.uuid4()),
        user_id=user_id,
        latex=latex or "",
        mathml=mathml or "",
        source=source,
        file_name=file_name,
        processing_time_ms=processing_time_ms,
        status=status,
        error_message=error_message,
        category=category,
        explanation=explanation,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    logger.info(f"Created history entry: {entry.uuid} (source={source})")
    return entry


def delete_entry(db: Session, entry_uuid: str, user_id: Optional[int] = None) -> bool:
    """Delete a single history entry by UUID. Returns True if found and deleted."""
    query = db.query(Conversion).filter(Conversion.uuid == entry_uuid)
    if user_id is not None:
        query = query.filter(Conversion.user_id == user_id)

    entry = query.first()
    if not entry:
        return False

    db.delete(entry)
    db.commit()
    logger.info(f"Deleted history entry: {entry_uuid}")
    return True


def clear_all(db: Session, user_id: Optional[int] = None) -> int:
    """Delete all history entries. Returns count deleted."""
    query = db.query(Conversion)
    if user_id is not None:
        query = query.filter(Conversion.user_id == user_id)

    count = query.count()
    query.delete(synchronize_session=False)
    db.commit()
    logger.info(f"Cleared {count} history entries.")
    return count


def get_stats(db: Session, user_id: Optional[int] = None) -> dict:
    """Compute aggregate statistics from the conversion history."""
    query = db.query(Conversion)
    if user_id is not None:
        query = query.filter(Conversion.user_id == user_id)

    total = query.count()
    upload_count = query.filter(Conversion.source == "upload").count()
    converter_count = query.filter(Conversion.source == "converter").count()
    handwriting_count = query.filter(Conversion.source == "handwriting").count()

    # Compute average processing time
    avg_time = (
        db.query(func.avg(Conversion.processing_time_ms))
        .filter(Conversion.processing_time_ms.isnot(None))
        .scalar()
    ) or 0

    # Success rate
    success_count = query.filter(Conversion.status == "success").count()
    success_rate = (success_count / total * 100) if total > 0 else 100.0

    # Active formats
    formats = {"LaTeX", "PDF", "Word"}  # Always available
    has_mathml = query.filter(Conversion.mathml != "").first() is not None
    if has_mathml:
        formats.add("MathML")

    # Weekly stats
    now = datetime.now(timezone.utc)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekly = []

    for i in range(6, -1, -1):
        target_date = now - timedelta(days=i)
        day_label = day_names[target_date.weekday()]
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        day_query = query.filter(
            Conversion.created_at >= start_of_day,
            Conversion.created_at < end_of_day,
        )
        day_count = day_query.count()
        weekly.append({"day": day_label, "count": day_count})

    return {
        "total_equations": total,
        "upload_count": upload_count,
        "converter_count": converter_count,
        "handwriting_count": handwriting_count,
        "active_formats": len(formats),
        "weekly_stats": weekly,
        "avg_processing_time_ms": int(avg_time),
        "success_rate": round(success_rate, 1),
    }
