from __future__ import annotations

from datetime import datetime, timezone

from cti_service.contracts import ScoreCaseRequest
from cti_service.decision_support import build_grounded_decision
from cti_service.eval_framework import (
    EvaluationMetricBundle,
    compare_against_baselines,
)
from cti_service.scorer import BaselineScorer, ScorerContext


def _build_scorer(now: datetime) -> BaselineScorer:
    return BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="test-v1"),
        now_provider=lambda: now,
    )


def test_abstention_behavior_prefers_safety_when_uncertainty_is_high() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)

    request = ScoreCaseRequest(
        case_id="case-abstain",
        as_of_time=datetime(2026, 3, 5, 12, 0, tzinfo=timezone.utc),
        source_system="unknown",
        ioc_type="domain",
        ioc_value="secure-login-check-update.example",
        host_context={"criticality": 0.8, "assetExposure": 0.8},
        rule_context={
            "severityScore": 0.9,
            "scannerAgreement": 0.1,
            "sourceTrust": 0.05,
            "evidenceConflict": 0.9,
            "sightingsCount": 1,
            "sightingsDistinctSources": 1,
        },
    )

    scored = scorer.score_case(request)
    assert scored.decision_state == "abstain"
    assert scored.uncertainty_score >= 0.42
    assert "high_uncertainty" in scored.abstain_reason_codes


def test_uncertainty_sanity_check_tracks_conflict_monotonically() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)

    base_payload = {
        "as_of_time": now,
        "source_system": "feed",
        "ioc_type": "url",
        "ioc_value": "hxxps://secure-login-update-check.test/path",
        "host_context": {"criticality": 0.7, "assetExposure": 0.6},
        "rule_context": {
            "severityScore": 0.7,
            "scannerAgreement": 0.7,
            "sourceTrust": 0.8,
            "sightingsCount": 6,
            "sightingsDistinctSources": 3,
        },
    }

    low_conflict = scorer.score_case(
        ScoreCaseRequest(case_id="case-low-conflict", **base_payload, rule_context={**base_payload["rule_context"], "evidenceConflict": 0.1})
    )
    high_conflict = scorer.score_case(
        ScoreCaseRequest(case_id="case-high-conflict", **base_payload, rule_context={**base_payload["rule_context"], "evidenceConflict": 0.8})
    )

    assert high_conflict.uncertainty_score > low_conflict.uncertainty_score


def test_next_best_evidence_output_is_non_empty_and_grounded() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="case-nbe",
            as_of_time=now,
            source_system="feed",
            ioc_type="domain",
            ioc_value="login-verify-reset.example",
            host_context={"criticality": 0.6, "assetExposure": 0.6},
            rule_context={
                "severityScore": 0.7,
                "scannerAgreement": 0.6,
                "sourceTrust": 0.18,
                "evidenceConflict": 0.65,
            },
        )
    )

    gap_collections = {item.recommended_collection for item in scored.evidence_gaps}
    assert scored.next_best_evidence
    assert set(scored.next_best_evidence).issubset(gap_collections)


def test_grounded_decision_requires_non_string_corroboration_for_malicious_verdict() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)

    request = ScoreCaseRequest(
        case_id="case-no-corroboration",
        as_of_time=now,
        source_system="feed",
        ioc_type="url",
        ioc_value="hxxps://secure-login-update-check.test/path",
        host_context={"criticality": 0.6, "assetExposure": 0.5},
        rule_context={
            "severityScore": 0.95,
            "scannerAgreement": 0.35,
            "evidenceConflict": 0.05,
            "sourceTrust": 0.8,
        },
    )

    diagnostics = scorer.score_case(request)
    grounded = build_grounded_decision(diagnostics, request)
    assert grounded.verdict == "insufficient_evidence"
    assert grounded.abstain_reason is not None


def test_grounded_decision_confidence_semantics_are_bounded() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)
    request = ScoreCaseRequest(
        case_id="case-confidence",
        as_of_time=now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="login-verify-reset.example",
        host_context={"criticality": 0.5, "assetExposure": 0.4},
        rule_context={
            "severityScore": 0.7,
            "scannerAgreement": 0.72,
            "sourceTrust": 0.8,
            "sightingsDistinctSources": 3,
            "evidenceConflict": 0.1,
        },
    )

    diagnostics = scorer.score_case(request)
    grounded = build_grounded_decision(diagnostics, request)
    assert 0.0 <= grounded.confidence <= 1.0


def test_complexity_gate_rejects_candidate_when_simple_baseline_is_safer() -> None:
    candidate = EvaluationMetricBundle(
        precision_at_k=0.55,
        recall_at_k=0.60,
        calibration_error=0.15,
        unsafe_recommendation_rate=0.35,
        analyst_override_rate=0.20,
        canary_success_rate=0.60,
        rollback_rate=0.30,
        queue_high_impact_lift=0.01,
        deployment_regret=0.10,
        outcomes={"confident_correct": 80, "confident_wrong": 45, "abstained": 75, "overridden": 22, "rolled_back": 14},
        unavailable_metrics=[],
        sample_size=200,
    )
    baseline = EvaluationMetricBundle(
        precision_at_k=0.56,
        recall_at_k=0.55,
        calibration_error=0.18,
        unsafe_recommendation_rate=0.12,
        analyst_override_rate=0.18,
        canary_success_rate=0.62,
        rollback_rate=0.26,
        queue_high_impact_lift=0.03,
        deployment_regret=0.04,
        outcomes={"confident_correct": 82, "confident_wrong": 39, "abstained": 79, "overridden": 20, "rolled_back": 11},
        unavailable_metrics=[],
        sample_size=200,
    )

    gate = compare_against_baselines(candidate, {"source_trust": baseline}, min_precision_gain=0.01)
    assert gate.passed is False
    assert gate.reasons
