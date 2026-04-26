from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from decision_service.registry import ModelRegistryEntry, ModelRegistryStore


def _load_job_module(name: str):
    path = Path(__file__).resolve().parents[2] / "jobs" / f"{name}.py"
    jobs_dir = str(path.parent)
    if jobs_dir not in sys.path:
        sys.path.insert(0, jobs_dir)
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_train_baseline_cv_writes_registry_relative_artifact_paths(tmp_path: Path) -> None:
    module = _load_job_module("train_baseline_cv")
    snapshot_root = tmp_path / "snapshots"
    _write_snapshot(snapshot_root=snapshot_root, dataset_version="train-v1", row_count=60)
    artifacts_root = tmp_path / "artifacts"
    registry_path = artifacts_root / "model_registry.json"

    previous_argv = sys.argv
    sys.argv = [
        "train_baseline_cv.py",
        "--snapshot-root",
        str(snapshot_root),
        "--dataset-version",
        "train-v1",
        "--registry-path",
        str(registry_path),
        "--artifacts-dir",
        str(artifacts_root),
        "--folds",
        "3",
        "--seed",
        "7",
    ]
    try:
        module.main()
    finally:
        sys.argv = previous_argv

    store = ModelRegistryStore(registry_path)
    document = store.load()
    assert len(document.entries) == 1
    entry = document.entries[0]
    assert entry.status == "candidate"
    assert entry.artifact_hashes
    assert all(not Path(value).is_absolute() for value in entry.artifact_paths.values())
    assert all(value.startswith(f"models/{entry.model_version}/") for value in entry.artifact_paths.values())
    assert store.validate_artifacts(entry, require_hashes=True)


def test_publish_model_refuses_bad_artifact_hash(tmp_path: Path) -> None:
    module = _load_job_module("publish_model")
    artifacts_root = tmp_path / "artifacts"
    artifact_path = artifacts_root / "models" / "v1-a" / "metrics.json"
    artifact_path.parent.mkdir(parents=True)
    artifact_path.write_text('{"precision":1.0}', encoding="utf-8")
    store = ModelRegistryStore(artifacts_root / "model_registry.json")
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-a",
            dataset_version="d-1",
            status="candidate",
            created_at_utc=datetime.now(timezone.utc),
            artifact_paths={"metrics": "models/v1-a/metrics.json"},
            artifact_hashes={"metrics": "not-the-real-hash"},
        )
    )

    previous_argv = sys.argv
    sys.argv = [
        "publish_model.py",
        "--registry-path",
        str(store.path),
        "--model-version",
        "v1-a",
        "--skip-promotion-gates",
    ]
    try:
        try:
            module.main()
        except ValueError as exc:
            assert "hash mismatch" in str(exc)
        else:  # pragma: no cover
            raise AssertionError("publish_model.py should reject invalid artifact hashes")
    finally:
        sys.argv = previous_argv

    assert store.get_by_version("v1-a").status == "candidate"


def test_publish_model_promotes_when_artifacts_validate(tmp_path: Path, capsys) -> None:
    module = _load_job_module("publish_model")
    artifacts_root = tmp_path / "artifacts"
    artifact_path = artifacts_root / "models" / "v1-a" / "metrics.json"
    artifact_path.parent.mkdir(parents=True)
    artifact_path.write_text('{"precision":1.0}', encoding="utf-8")
    digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    evaluation_report_path = tmp_path / "evaluation.json"
    _write_evaluation_report(evaluation_report_path, model_version="v1-a", passed=True)
    store = ModelRegistryStore(artifacts_root / "model_registry.json")
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-a",
            dataset_version="d-1",
            status="candidate",
            created_at_utc=datetime.now(timezone.utc),
            artifact_paths={"metrics": "models/v1-a/metrics.json"},
            artifact_hashes={"metrics": digest},
        )
    )

    previous_argv = sys.argv
    sys.argv = [
        "publish_model.py",
        "--registry-path",
        str(store.path),
        "--model-version",
        "v1-a",
        "--evaluation-report",
        str(evaluation_report_path),
    ]
    try:
        module.main()
    finally:
        sys.argv = previous_argv

    output = json.loads(capsys.readouterr().out)
    assert output["status"] == "active"
    assert output["promotionGates"]["passed"] is True
    assert store.get_by_version("v1-a").status == "active"


