from __future__ import annotations

from datetime import datetime, timezone

from cti_service.contracts import (
    CaseScoreVectorResponse,
    DecisionProvenanceItemResponse,
    EvidenceFusionDeduplicationResponse,
    EvidenceFusionEvidenceItemResponse,
    EvidenceFusionExplanationResponse,
    EvidenceFusionMissingItemResponse,
    ScoreCaseRequest,
)
from cti_service.promotion_suppression_engine import build_promotion_suppression_decision


def _score(
    *,
    temporal_signal: float = 0.9,
    evidence_conflict_signal: float = 0.1,
    sightings_signal: float = 0.8,
    source_trust_signal: float = 0.8,
) -> CaseScoreVectorResponse:
    now = datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc)
    return CaseScoreVectorResponse(
        case_id="case-1",
        maliciousness_score=0.75,
        actionability_score=0.60,
        deployability_score=0.60,
        decay_score=0.2,
        uncertainty_score=0.20,
        blast_radius_score=0.45,
        uncertainty_band=[0.60, 0.90],
        top_evidence=[],
        feature_groups={
            "temporal_signal": temporal_signal,
            "evidence_conflict_signal": evidence_conflict_signal,
            "sightings_signal": sightings_signal,
            "source_trust_signal": source_trust_signal,
        },
        axis_explanations=[],
        reason_codes=[],
        evidence_gaps=[],
        model_version="v1",
        dataset_version="test-v1",
        feature_snapshot_hash="hash-1",
        decision_state="recommend",
        abstain_reason_codes=[],
        next_best_evidence=[],
        scored_at_utc=now,
    )


def _request(
    *,
    criticality: str = "high",
    environment: str = "prod",
    recency_bucket: str = "new",
    allowlisted: bool = False,
    baseline_match: bool = False,
    analyst_outcomes: list[dict[str, object]] | None = None,
) -> ScoreCaseRequest:
    return ScoreCaseRequest(
        case_id="case-1",
        ioc_type="domain",
        ioc_value="example.test",
        host_context={"criticality": criticality, "environment": environment},
        rule_context={},
        detection_package={
            "rule_family": "sigma",
            "rule_metadata": {"source": "unit", "rule_id": "SIG-1"},
            "raw_hit_payload": {"event_id": "evt-1"},
            "object_metadata": {"object_id": "obj-1", "object_type": "process_event"},
            "asset_context": {"criticality": criticality, "environment": environment},
            "time_prevalence_context": {"recency_bucket": recency_bucket},
            "allowlist_baseline_context": {"allowlisted": allowlisted, "baseline_match": baseline_match},
            "prior_analyst_outcomes": {"outcomes": analyst_outcomes or []},
        },
    )


def _fusion(
    *,
    positive_sources: list[str],
    negative_sources: list[str],
    contradictory_sources: list[str],
    missing_count: int = 0,
    coverage: dict[str, bool] | None = None,
) -> EvidenceFusionExplanationResponse:
    def _item(*, source: str, polarity: str, anchor: str) -> EvidenceFusionEvidenceItemResponse:
        return EvidenceFusionEvidenceItemResponse(
            channel="linked_enrichment",
            source=source,
            evidence_id=f"{source}-{anchor}",
            reference=None,
            category="enrichment",
            polarity=polarity,  # type: ignore[arg-type]
            confidence=0.8,
            summary="summary",
            anchor=anchor,
        )

    positive = [_item(source=source, polarity="positive", anchor=f"p-{index}") for index, source in enumerate(positive_sources, start=1)]
    negative = [_item(source=source, polarity="negative", anchor=f"n-{index}") for index, source in enumerate(negative_sources, start=1)]
    contradictory = [
        _item(source=source, polarity="negative", anchor=f"c-{index}") for index, source in enumerate(contradictory_sources, start=1)
    ]
    missing = [
        EvidenceFusionMissingItemResponse(
            gap_id=f"gap-{index}",
            channel="behavior_evidence",
            description="missing",
            importance="high",
        )
        for index in range(1, missing_count + 1)
    ]
    resolved_coverage = coverage or {
        "rule_semantics": True,
        "hit_payload": True,
        "environment_context": True,
        "linked_enrichment": True,
        "behavior_evidence": len(positive) > 0,
        "analyst_history": True,
    }
    return EvidenceFusionExplanationResponse(
        positive_evidence=positive,
        negative_evidence=negative,
        contradictory_evidence=contradictory,
        missing_evidence=missing,
        coverage=resolved_coverage,
        deduplication=EvidenceFusionDeduplicationResponse(input_count=6, unique_count=6, duplicate_count=0),
        explanation_lines=["fused"],
    )


