from __future__ import annotations

from datetime import datetime, timezone

import pytest

from decision_service.config import load_settings

CANONICAL_VERDICTS = {
    "benign",
    "likely_benign",
    "suspicious",
    "likely_malicious",
    "malicious",
    "false_positive",
    "insufficient_evidence",
    "stale_or_revoked",
}
REVIEW_PRIORITIES = {"low", "medium", "high", "critical"}
ESCALATION_TARGETS = {
    "none",
    "analyst_queue",
    "security_admin",
    "it_operator",
    "incident_response",
}
REVIEWER_ROLES = {
    "tier1_analyst",
    "tier2_detection_engineer",
    "incident_responder",
}


def _assert_action_plan_shape(action_plan: dict) -> None:
    assert "summary" in action_plan
    assert "recommendedActions" in action_plan
    assert 1 <= len(action_plan["recommendedActions"]) <= 3
    assert "prerequisites" in action_plan
    assert "cautions" in action_plan
    assert action_plan["neverAutoExecutes"] is True
    assert action_plan["policyConstrained"] is True
    assert action_plan["evidenceBased"] is True
    assert "machineReadable" in action_plan
    for rank, action in enumerate(action_plan["recommendedActions"], start=1):
        assert "action" in action
        assert action["rank"] == rank
        assert 0.0 <= action["score"] <= 1.0
        assert action["requiresHumanApproval"] is True
        assert action["executionMode"] == "manual_only"
        assert action["escalationTarget"] in ESCALATION_TARGETS
        assert action["requiredReviewerRole"] in REVIEWER_ROLES
        assert "rationale" in action
        assert "prerequisites" in action
        assert "cautions" in action


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
            "detectionPackage": {
                "rule_family": "sigma",
                "full_rule_text": "title: Suspicious Script Host",
                "rule_metadata": {"source": "soc-content", "rule_id": "SIG-API-1", "tags": ["suspicious"]},
                "raw_hit_payload": {"event_id": "evt-api-1", "command_line": "wscript.exe launcher.js"},
                "object_metadata": {"object_id": "obj-api-1", "object_type": "process_event", "source_system": "siem"},
                "asset_context": {"asset_id": "asset-api-1", "criticality": "high", "environment": "prod"},
                "linked_enrichment": {
                    "enrichments": [
                        {"kind": "reputation", "source": "intel-feed", "value": {"score": 90}, "confidence": 0.86},
                        {"kind": "reputation", "source": "intel-feed", "value": {"score": 90}, "confidence": 0.86},
                    ]
                },
                "behavior_report_references": {
                    "reports": [
                        {
                            "report_id": "rep-api-1",
                            "source": "sandbox-cluster",
                            "reference": "internal://reports/rep-api-1",
                            "summary": "Behavior report supports malicious execution.",
                        }
                    ]
                },
                "prior_analyst_outcomes": {
                    "outcomes": [
                        {
                            "analyst_id": "analyst-1",
                            "case_id": "case-history-1",
                            "verdict": "false_positive",
                            "notes": "Prior benign installer case.",
                        }
                    ]
                },
            },
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
    assert "falsePositiveRisk" in body["groundedDecision"]
    assert "reviewPriority" in body["groundedDecision"]
    assert "shouldPromoteToIndicator" in body["groundedDecision"]
    assert "shouldSuppress" in body["groundedDecision"]
    assert "shouldAllowlist" in body["groundedDecision"]
    assert "shouldEscalate" in body["groundedDecision"]
    assert "safetyDiagnostics" in body["groundedDecision"]
    assert "evidenceFusion" in body["groundedDecision"]
    assert "promotionSuppressionDecision" in body["groundedDecision"]
    assert "actionPlan" in body["groundedDecision"]
    assert body["groundedDecision"]["verdict"] in CANONICAL_VERDICTS
    assert 0.0 <= body["groundedDecision"]["confidence"] <= 1.0
    assert 0.0 <= body["groundedDecision"]["falsePositiveRisk"] <= 1.0
    assert body["groundedDecision"]["reviewPriority"] in REVIEW_PRIORITIES
    assert "decision" in body["groundedDecision"]["promotionSuppressionDecision"]
    assert "confidence" in body["groundedDecision"]["promotionSuppressionDecision"]
    assert "rationale" in body["groundedDecision"]["promotionSuppressionDecision"]
    assert body["groundedDecision"]["safetyDiagnostics"]["autoRemediationAllowed"] is False
    _assert_action_plan_shape(body["groundedDecision"]["actionPlan"])
    fusion = body["groundedDecision"]["evidenceFusion"]
    assert "positiveEvidence" in fusion
    assert "negativeEvidence" in fusion
    assert "contradictoryEvidence" in fusion
    assert "missingEvidence" in fusion
    assert fusion["deduplication"]["duplicateCount"] >= 1


