from __future__ import annotations

import hashlib
import json
from dataclasses import asdict
from datetime import timedelta
from pathlib import Path
from typing import Any

import pandas as pd

from .schema import TrainingRow

POSITIVE_VERDICTS = {"true_positive", "escalated"}


def _read_csv(path: Path, required_columns: list[str]) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Missing required input file: {path}")
    frame = pd.read_csv(path)
    missing = [column for column in required_columns if column not in frame.columns]
    if missing:
        raise ValueError(f"File {path.name} is missing required columns: {missing}")
    return frame


def _parse_json_cell(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return {}
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return {}
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def build_training_rows(input_dir: Path, horizon_hours: int) -> tuple[list[TrainingRow], str]:
    observables = _read_csv(
        input_dir / "observables.csv",
        ["ioc_type", "ioc_value", "event_time", "source_system"],
    )
    detections = _read_csv(
        input_dir / "detections.csv",
        ["ioc_type", "ioc_value", "event_time", "scanner_family"],
    )
    outcomes = _read_csv(
        input_dir / "outcomes.csv",
        ["ioc_type", "ioc_value", "event_time", "verdict"],
    )

    enrichment_path = input_dir / "enrichment.csv"
    enrichment = pd.read_csv(enrichment_path) if enrichment_path.exists() else pd.DataFrame()

    observables["event_time"] = pd.to_datetime(observables["event_time"], utc=True, errors="coerce")
    detections["event_time"] = pd.to_datetime(detections["event_time"], utc=True, errors="coerce")
    outcomes["event_time"] = pd.to_datetime(outcomes["event_time"], utc=True, errors="coerce")
    if not enrichment.empty and "event_time" in enrichment.columns:
        enrichment["event_time"] = pd.to_datetime(enrichment["event_time"], utc=True, errors="coerce")

    observables = observables.dropna(subset=["event_time"]).sort_values("event_time")
    detections = detections.dropna(subset=["event_time"]).sort_values("event_time")
    outcomes = outcomes.dropna(subset=["event_time"]).sort_values("event_time")

    rows: list[TrainingRow] = []
    horizon = timedelta(hours=horizon_hours)

    grouped_detections = detections.groupby(["ioc_type", "ioc_value"], sort=False)
    grouped_outcomes = outcomes.groupby(["ioc_type", "ioc_value"], sort=False)
    grouped_enrichment = (
        enrichment.groupby(["ioc_type", "ioc_value"], sort=False) if not enrichment.empty else {}
    )

    for observable in observables.itertuples(index=False):
        key = (str(observable.ioc_type).strip().lower(), str(observable.ioc_value).strip())
        event_time = observable.event_time

        det_rows = grouped_detections.get_group(key) if key in grouped_detections.groups else pd.DataFrame()
        det_rows = det_rows[det_rows["event_time"] <= event_time]  # leakage-safe
        recent_detections = det_rows[det_rows["event_time"] >= event_time - timedelta(hours=24)]

        out_rows = grouped_outcomes.get_group(key) if key in grouped_outcomes.groups else pd.DataFrame()
        out_window = out_rows[(out_rows["event_time"] >= event_time) & (out_rows["event_time"] <= event_time + horizon)]

        is_positive = int(any(str(v).strip().lower() in POSITIVE_VERDICTS for v in out_window["verdict"].tolist()))
        has_escalation = int(any(str(v).strip().lower() == "escalated" for v in out_window["verdict"].tolist()))
        risk_tier = "high" if has_escalation else ("medium" if is_positive else "low")

        scanner_agreement = min(
            1.0,
            recent_detections["scanner_family"].nunique() / 4.0 if len(recent_detections) > 0 else 0.0,
        )
        severity_score = (
            float(recent_detections["severity_score"].max())
            if "severity_score" in recent_detections.columns and len(recent_detections) > 0
            else 0.0
        )

        host_context = _parse_json_cell(getattr(observable, "host_context_json", None))
        rule_context = _parse_json_cell(getattr(observable, "rule_context_json", None))
        rule_context["scanner_agreement"] = scanner_agreement
        rule_context["severity_score"] = severity_score
        rule_context["historical_hits"] = float(len(det_rows))

        if key in grouped_enrichment.groups:
            enrich_rows = grouped_enrichment.get_group(key)
            latest = enrich_rows.iloc[-1].to_dict()
            for name, value in latest.items():
                if name in {"ioc_type", "ioc_value", "event_time"}:
                    continue
                rule_context[name] = value

        rows.append(
            TrainingRow(
                ioc_type=key[0],
                ioc_value=key[1],
                source_system=str(observable.source_system),
                event_time=event_time.to_pydatetime(),
                host_context=host_context,
                rule_context=rule_context,
                malicious_within_horizon=is_positive,
                risk_tier=risk_tier,
                action_required=int(is_positive or has_escalation),
            )
        )

    dataset_hash = _dataset_version_hash(rows, horizon_hours)
    return rows, dataset_hash


def training_rows_to_frame(rows: list[TrainingRow]) -> pd.DataFrame:
    return pd.DataFrame([asdict(row) for row in rows])


def _dataset_version_hash(rows: list[TrainingRow], horizon_hours: int) -> str:
    digest = hashlib.sha256()
    digest.update(f"horizon={horizon_hours}".encode("utf-8"))
    for row in rows:
        digest.update(json.dumps(asdict(row), sort_keys=True, default=str).encode("utf-8"))
    return digest.hexdigest()

