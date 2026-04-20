from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from cti_service.api import create_app
from cti_service.calibration import LogisticCalibrator
from cti_service.config import ServiceSettings
from cti_service.registry import ModelRegistryEntry, ModelRegistryStore


@pytest.fixture()
def snapshot_root(tmp_path: Path) -> Path:
    root = tmp_path / "snapshots"
    version = "test-v1"
    snapshot_dir = root / version
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    now = datetime(2026, 3, 12, 12, 0, tzinfo=timezone.utc)
    observables = pd.DataFrame(
        [
            {
                "ioc_type": "domain",
                "ioc_value": "login-secure-update.test",
                "event_time": (now - timedelta(hours=48)).isoformat(),
                "source_system": "feed_a",
                "host_context_json": json.dumps({"criticality": 0.8, "assetExposure": 0.7}),
                "rule_context_json": json.dumps({"severityScore": 0.9, "scannerAgreement": 0.8}),
            },
            {
                "ioc_type": "domain",
                "ioc_value": "example.org",
                "event_time": (now - timedelta(hours=24)).isoformat(),
                "source_system": "feed_b",
                "host_context_json": json.dumps({"criticality": 0.2, "assetExposure": 0.2}),
                "rule_context_json": json.dumps({"severityScore": 0.2, "scannerAgreement": 0.2}),
            },
            {
                "ioc_type": "url",
                "ioc_value": "hxxps://evil-login-check.test/path",
                "event_time": (now - timedelta(hours=6)).isoformat(),
                "source_system": "feed_c",
                "host_context_json": json.dumps({"criticality": 0.7, "assetExposure": 0.6}),
                "rule_context_json": json.dumps({"severityScore": 0.85, "scannerAgreement": 0.7}),
            },
        ]
    )
    detections = pd.DataFrame(
        [
            {
                "ioc_type": "domain",
                "ioc_value": "login-secure-update.test",
                "event_time": (now - timedelta(hours=47)).isoformat(),
                "scanner_family": "sigma",
                "severity_score": 0.9,
            },
            {
                "ioc_type": "domain",
                "ioc_value": "example.org",
                "event_time": (now - timedelta(hours=23)).isoformat(),
                "scanner_family": "snort",
                "severity_score": 0.2,
            },
            {
                "ioc_type": "url",
                "ioc_value": "hxxps://evil-login-check.test/path",
                "event_time": (now - timedelta(hours=5)).isoformat(),
                "scanner_family": "sigma",
                "severity_score": 0.86,
            },
        ]
    )
    outcomes = pd.DataFrame(
        [
            {
                "ioc_type": "domain",
                "ioc_value": "login-secure-update.test",
                "event_time": (now - timedelta(hours=40)).isoformat(),
                "verdict": "true_positive",
            },
            {
                "ioc_type": "domain",
                "ioc_value": "example.org",
                "event_time": (now - timedelta(hours=20)).isoformat(),
                "verdict": "benign",
            },
            {
                "ioc_type": "url",
                "ioc_value": "hxxps://evil-login-check.test/path",
                "event_time": (now - timedelta(hours=2)).isoformat(),
                "verdict": "escalated",
            },
        ]
    )
    source_trust = pd.DataFrame(
        [
            {"source_system": "feed_a", "trust_score": 0.30},
            {"source_system": "feed_b", "trust_score": 0.90},
            {"source_system": "feed_c", "trust_score": 0.45},
        ]
    )

    observables.to_csv(snapshot_dir / "observables.csv", index=False)
    detections.to_csv(snapshot_dir / "detections.csv", index=False)
    outcomes.to_csv(snapshot_dir / "outcomes.csv", index=False)
    source_trust.to_csv(snapshot_dir / "source_trust.csv", index=False)
    manifest = {
        "datasetVersion": version,
        "createdAtUtc": now.isoformat(),
        "files": {
            "observables": "observables.csv",
            "detections": "detections.csv",
            "outcomes": "outcomes.csv",
            "source_trust": "source_trust.csv",
        },
    }
    (snapshot_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return root


@pytest.fixture()
def settings(tmp_path: Path, snapshot_root: Path) -> ServiceSettings:
    artifacts_root = tmp_path / "artifacts"
    registry_path = artifacts_root / "model_registry.json"
    dataset_registry_path = artifacts_root / "dataset_registry.json"
    feedback_path = artifacts_root / "feedback_events.jsonl"

    store = ModelRegistryStore(registry_path)
    now = datetime.now(timezone.utc)
    store.upsert(
        ModelRegistryEntry(
            model_id="cti-v1-baseline",
            model_version="v1-test",
            dataset_version="test-v1",
            status="active",
            created_at_utc=now,
            published_at_utc=now,
            metrics={"precision": 0.6, "recall": 0.8},
            thresholds={"recommend": 0.55, "escalate": 0.8, "abstain": 0.35},
            calibration=LogisticCalibrator().to_dict(),
        )
    )
    return ServiceSettings(
        service_name="test-service",
        environment="test",
        artifacts_root=artifacts_root,
        snapshot_root=snapshot_root,
        registry_path=registry_path,
        dataset_registry_path=dataset_registry_path,
        feedback_store_path=feedback_path,
        default_dataset_version="test-v1",
    )


@pytest.fixture()
def client(settings: ServiceSettings) -> TestClient:
    app = create_app(settings)
    return TestClient(app)