def test_publish_model_refuses_failed_promotion_gates(tmp_path: Path) -> None:
    module = _load_job_module("publish_model")
    artifacts_root = tmp_path / "artifacts"
    artifact_path = artifacts_root / "models" / "v1-a" / "metrics.json"
    artifact_path.parent.mkdir(parents=True)
    artifact_path.write_text('{"precision":1.0}', encoding="utf-8")
    digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    evaluation_report_path = tmp_path / "evaluation.json"
    _write_evaluation_report(evaluation_report_path, model_version="v1-a", passed=False)
    store = ModelRegistryStore(artifacts_root / "model_registry.json")
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-a",
            dataset_version="d-1",
            status="candidate",
            created_at_utc=datetime.now(timezone.utc),
            artifact_paths={"metrics": "models/v1-a/metrics.json"},
            artifact_hashes={"metrics": digest},
        )
    )

    previous_argv = sys.argv
    sys.argv = [
        "publish_model.py",
        "--registry-path",
        str(store.path),
        "--model-version",
        "v1-a",
        "--evaluation-report",
        str(evaluation_report_path),
    ]
    try:
        try:
            module.main()
        except RuntimeError as exc:
            assert "Promotion gates failed" in str(exc)
        else:  # pragma: no cover
            raise AssertionError("publish_model.py should reject failing promotion gates")
    finally:
        sys.argv = previous_argv

    assert store.get_by_version("v1-a").status == "candidate"


def test_publish_model_refuses_missing_ioc_required_slices(tmp_path: Path) -> None:
    module = _load_job_module("publish_model")
    artifacts_root = tmp_path / "artifacts"
    artifact_path = artifacts_root / "models" / "v1-a" / "metrics.json"
    artifact_path.parent.mkdir(parents=True)
    artifact_path.write_text('{"precision":1.0}', encoding="utf-8")
    digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    evaluation_report_path = tmp_path / "evaluation.json"
    _write_evaluation_report(evaluation_report_path, model_version="v1-a", passed=True)
    report = json.loads(evaluation_report_path.read_text(encoding="utf-8"))
    report["slices"] = [row for row in report["slices"] if row["sliceField"] != "evidence_tier"]
    evaluation_report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    store = ModelRegistryStore(artifacts_root / "model_registry.json")
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-a",
            dataset_version="d-1",
            status="candidate",
            created_at_utc=datetime.now(timezone.utc),
            artifact_paths={"metrics": "models/v1-a/metrics.json"},
            artifact_hashes={"metrics": digest},
        )
    )

    previous_argv = sys.argv
    sys.argv = [
        "publish_model.py",
        "--registry-path",
        str(store.path),
        "--model-version",
        "v1-a",
        "--evaluation-report",
        str(evaluation_report_path),
    ]
    try:
        try:
            module.main()
        except RuntimeError as exc:
            assert "missing required evaluation slice fields" in str(exc)
        else:  # pragma: no cover
            raise AssertionError("publish_model.py should reject missing IOC slices")
    finally:
        sys.argv = previous_argv

    assert store.get_by_version("v1-a").status == "candidate"


def test_publish_model_refuses_ioc_protected_case_regression(tmp_path: Path) -> None:
    module = _load_job_module("publish_model")
    artifacts_root = tmp_path / "artifacts"
    artifact_path = artifacts_root / "models" / "v1-a" / "metrics.json"
    artifact_path.parent.mkdir(parents=True)
    artifact_path.write_text('{"precision":1.0}', encoding="utf-8")
    digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    evaluation_report_path = tmp_path / "evaluation.json"
    _write_evaluation_report(evaluation_report_path, model_version="v1-a", passed=True)
    report = json.loads(evaluation_report_path.read_text(encoding="utf-8"))
    report["protectedCases"] = {"failed": 1}
    evaluation_report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    store = ModelRegistryStore(artifacts_root / "model_registry.json")
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-a",
            dataset_version="d-1",
            status="candidate",
            created_at_utc=datetime.now(timezone.utc),
            artifact_paths={"metrics": "models/v1-a/metrics.json"},
            artifact_hashes={"metrics": digest},
        )
    )

    previous_argv = sys.argv
    sys.argv = [
        "publish_model.py",
        "--registry-path",
        str(store.path),
        "--model-version",
        "v1-a",
        "--evaluation-report",
        str(evaluation_report_path),
    ]
    try:
        try:
            module.main()
        except RuntimeError as exc:
            assert "protected false-positive" in str(exc)
        else:  # pragma: no cover
            raise AssertionError("publish_model.py should reject protected-case regressions")
    finally:
        sys.argv = previous_argv

    assert store.get_by_version("v1-a").status == "candidate"


