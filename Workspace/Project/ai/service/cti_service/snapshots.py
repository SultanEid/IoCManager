from __future__ import annotations

import json
import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from .contracts import ScoreCaseRequest

POSITIVE_VERDICTS = {"true_positive", "escalated"}


@dataclass(frozen=True)
class SnapshotDataset:
    dataset_version: str
    created_at_utc: datetime
    observables: pd.DataFrame
    detections: pd.DataFrame
    outcomes: pd.DataFrame
    source_trust: pd.DataFrame
    manifest_path: Path
    manifest_hash: str
    manifest_files: dict[str, str]

    @property
    def source_trust_map(self) -> dict[str, float]:
        mapping: dict[str, float] = {}
        if self.source_trust.empty:
            return mapping
        for row in self.source_trust.itertuples(index=False):
            source_system = str(getattr(row, "source_system", "")).strip().lower()
            if not source_system:
                continue
            trust_score = float(getattr(row, "trust_score", 0.5))
            mapping[source_system] = max(0.0, min(1.0, trust_score))
        return mapping


@dataclass(frozen=True)
class TrainingExample:
    request: ScoreCaseRequest
    label: int
    event_time: datetime
    source_trust: float


class SnapshotLoader:
    def __init__(self, root: Path) -> None:
        self._root = root

    def list_versions(self) -> list[str]:
        if not self._root.exists():
            return []
        versions = [item.name for item in self._root.iterdir() if item.is_dir()]
        return sorted(versions)

    def load(self, dataset_version: str) -> SnapshotDataset:
        version_dir = self._root / dataset_version
        manifest_path = version_dir / "manifest.json"
        if not manifest_path.exists():
            raise FileNotFoundError(f"Snapshot manifest not found: {manifest_path}")

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest_hash = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode("utf-8")).hexdigest()
        files = self._validate_manifest(manifest, dataset_version)

        observables = self._read_required_csv(
            version_dir / files["observables"],
            required_columns=["ioc_type", "ioc_value", "event_time", "source_system"],
            file_label="observables",
        )
        detections = self._read_required_csv(
            version_dir / files["detections"],
            required_columns=["ioc_type", "ioc_value", "event_time", "scanner_family"],
            file_label="detections",
        )
        outcomes = self._read_required_csv(
            version_dir / files["outcomes"],
            required_columns=["ioc_type", "ioc_value", "event_time", "verdict"],
            file_label="outcomes",
        )
        source_trust = self._read_optional_csv(
            version_dir / files.get("source_trust", "source_trust.csv"),
            required_columns=["source_system", "trust_score"],
        )

        created_at = self._parse_utc(manifest["createdAtUtc"])
        observables = self._normalize_observables(observables)
        detections = self._normalize_detections(detections)
        outcomes = self._normalize_outcomes(outcomes)
        source_trust = self._normalize_source_trust(source_trust)

        return SnapshotDataset(
            dataset_version=dataset_version,
            created_at_utc=created_at,
            observables=observables,
            detections=detections,
            outcomes=outcomes,
            source_trust=source_trust,
            manifest_path=manifest_path,
            manifest_hash=manifest_hash,
            manifest_files=files,
        )

    @staticmethod
    def _validate_manifest(manifest: dict[str, Any], dataset_version: str) -> dict[str, str]:
        required_keys = {"datasetVersion", "createdAtUtc", "files"}
        missing = sorted(required_keys.difference(manifest.keys()))
        if missing:
            raise ValueError(f"Manifest is missing required keys: {missing}")

        manifest_version = str(manifest["datasetVersion"]).strip()
        if manifest_version != dataset_version:
            raise ValueError(
                f"Manifest datasetVersion '{manifest_version}' does not match requested version '{dataset_version}'."
            )

        files = manifest["files"]
        if not isinstance(files, dict):
            raise ValueError("Manifest 'files' must be a JSON object.")

        required_files = {"observables", "detections", "outcomes"}
        missing_files = sorted(required_files.difference(files.keys()))
        if missing_files:
            raise ValueError(f"Manifest files are missing required entries: {missing_files}")

        casted: dict[str, str] = {}
        for key, value in files.items():
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"Manifest file entry '{key}' must be a non-empty string path.")
            casted[key] = value.strip()
        return casted

    @staticmethod
    def _read_required_csv(path: Path, required_columns: list[str], file_label: str) -> pd.DataFrame:
        if not path.exists():
            raise FileNotFoundError(f"Required snapshot file not found for {file_label}: {path}")
        frame = pd.read_csv(path)
        missing = [column for column in required_columns if column not in frame.columns]
        if missing:
            raise ValueError(f"Snapshot file '{path.name}' is missing required columns: {missing}")
        return frame

    @staticmethod
    def _read_optional_csv(path: Path, required_columns: list[str]) -> pd.DataFrame:
        if not path.exists():
            return pd.DataFrame(columns=required_columns)
        frame = pd.read_csv(path)
        missing = [column for column in required_columns if column not in frame.columns]
        if missing:
            raise ValueError(f"Snapshot file '{path.name}' is missing required columns: {missing}")
        return frame

    @staticmethod
    def _normalize_observables(frame: pd.DataFrame) -> pd.DataFrame:
        normalized = frame.copy()
        normalized["ioc_type"] = normalized["ioc_type"].astype(str).str.strip().str.lower()
        normalized["ioc_value"] = normalized["ioc_value"].astype(str).str.strip()
        normalized["source_system"] = normalized["source_system"].astype(str).str.strip().str.lower()
        normalized["event_time"] = pd.to_datetime(normalized["event_time"], utc=True, errors="coerce")
        normalized = normalized.dropna(subset=["event_time"])
        normalized["host_context"] = normalized.apply(
            lambda row: _parse_json_cell(row.get("host_context_json")),
            axis=1,
        )
        normalized["rule_context"] = normalized.apply(
            lambda row: _parse_json_cell(row.get("rule_context_json")),
            axis=1,
        )
        return normalized.sort_values("event_time").reset_index(drop=True)

    @staticmethod
    def _normalize_detections(frame: pd.DataFrame) -> pd.DataFrame:
        normalized = frame.copy()
        normalized["ioc_type"] = normalized["ioc_type"].astype(str).str.strip().str.lower()
        normalized["ioc_value"] = normalized["ioc_value"].astype(str).str.strip()
        normalized["scanner_family"] = normalized["scanner_family"].astype(str).str.strip().str.lower()
        normalized["event_time"] = pd.to_datetime(normalized["event_time"], utc=True, errors="coerce")
        if "severity_score" in normalized.columns:
            normalized["severity_score"] = pd.to_numeric(normalized["severity_score"], errors="coerce").fillna(0.0)
        else:
            normalized["severity_score"] = 0.0
        normalized = normalized.dropna(subset=["event_time"])
        return normalized.sort_values("event_time").reset_index(drop=True)

    @staticmethod
    def _normalize_outcomes(frame: pd.DataFrame) -> pd.DataFrame:
        normalized = frame.copy()
        normalized["ioc_type"] = normalized["ioc_type"].astype(str).str.strip().str.lower()
        normalized["ioc_value"] = normalized["ioc_value"].astype(str).str.strip()
        normalized["verdict"] = normalized["verdict"].astype(str).str.strip().str.lower()
        normalized["event_time"] = pd.to_datetime(normalized["event_time"], utc=True, errors="coerce")
        normalized = normalized.dropna(subset=["event_time"])
        return normalized.sort_values("event_time").reset_index(drop=True)

    @staticmethod
    def _normalize_source_trust(frame: pd.DataFrame) -> pd.DataFrame:
        if frame.empty:
            return frame
        normalized = frame.copy()
        normalized["source_system"] = normalized["source_system"].astype(str).str.strip().str.lower()
        normalized["trust_score"] = pd.to_numeric(normalized["trust_score"], errors="coerce").fillna(0.5)
        normalized["trust_score"] = normalized["trust_score"].clip(0.0, 1.0)
        return normalized.dropna(subset=["source_system"]).drop_duplicates(subset=["source_system"], keep="last")

    @staticmethod
    def _parse_utc(value: str) -> datetime:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)


