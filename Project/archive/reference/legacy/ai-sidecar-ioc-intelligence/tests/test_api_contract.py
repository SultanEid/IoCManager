from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _sample_request() -> dict:
    return {
        "ioc_value": "login-secure-account-update.tk",
        "ioc_type": "domain",
        "source_system": "snort",
        "event_time": datetime.now(timezone.utc).isoformat(),
        "host_context": {"criticality": 0.8, "asset_exposure": 0.7},
        "rule_context": {"scanner_agreement": 0.75, "severity_score": 0.9, "scanner_family": "snort"},
    }


def test_score_ioc_contract() -> None:
    response = client.post("/score_ioc", json=_sample_request())
    assert response.status_code == 200
    body = response.json()
    for key in [
        "risk_score",
        "risk_tier",
        "confidence",
        "uncertainty_set",
        "top_evidence",
        "recommended_action",
        "ttl_hours",
        "model_version",
    ]:
        assert key in body
    assert 0.0 <= body["risk_score"] <= 1.0
    assert 0.0 <= body["confidence"] <= 1.0
    assert len(body["uncertainty_set"]) == 2
    assert body["risk_tier"] in {"critical", "high", "medium", "low"}


def test_batch_contract() -> None:
    payload = {"items": [_sample_request(), _sample_request()]}
    response = client.post("/score_batch", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert len(body["items"]) == 2


def test_feedback_contract() -> None:
    payload = {
        "ioc_type": "domain",
        "ioc_value": "login-secure-account-update.tk",
        "verdict": "true_positive",
        "source_system": "analyst",
        "event_time": datetime.now(timezone.utc).isoformat(),
        "metadata": {"case_priority": "p1"},
    }
    response = client.post("/feedback", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True


def test_model_card_contract() -> None:
    response = client.get("/model_card")
    assert response.status_code == 200
    body = response.json()
    assert "model_version" in body
    assert "views" in body
    assert "optimization_target" in body


def test_ingest_report_contract() -> None:
    payload = {
        "source_name": "unit-test",
        "document_id": "rep-001",
        "document_url": "https://example.org/report",
        "document_text": "Observed C2 at 185.220.101.1 and hxxps://evil-login-check[.]xyz path. Related CVE-2024-12345 and T1059.",
        "ingestion_time": datetime.now(timezone.utc).isoformat(),
    }
    response = client.post("/ingest_report", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["report_id"] == "rep-001"
    assert "extracted_iocs" in body
    assert isinstance(body["extracted_iocs"], list)


def test_rule_proposal_contract() -> None:
    payload = {
        "ioc_type": "domain",
        "ioc_value": "evil-login-check.xyz",
        "risk_tier": "high",
        "preferred_family": "sigma",
        "context": {"attack": "phishing"},
    }
    response = client.post("/propose_rules", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "proposal_id" in body
    assert body["human_review_required"] is True
    assert body["rule_family"] == "sigma"


def test_deployment_recommendation_contract() -> None:
    payload = {
        "rule_family": "sigma",
        "rule_name": "Phishing Rule",
        "risk_tier": "high",
        "targets": [
            {
                "server_id": "srv-1",
                "hostname": "siem-01",
                "asset_class": "siem",
                "environment": "prod",
                "criticality": 0.9,
                "noise_tolerance": 0.2,
            }
        ],
    }
    response = client.post("/recommend_deployment", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "recommendations" in body
    assert len(body["recommendations"]) == 1


def test_copilot_contract() -> None:
    payload = {
        "question": "Why is this IOC high priority and what should we deploy?",
        "observable_id": 10,
    }
    response = client.post("/copilot/query", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "answer" in body
    assert "citations" in body


def test_graph_link_candidates_contract() -> None:
    payload = {
        "seed_observable_id": 1,
        "top_k": 2,
        "seed_type": "domain",
        "seed_value": "evil-login-check.xyz",
        "candidate_nodes": [
            {
                "observable_id": 2,
                "type": "domain",
                "value": "evil-check.xyz",
                "confidence": 85,
                "source_count": 6,
                "last_seen_utc": datetime.now(timezone.utc).isoformat(),
                "existing_links": 3,
            },
            {
                "observable_id": 3,
                "type": "ip",
                "value": "185.220.101.1",
                "confidence": 90,
                "source_count": 8,
                "last_seen_utc": datetime.now(timezone.utc).isoformat(),
                "existing_links": 5,
            },
        ],
    }
    response = client.post("/graph/link_candidates", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) <= 2


def test_score_case_contract() -> None:
    payload = {
        "case_id": "case-1",
        "as_of_time": datetime.now(timezone.utc).isoformat(),
        "source_system": "manager",
        "ioc_type": "domain",
        "ioc_value": "evil-login-check.xyz",
        "host_context": {"criticality": 0.8},
        "rule_context": {"severity_score": 0.7, "scanner_agreement": 0.6},
    }
    response = client.post("/score_case", json=payload)
    assert response.status_code == 200
    body = response.json()
    for key in [
        "maliciousness_score",
        "actionability_score",
        "deployability_score",
        "decay_score",
        "uncertainty_score",
        "blast_radius_score",
        "uncertainty_band",
        "model_version",
        "dataset_version",
        "feature_snapshot_hash",
    ]:
        assert key in body


def test_recommend_action_contract() -> None:
    payload = {
        "case_id": "case-1",
        "is_critical_asset": False,
        "evidence_conflict": 0.1,
        "missing_evidence_hints_count": 0,
        "score_vector": {
            "maliciousness_score": 0.8,
            "actionability_score": 0.7,
            "deployability_score": 0.65,
            "decay_score": 0.2,
            "uncertainty_score": 0.1,
            "blast_radius_score": 0.35,
            "uncertainty_band": [0.6, 0.9],
            "top_evidence": [],
            "model_version": "v1",
            "dataset_version": "d1",
            "feature_snapshot_hash": "abc",
        },
    }
    response = client.post("/recommend_action", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "decision_state" in body
    assert "recommended_action" in body
    assert "approval_tier_required" in body
    assert "policy_version" in body


def test_request_more_evidence_contract() -> None:
    payload = {"case_id": "case-1", "reason": "conflict"}
    response = client.post("/request_more_evidence", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["case_id"] == "case-1"
    assert "next_best_evidence" in body


def test_simulate_rule_contract() -> None:
    payload = {
        "case_id": "case-1",
        "rule_type": "sigma",
        "rule_body": "title: suspicious login\n detection:\n   selection:\n     CommandLine|contains: hxxp\n",
    }
    response = client.post("/simulate_rule", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "predicted_coverage" in body
    assert "predicted_fp_risk" in body