def _provenance(count: int = 8) -> list[DecisionProvenanceItemResponse]:
    return [
        DecisionProvenanceItemResponse(source="test", key=f"key-{index}", value=f"value-{index}")
        for index in range(1, count + 1)
    ]


def test_engine_outputs_promote_to_indicator() -> None:
    result = build_promotion_suppression_decision(
        verdict="malicious",
        confidence=0.92,
        false_positive_risk=0.10,
        score=_score(temporal_signal=0.95),
        request=_request(),
        evidence_fusion=_fusion(
            positive_sources=["feed-a", "feed-b", "feed-c"],
            negative_sources=[],
            contradictory_sources=[],
            missing_count=0,
        ),
        provenance=_provenance(10),
    )
    assert result.decision == "promote_to_indicator"
    assert result.required_reviewer_role is None


def test_engine_outputs_suppress_as_benign() -> None:
    result = build_promotion_suppression_decision(
        verdict="false_positive",
        confidence=0.10,
        false_positive_risk=0.98,
        score=_score(temporal_signal=0.30),
        request=_request(
            criticality="low",
            environment="dev",
            analyst_outcomes=[{"verdict": "benign"}, {"verdict": "false_positive"}],
        ),
        evidence_fusion=_fusion(
            positive_sources=[],
            negative_sources=["feed-a", "feed-a", "feed-a", "feed-a"],
            contradictory_sources=[],
            missing_count=3,
            coverage={
                "rule_semantics": True,
                "hit_payload": False,
                "environment_context": False,
                "linked_enrichment": False,
                "behavior_evidence": False,
                "analyst_history": False,
            },
        ),
        provenance=_provenance(1),
    )
    assert result.decision == "suppress_as_benign"
    assert result.required_reviewer_role is None


def test_engine_outputs_allowlist_when_allowlist_signal_precedes_suppression() -> None:
    result = build_promotion_suppression_decision(
        verdict="likely_benign",
        confidence=0.15,
        false_positive_risk=0.92,
        score=_score(temporal_signal=0.30),
        request=_request(
            allowlisted=True,
            baseline_match=True,
            analyst_outcomes=[{"verdict": "false_positive"}],
        ),
        evidence_fusion=_fusion(
            positive_sources=[],
            negative_sources=["feed-a", "feed-a", "feed-a", "feed-a"],
            contradictory_sources=[],
            missing_count=2,
            coverage={
                "rule_semantics": True,
                "hit_payload": False,
                "environment_context": False,
                "linked_enrichment": False,
                "behavior_evidence": False,
                "analyst_history": False,
            },
        ),
        provenance=_provenance(1),
    )
    assert result.decision == "allowlist"
    assert result.required_reviewer_role is None


def test_engine_outputs_mark_stale_or_revoked_for_stale_verdict() -> None:
    result = build_promotion_suppression_decision(
        verdict="stale_or_revoked",
        confidence=0.8,
        false_positive_risk=0.3,
        score=_score(temporal_signal=0.9),
        request=_request(),
        evidence_fusion=_fusion(
            positive_sources=["feed-a"],
            negative_sources=[],
            contradictory_sources=[],
            missing_count=0,
        ),
        provenance=_provenance(8),
    )
    assert result.decision == "mark_stale_or_revoked"
    assert result.confidence >= 0.75


def test_engine_outputs_keep_as_observable_when_thresholds_not_met() -> None:
    result = build_promotion_suppression_decision(
        verdict="likely_malicious",
        confidence=0.75,
        false_positive_risk=0.50,
        score=_score(temporal_signal=0.7, evidence_conflict_signal=0.1),
        request=_request(criticality="low", environment="dev"),
        evidence_fusion=_fusion(
            positive_sources=["feed-a"],
            negative_sources=["feed-b"],
            contradictory_sources=[],
            missing_count=1,
        ),
        provenance=_provenance(8),
    )
    assert result.decision == "keep_as_observable"
    assert result.required_reviewer_role is None


