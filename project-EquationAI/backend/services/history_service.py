"""
EquationAI — History Service
Manages equation history with in-memory store + JSON file persistence.
"""

import json
import uuid
import os
import logging
from datetime import datetime, timezone
from typing import List, Optional
from threading import Lock

logger = logging.getLogger("HistoryService")

# Persistent storage path
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
MAX_ENTRIES = 500


class HistoryService:
    """Thread-safe history manager with JSON file backup."""

    def __init__(self):
        self._entries: List[dict] = []
        self._lock = Lock()
        self._load_from_file()

    # ──────────────────────────────────────────────
    #  File I/O
    # ──────────────────────────────────────────────

    def _load_from_file(self):
        """Load history from JSON file on startup."""
        try:
            if os.path.exists(HISTORY_FILE):
                with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self._entries = data
                        logger.info(f"Loaded {len(self._entries)} history entries from disk.")
                    else:
                        self._entries = []
            else:
                self._entries = []
                logger.info("No existing history file found. Starting fresh.")
        except Exception as e:
            logger.error(f"Failed to load history file: {e}")
            self._entries = []

    def _save_to_file(self):
        """Persist current history to JSON file."""
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(self._entries, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save history file: {e}")

    # ──────────────────────────────────────────────
    #  CRUD Operations
    # ──────────────────────────────────────────────

    def get_all(
        self,
        source: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[dict]:
        """Return history entries, optionally filtered by source or search query."""
        with self._lock:
            results = list(self._entries)

        # Filter by source
        if source:
            results = [e for e in results if e.get("source") == source]

        # Filter by search query (matches latex or fileName)
        if search:
            q = search.lower().strip()
            results = [
                e for e in results
                if q in (e.get("latex") or "").lower()
                or q in (e.get("fileName") or "").lower()
            ]

        return results

    def add_entry(
        self,
        latex: str,
        mathml: str = "",
        source: str = "upload",
        file_name: Optional[str] = None,
    ) -> dict:
        """Create a new history entry and persist it."""
        entry = {
            "id": str(uuid.uuid4()),
            "latex": latex or "",
            "mathml": mathml or "",
            "source": source,
            "fileName": file_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        with self._lock:
            # Prepend (newest first)
            self._entries.insert(0, entry)

            # Cap at MAX_ENTRIES
            if len(self._entries) > MAX_ENTRIES:
                self._entries = self._entries[:MAX_ENTRIES]

            self._save_to_file()

        logger.info(f"Added history entry: {entry['id']} (source={source})")
        return entry

    def delete_entry(self, entry_id: str) -> bool:
        """Delete a single history entry by ID. Returns True if found and deleted."""
        with self._lock:
            original_len = len(self._entries)
            self._entries = [e for e in self._entries if e.get("id") != entry_id]
            deleted = len(self._entries) < original_len

            if deleted:
                self._save_to_file()
                logger.info(f"Deleted history entry: {entry_id}")

        return deleted

    def clear_all(self):
        """Delete all history entries."""
        with self._lock:
            count = len(self._entries)
            self._entries = []
            self._save_to_file()
            logger.info(f"Cleared all {count} history entries.")

    # ──────────────────────────────────────────────
    #  Statistics
    # ──────────────────────────────────────────────

    def get_stats(self) -> dict:
        """Compute aggregate statistics from history."""
        with self._lock:
            entries = list(self._entries)

        total = len(entries)
        upload_count = sum(1 for e in entries if e.get("source") == "upload")
        converter_count = sum(1 for e in entries if e.get("source") == "converter")
        handwriting_count = sum(1 for e in entries if e.get("source") == "handwriting")

        # Count active formats (always at least LaTeX; MathML if any entry has it)
        formats = {"LaTeX"}  # Always available
        if any(e.get("mathml") for e in entries):
            formats.add("MathML")
        # PDF and Word export are always available as features
        formats.add("PDF")
        formats.add("Word")

        # Weekly stats: count entries per day for the last 7 days
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        weekly = []

        for i in range(6, -1, -1):
            target_date = now - timedelta(days=i)
            day_label = day_names[target_date.weekday()]
            day_count = 0

            for e in entries:
                try:
                    entry_dt = datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00"))
                    if entry_dt.date() == target_date.date():
                        day_count += 1
                except (ValueError, KeyError):
                    pass

            weekly.append({"day": day_label, "count": day_count})

        return {
            "total_equations": total,
            "upload_count": upload_count,
            "converter_count": converter_count,
            "handwriting_count": handwriting_count,
            "active_formats": len(formats),
            "weekly_stats": weekly,
        }


# Singleton instance
history_service = HistoryService()
