from __future__ import annotations

import json
from pathlib import Path

from .schemas import ModelCardResponse


def load_model_card(path: Path, fallback_version: str) -> ModelCardResponse:
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        return ModelCardResponse(**data)

    return ModelCardResponse(
        model_version=fallback_version,
        trained_at_utc="unavailable",
        views=["lexical", "tabular", "graph", "temporal"],
        metrics=[
            "pr_auc",
            "recall_at_top_k",
            "fnr_at_fixed_alert_budget",
            "calibration_error",
            "mean_time_to_detect_gain",
        ],
        supported_ioc_types=["ip", "domain", "url", "hash"],
        optimization_target="recall-first",
    )

