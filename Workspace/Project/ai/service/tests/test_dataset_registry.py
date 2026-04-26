from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest

import decision_service.dataset_registry as dataset_registry_module
from decision_service.dataset_registry import DatasetRegistryDocument, DatasetRegistryEntry, DatasetRegistryStore


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


def test_dataset_registry_save_failure_preserves_previous_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "dataset_registry.json"
    store = DatasetRegistryStore(path)
    now = datetime.now(timezone.utc)
    entry = DatasetRegistryEntry(
        dataset_version="test-v1",
        created_at_utc=now,
        manifest_path=str((tmp_path / "manifest.json").resolve()),
        manifest_hash="abc123",
        source_files={"observables": "observables.csv"},
    )
    store.upsert(entry)
    baseline = path.read_text(encoding="utf-8")

    def failing_atomic_write(path: Path, content: str) -> None:
        raise OSError("simulated atomic replace failure")

    monkeypatch.setattr(dataset_registry_module, "_atomic_write_text", failing_atomic_write)

    with pytest.raises(OSError):
        store.save(DatasetRegistryDocument(updated_at_utc=now, entries=[]))

    assert path.read_text(encoding="utf-8") == baseline
    assert store.get_by_version("test-v1") is not None

