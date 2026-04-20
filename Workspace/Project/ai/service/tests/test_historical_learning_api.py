from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import shutil

from fastapi.testclient import TestClient

from cti_service.api import create_app
from cti_service.config import ServiceSettings


def _build_client(name: str) -> tuple[TestClient, ServiceSettings]:
    root = Path(__file__).resolve().parent / f"_tmp_{name}"
    if root.exists():
        shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    artifacts = root / "artifacts"
    settings = ServiceSettings(
        service_name="historical-api-test",
        environment="test",
        artifacts_root=artifacts,
        action_policy_matrix_path=artifacts / "action_policy_matrix.v1.json",
        snapshot_root=root / "snapshots",
        registry_path=artifacts / "model_registry.json",
        dataset_registry_path=artifacts / "dataset_registry.json",
        feedback_store_path=artifacts / "feedback_events.jsonl",
        default_dataset_version=None,
    )
    return TestClient(create_app(settings)), settings


def test_historical_learning_api_feedback_query_and_score_case_roundtrip() -> None:
    client, _ = _build_client("historical_api_roundtrip")

    feedback_payloads = [
        {
            "eventType": "recommendation_feedback",
            "isFinal": True,
            "recommendationCode": "contain_host",
            "recommendationDisposition": "accepted",
            "occurredAtUtc": "2026-04-16T10:00:00Z",
        },
        {
            "eventType": "final_closure",
            "isFinal": True,
            "closureLabel": "confirmed_malicious",
            "closureVerdict": "malicious",
            "occurredAtUtc": "2026-04-16T10:05:00Z",
        },
        {
            "eventType": "post_action_outcome",
            "isFinal": True,
            "postActionOutcome": "regression",
            "occurredAtUtc": "2026-04-16T10:10:00Z",
        },
    ]
    for payload in feedback_payloads:
        response = client.post(
            "/feedback",
            json={
                "caseId": "case-hl-api-1",
                "decisionId": "decision-hl-api-1",
                "iocType": "domain",
                "iocValue": "history-api.example",
                "sourceSystem": "siem",
                "detectionFamily": "sigma",
                "verdict": "true_positive",
                "submittedByUserId": "analyst-1",
                "similarityContext": {
                    "ruleFamily": "sigma",
                    "ruleId": "SIG-HL-API-1",
                    "iocIndicators": [{"indicatorType": "domain", "indicatorValue": "history-api.example"}],
                    "behaviorPatterns": ["script_host"],
                    "networkDestinationFamilies": ["api.example"],
                },
                **payload,
            },
        )
        assert response.status_code == 200

    query_response = client.post(
        "/historical_learning/query",
        json={
            "caseId": "case-hl-api-query",
            "sourceSystem": "siem",
            "iocType": "domain",
            "iocValue": "history-api.example",
            "hostContext": {},
            "ruleContext": {},
            "topK": 5,
            "lookbackDays": 90,
        },
    )
    assert query_response.status_code == 200
    query_body = query_response.json()
    assert query_body["quality"]["eligibleCount"] >= 1
    assert query_body["historicalFeatures"]
    assert query_body["featureProvenance"]
    assert query_body["similarDetections"]
    top_query_similar = query_body["similarDetections"][0]
    assert 0.0 <= top_query_similar["similarityScore"] <= 1.0
    assert top_query_similar["similarityReasons"]
    assert "malicious" in top_query_similar["priorVerdicts"]
    assert "contain_host" in top_query_similar["priorAcceptedActions"]
    assert "regression" in top_query_similar["priorOutcomes"]

    score_response = client.post(
        "/score_case",
        json={
            "caseId": "case-hl-api-score",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "siem",
            "iocType": "domain",
            "iocValue": "history-api.example",
            "hostContext": {"criticality": 0.8},
            "ruleContext": {"ruleFamily": "sigma"},
            "detectionPackage": {
                "rule_family": "sigma",
                "full_rule_text": "title: Suspicious Script Host",
                "rule_metadata": {"source": "soc-content", "rule_id": "SIG-HL-API-1", "tags": ["suspicious"]},
                "raw_hit_payload": {"event_id": "evt-hl-api-1", "command_line": "wscript.exe launcher.js"},
                "object_metadata": {"object_id": "obj-hl-api-1", "object_type": "process_event", "source_system": "siem"},
            },
        },
    )
    assert score_response.status_code == 200
    grounded = score_response.json()["groundedDecision"]
    assert grounded["historicalLearning"] is not None
    assert grounded["historicalLearning"]["quality"]["eligibleCount"] >= 1
    assert grounded["historicalLearning"]["similarDetections"]
    top_score_similar = grounded["historicalLearning"]["similarDetections"][0]
    assert 0.0 <= top_score_similar["similarityScore"] <= 1.0
    assert top_score_similar["similarityReasons"]
    assert "contain_host" in top_score_similar["priorAcceptedActions"]
    assert "regression" in top_score_similar["priorOutcomes"]
    assert any(item["source"] == "historical_learning_feature" for item in grounded["provenance"])


