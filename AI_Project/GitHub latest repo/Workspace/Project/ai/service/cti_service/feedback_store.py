from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from .contracts import FeedbackIngestResponse, SubmitFeedbackRequest


class FeedbackStore:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = Lock()

    def append(self, request: SubmitFeedbackRequest) -> FeedbackIngestResponse:
        now = datetime.now(timezone.utc)
        feedback_id = str(uuid4())
        row = {
            "feedbackId": feedback_id,
            "caseId": request.case_id,
            "decisionId": request.decision_id,
            "verdict": request.verdict,
            "notes": request.notes,
            "submittedByUserId": request.submitted_by_user_id,
            "submittedAtUtc": now.isoformat(),
        }
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            with self._path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(row))
                handle.write("\n")

        return FeedbackIngestResponse(
            feedback_id=feedback_id,
            accepted=True,
            submitted_at_utc=now,
        )