def _write_snapshot(*, snapshot_root: Path, dataset_version: str, row_count: int) -> None:
    snapshot_dir = snapshot_root / dataset_version
    snapshot_dir.mkdir(parents=True)
    base_time = datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc)
    observables: list[dict[str, str]] = []
    detections: list[dict[str, str]] = []
    outcomes: list[dict[str, str]] = []
    for index in range(row_count):
        is_positive = index % 2 == 0
        ioc_value = f"ioc-{index}.example"
        source_system = "feed_high" if is_positive else "feed_low"
        event_time = base_time + timedelta(minutes=index)
        observables.append(
            {
                "ioc_type": "domain",
                "ioc_value": ioc_value,
                "event_time": event_time.isoformat(),
                "source_system": source_system,
                "host_context_json": json.dumps({"criticality": 0.8 if is_positive else 0.2}),
                "rule_context_json": json.dumps(
                    {
                        "severityScore": 0.9 if is_positive else 0.1,
                        "scannerAgreement": 0.8 if is_positive else 0.1,
                    }
                ),
            }
        )
        detections.append(
            {
                "ioc_type": "domain",
                "ioc_value": ioc_value,
                "event_time": event_time.isoformat(),
                "scanner_family": "sigma" if is_positive else "snort",
                "severity_score": "0.9" if is_positive else "0.1",
            }
        )
        outcomes.append(
            {
                "ioc_type": "domain",
                "ioc_value": ioc_value,
                "event_time": (event_time + timedelta(hours=1)).isoformat(),
                "verdict": "true_positive" if is_positive else "benign",
            }
        )

    _write_csv(snapshot_dir / "observables.csv", observables)
    _write_csv(snapshot_dir / "detections.csv", detections)
    _write_csv(snapshot_dir / "outcomes.csv", outcomes)
    _write_csv(
        snapshot_dir / "source_trust.csv",
        [
            {"source_system": "feed_high", "trust_score": "0.85"},
            {"source_system": "feed_low", "trust_score": "0.25"},
        ],
    )
    (snapshot_dir / "manifest.json").write_text(
        json.dumps(
            {
                "datasetVersion": dataset_version,
                "createdAtUtc": base_time.isoformat(),
                "files": {
                    "observables": "observables.csv",
                    "detections": "detections.csv",
                    "outcomes": "outcomes.csv",
                    "source_trust": "source_trust.csv",
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def _write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def _write_evaluation_report(path: Path, *, model_version: str, passed: bool) -> None:
    metric_value = 0.90 if passed else 0.40
    false_positive_rate = 0.02 if passed else 0.42
    path.write_text(
        json.dumps(
            {
                "modelVersion": model_version,
                "datasetVersion": "d-1",
                "sampleSize": 100,
                "overall": {
                    "precision": metric_value,
                    "recall": metric_value,
                    "f1": metric_value,
                    "likelyMaliciousPrecision": metric_value,
                    "prAuc": metric_value,
                    "calibrationError": 0.04,
                    "brierScore": 0.08,
                    "falsePositiveRate": false_positive_rate,
                    "falseNegativeRate": 0.05,
                    "unsafeRecommendationRate": 0.0,
                    "coverage": 0.80,
                },
                "slices": [
                    {"sliceField": "ioc_type", "sliceValue": "domain"},
                    {"sliceField": "source_system", "sliceValue": "feed"},
                    {"sliceField": "source_name", "sliceValue": "feed"},
                    {"sliceField": "source_type", "sliceValue": "trusted_feed"},
                    {"sliceField": "severity", "sliceValue": "high"},
                    {"sliceField": "table_confidence_bucket", "sliceValue": "high"},
                    {"sliceField": "age_bucket", "sliceValue": "1_7d"},
                    {"sliceField": "evidence_tier", "sliceValue": "attribute_only"},
                    {"sliceField": "label_provenance", "sliceValue": "trusted_feed"},
                    {"sliceField": "scan_evidence_available", "sliceValue": "missing"},
                    {"sliceField": "rule_family", "sliceValue": "sigma"},
                    {"sliceField": "recency_bucket", "sliceValue": "0_24h"},
                    {"sliceField": "trust_bucket", "sliceValue": "high"},
                    {"sliceField": "evidence_availability_bucket", "sliceValue": "sparse"},
                ],
                "protectedCases": {"failed": 0},
                "highQualityAttributeOnly": {"abstainRate": 0.10},
            },
            indent=2,
        ),
        encoding="utf-8",
    )
