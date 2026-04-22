from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import pytest

from cti_service.snapshots import SnapshotLoader


def test_snapshot_loader_reads_version(snapshot_root: Path) -> None:
    loader = SnapshotLoader(snapshot_root)
    snapshot = loader.load("test-v1")
    snapshot_again = loader.load("test-v1")
    assert snapshot.dataset_version == "test-v1"
    assert not snapshot.observables.empty
    assert "feed_a" in snapshot.source_trust_map
    assert snapshot.manifest_hash
    assert snapshot.manifest_hash == snapshot_again.manifest_hash
    assert snapshot.manifest_files["observables"] == "observables.csv"


def test_snapshot_loader_rejects_missing_required_columns(tmp_path: Path) -> None:
    root = tmp_path / "snapshots"
    version_dir = root / "broken-v1"
    version_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "datasetVersion": "broken-v1",
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "files": {
            "observables": "observables.csv",
            "detections": "detections.csv",
            "outcomes": "outcomes.csv",
        },
    }
    (version_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    pd.DataFrame([{"ioc_type": "domain"}]).to_csv(version_dir / "observables.csv", index=False)
    pd.DataFrame([{"ioc_type": "domain", "ioc_value": "a", "event_time": datetime.now(timezone.utc).isoformat(), "scanner_family": "x"}]).to_csv(version_dir / "detections.csv", index=False)
    pd.DataFrame([{"ioc_type": "domain", "ioc_value": "a", "event_time": datetime.now(timezone.utc).isoformat(), "verdict": "benign"}]).to_csv(version_dir / "outcomes.csv", index=False)

    loader = SnapshotLoader(root)
    with pytest.raises(ValueError):
        loader.load("broken-v1")


def test_snapshot_loader_keeps_mixed_iso_timestamps(tmp_path: Path) -> None:
    root = tmp_path / "snapshots"
    version_dir = root / "mixed-v1"
    version_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "datasetVersion": "mixed-v1",
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "files": {
            "observables": "observables.csv",
            "detections": "detections.csv",
            "outcomes": "outcomes.csv",
        },
    }
    (version_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    observables = [
        {"ioc_type": "domain", "ioc_value": "a.example", "event_time": "2026-04-22T12:14:59.101480+00:00", "source_system": "siem"},
        {"ioc_type": "domain", "ioc_value": "b.example", "event_time": "2026-04-22T12:15:29Z", "source_system": "siem"},
        {"ioc_type": "domain", "ioc_value": "c.example", "event_time": datetime.now(timezone.utc).isoformat(), "source_system": "siem"},
    ]
    detections = [
        {"ioc_type": item["ioc_type"], "ioc_value": item["ioc_value"], "event_time": item["event_time"], "scanner_family": "sigma"}
        for item in observables
    ]
    outcomes = [
        {"ioc_type": item["ioc_type"], "ioc_value": item["ioc_value"], "event_time": item["event_time"], "verdict": "benign"}
        for item in observables
    ]
    pd.DataFrame(observables).to_csv(version_dir / "observables.csv", index=False)
    pd.DataFrame(detections).to_csv(version_dir / "detections.csv", index=False)
    pd.DataFrame(outcomes).to_csv(version_dir / "outcomes.csv", index=False)

    loader = SnapshotLoader(root)
    snapshot = loader.load("mixed-v1")

    assert len(snapshot.observables) == 3
    assert len(snapshot.detections) == 3
    assert len(snapshot.outcomes) == 3
