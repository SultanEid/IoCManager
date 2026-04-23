from __future__ import annotations

import pytest
from pydantic import ValidationError

from decision_service.contracts import (
    EvaluateModelRequest,
    GroundedDecisionResponse,
    HistoricalLearningQueryRequest,
    HistoricalLearningQueryResponse,
    PromotionSuppressionDecisionResponse,
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
        "detectionPackage": {"rule_family": "sigma", "rule_metadata": {"source": "unit", "rule_id": "SIG-1"}},
    }
    request = ScoreCaseRequest.model_validate(payload)
    dumped = request.model_dump(by_alias=True)
    assert dumped["caseId"] == "case-1"
    assert dumped["iocType"] == "domain"
    assert dumped["ruleContext"]["severityScore"] == 0.3
    assert dumped["detectionPackage"]["rule_family"] == "sigma"


def test_score_case_validation_fails_on_missing_required_fields() -> None:
    with pytest.raises(ValidationError):
        ScoreCaseRequest.model_validate({"caseId": "case-1", "iocType": "domain"})


def test_feedback_contract() -> None:
    request = SubmitFeedbackRequest.model_validate(
        {
            "caseId": "case-77",
            "decisionId": "decision-77",
            "verdict": "true_positive",
            "confidence": 0.91,
            "falsePositiveRisk": 0.08,
            "reviewPriority": "high",
            "shouldPromoteToIndicator": True,
            "shouldSuppress": False,
            "shouldAllowlist": False,
            "shouldEscalate": True,
            "notes": "Validated by analyst",
            "submittedByUserId": "user-1",
        }
    )
    assert request.case_id == "case-77"
    assert request.submitted_by_user_id == "user-1"
    assert request.review_priority == "high"


def test_feedback_contract_accepts_similarity_context() -> None:
    request = SubmitFeedbackRequest.model_validate(
        {
            "caseId": "case-simctx",
            "decisionId": "decision-simctx",
            "iocType": "domain",
            "iocValue": "match.example",
            "eventType": "recommendation_feedback",
            "isFinal": True,
            "recommendationCode": "search_fleet",
            "recommendationDisposition": "accepted",
            "verdict": "true_positive",
            "submittedByUserId": "user-1",
            "similarityContext": {
                "ruleFamily": "sigma",
                "ruleId": "SIG-100",
                "iocIndicators": [{"indicatorType": "domain", "indicatorValue": "match.example"}],
                "behaviorPatterns": ["memory_injection_api", "powershell.exe"],
                "signer": "unknown",
                "publisher": "contoso",
                "assetGroup": "finance",
                "lineageShape": "p3_u1_h1",
                "networkDestinationFamilies": ["example.com"],
                "analystClosurePattern": "confirmed_malicious",
            },
        }
    )
    assert request.similarity_context is not None
    assert request.similarity_context.rule_family == "sigma"
    assert request.similarity_context.ioc_indicators[0].indicator_type == "domain"


def test_feedback_contract_rejects_invalid_similarity_context_indicator_shape() -> None:
    with pytest.raises(ValidationError):
        SubmitFeedbackRequest.model_validate(
            {
                "caseId": "case-simctx-bad",
                "decisionId": "decision-simctx-bad",
                "iocType": "domain",
                "iocValue": "match.example",
                "eventType": "recommendation_feedback",
                "isFinal": True,
                "recommendationCode": "search_fleet",
                "recommendationDisposition": "accepted",
                "verdict": "true_positive",
                "submittedByUserId": "user-1",
                "similarityContext": {
                    "iocIndicators": [{"indicatorType": "", "indicatorValue": "match.example"}],
                },
            }
        )


