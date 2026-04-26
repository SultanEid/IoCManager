from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .calibration import LogisticCalibrator


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temp_path = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        temp_path.replace(path)
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink(missing_ok=True)


class RegistryModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ModelRegistryEntry(RegistryModel):
    model_id: str
    model_version: str
    dataset_version: str
    status: Literal["candidate", "active", "archived", "retired"] = "candidate"
    created_at_utc: datetime
    published_at_utc: datetime | None = None
    training_window_start_utc: datetime | None = None
    training_window_end_utc: datetime | None = None
    evaluation_window_start_utc: datetime | None = None
    evaluation_window_end_utc: datetime | None = None
    metrics: dict[str, float] = Field(default_factory=dict)
    scoring_profile_version: str = "heuristic-v1"
    feature_schema_version: str = "cti-feature-schema-v1"
    thresholds: dict[str, float] = Field(
        default_factory=lambda: {"recommend": 0.55, "escalate": 0.80, "abstain": 0.35}
    )
    calibration: dict[str, Any] = Field(default_factory=lambda: LogisticCalibrator().to_dict())
    calibration_metadata: dict[str, str] = Field(default_factory=dict)
    artifact_paths: dict[str, str] = Field(default_factory=dict)
    artifact_hashes: dict[str, str] = Field(default_factory=dict)
    dataset_manifest_hash: str | None = None
    notes: str | None = None


class ModelRegistryDocument(RegistryModel):
    schema_version: int = 1
    updated_at_utc: datetime
    entries: list[ModelRegistryEntry] = Field(default_factory=list)


class ModelRegistryStore:
    def __init__(self, path: Path) -> None:
        self._path = path

    @property
    def path(self) -> Path:
        return self._path

    def load(self) -> ModelRegistryDocument:
        if not self._path.exists():
            return ModelRegistryDocument(updated_at_utc=_utcnow(), entries=[])

        payload = json.loads(self._path.read_text(encoding="utf-8"))
        return ModelRegistryDocument.model_validate(payload)

    def save(self, document: ModelRegistryDocument) -> None:
        updated_document = document.model_copy(update={"updated_at_utc": _utcnow()})
        _atomic_write_text(self._path, updated_document.model_dump_json(indent=2))

    def upsert(self, entry: ModelRegistryEntry) -> ModelRegistryDocument:
        document = self.load()
        replaced = False
        entries: list[ModelRegistryEntry] = []
        for item in document.entries:
            if item.model_version == entry.model_version:
                entries.append(entry)
                replaced = True
            else:
                entries.append(item)
        if not replaced:
            entries.append(entry)
        updated = document.model_copy(update={"entries": entries})
        self.save(updated)
        return self.load()

    def get_active(self) -> ModelRegistryEntry | None:
        document = self.load()
        active = [entry for entry in document.entries if entry.status == "active"]
        if active:
            return sorted(active, key=lambda item: item.created_at_utc)[-1]
        if document.entries:
            return sorted(document.entries, key=lambda item: item.created_at_utc)[-1]
        return None

    def get_by_version(self, model_version: str) -> ModelRegistryEntry | None:
        document = self.load()
        for entry in document.entries:
            if entry.model_version == model_version:
                return entry
        return None

    def promote(self, model_version: str) -> ModelRegistryEntry:
        document = self.load()
        target: ModelRegistryEntry | None = None
        updated_entries: list[ModelRegistryEntry] = []
        now = _utcnow()
        for entry in document.entries:
            if entry.model_version == model_version:
                promoted = entry.model_copy(update={"status": "active", "published_at_utc": now})
                target = promoted
                updated_entries.append(promoted)
            elif entry.status == "active":
                updated_entries.append(entry.model_copy(update={"status": "archived"}))
            else:
                updated_entries.append(entry)

        if target is None:
            raise ValueError(f"Model version '{model_version}' was not found in registry.")

        updated = document.model_copy(update={"entries": updated_entries, "updated_at_utc": now})
        self.save(updated)
        return target
