from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .schemas import AnalystOutcome


class FeedbackStore:
    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS feedback_outcomes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ioc_type TEXT NOT NULL,
                    ioc_value TEXT NOT NULL,
                    verdict TEXT NOT NULL,
                    case_id TEXT,
                    source_system TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    event_time_utc TEXT NOT NULL,
                    stored_at_utc TEXT NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS ix_feedback_ioc ON feedback_outcomes(ioc_type, ioc_value)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS ix_feedback_verdict ON feedback_outcomes(verdict)"
            )

    def store(self, outcome: AnalystOutcome) -> datetime:
        stored_at = datetime.now(timezone.utc)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO feedback_outcomes
                (ioc_type, ioc_value, verdict, case_id, source_system, metadata_json, event_time_utc, stored_at_utc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    outcome.ioc_type,
                    outcome.ioc_value,
                    outcome.verdict,
                    outcome.case_id,
                    outcome.source_system,
                    json.dumps(outcome.metadata, separators=(",", ":"), sort_keys=True),
                    outcome.event_time.astimezone(timezone.utc).isoformat(),
                    stored_at.isoformat(),
                ),
            )
        return stored_at

    def get_stats(self, ioc_type: str, ioc_value: str) -> dict[str, int]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT verdict, COUNT(*) as c
                FROM feedback_outcomes
                WHERE ioc_type = ? AND ioc_value = ?
                GROUP BY verdict
                """,
                (ioc_type, ioc_value),
            ).fetchall()

        stats: dict[str, int] = {}
        for row in rows:
            stats[str(row["verdict"])] = int(row["c"])
        return stats