@pytest.mark.parametrize(
    "payload",
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
def test_feedback_contract_accepts_typed_historical_event_payloads(payload: dict[str, object]) -> None:
    request = SubmitFeedbackRequest.model_validate(
        {
            "caseId": "case-typed",
            "decisionId": "decision-typed",
            "iocType": "domain",
            "iocValue": "typed-history.example",
            "verdict": "true_positive",
            "submittedByUserId": "user-1",
            **payload,
        }
    )
    assert request.event_type is not None


def test_feedback_contract_rejects_missing_event_specific_fields() -> None:
    with pytest.raises(ValidationError):
        SubmitFeedbackRequest.model_validate(
            {
                "caseId": "case-bad",
                "decisionId": "decision-bad",
                "iocType": "domain",
                "iocValue": "bad-history.example",
                "eventType": "recommendation_feedback",
                "isFinal": True,
                "verdict": "true_positive",
                "submittedByUserId": "user-1",
            }
        )


def test_evaluate_model_contract_defaults_are_stable() -> None:
    request = EvaluateModelRequest.model_validate({})
    assert request.horizon_hours == 72
    assert "source_system" in request.slice_fields


def test_grounded_decision_contract_roundtrip() -> None:
    payload = {
        "verdict": "likely_malicious",
        "action": "canary",
        "confidence": 0.62,
        "falsePositiveRisk": 0.23,
        "reviewPriority": "high",
        "shouldPromoteToIndicator": True,
        "shouldSuppress": False,
        "shouldAllowlist": False,
        "shouldEscalate": True,
        "promotionSuppressionDecision": {
            "decision": "promote_to_indicator",
            "confidence": 0.71,
            "rationale": "malicious-like verdict met promotion guardrails; strongest_signals: promotion_score=0.78, corroboration=0.66.",
            "requiredReviewerRole": None,
        },
        "actionPlan": {
            "summary": "Generated manual-only actions for likely_malicious verdict.",
            "recommendedActions": [
                {
                    "action": "search_fleet",
                    "rank": 1,
                    "score": 0.77,
                    "rationale": "search_fleet prioritized to validate spread across related detections.",
                    "prerequisites": ["Scope search to relevant tenants and lookback window."],
                    "cautions": ["Large-scope searches can increase SIEM/EDR query load."],
                    "escalationTarget": "analyst_queue",
                    "requiredReviewerRole": "tier1_analyst",
                    "requiresHumanApproval": True,
                    "executionMode": "manual_only",
                },
                {
                    "action": "notify_analyst",
                    "rank": 2,
                    "score": 0.61,
                    "rationale": "notify_analyst prioritized based on communication policy.",
                    "prerequisites": ["Include evidence summary, confidence, and false-positive risk."],
                    "cautions": ["Analyst notifications should include clear next actions to avoid churn."],
                    "escalationTarget": "analyst_queue",
                    "requiredReviewerRole": "tier1_analyst",
                    "requiresHumanApproval": True,
                    "executionMode": "manual_only",
                },
            ],
            "prerequisites": [
                "Scope search to relevant tenants and lookback window.",
                "Include evidence summary, confidence, and false-positive risk.",
            ],
            "cautions": [
                "Large-scope searches can increase SIEM/EDR query load.",
                "Analyst notifications should include clear next actions to avoid churn.",
            ],
            "neverAutoExecutes": True,
            "policyConstrained": True,
            "evidenceBased": True,
            "machineReadable": {
                "inputSnapshot": {
                    "family": "sigma",
                    "verdict": "likely_malicious",
                    "confidence": 0.62,
                    "falsePositiveRisk": 0.23,
                },
                "policyChecks": [
                    {
                        "check": "manual_execution_only",
                        "passed": True,
                        "details": "All recommended actions require explicit human approval and manual execution.",
                    }
                ],
                "actionScores": [
                    {
                        "action": "search_fleet",
                        "eligible": True,
                        "score": 0.77,
                        "rationale": "search_fleet prioritized to validate spread across related detections.",
                        "blockedReasons": [],
                    }
                ],
                "selection": {
                    "maxActions": 3,
                    "fallbackToNoImmediateAction": False,
                    "selectedActions": ["search_fleet", "notify_analyst"],
                },
            },
        },
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
        "evidenceFusion": {
            "positiveEvidence": [
                {
                    "channel": "behavior_evidence",
                    "source": "sandbox-cluster",
                    "evidenceId": "rep-1",
                    "reference": "internal://rep-1",
                    "category": "behavior_report",
                    "polarity": "positive",
                    "confidence": 0.8,
                    "summary": "Behavior report supports malicious execution.",
                    "anchor": "rep-1",
                }
            ],
            "negativeEvidence": [],
            "contradictoryEvidence": [],
            "missingEvidence": [
                {
                    "gapId": "missing_analyst_history",
                    "channel": "analyst_history",
                    "description": "No usable analyst history evidence was provided.",
                    "importance": "medium",
                }
            ],
            "coverage": {
                "rule_semantics": True,
                "hit_payload": True,
                "environment_context": True,
                "linked_enrichment": True,
                "behavior_evidence": True,
                "analyst_history": False,
            },
            "deduplication": {"inputCount": 7, "uniqueCount": 6, "duplicateCount": 1},
            "explanationLines": ["Fused evidence summary."],
        },
        "historicalLearning": {
            "features": {
                "history_support_signal": 0.62,
                "history_recommendation_accept_rate": 0.71,
            },
            "featureProvenance": [
                {
                    "feature": "history_support_signal",
                    "sourceEventId": "evt-1",
                    "eventType": "recommendation_feedback",
                    "occurredAtUtc": "2026-04-16T10:00:00Z",
                    "contribution": 0.62,
                    "detail": "recommendation_accepted",
                }
            ],
            "quality": {
                "eligibleCount": 2,
                "droppedCount": 1,
                "dropReasons": {"not_finalized": 1},
                "lookbackDays": 90,
            },
            "similarDetections": [
                {
                    "detectionId": "det-1",
                    "ruleFamily": "sigma",
                    "ruleId": "SIG-1",
                    "relationType": "supporting_signal",
                    "observedAt": "2026-04-16T10:00:00Z",
                    "confidence": 0.77,
                    "similarityScore": 0.83,
                    "similarityReasons": ["same rule id", "same network destination family (example.com)"],
                    "priorVerdicts": ["confirmed_malicious"],
                    "priorAcceptedActions": ["search_fleet"],
                    "priorOutcomes": ["success"],
                }
            ],
        },
        "safetyDiagnostics": {
            "autoRemediationAllowed": False,
            "weakEvidence": False,
            "contradictoryEvidence": False,
            "contradictionScore": 0.12,
            "missingCriticalFields": [],
            "partialEvidence": True,
            "enrichmentStatus": "available",
            "falsePositiveRisk": 0.23,
            "severityCapApplied": False,
            "maxRecommendationSeverity": "containment_allowed",
            "degradationReasons": [],
        },
    }
    response = GroundedDecisionResponse.model_validate(payload)
    assert response.verdict == "likely_malicious"
    assert response.review_priority == "high"
    assert response.evidence_fusion is not None
    assert response.evidence_fusion.deduplication.duplicate_count == 1
    assert response.historical_learning is not None
    assert response.historical_learning.quality.eligible_count == 2
    assert response.action_plan.never_auto_executes is True


def test_historical_learning_query_contract_roundtrip() -> None:
    request = HistoricalLearningQueryRequest.model_validate(
        {
            "caseId": "case-hl-q",
            "iocType": "domain",
            "iocValue": "history-query.example",
            "sourceSystem": "manager",
            "topK": 7,
            "lookbackDays": 45,
        }
    )
    assert request.top_k == 7
    assert request.lookback_days == 45

    response = HistoricalLearningQueryResponse.model_validate(
        {
            "historicalFeatures": {"history_support_signal": 0.56},
            "similarDetections": [
                {
                    "detectionId": "det-7",
                    "ruleFamily": "snort",
                    "ruleId": "SNORT-7",
                    "relationType": "supporting_signal",
                    "observedAt": "2026-04-16T10:00:00Z",
                    "confidence": 0.74,
                    "similarityScore": 0.81,
                    "similarityReasons": ["same rule family"],
                    "priorVerdicts": ["likely_malicious"],
                    "priorAcceptedActions": ["block_ip"],
                    "priorOutcomes": ["regression"],
                }
            ],
            "featureProvenance": [
                {
                    "feature": "history_support_signal",
                    "sourceEventId": "evt-7",
                    "eventType": "final_closure",
                    "occurredAtUtc": "2026-04-16T09:50:00Z",
                    "contribution": 0.56,
                    "detail": "closure=malicious",
                }
            ],
            "quality": {
                "eligibleCount": 1,
                "droppedCount": 0,
                "dropReasons": {},
                "lookbackDays": 45,
            },
        }
    )
    assert response.quality.eligible_count == 1
    assert response.similar_detections[0].similarity_score == 0.81
    assert response.similar_detections[0].prior_outcomes == ["regression"]


def test_grounded_decision_requires_abstain_reason_for_insufficient_evidence() -> None:
    with pytest.raises(ValidationError):
        GroundedDecisionResponse.model_validate(
            {
                "verdict": "insufficient_evidence",
                "action": "hold",
                "confidence": 0.8,
                "falsePositiveRisk": 0.39,
                "reviewPriority": "medium",
                "shouldPromoteToIndicator": False,
                "shouldSuppress": False,
                "shouldAllowlist": False,
                "shouldEscalate": True,
                "safetyDiagnostics": {
                    "autoRemediationAllowed": False,
                    "weakEvidence": True,
                    "contradictoryEvidence": True,
                    "contradictionScore": 0.60,
                    "missingCriticalFields": [],
                    "partialEvidence": True,
                    "enrichmentStatus": "unavailable",
                    "falsePositiveRisk": 0.39,
                    "severityCapApplied": True,
                    "maxRecommendationSeverity": "review_only",
                    "degradationReasons": ["linked_enrichment_unavailable"],
                },
                "promotionSuppressionDecision": {
                    "decision": "needs_human_review",
                    "confidence": 0.8,
                    "rationale": "review pressure or ambiguity threshold triggered manual review; strongest_signals: review_pressure=0.80, contradiction_ratio=0.60.",
                    "requiredReviewerRole": "tier2_detection_engineer",
                },
                "actionPlan": {
                    "summary": "No operational action met policy gates.",
                    "recommendedActions": [
                        {
                            "action": "no_immediate_action",
                            "rank": 1,
                            "score": 0.71,
                            "rationale": "No operational action met deterministic policy gates.",
                            "prerequisites": ["Continue evidence collection and monitor for corroborating signals."],
                            "cautions": ["Lack of immediate containment increases monitoring requirements."],
                            "escalationTarget": "analyst_queue",
                            "requiredReviewerRole": "tier2_detection_engineer",
                            "requiresHumanApproval": True,
                            "executionMode": "manual_only",
                        }
                    ],
                    "prerequisites": ["Continue evidence collection and monitor for corroborating signals."],
                    "cautions": ["Lack of immediate containment increases monitoring requirements."],
                    "neverAutoExecutes": True,
                    "policyConstrained": True,
                    "evidenceBased": True,
                    "machineReadable": {
                        "inputSnapshot": {"verdict": "insufficient_evidence"},
                        "policyChecks": [
                            {"check": "manual_execution_only", "passed": True, "details": "manual-only"}
                        ],
                        "actionScores": [],
                        "selection": {"maxActions": 3, "fallbackToNoImmediateAction": True, "selectedActions": ["no_immediate_action"]},
                    },
                },
                "provenance": [],
                "reasons": ["decision abstained until stronger corroborated evidence is collected"],
                "nextBestEvidence": ["collect_independent_high_trust_corroboration"],
            }
        )


def test_promotion_suppression_contract_requires_role_for_manual_review() -> None:
    with pytest.raises(ValidationError):
        PromotionSuppressionDecisionResponse.model_validate(
            {
                "decision": "needs_human_review",
                "confidence": 0.74,
                "rationale": "manual review required because confidence is low and evidence conflicts persist.",
                "requiredReviewerRole": None,
            }
        )


def test_promotion_suppression_contract_rejects_role_for_non_manual_decision() -> None:
    with pytest.raises(ValidationError):
        PromotionSuppressionDecisionResponse.model_validate(
            {
                "decision": "keep_as_observable",
                "confidence": 0.62,
                "rationale": "thresholds for promotion and suppression were not met.",
                "requiredReviewerRole": "tier1_analyst",
            }
        )


def test_grounded_decision_contract_rejects_non_manual_action_plan_execution() -> None:
    payload = {
        "verdict": "likely_benign",
        "action": "monitor",
        "confidence": 0.55,
        "falsePositiveRisk": 0.34,
        "reviewPriority": "medium",
        "shouldPromoteToIndicator": False,
        "shouldSuppress": False,
        "shouldAllowlist": True,
        "shouldEscalate": False,
        "safetyDiagnostics": {
            "autoRemediationAllowed": False,
            "weakEvidence": False,
            "contradictoryEvidence": False,
            "contradictionScore": 0.0,
            "missingCriticalFields": [],
            "partialEvidence": False,
            "enrichmentStatus": "available",
            "falsePositiveRisk": 0.34,
            "severityCapApplied": False,
            "maxRecommendationSeverity": "containment_allowed",
            "degradationReasons": [],
        },
        "promotionSuppressionDecision": {
            "decision": "keep_as_observable",
            "confidence": 0.62,
            "rationale": "thresholds for promotion and suppression were not met.",
            "requiredReviewerRole": None,
        },
        "actionPlan": {
            "summary": "Generated action plan.",
            "recommendedActions": [
                {
                    "action": "notify_analyst",
                    "rank": 1,
                    "score": 0.4,
                    "rationale": "Communication required.",
                    "prerequisites": [],
                    "cautions": [],
                    "escalationTarget": "none",
                    "requiredReviewerRole": "tier1_analyst",
                    "requiresHumanApproval": True,
                    "executionMode": "manual_only",
                }
            ],
            "prerequisites": [],
            "cautions": [],
            "neverAutoExecutes": False,
            "policyConstrained": True,
            "evidenceBased": True,
            "machineReadable": {
                "inputSnapshot": {},
                "policyChecks": [{"check": "manual_execution_only", "passed": True, "details": "manual-only"}],
                "actionScores": [],
                "selection": {"maxActions": 3, "fallbackToNoImmediateAction": False, "selectedActions": ["notify_analyst"]},
            },
        },
        "provenance": [],
        "reasons": ["monitoring only"],
        "abstainReason": None,
        "nextBestEvidence": ["collect_post_action_validation_signals"],
    }
    with pytest.raises(ValidationError):
        GroundedDecisionResponse.model_validate(payload)