def test_historical_learning_api_score_case_merges_caller_and_retrieved_similar_detection_fields() -> None:
    client, _ = _build_client("historical_api_merge_fields")

    feedback_payloads = [
        {
            "eventType": "recommendation_feedback",
            "isFinal": True,
            "recommendationCode": "contain_host",
            "recommendationDisposition": "accepted",
            "occurredAtUtc": "2026-04-16T11:00:00Z",
        },
        {
            "eventType": "post_action_outcome",
            "isFinal": True,
            "postActionOutcome": "regression",
            "occurredAtUtc": "2026-04-16T11:05:00Z",
        },
    ]
    for payload in feedback_payloads:
        response = client.post(
            "/feedback",
            json={
                "caseId": "case-hl-api-merge",
                "decisionId": "decision-hl-api-merge",
                "iocType": "domain",
                "iocValue": "history-api-merge.example",
                "sourceSystem": "siem",
                "detectionFamily": "sigma",
                "verdict": "true_positive",
                "submittedByUserId": "analyst-1",
                "similarityContext": {
                    "ruleFamily": "sigma",
                    "ruleId": "SIG-HL-API-MERGE",
                    "iocIndicators": [{"indicatorType": "domain", "indicatorValue": "history-api-merge.example"}],
                    "behaviorPatterns": ["script_host"],
                },
                **payload,
            },
        )
        assert response.status_code == 200

    score_response = client.post(
        "/score_case",
        json={
            "caseId": "case-hl-api-merge-score",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "siem",
            "iocType": "domain",
            "iocValue": "history-api-merge.example",
            "hostContext": {"criticality": 0.8},
            "ruleContext": {"ruleFamily": "sigma", "ruleId": "SIG-HL-API-MERGE"},
            "detectionPackage": {
                "rule_family": "sigma",
                "rule_metadata": {"rule_id": "SIG-HL-API-MERGE"},
                "raw_hit_payload": {"event_id": "evt-hl-api-merge-1"},
                "historical_learning_context": {
                    "features": {"history_support_signal": 0.1},
                    "feature_provenance": [],
                    "quality": {"eligible_count": 1, "dropped_count": 0, "drop_reasons": {}, "lookback_days": 90},
                    "similar_detections": [
                        {
                            "detection_id": "decision-hl-api-merge",
                            "rule_family": "sigma",
                            "rule_id": "SIG-HL-API-MERGE",
                            "relation_type": "supporting_signal",
                            "observed_at": "2026-04-15T00:00:00Z",
                            "confidence": 0.41,
                            "similarity_score": 0.40,
                            "similarity_reasons": ["caller supplied reason"],
                            "prior_verdicts": ["suspicious"],
                            "prior_accepted_actions": ["search_fleet"],
                            "prior_outcomes": ["success"],
                        }
                    ],
                },
            },
        },
    )
    assert score_response.status_code == 200
    similar = score_response.json()["groundedDecision"]["historicalLearning"]["similarDetections"]
    assert similar
    merged = next(
        item for item in similar if item["detectionId"] == "decision-hl-api-merge" and item["ruleId"] == "SIG-HL-API-MERGE"
    )
    assert "caller supplied reason" in merged["similarityReasons"]
    assert any(reason.startswith("same ") for reason in merged["similarityReasons"])
    assert "search_fleet" in merged["priorAcceptedActions"]
    assert "contain_host" in merged["priorAcceptedActions"]
    assert "success" in merged["priorOutcomes"]
    assert "regression" in merged["priorOutcomes"]


def test_historical_learning_api_does_not_mutate_model_or_dataset_registry() -> None:
    client, settings = _build_client("historical_api_registry_invariance")
    settings.registry_path.parent.mkdir(parents=True, exist_ok=True)
    settings.registry_path.write_text("{\"models\": []}", encoding="utf-8")
    settings.dataset_registry_path.write_text("{\"datasets\": []}", encoding="utf-8")
    before_registry = settings.registry_path.read_text(encoding="utf-8")
    before_dataset_registry = settings.dataset_registry_path.read_text(encoding="utf-8")

    response = client.post(
        "/feedback",
        json={
            "caseId": "case-hl-api-registry",
            "decisionId": "decision-hl-api-registry",
            "iocType": "domain",
            "iocValue": "registry-invariance.example",
            "sourceSystem": "siem",
            "eventType": "final_closure",
            "isFinal": True,
            "closureLabel": "confirmed_malicious",
            "closureVerdict": "malicious",
            "verdict": "true_positive",
            "submittedByUserId": "analyst-1",
        },
    )
    assert response.status_code == 200

    query_response = client.post(
        "/historical_learning/query",
        json={
            "caseId": "case-hl-api-registry-q",
            "sourceSystem": "siem",
            "iocType": "domain",
            "iocValue": "registry-invariance.example",
            "hostContext": {},
            "ruleContext": {},
        },
    )
    assert query_response.status_code == 200

    assert settings.registry_path.read_text(encoding="utf-8") == before_registry
    assert settings.dataset_registry_path.read_text(encoding="utf-8") == before_dataset_registry