def test_engine_outputs_needs_human_review_for_insufficient_evidence() -> None:
    result = build_promotion_suppression_decision(
        verdict="insufficient_evidence",
        confidence=0.45,
        false_positive_risk=0.35,
        score=_score(temporal_signal=0.8),
        request=_request(criticality="medium", environment="staging"),
        evidence_fusion=_fusion(
            positive_sources=["feed-a"],
            negative_sources=["feed-b"],
            contradictory_sources=["feed-c"],
            missing_count=2,
        ),
        provenance=_provenance(5),
    )
    assert result.decision == "needs_human_review"
    assert result.required_reviewer_role is not None


def test_engine_prior_analyst_conflict_forces_manual_review() -> None:
    result = build_promotion_suppression_decision(
        verdict="suspicious",
        confidence=0.20,
        false_positive_risk=0.40,
        score=_score(temporal_signal=0.85, evidence_conflict_signal=0.8),
        request=_request(
            analyst_outcomes=[{"verdict": "likely_malicious"}, {"verdict": "false_positive"}],
        ),
        evidence_fusion=_fusion(
            positive_sources=["feed-a"],
            negative_sources=["feed-b"],
            contradictory_sources=["feed-c", "feed-c", "feed-c", "feed-c"],
            missing_count=4,
        ),
        provenance=_provenance(1),
    )
    assert result.decision == "needs_human_review"


def test_engine_timeliness_override_marks_stale_even_with_promotable_signal() -> None:
    result = build_promotion_suppression_decision(
        verdict="malicious",
        confidence=0.95,
        false_positive_risk=0.08,
        score=_score(temporal_signal=0.1),
        request=_request(recency_bucket="stale"),
        evidence_fusion=_fusion(
            positive_sources=["feed-a", "feed-b", "feed-c"],
            negative_sources=[],
            contradictory_sources=[],
            missing_count=0,
        ),
        provenance=_provenance(10),
    )
    assert result.decision == "mark_stale_or_revoked"


def test_engine_assigns_incident_responder_role_for_high_relevance_malicious_review() -> None:
    result = build_promotion_suppression_decision(
        verdict="likely_malicious",
        confidence=0.20,
        false_positive_risk=0.70,
        score=_score(temporal_signal=0.9, evidence_conflict_signal=0.8),
        request=_request(
            criticality="critical",
            environment="prod",
            analyst_outcomes=[{"verdict": "likely_malicious"}, {"verdict": "false_positive"}],
        ),
        evidence_fusion=_fusion(
            positive_sources=["feed-a"],
            negative_sources=["feed-b"],
            contradictory_sources=["feed-c", "feed-c", "feed-c"],
            missing_count=6,
            coverage={
                "rule_semantics": True,
                "hit_payload": False,
                "environment_context": False,
                "linked_enrichment": False,
                "behavior_evidence": False,
                "analyst_history": False,
            },
        ),
        provenance=_provenance(1),
    )
    assert result.decision == "needs_human_review"
    assert result.required_reviewer_role == "incident_responder"


def test_engine_assigns_tier2_role_when_false_positive_risk_is_high() -> None:
    result = build_promotion_suppression_decision(
        verdict="benign",
        confidence=0.20,
        false_positive_risk=0.75,
        score=_score(temporal_signal=0.9, evidence_conflict_signal=0.8),
        request=_request(
            criticality="low",
            environment="dev",
            analyst_outcomes=[{"verdict": "false_positive"}, {"verdict": "likely_malicious"}],
        ),
        evidence_fusion=_fusion(
            positive_sources=["feed-a"],
            negative_sources=["feed-b"],
            contradictory_sources=["feed-c", "feed-c", "feed-c"],
            missing_count=6,
            coverage={
                "rule_semantics": True,
                "hit_payload": False,
                "environment_context": False,
                "linked_enrichment": False,
                "behavior_evidence": False,
                "analyst_history": False,
            },
        ),
        provenance=_provenance(1),
    )
    assert result.decision == "needs_human_review"
    assert result.required_reviewer_role == "tier2_detection_engineer"


def test_engine_assigns_tier1_role_when_manual_review_is_low_impact() -> None:
    result = build_promotion_suppression_decision(
        verdict="insufficient_evidence",
        confidence=0.66,
        false_positive_risk=0.35,
        score=_score(temporal_signal=0.9, evidence_conflict_signal=0.2),
        request=_request(criticality="low", environment="dev"),
        evidence_fusion=_fusion(
            positive_sources=["feed-a", "feed-b"],
            negative_sources=[],
            contradictory_sources=[],
            missing_count=0,
        ),
        provenance=_provenance(8),
    )
    assert result.decision == "needs_human_review"
    assert result.required_reviewer_role == "tier1_analyst"
