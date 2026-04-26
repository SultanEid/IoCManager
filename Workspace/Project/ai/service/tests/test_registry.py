from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path

import pytest

import decision_service.registry as registry_module
from decision_service.registry import ModelRegistryDocument, ModelRegistryEntry, ModelRegistryStore


def test_registry_roundtrip(tmp_path: Path) -> None:
    path = tmp_path / "registry.json"
    store = ModelRegistryStore(path)
    now = datetime.now(timezone.utc)
    entry = ModelRegistryEntry(
        model_id="cti-v1",
        model_version="v1-a",
        dataset_version="d-1",
        status="candidate",
        created_at_utc=now,
        scoring_profile_version="heuristic-v1",
        feature_schema_version="cti-feature-schema-v1",
        calibration_metadata={"method": "logistic_regression"},
        dataset_manifest_hash="manifest-hash",
    )
    store.upsert(entry)
    loaded = store.get_by_version("v1-a")
    assert loaded is not None
    assert loaded.dataset_version == "d-1"
    assert loaded.scoring_profile_version == "heuristic-v1"
    assert loaded.dataset_manifest_hash == "manifest-hash"


def test_registry_promote_archives_previous_active(tmp_path: Path) -> None:
    path = tmp_path / "registry.json"
    store = ModelRegistryStore(path)
    now = datetime.now(timezone.utc)
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-old",
            dataset_version="d-1",
            status="active",
            created_at_utc=now,
        )
    )
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-new",
            dataset_version="d-2",
            status="candidate",
            created_at_utc=now,
        )
    )
    promoted = store.promote("v1-new")
    assert promoted.status == "active"

    doc = store.load()
    statuses = {entry.model_version: entry.status for entry in doc.entries}
    assert statuses["v1-new"] == "active"
    assert statuses["v1-old"] == "archived"


def test_registry_save_failure_preserves_previous_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "registry.json"
    store = ModelRegistryStore(path)
    now = datetime.now(timezone.utc)
    entry = ModelRegistryEntry(
        model_id="cti-v1",
        model_version="v1-a",
        dataset_version="d-1",
        status="active",
        created_at_utc=now,
    )
    store.upsert(entry)
    baseline = path.read_text(encoding="utf-8")

    def failing_atomic_write(path: Path, content: str) -> None:
        raise OSError("simulated atomic replace failure")

    monkeypatch.setattr(registry_module, "_atomic_write_text", failing_atomic_write)

    with pytest.raises(OSError):
        store.save(ModelRegistryDocument(updated_at_utc=now, entries=[]))

    assert path.read_text(encoding="utf-8") == baseline
    assert store.get_by_version("v1-a") is not None


def test_registry_resolves_relative_artifact_paths_and_validates_hashes(tmp_path: Path) -> None:
    path = tmp_path / "artifacts" / "model_registry.json"
    artifact_path = tmp_path / "artifacts" / "models" / "v1-a" / "calibration.json"
    artifact_path.parent.mkdir(parents=True)
    artifact_path.write_text('{"method":"identity"}', encoding="utf-8")
    digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    store = ModelRegistryStore(path)
    entry = ModelRegistryEntry(
        model_id="cti-v1",
        model_version="v1-a",
        dataset_version="d-1",
        status="candidate",
        created_at_utc=datetime.now(timezone.utc),
        artifact_paths={"calibration": "models/v1-a/calibration.json"},
        artifact_hashes={"calibration": digest},
    )

    resolved = store.validate_artifacts(entry, require_hashes=True)

    assert resolved["calibration"] == artifact_path.resolve()


def test_registry_validation_rejects_bad_artifact_hash(tmp_path: Path) -> None:
    path = tmp_path / "artifacts" / "model_registry.json"
    artifact_path = tmp_path / "artifacts" / "models" / "v1-a" / "thresholds.json"
    artifact_path.parent.mkdir(parents=True)
    artifact_path.write_text('{"recommend":0.55}', encoding="utf-8")
    store = ModelRegistryStore(path)
    entry = ModelRegistryEntry(
        model_id="cti-v1",
        model_version="v1-a",
        dataset_version="d-1",
        status="candidate",
        created_at_utc=datetime.now(timezone.utc),
        artifact_paths={"thresholds": "models/v1-a/thresholds.json"},
        artifact_hashes={"thresholds": "bad-hash"},
    )

    with pytest.raises(ValueError, match="hash mismatch"):
        store.validate_artifacts(entry, require_hashes=True)

