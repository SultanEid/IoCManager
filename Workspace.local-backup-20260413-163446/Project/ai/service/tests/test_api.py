from __future__ import annotations

from datetime import datetime, timezone


def test_score_case_endpoint(client) -> None:
    response = client.post(
        "/score_case",
        json={
            "caseId": "case-1",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "feed_a",
            "iocType": "domain",
            "iocValue": "login-secure-update.test",
            "hostContext": {"criticality": 0.8, "assetExposure": 0.7},
            "ruleContext": {"severityScore": 0.9, "scannerAgreement": 0.8},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["modelVersion"] == "v1-test"
    assert body["caseId"] == "case-1"
    assert "maliciousnessScore" in body
    assert "featureGroups" in body
    assert "decisionState" in body
    assert "groundedDecision" in body
    assert "verdict" in body["groundedDecision"]
    assert "action" in body["groundedDecision"]
    assert "confidence" in body["groundedDecision"]


def test_recommend_action_endpoint(client) -> None:
    response = client.post(
        "/recommend_action",
        json={
            "caseId": "case-ra-1",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "feed_a",
            "iocType": "url",
            "iocValue": "hxxps://evil-login-check.test/path",
            "hostContext": {"criticality": 0.8, "assetExposure": 0.7},
            "ruleContext": {
                "severityScore": 0.9,
                "scannerAgreement": 0.8,
                "sightingsCount": 6,
                "evidenceConflict": 0.1,
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "verdict" in body
    assert "action" in body
    assert "confidence" in body
    assert "provenance" in body
    assert "reasons" in body


def test_request_more_evidence_endpoint_and_validation(client) -> None:
    valid = client.post(
        "/request_more_evidence",
        json={
            "caseId": "case-rme-1",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "feed_a",
            "iocType": "domain",
            "iocValue": "login-secure-update.test",
            "hostContext": {"criticality": 0.7, "assetExposure": 0.5},
            "ruleContext": {"severityScore": 0.8, "scannerAgreement": 0.6, "evidenceConflict": 0.5},
        },
    )
    assert valid.status_code == 200
    body = valid.json()
    assert body["verdict"] == "insufficient_evidence"
    assert body["action"] == "hold"
    assert body["abstainReason"] in {
        "high_uncertainty",
        "high_evidence_conflict",
        "low_source_trust",
        "low_sightings_corroboration",
        "missing_non_string_corroboration",
        "insufficient_correlated_evidence",
    }
    assert body["nextBestEvidence"]

    invalid = client.post("/request_more_evidence", json={"caseId": "missing-required"})
    assert invalid.status_code == 422


def test_score_batch_endpoint_with_per_item_errors(client) -> None:
    payload = {
        "items": [
            {
                "caseId": "case-ok",
                "iocType": "domain",
                "iocValue": "login-secure-update.test",
                "sourceSystem": "feed_a",
                "hostContext": {"criticality": 0.8},
                "ruleContext": {"severityScore": 0.9},
            },
            {
                "caseId": "case-bad",
                "iocType": "domain"
            },
        ]
    }
    response = client.post("/score_batch", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["succeeded"] == 1
    assert body["failed"] == 1
    assert body["items"][0]["result"]["groundedDecision"]["verdict"]


def test_explain_case_endpoint(client) -> None:
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "case": {
            "id": "case-1",
            "title": "Suspicious domain",
            "summary": "Summary",
            "ownerUserId": "u-1",
            "state": "triage",
            "openedAtUtc": now,
            "closedAtUtc": None,
        },
        "decision": {
            "id": "d-1",
            "decisionState": "recommend",
            "recommendationCode": "contain_and_monitor",
            "recommendationSummary": "Contain after review",
            "snapshotHash": "abc",
            "modelVersion": "v1-test",
            "policyVersion": "p1",
            "transformationLineageHash": "lineage",
            "decidedAtUtc": now,
        },
        "snapshot": {
            "id": "s-1",
            "snapshotHash": "abc",
            "capturedAtUtc": now,
            "featureWindowStartUtc": now,
            "featureWindowEndUtc": now,
            "capturedByPipeline": "cti-v1",
        },
        "evidenceReferences": [
            {
                "evidenceAssertionId": "e-1",
                "evidenceReference": "ref",
                "assertionType": "ioc",
                "statement": "IOC seen in telemetry",
                "confidence": 0.8,
                "isConflicting": False,
                "sourceReference": "source://x",
                "observedAtUtc": now,
                "referencedAtUtc": now,
            }
        ],
    }
    response = client.post("/explain_case", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["decisionId"] == "d-1"
    assert "replayBundleHash" in body


def test_extract_report_and_alias(client) -> None:
    payload = {
        "sourceName": "test",
        "documentId": "rep-1",
        "documentUrl": "https://example.org",
        "documentText": "Observed hxxps://evil-login-check.test and 185.220.101.1 with T1059 and CVE-2024-12345.",
        "ingestionTime": datetime.now(timezone.utc).isoformat(),
    }
    canonical = client.post("/extract_report", json=payload)
    alias = client.post("/ingest_report", json=payload)
    assert canonical.status_code == 200
    assert alias.status_code == 200
    assert canonical.json()["reportId"] == "rep-1"
    assert alias.json()["reportId"] == "rep-1"


def test_graph_neighbors_and_alias(client) -> None:
    payload = {
        "seedObservableId": 1,
        "topK": 2,
        "seedType": "domain",
        "seedValue": "evil-login-check.test",
        "candidateNodes": [
            {
                "observableId": 2,
                "type": "domain",
                "value": "evil-check.test",
                "confidence": 90,
                "sourceCount": 5,
                "lastSeenUtc": datetime.now(timezone.utc).isoformat(),
                "existingLinks": 4,
            }
        ],
    }
    canonical = client.post("/graph_neighbors", json=payload)
    alias = client.post("/graph/link_candidates", json=payload)
    assert canonical.status_code == 200
    assert alias.status_code == 200
    assert isinstance(canonical.json(), list)
    assert isinstance(alias.json(), list)


def test_feedback_endpoint(client) -> None:
    payload = {
        "caseId": "case-1",
        "decisionId": "d-1",
        "verdict": "true_positive",
        "notes": "valid",
        "submittedByUserId": "analyst-1",
    }
    response = client.post("/feedback", json=payload)
    assert response.status_code == 200
    assert response.json()["accepted"] is True


def test_evaluate_model_endpoint(client) -> None:
    payload = {
        "modelVersion": "v1-test",
        "datasetVersion": "test-v1",
        "horizonHours": 72,
        "sliceFields": ["ioc_type", "source_system", "time_bucket"],
    }
    response = client.post("/evaluate_model", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["modelVersion"] == "v1-test"
    assert body["datasetVersion"] == "test-v1"
    assert "overall" in body
    assert "slices" in body
    assert "unavailableMetrics" in body["overall"]


def test_health_includes_version_metadata(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["modelVersion"] == "v1-test"
    assert body["datasetVersion"] == "test-v1"
    assert body["scoringProfileVersion"] == "heuristic-v1"
    assert "featureSchemaVersion" in body
    assert body["datasetManifestHash"] is not None
