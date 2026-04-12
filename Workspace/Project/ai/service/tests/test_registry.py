from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from cti_service.registry import ModelRegistryEntry, ModelRegistryStore


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
