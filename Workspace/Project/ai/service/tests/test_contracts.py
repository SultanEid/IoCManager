from __future__ import annotations

import pytest
from pydantic import ValidationError

from cti_service.contracts import (
    EvaluateModelRequest,
    GroundedDecisionResponse,
    ScoreCaseRequest,
    SubmitFeedbackRequest,
)


def test_score_case_contract_uses_camel_case_aliases() -> None:
    payload = {
        "caseId": "case-1",
        "asOfTime": "2026-03-12T00:00:00Z",
        "sourceSystem": "manager",
        "iocType": "domain",
        "iocValue": "example.org",
        "hostContext": {"criticality": 0.5},
        "ruleContext": {"severityScore": 0.3},
    }
    request = ScoreCaseRequest.model_validate(payload)
    dumped = request.model_dump(by_alias=True)
    assert dumped["caseId"] == "case-1"
    assert dumped["iocType"] == "domain"
    assert dumped["ruleContext"]["severityScore"] == 0.3


def test_score_case_validation_fails_on_missing_required_fields() -> None:
    with pytest.raises(ValidationError):
        ScoreCaseRequest.model_validate({"caseId": "case-1", "iocType": "domain"})


def test_feedback_contract() -> None:
    request = SubmitFeedbackRequest.model_validate(
        {
            "caseId": "case-77",
            "decisionId": "decision-77",
            "verdict": "true_positive",
            "notes": "Validated by analyst",
            "submittedByUserId": "user-1",
        }
    )
    assert request.case_id == "case-77"
    assert request.submitted_by_user_id == "user-1"


def test_evaluate_model_contract_defaults_are_stable() -> None:
    request = EvaluateModelRequest.model_validate({})
    assert request.horizon_hours == 72
    assert "source_system" in request.slice_fields


def test_grounded_decision_contract_roundtrip() -> None:
    payload = {
        "verdict": "likely_malicious",
        "action": "canary",
        "confidence": 0.62,
        "provenance": [
            {
                "source": "rule_context",
                "key": "scannerAgreement",
                "value": "0.84",
            }
        ],
        "reasons": [
            "verdict=likely_malicious based on calibrated_signal=0.71, uncertainty=0.20, conflict=0.12",
            "action=canary selected for controlled operational response",
        ],
        "abstainReason": None,
        "nextBestEvidence": ["collect_post_action_validation_signals"],
    }
    response = GroundedDecisionResponse.model_validate(payload)
    assert response.verdict == "likely_malicious"


def test_grounded_decision_requires_abstain_reason_for_insufficient_evidence() -> None:
    with pytest.raises(ValidationError):
        GroundedDecisionResponse.model_validate(
            {
                "verdict": "insufficient_evidence",
                "action": "hold",
                "confidence": 0.8,
                "provenance": [],
                "reasons": ["decision abstained until stronger corroborated evidence is collected"],
                "nextBestEvidence": ["collect_independent_high_trust_corroboration"],
            }
        )