def build_training_examples(
    snapshot: SnapshotDataset,
    horizon_hours: int = 72,
    window_start_utc: datetime | None = None,
    window_end_utc: datetime | None = None,
) -> list[TrainingExample]:
    observables = snapshot.observables
    detections = snapshot.detections
    outcomes = snapshot.outcomes
    trust_map = snapshot.source_trust_map
    horizon = timedelta(hours=horizon_hours)

    if window_start_utc:
        observables = observables[observables["event_time"] >= pd.Timestamp(window_start_utc)]
    if window_end_utc:
        observables = observables[observables["event_time"] <= pd.Timestamp(window_end_utc)]

    results: list[TrainingExample] = []
    grouped_detections = detections.groupby(["ioc_type", "ioc_value"], sort=False)
    grouped_outcomes = outcomes.groupby(["ioc_type", "ioc_value"], sort=False)

    for row in observables.itertuples(index=False):
        ioc_type = str(row.ioc_type).lower()
        ioc_value = str(row.ioc_value)
        event_time: datetime = _ensure_datetime_utc(row.event_time)
        source_system = str(row.source_system).lower()
        key = (ioc_type, ioc_value)

        past_detections = (
            grouped_detections.get_group(key) if key in grouped_detections.groups else pd.DataFrame(columns=detections.columns)
        )
        recent_detections = past_detections[
            (past_detections["event_time"] <= pd.Timestamp(event_time))
            & (past_detections["event_time"] >= pd.Timestamp(event_time - timedelta(hours=24)))
        ]
        scanner_agreement = min(1.0, float(recent_detections["scanner_family"].nunique()) / 4.0)
        severity_score = (
            float(recent_detections["severity_score"].max())
            if "severity_score" in recent_detections.columns and not recent_detections.empty
            else 0.0
        )

        future_outcomes = (
            grouped_outcomes.get_group(key) if key in grouped_outcomes.groups else pd.DataFrame(columns=outcomes.columns)
        )
        label_window = future_outcomes[
            (future_outcomes["event_time"] >= pd.Timestamp(event_time))
            & (future_outcomes["event_time"] <= pd.Timestamp(event_time + horizon))
        ]
        label = int(any(str(verdict).strip().lower() in POSITIVE_VERDICTS for verdict in label_window["verdict"].tolist()))

        host_context = dict(getattr(row, "host_context", {}) or {})
        rule_context = dict(getattr(row, "rule_context", {}) or {})
        rule_context.setdefault("scannerAgreement", scanner_agreement)
        rule_context.setdefault("severityScore", severity_score)
        if source_system in trust_map and "sourceTrust" not in rule_context:
            rule_context["sourceTrust"] = trust_map[source_system]

        request = ScoreCaseRequest(
            case_id=f"{ioc_type}:{ioc_value}:{event_time.isoformat()}",
            as_of_time=event_time,
            source_system=source_system,
            ioc_type=ioc_type,
            ioc_value=ioc_value,
            host_context=host_context,
            rule_context=rule_context,
        )
        source_trust = float(rule_context.get("sourceTrust", trust_map.get(source_system, 0.5)))
        results.append(
            TrainingExample(
                request=request,
                label=label,
                event_time=event_time,
                source_trust=max(0.0, min(1.0, source_trust)),
            )
        )

    return sorted(results, key=lambda item: item.event_time)


def _parse_json_cell(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, float) and pd.isna(value):
        return {}
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return {}
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _ensure_datetime_utc(value: Any) -> datetime:
    if isinstance(value, pd.Timestamp):
        value = value.to_pydatetime()
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    raise ValueError(f"Unsupported datetime value: {value!r}")
