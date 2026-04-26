from __future__ import annotations

from datetime import datetime, timezone

import pytest

from decision_service.contracts import ScoreCaseRequest
from decision_service.decision_support import build_grounded_decision
from decision_service.scorer import BaselineScorer, ScorerContext


def test_false_positive_signal_downgrades_to_manual_allowlist_decision() -> None:
    diagnostics, grounded = _score_grounded(
        case_id="case-false-positive-golden",
        rule_context={
            "severityScore": 0.8,
            "scannerAgreement": 0.8,
            "sourceTrust": 0.9,
            "allowlistHit": True,
        },
    )

    assert diagnostics.decision_state in {"defer", "recommend", "escalate"}
    assert grounded.verdict == "false_positive"
    assert grounded.should_allowlist is True
    assert grounded.should_suppress is True
    assert grounded.safety_diagnostics.auto_remediation_allowed is False
    assert grounded.action_plan.never_auto_executes is True


def test_stale_indicator_signal_downgrades_without_auto_action() -> None:
    _, grounded = _score_grounded(
        case_id="case-stale-golden",
        rule_context={
            "severityScore": 0.8,
            "scannerAgreement": 0.8,
            "sourceTrust": 0.9,
            "staleIndicator": True,
        },
    )

    assert grounded.verdict == "stale_or_revoked"
    assert grounded.should_suppress is True
    assert grounded.should_allowlist is False
    assert grounded.action == "hold"
    assert grounded.safety_diagnostics.auto_remediation_allowed is False


