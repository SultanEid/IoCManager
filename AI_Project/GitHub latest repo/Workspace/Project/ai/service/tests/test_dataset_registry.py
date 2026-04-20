from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from cti_service.dataset_registry import DatasetRegistryEntry, DatasetRegistryStore


def test_dataset_registry_roundtrip(tmp_path: Path) -> None:
    path = tmp_path / "dataset_registry.json"
    store = DatasetRegistryStore(path)
    now = datetime.now(timezone.utc)
    entry = DatasetRegistryEntry(
        dataset_version="test-v1",
        created_at_utc=now,
        manifest_path=str((tmp_path / "manifest.json").resolve()),
        manifest_hash="abc123",
        source_files={"observables": "observables.csv"},
        notes="test",
    )

    store.upsert(entry)
    loaded = store.get_by_version("test-v1")
    assert loaded is not None
    assert loaded.manifest_hash == "abc123"
    assert loaded.source_files["observables"] == "observables.csv"
    latest = store.get_latest()
    assert latest is not None
    assert latest.dataset_version == "test-v1"
