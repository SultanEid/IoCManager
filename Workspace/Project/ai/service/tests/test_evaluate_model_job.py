from __future__ import annotations

import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from decision_service.calibration import LogisticCalibrator
from decision_service.registry import ModelRegistryEntry, ModelRegistryStore


def _load_job_module():
    path = Path(__file__).resolve().parents[2] / "jobs" / "evaluate_model.py"
    jobs_dir = str(path.parent)
    if jobs_dir not in sys.path:
        sys.path.insert(0, jobs_dir)
    spec = importlib.util.spec_from_file_location("evaluate_model", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_evaluate_model_writes_gate_metadata_and_required_slices(snapshot_root: Path, tmp_path: Path) -> None:
    module = _load_job_module()
    registry_path = tmp_path / "artifacts" / "model_registry.json"
    store = ModelRegistryStore(registry_path)
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-test",
            dataset_version="test-v1",
            status="candidate",
            created_at_utc=datetime.now(timezone.utc),
            thresholds={"recommend": 0.55, "escalate": 0.80, "abstain": 0.35},
            calibration=LogisticCalibrator().to_dict(),
        )
    )
    output_file = tmp_path / "evaluation.json"

    previous_argv = sys.argv
    sys.argv = [
        "evaluate_model.py",
        "--snapshot-root",
        str(snapshot_root),
        "--dataset-version",
        "test-v1",
        "--registry-path",
        str(registry_path),
        "--model-version",
        "v1-test",
        "--output-file",
        str(output_file),
        "--bundle-root",
        str(tmp_path / "bundles"),
    ]
    try:
        module.main()
    finally:
        sys.argv = previous_argv

    report = json.loads(output_file.read_text(encoding="utf-8"))
    assert report["evaluationBundleVersion"] == "decision-eval-v2"
    assert "inputHashes" in report
    assert "promotionGates" in report
    assert "checkedMetrics" in report["promotionGates"]
    slice_fields = {row["sliceField"] for row in report["slices"]}
    assert {
        "ioc_type",
        "source_system",
        "rule_family",
        "recency_bucket",
        "trust_bucket",
        "evidence_availability_bucket",
    }.issubset(slice_fields)
    run_manifest = json.loads(Path(report["bundleFiles"]["runManifest"]).read_text(encoding="utf-8"))
    assert "commandMetadata" in run_manifest
    assert "inputHashes" in run_manifest