def test_score_case_response_contract_keeps_required_backend_fields(client) -> None:
    response = client.post(
        "/score_case",
        json={
            "caseId": "case-contract-required-fields",
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
    grounded = body["groundedDecision"]
    for key in (
        "caseId",
        "modelVersion",
        "datasetVersion",
        "featureSnapshotHash",
        "decisionState",
        "maliciousnessScore",
        "groundedDecision",
    ):
        assert key in body
    for key in (
        "verdict",
        "confidence",
        "falsePositiveRisk",
        "reviewPriority",
        "safetyDiagnostics",
        "promotionSuppressionDecision",
        "actionPlan",
    ):
        assert key in grounded
    assert grounded["actionPlan"]["neverAutoExecutes"] is True


def test_ioc_table_attributes_produce_bounded_analyst_insight() -> None:
    diagnostics, grounded = _score_ioc_table_grounded(
        ioc_type="domain",
        ioc_value="beacon.zombie-lab.example.zip",
        severity_score=0.95,
        table_confidence=0.95,
        source_trust=0.8,
    )

    assert diagnostics.maliciousness_score >= 0.60
    assert grounded.verdict == "likely_malicious"
    assert grounded.action == "monitor"
    assert grounded.abstain_reason is None
    assert grounded.confidence <= 0.66
    assert grounded.safety_diagnostics.weak_evidence is True
    assert grounded.safety_diagnostics.auto_remediation_allowed is False
    assert grounded.action_plan.never_auto_executes is True
    assert any("IOC attribute fallback" in reason for reason in grounded.reasons)


def test_critical_documentation_ip_is_suspicious_not_likely_malicious() -> None:
    _, grounded = _score_ioc_table_grounded(
        ioc_type="ip",
        ioc_value="203.0.113.10",
        severity_score=0.95,
        table_confidence=0.95,
        source_trust=0.8,
        source_name="Lab Network Sensors",
        source_type="api_import",
    )

    assert grounded.verdict == "suspicious"
    assert grounded.confidence <= 0.66
    assert grounded.false_positive_risk >= 0.50
    assert grounded.safety_diagnostics.weak_evidence is True
    assert any("Protected lab/test/documentation IOC context" in reason for reason in grounded.reasons)


def test_medium_protected_lab_ioc_returns_likely_benign_decision() -> None:
    _, grounded = _score_ioc_table_grounded(
        ioc_type="domain",
        ioc_value="vpn.identity-lab.test",
        severity_score=0.55,
        table_confidence=0.84,
        source_trust=0.72,
        source_name="Threat Intel Sandbox Corpus",
        source_type="file_upload",
    )

    assert grounded.verdict == "likely_benign"
    assert grounded.action == "monitor"
    assert grounded.confidence >= 0.60
    assert grounded.abstain_reason is None
    assert grounded.false_positive_risk >= 0.50
    assert grounded.action_plan.never_auto_executes is True


def test_analyst_true_positive_can_override_protected_context() -> None:
    _, grounded = _score_ioc_table_grounded(
        ioc_type="domain",
        ioc_value="beacon.zombie-lab.test",
        severity_score=0.95,
        table_confidence=0.95,
        source_trust=0.8,
        analyst_outcome="true_positive",
    )

    assert grounded.verdict in {"suspicious", "likely_malicious", "malicious"}
    assert not any("Protected lab/test/documentation IOC context" in reason for reason in grounded.reasons)


def test_ioc_table_low_trust_still_abstains() -> None:
    _, grounded = _score_ioc_table_grounded(
        ioc_type="domain",
        ioc_value="beacon.zombie-lab.test",
        severity_score=0.95,
        table_confidence=0.95,
        source_trust=0.05,
    )

    assert grounded.verdict == "insufficient_evidence"
    assert grounded.action == "hold"
    assert grounded.abstain_reason is not None
    assert grounded.safety_diagnostics.auto_remediation_allowed is False


@pytest.mark.parametrize(
    ("case_id", "rule_context", "expected_reason"),
    [
        (
            "case-insufficient-low-trust",
            {"severityScore": 0.9, "scannerAgreement": 0.8, "sourceTrust": 0.05},
            "high_uncertainty",
        ),
        (
            "case-insufficient-conflict",
            {"severityScore": 0.9, "scannerAgreement": 0.8, "sourceTrust": 0.8, "evidenceConflict": 0.9},
            "high_evidence_conflict",
        ),
    ],
)
def test_insufficient_evidence_golden_cases_keep_abstain_reason(case_id: str, rule_context: dict[str, float], expected_reason: str) -> None:
    _, grounded = _score_grounded(case_id=case_id, rule_context=rule_context)

    assert grounded.verdict == "insufficient_evidence"
    assert grounded.abstain_reason == expected_reason
    assert grounded.action == "hold"
    assert grounded.safety_diagnostics.auto_remediation_allowed is False


def _score_grounded(*, case_id: str, rule_context: dict[str, object]):
    now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: now,
    )
    request = ScoreCaseRequest(
        case_id=case_id,
        as_of_time=now,
        source_system="manager",
        ioc_type="domain",
        ioc_value="example.test",
        host_context={"criticality": 0.7, "assetExposure": 0.4},
        rule_context=rule_context,
        detection_package={
            "rule_family": "generic",
            "object_metadata": {
                "object_id": f"obj-{case_id}",
                "object_type": "observable",
                "source_system": "manager",
            },
            "linked_enrichment": {
                "enrichments": [
                    {
                        "kind": "reputation",
                        "source": "unit-test",
                        "confidence": 0.8,
                        "value": {"score": 80},
                    }
                ]
            },
            "behavior_report_references": {
                "reports": [
                    {
                        "report_id": f"rep-{case_id}",
                        "source": "unit-test",
                        "summary": "Non-string corroborating context.",
                    }
                ]
            },
        },
    )
    diagnostics = scorer.score_case(request)
    return diagnostics, build_grounded_decision(diagnostics, request)


def _score_ioc_table_grounded(
    *,
    ioc_type: str,
    ioc_value: str,
    severity_score: float,
    table_confidence: float,
    source_trust: float,
    source_name: str = "ioc_table",
    source_type: str = "manual_entry",
    analyst_outcome: str | None = None,
):
    now = datetime(2026, 4, 26, 10, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: now,
    )
    request = ScoreCaseRequest(
        case_id=f"ioc-table-{ioc_type}",
        as_of_time=datetime(2026, 4, 24, 8, 17, tzinfo=timezone.utc),
        source_system="ioc_manager_ioc_table",
        ioc_type=ioc_type,
        ioc_value=ioc_value,
        host_context={"criticality": 0.3, "assetExposure": 0.2, "linkedScanResultCount": 0},
        rule_context={
            "severityScore": severity_score,
            "scannerAgreement": table_confidence,
            "sourceTrust": source_trust,
            "sourceName": source_name,
            "sourceType": source_type,
            "tableConfidence": table_confidence,
            "linkedScanResultCount": 0,
        },
        detection_package={
            "rule_family": "suricata",
            "object_metadata": {
                "object_id": "ioc-table-fixture",
                "object_type": "ioc",
                "source_system": "ioc_manager_ioc_table",
            },
            "rule_metadata": {
                "rule_id": f"ioc-table-{ioc_type}",
                "title": f"IOC table {ioc_type} indicator",
                "severity": "Critical",
            },
            "raw_hit_payload": {
                "event_id": "ioc-table-fixture",
                "indicator": ioc_value,
                "indicator_type": ioc_type,
                "linked_scan_result_count": 0,
            },
            "linked_enrichment": {
                "enrichments": [
                    {
                        "kind": "ioc_table",
                        "source": "unit-test",
                        "confidence": table_confidence,
                        "severity": "Critical",
                    }
                ],
            },
        },
    )
    if analyst_outcome:
        request.rule_context["analystOutcome"] = analyst_outcome
    diagnostics = scorer.score_case(request)
    return diagnostics, build_grounded_decision(diagnostics, request)