def test_score_case_endpoint_uses_deterministic_yara_decision_for_lexical_only_input(client) -> None:
    response = client.post(
        "/score_case",
        json={
            "caseId": "case-yara-lexical-only",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "feed_a",
            "iocType": "hash",
            "iocValue": "a" * 64,
            "hostContext": {"criticality": 0.6, "assetExposure": 0.4},
            "ruleContext": {"ruleFamily": "yara"},
            "detectionPackage": {
                "rule_family": "yara",
                "full_rule_text": "rule LexicalOnly { strings: $a = \"VirtualAllocEx\" ascii wide condition: $a }",
                "rule_metadata": {
                    "source": "unit",
                    "rule_id": "YARA-LEX-1",
                    "rule_name": "LexicalOnly",
                    "tags": ["suspicious", "memory_injection"],
                },
                "raw_hit_payload": {
                    "event_id": "evt-yara-lex-1",
                    "matched_strings": ["VirtualAllocEx"],
                    "match_count": 1,
                },
                "object_metadata": {
                    "object_id": "obj-yara-lex-1",
                    "object_type": "file",
                    "source_system": "edr",
                },
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    grounded = body["groundedDecision"]
    assert grounded["verdict"] == "insufficient_evidence"
    assert grounded["abstainReason"] == "missing_non_string_corroboration"
    assert grounded["reasons"]
    assert grounded["nextBestEvidence"]
    assert 0.0 <= grounded["falsePositiveRisk"] <= 1.0
    assert grounded["safetyDiagnostics"]["weakEvidence"] is True


def test_score_case_endpoint_promotes_nested_yara_scanner_evidence(client) -> None:
    response = client.post(
        "/score_case",
        json={
            "caseId": "case-yara-nested-scanner-evidence",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "yara",
            "iocType": "file_path",
            "iocValue": "C:/Temp/sample.bin",
            "hostContext": {"criticality": 0.72, "assetExposure": 0.25},
            "ruleContext": {
                "ruleFamily": "yara",
                "severityScore": 0.82,
                "scannerAgreement": 0.78,
                "sourceTrust": 0.74,
                "providerConfidence": 0.82,
                "indicatorStrength": 0.82,
                "enrichmentStrength": 0.65,
                "activitySignal": 0.70,
                "externalSourceSignal": 0.68,
                "sightingsCount": 1,
                "sightingsCorroboration": 0.48,
                "evidenceConflict": 0.0,
            },
            "detectionPackage": {
                "rule_family": "yara",
                "full_rule_text": "rule LabDetection { strings: $a = \"MALWARE_TEST_STRING\" ascii condition: $a }",
                "rule_metadata": {
                    "source": "manual",
                    "rule_id": "YARA-LAB-1",
                    "rule_name": "LabDetection",
                    "tags": ["malware", "lab"],
                    "meta": {"severity": "high"},
                },
                "raw_hit_payload": {
                    "filePath": "C:/Temp/sample.bin",
                    "evidence": {
                        "matchedStrings": ["MALWARE_TEST_STRING"],
                        "filePath": "C:/Temp/sample.bin",
                        "matchCount": 1,
                        "engine": "yara",
                    },
                },
                "object_metadata": {
                    "object_id": "scan-result-yara-1",
                    "object_type": "file",
                    "source_system": "yara",
                },
                "asset_context": {
                    "asset_id": "zombie-vm",
                    "asset_name": "Zombie",
                    "asset_type": "scan_target",
                    "criticality": "high",
                    "environment": "lab",
                    "internet_exposed": False,
                },
                "time_prevalence_context": {
                    "hit_count_24h": 1,
                    "hit_count_7d": 1,
                    "prevalence_ratio": 0.001,
                    "recency_bucket": "recent",
                    "trend": "new",
                },
                "linked_enrichment": {
                    "enrichments": [
                        {
                            "kind": "scanner_result_high",
                            "source": "app-db-scan-results",
                            "confidence": 0.82,
                            "value": {"scanner_family": "yara", "severity": "high"},
                        }
                    ]
                },
                "behavior_report_references": {
                    "reports": [
                        {
                            "report_id": "scan-result-yara-1",
                            "source": "app-db-scan-results",
                            "summary": "YARA scanner reported high severity malicious scanner evidence.",
                        }
                    ]
                },
            },
        },
    )
    assert response.status_code == 200
    grounded = response.json()["groundedDecision"]
    assert grounded["verdict"] in {"suspicious", "likely_malicious", "malicious"}
    assert grounded["action"] != "hold"
    assert grounded["abstainReason"] is None
    assert grounded["safetyDiagnostics"]["weakEvidence"] is False


def test_score_case_endpoint_uses_deterministic_sigma_decision_for_lexical_only_input(client) -> None:
    response = client.post(
        "/score_case",
        json={
            "caseId": "case-sigma-lexical-only",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "feed_a",
            "iocType": "domain",
            "iocValue": "secure-login-update.example",
            "hostContext": {"criticality": 0.6, "assetExposure": 0.4},
            "ruleContext": {"ruleFamily": "sigma"},
            "detectionPackage": {
                "rule_family": "sigma",
                "full_rule_text": "title: Suspicious Script Host\ncondition: selection",
                "rule_metadata": {
                    "source": "unit",
                    "rule_id": "SIGMA-LEX-1",
                    "title": "Suspicious Script Host",
                    "id": "sigma-lex-1",
                    "status": "test",
                    "tags": ["suspicious", "defense_evasion"],
                    "logsource": {"category": "process_creation", "product": "windows"},
                },
                "raw_hit_payload": {
                    "event_id": "evt-sigma-lex-1",
                    "command_line": "wscript.exe //E:jscript launcher.js -enc U0FNUExFX0RBVEE=",
                    "image": "C:/Windows/System32/wscript.exe",
                },
                "object_metadata": {
                    "object_id": "obj-sigma-lex-1",
                    "object_type": "process_event",
                    "source_system": "siem",
                },
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    grounded = body["groundedDecision"]
    assert grounded["verdict"] == "insufficient_evidence"
    assert grounded["abstainReason"] == "missing_non_string_corroboration"
    assert grounded["reasons"]
    assert grounded["nextBestEvidence"]
    assert "SIGMA deterministic decision produced verdict=" in grounded["reasons"][0]
    assert 0.0 <= grounded["falsePositiveRisk"] <= 1.0
    assert grounded["safetyDiagnostics"]["weakEvidence"] is True


def test_score_case_endpoint_uses_deterministic_snort_decision_for_lexical_only_input(client) -> None:
    response = client.post(
        "/score_case",
        json={
            "caseId": "case-snort-lexical-only",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "feed_a",
            "iocType": "ip",
            "iocValue": "198.51.100.22",
            "hostContext": {"criticality": 0.6, "assetExposure": 0.4},
            "ruleContext": {"ruleFamily": "snort"},
            "detectionPackage": {
                "rule_family": "snort",
                "full_rule_text": (
                    "alert tcp any any -> any 443 "
                    "(msg:\"Suspicious periodic beacon cadence\"; sid:551001; rev:3; classtype:trojan-activity;)"
                ),
                "rule_metadata": {
                    "source": "unit",
                    "rule_id": "SNORT-LEX-1",
                    "sid": 551001,
                    "rev": 3,
                    "msg": "Suspicious periodic beacon cadence",
                    "classification": "trojan-activity",
                    "protocol": "tcp",
                },
                "raw_hit_payload": {
                    "event_id": "evt-snort-lex-1",
                    "message": "Suspicious periodic beacon cadence",
                },
                "object_metadata": {
                    "object_id": "obj-snort-lex-1",
                    "object_type": "network_flow",
                    "source_system": "ids",
                },
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    grounded = body["groundedDecision"]
    assert grounded["verdict"] == "insufficient_evidence"
    assert grounded["abstainReason"] == "missing_non_string_corroboration"
    assert grounded["reasons"]
    assert grounded["nextBestEvidence"]
    assert "SNORT deterministic decision produced verdict=" in grounded["reasons"][0]
    assert 0.0 <= grounded["falsePositiveRisk"] <= 1.0
    assert grounded["safetyDiagnostics"]["weakEvidence"] is True


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
    assert "falsePositiveRisk" in body
    assert "reviewPriority" in body
    assert "shouldPromoteToIndicator" in body
    assert "shouldSuppress" in body
    assert "shouldAllowlist" in body
    assert "shouldEscalate" in body
    assert "safetyDiagnostics" in body
    assert "promotionSuppressionDecision" in body
    assert "actionPlan" in body
    assert "provenance" in body
    assert "reasons" in body
    assert body["verdict"] in CANONICAL_VERDICTS
    assert 0.0 <= body["confidence"] <= 1.0
    assert 0.0 <= body["falsePositiveRisk"] <= 1.0
    assert body["reviewPriority"] in REVIEW_PRIORITIES
    assert body["safetyDiagnostics"]["autoRemediationAllowed"] is False
    assert "decision" in body["promotionSuppressionDecision"]
    assert "confidence" in body["promotionSuppressionDecision"]
    assert "rationale" in body["promotionSuppressionDecision"]
    _assert_action_plan_shape(body["actionPlan"])


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
    assert "falsePositiveRisk" in body
    assert "reviewPriority" in body
    assert "shouldPromoteToIndicator" in body
    assert "shouldSuppress" in body
    assert "shouldAllowlist" in body
    assert "shouldEscalate" in body
    assert "safetyDiagnostics" in body
    assert "promotionSuppressionDecision" in body
    assert "actionPlan" in body
    assert body["verdict"] in CANONICAL_VERDICTS
    assert 0.0 <= body["confidence"] <= 1.0
    assert 0.0 <= body["falsePositiveRisk"] <= 1.0
    assert body["reviewPriority"] in REVIEW_PRIORITIES
    assert "decision" in body["promotionSuppressionDecision"]
    assert "confidence" in body["promotionSuppressionDecision"]
    assert "rationale" in body["promotionSuppressionDecision"]
    _assert_action_plan_shape(body["actionPlan"])
    assert body["abstainReason"] in {
        "high_uncertainty",
        "high_evidence_conflict",
        "low_source_trust",
        "low_sightings_corroboration",
        "missing_non_string_corroboration",
        "insufficient_correlated_evidence",
        "missing_critical_fields",
    }
    assert body["nextBestEvidence"]


def test_score_case_degraded_enrichment_returns_200_with_safety_diagnostics(client) -> None:
    response = client.post(
        "/score_case",
        json={
            "caseId": "case-enrichment-degraded",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "feed_a",
            "iocType": "domain",
            "iocValue": "degraded-enrichment.example",
            "hostContext": {"criticality": 0.6, "assetExposure": 0.4},
            "ruleContext": {"ruleFamily": "sigma"},
            "detectionPackage": {
                "rule_family": "sigma",
                "full_rule_text": "title: Suspicious Script Host",
                "rule_metadata": {"source": "unit", "rule_id": "SIG-DEG-API-1", "title": "Suspicious Script Host"},
                "raw_hit_payload": {
                    "event_id": "evt-deg-api-1",
                    "command_line": "wscript.exe launcher.js",
                    "image": "C:/Windows/System32/wscript.exe",
                },
                "object_metadata": {
                    "object_id": "obj-deg-api-1",
                    "object_type": "process_event",
                    "source_system": "siem",
                },
                "linked_enrichment": {"enrichments": []},
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    diagnostics = body["groundedDecision"]["safetyDiagnostics"]
    assert diagnostics["enrichmentStatus"] == "unavailable"
    assert "linked_enrichment_unavailable" in diagnostics["degradationReasons"]

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


@pytest.mark.parametrize(
    "event_payload",
    [
        {
            "eventType": "analyst_override",
            "isFinal": True,
            "overrideApplied": True,
            "overrideRecommendedVerdict": "suspicious",
            "overrideFinalVerdict": "likely_benign",
        },
        {
            "eventType": "final_closure",
            "isFinal": True,
            "closureLabel": "false_positive",
            "closureVerdict": "benign",
        },
        {
            "eventType": "recommendation_feedback",
            "isFinal": True,
            "recommendationCode": "contain_host",
            "recommendationDisposition": "accepted",
        },
        {
            "eventType": "post_action_outcome",
            "isFinal": True,
            "postActionOutcome": "regression",
        },
        {
            "eventType": "suppression_allowlist_decision",
            "isFinal": True,
            "suppressionDecision": "suppression",
        },
        {
            "eventType": "rollback_outcome",
            "isFinal": True,
            "rollbackPerformed": True,
            "rollbackSucceeded": True,
        },
    ],
)
def test_feedback_endpoint_accepts_all_historical_event_types(client, event_payload: dict[str, object]) -> None:
    payload = {
        "caseId": "case-hl-feedback",
        "decisionId": "decision-hl-feedback",
        "iocType": "domain",
        "iocValue": "history-feedback.example",
        "sourceSystem": "siem",
        "detectionFamily": "sigma",
        "verdict": "true_positive",
        "notes": "historical-learning",
        "submittedByUserId": "analyst-1",
        **event_payload,
    }
    response = client.post("/feedback", json=payload)
    assert response.status_code == 200
    assert response.json()["accepted"] is True


def test_historical_learning_query_and_score_case_expose_history_context(client, settings) -> None:
    baseline_registry = settings.registry_path.read_text(encoding="utf-8")
    baseline_dataset_registry = settings.dataset_registry_path.read_text(encoding="utf-8")

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
    ]
    for payload in feedback_payloads:
        response = client.post(
            "/feedback",
            json={
                "caseId": "case-hl-1",
                "decisionId": "decision-hl-1",
                "iocType": "domain",
                "iocValue": "history-query.example",
                "sourceSystem": "siem",
                "detectionFamily": "sigma",
                "verdict": "true_positive",
                "notes": "historical-learning",
                "submittedByUserId": "analyst-1",
                **payload,
            },
        )
        assert response.status_code == 200
    assert settings.registry_path.read_text(encoding="utf-8") == baseline_registry
    assert settings.dataset_registry_path.read_text(encoding="utf-8") == baseline_dataset_registry

    query_response = client.post(
        "/historical_learning/query",
        json={
            "caseId": "case-hl-query",
            "sourceSystem": "siem",
            "iocType": "domain",
            "iocValue": "history-query.example",
            "hostContext": {},
            "ruleContext": {},
            "topK": 5,
            "lookbackDays": 90,
        },
    )
    assert query_response.status_code == 200
    query_body = query_response.json()
    assert "historicalFeatures" in query_body
    assert query_body["quality"]["eligibleCount"] >= 1
    assert query_body["featureProvenance"]
    assert query_body["similarDetections"]

    score_response = client.post(
        "/score_case",
        json={
            "caseId": "case-hl-score",
            "asOfTime": datetime.now(timezone.utc).isoformat(),
            "sourceSystem": "siem",
            "iocType": "domain",
            "iocValue": "history-query.example",
            "hostContext": {"criticality": 0.8},
            "ruleContext": {"ruleFamily": "sigma"},
            "detectionPackage": {
                "rule_family": "sigma",
                "full_rule_text": "title: Suspicious Script Host",
                "rule_metadata": {"source": "soc-content", "rule_id": "SIG-HL-1", "tags": ["suspicious"]},
                "raw_hit_payload": {"event_id": "evt-hl-1", "command_line": "wscript.exe launcher.js"},
                "object_metadata": {"object_id": "obj-hl-1", "object_type": "process_event", "source_system": "siem"},
            },
        },
    )
    assert score_response.status_code == 200
    score_body = score_response.json()
    grounded = score_body["groundedDecision"]
    assert grounded["historicalLearning"] is not None
    assert grounded["historicalLearning"]["quality"]["eligibleCount"] >= 1
    assert grounded["historicalLearning"]["features"]
    assert any(item["source"] == "historical_learning_feature" for item in grounded["provenance"])
    assert "history_support_signal" in grounded["actionPlan"]["machineReadable"]["inputSnapshot"]

    _ = client.post(
        "/historical_learning/query",
        json={
            "caseId": "case-hl-query-2",
            "sourceSystem": "siem",
            "iocType": "domain",
            "iocValue": "history-query.example",
            "hostContext": {},
            "ruleContext": {},
        },
    )
    assert settings.registry_path.read_text(encoding="utf-8") == baseline_registry
    assert settings.dataset_registry_path.read_text(encoding="utf-8") == baseline_dataset_registry


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
    assert "confusionMatrix" in body["overall"]
    assert "calibrationBins" in body["overall"]
    assert "brierScore" in body["overall"]


def test_health_includes_version_metadata(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["modelVersion"] == "v1-test"
    assert body["datasetVersion"] == "test-v1"
    assert body["scoringProfileVersion"] == "heuristic-v1"
    assert "featureSchemaVersion" in body
    assert body["datasetManifestHash"] is not None


def test_model_statistics_includes_active_model_metrics(client) -> None:
    response = client.get("/model_statistics")
    assert response.status_code == 200
    body = response.json()
    assert body["modelVersion"] == "v1-test"
    assert body["datasetVersion"] == "test-v1"
    assert body["metrics"]["precision"] == 0.6
    assert body["metrics"]["recall"] == 0.8
    assert body["thresholds"]["recommend"] == 0.55
    assert body["datasetCounts"]["observables"] == 3
    assert body["datasetCounts"]["sourceTrust"] == 3


def test_app_metadata_uses_ioc_manager_identity(client) -> None:
    assert client.app.title == "IoC Manager Decision Sidecar"
    assert "decision support" in client.app.description.lower()
    assert "compatibility surfaces" not in client.app.description.lower()


def test_load_settings_prefers_ioc_manager_aliases(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("IOC_MANAGER_AI_SERVICE_NAME", "ioc-manager-sidecar-alias")
    monkeypatch.setenv("CTI_SIDECAR_SERVICE_NAME", "legacy-sidecar-name")
    monkeypatch.setenv("IOC_MANAGER_AI_ARTIFACTS_ROOT", str(tmp_path / "ioc-manager-artifacts"))
    monkeypatch.setenv("CTI_SIDECAR_ARTIFACTS_ROOT", str(tmp_path / "legacy-artifacts"))
    monkeypatch.setenv("IOC_MANAGER_AI_ENV", "staging")
    monkeypatch.setenv("CTI_SIDECAR_ENV", "legacy")

    settings = load_settings()

    assert settings.service_name == "ioc-manager-sidecar-alias"
    assert settings.environment == "staging"
    assert settings.artifacts_root == tmp_path / "ioc-manager-artifacts"
