from __future__ import annotations

import json
import os
import tempfile
import hashlib
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


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def artifact_path_for_registry(path: Path, artifact_root: Path) -> str:
    resolved_path = path.resolve()
    resolved_root = artifact_root.resolve()
    try:
        return resolved_path.relative_to(resolved_root).as_posix()
    except ValueError:
        return str(resolved_path)


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

    def resolve_artifact_path(self, artifact_path: str | Path) -> Path:
        path = Path(artifact_path)
        if path.is_absolute():
            return path
        return (self._path.parent / path).resolve()

    def validate_artifacts(
        self,
        entry: ModelRegistryEntry,
        *,
        require_hashes: bool = False,
    ) -> dict[str, Path]:
        if require_hashes and not entry.artifact_hashes:
            raise ValueError(f"Model version '{entry.model_version}' has no artifact hashes.")

        resolved: dict[str, Path] = {}
        for artifact_key, expected_hash in entry.artifact_hashes.items():
            artifact_path = entry.artifact_paths.get(artifact_key)
            if not artifact_path:
                raise ValueError(
                    f"Model version '{entry.model_version}' is missing artifact path '{artifact_key}'."
                )
            resolved_path = self.resolve_artifact_path(artifact_path)
            if not resolved_path.exists():
                raise FileNotFoundError(
                    f"Model version '{entry.model_version}' artifact '{artifact_key}' was not found: {resolved_path}"
                )
            actual_hash = _sha256_file(resolved_path)
            if actual_hash != expected_hash:
                raise ValueError(
                    f"Model version '{entry.model_version}' artifact '{artifact_key}' hash mismatch."
                )
            resolved[artifact_key] = resolved_path
        return resolved

    def promote(
        self,
        model_version: str,
        *,
        validate_artifacts: bool = False,
        require_artifact_hashes: bool = False,
    ) -> ModelRegistryEntry:
        document = self.load()
        target: ModelRegistryEntry | None = None
        for entry in document.entries:
            if entry.model_version == model_version:
                target = entry
                break

        if target is None:
            raise ValueError(f"Model version '{model_version}' was not found in registry.")

        if validate_artifacts:
            self.validate_artifacts(target, require_hashes=require_artifact_hashes)

        target = None
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

        updated = document.model_copy(update={"entries": updated_entries, "updated_at_utc": now})
        self.save(updated)
        return target
