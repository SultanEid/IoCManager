from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class TrainingRow:
    ioc_type: str
    ioc_value: str
    source_system: str
    event_time: datetime
    host_context: dict[str, Any]
    rule_context: dict[str, Any]
    malicious_within_horizon: int
    risk_tier: str
    action_required: int

