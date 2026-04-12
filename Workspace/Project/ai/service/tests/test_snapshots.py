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
