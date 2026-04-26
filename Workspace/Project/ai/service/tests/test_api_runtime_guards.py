from __future__ import annotations

import json
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from decision_service.api import create_app
from decision_service.config import load_settings
from decision_service.registry import ModelRegistryEntry, ModelRegistryStore


def test_score_batch_rejects_too_many_items(settings) -> None:
    limited_settings = replace(settings, max_score_batch_items=1)
    limited_client = TestClient(create_app(limited_settings))
    item = {
        "caseId": "case-ok",
        "iocType": "domain",
        "iocValue": "login-secure-update.test",
        "sourceSystem": "feed_a",
        "hostContext": {"criticality": 0.8},
        "ruleContext": {"severityScore": 0.9},
    }

    response = limited_client.post("/score_batch", json={"items": [item, item]})

    assert response.status_code == 413
    body = response.json()
    assert body["detail"]["limit"] == 1


def test_score_batch_rejects_too_large_request_body(settings) -> None:
    limited_settings = replace(settings, max_expensive_request_body_bytes=64)
    limited_client = TestClient(create_app(limited_settings))
    payload = json.dumps({"items": [{"caseId": "case-ok", "padding": "x" * 128}]})

    response = limited_client.post("/score_batch", content=payload, headers={"content-type": "application/json"})

    assert response.status_code == 413
    body = response.json()
    assert body["limitBytes"] == 64


def test_evaluate_model_endpoint_disabled_in_production(settings) -> None:
    production_settings = replace(
        settings,
        environment="production",
        enable_http_model_evaluation=False,
    )
    production_client = TestClient(create_app(production_settings))

    response = production_client.post(
        "/evaluate_model",
        json={"modelVersion": "v1-test", "datasetVersion": "test-v1", "horizonHours": 72},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Model evaluation endpoint is disabled for this environment."


def test_health_includes_empty_runtime_warnings(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["runtimeWarnings"] == []


def test_health_surfaces_sanitized_dataset_startup_warning(settings) -> None:
    degraded_settings = replace(settings, default_dataset_version="missing-dataset")
    degraded_client = TestClient(create_app(degraded_settings))

    response = degraded_client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["runtimeWarnings"] == ["dataset_snapshot_load_failed"]
    warnings_payload = json.dumps(body["runtimeWarnings"])
    assert "Traceback" not in warnings_payload
    assert "C:" not in warnings_payload


def test_health_surfaces_sanitized_model_artifact_warning(settings, tmp_path: Path) -> None:
    artifacts_root = tmp_path / "artifacts"
    artifact_path = artifacts_root / "models" / "v1-bad" / "metrics.json"
    artifact_path.parent.mkdir(parents=True)
    artifact_path.write_text('{"precision": 1.0}', encoding="utf-8")
    registry_path = artifacts_root / "model_registry.json"
    ModelRegistryStore(registry_path).upsert(
        ModelRegistryEntry(
            model_id="cti-v1",
            model_version="v1-bad",
            dataset_version="test-v1",
            status="active",
            created_at_utc=datetime.now(timezone.utc),
            artifact_paths={"metrics": "models/v1-bad/metrics.json"},
            artifact_hashes={"metrics": "bad-hash"},
        )
    )
    degraded_settings = replace(
        settings,
        artifacts_root=artifacts_root,
        registry_path=registry_path,
        dataset_registry_path=artifacts_root / "dataset_registry.json",
        feedback_store_path=artifacts_root / "feedback_events.jsonl",
    )
    degraded_client = TestClient(create_app(degraded_settings))

    response = degraded_client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert "model_artifact_validation_failed" in body["runtimeWarnings"]
    warnings_payload = json.dumps(body["runtimeWarnings"])
    assert "bad-hash" not in warnings_payload
    assert "C:" not in warnings_payload


def test_score_case_rejects_malformed_required_fields(client) -> None:
    response = client.post(
        "/score_case",
        json={
            "caseId": "case-malformed",
            "sourceSystem": "feed",
            "iocType": "domain",
            "iocValue": "",
        },
    )

    assert response.status_code == 422


def test_load_settings_disables_http_evaluation_by_default_for_staging(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("IOC_MANAGER_AI_ARTIFACTS_ROOT", str(tmp_path / "artifacts"))
    monkeypatch.setenv("IOC_MANAGER_AI_ENV", "staging")

    settings = load_settings()

    assert settings.enable_http_model_evaluation is False


def test_load_settings_accepts_runtime_guard_aliases(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("IOC_MANAGER_AI_ARTIFACTS_ROOT", str(tmp_path / "artifacts"))
    monkeypatch.setenv("IOC_MANAGER_AI_MAX_SCORE_BATCH_ITEMS", "7")
    monkeypatch.setenv("IOC_MANAGER_AI_MAX_EXPENSIVE_REQUEST_BODY_BYTES", "4096")
    monkeypatch.setenv("IOC_MANAGER_AI_ENABLE_HTTP_MODEL_EVALUATION", "true")

    settings = load_settings()

    assert settings.max_score_batch_items == 7
    assert settings.max_expensive_request_body_bytes == 4096
    assert settings.enable_http_model_evaluation is True
