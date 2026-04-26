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
