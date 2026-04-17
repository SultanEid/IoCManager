from __future__ import annotations

from datetime import datetime, timezone

from cti_service.calibration import LogisticCalibrator
from cti_service.contracts import ScoreCaseRequest
from cti_service.scorer import BaselineScorer, ScorerContext, ScoringThresholds


def test_scorer_is_deterministic_for_same_input() -> None:
    fixed_now = datetime(2026, 3, 12, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1", source_trust_map={"feed": 0.5}),
        calibrator=LogisticCalibrator(slope=4.5, intercept=0.0),
        thresholds=ScoringThresholds(recommend=0.55, escalate=0.8, abstain=0.35),
        now_provider=lambda: fixed_now,
    )
    request = ScoreCaseRequest(
        case_id="case-1",
        as_of_time=fixed_now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="login-update-secure.test",
        host_context={"criticality": 0.8, "assetExposure": 0.7},
        rule_context={"severityScore": 0.9, "scannerAgreement": 0.8},
    )

    first = scorer.score_case(request)
    second = scorer.score_case(request)
    assert first.maliciousness_score == second.maliciousness_score
    assert first.feature_snapshot_hash == second.feature_snapshot_hash
    assert first.decision_state == second.decision_state
    assert first.feature_groups == second.feature_groups


def test_scorer_abstains_on_low_source_trust_and_stale_data() -> None:
    fixed_now = datetime(2026, 3, 12, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )
    request = ScoreCaseRequest(
        case_id="case-2",
        as_of_time=datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc),
        source_system="unknown",
        ioc_type="url",
        ioc_value="http://example.org",
        host_context={"criticality": 0.2, "assetExposure": 0.2},
        rule_context={"severityScore": 0.2, "scannerAgreement": 0.1, "sourceTrust": 0.05},
    )

    scored = scorer.score_case(request)
    assert scored.decision_state == "abstain"
    assert "low_source_trust" in scored.abstain_reason_codes
    assert scored.uncertainty_score >= 0.30


def test_uncertainty_increases_when_source_trust_drops() -> None:
    fixed_now = datetime(2026, 3, 12, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    high_trust_request = ScoreCaseRequest(
        case_id="case-high-trust",
        as_of_time=fixed_now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="secure-login-example.test",
        host_context={"criticality": 0.7, "assetExposure": 0.6},
        rule_context={"severityScore": 0.7, "scannerAgreement": 0.7, "sourceTrust": 0.9},
    )

    low_trust_request = ScoreCaseRequest(
        case_id="case-low-trust",
        as_of_time=fixed_now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="secure-login-example.test",
        host_context={"criticality": 0.7, "assetExposure": 0.6},
        rule_context={"severityScore": 0.7, "scannerAgreement": 0.7, "sourceTrust": 0.1},
    )

    high_trust = scorer.score_case(high_trust_request)
    low_trust = scorer.score_case(low_trust_request)

    assert low_trust.uncertainty_score > high_trust.uncertainty_score


def test_decay_increases_for_stale_evidence() -> None:
    fixed_now = datetime(2026, 3, 12, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    fresh = scorer.score_case(
        ScoreCaseRequest(
            case_id="fresh",
            as_of_time=fixed_now,
            source_system="feed",
            ioc_type="domain",
            ioc_value="login-update.test",
            host_context={},
            rule_context={"severityScore": 0.7, "scannerAgreement": 0.6},
        )
    )
    stale = scorer.score_case(
        ScoreCaseRequest(
            case_id="stale",
            as_of_time=datetime(2026, 3, 5, 12, 0, tzinfo=timezone.utc),
            source_system="feed",
            ioc_type="domain",
            ioc_value="login-update.test",
            host_context={},
            rule_context={"severityScore": 0.7, "scannerAgreement": 0.6},
        )
    )
    assert stale.decay_score > fresh.decay_score


def test_sightings_and_conflict_influence_actionability_and_evidence_gaps() -> None:
    fixed_now = datetime(2026, 3, 12, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    high_corroboration = scorer.score_case(
        ScoreCaseRequest(
            case_id="high-corroboration",
            as_of_time=fixed_now,
            source_system="feed",
            ioc_type="url",
            ioc_value="hxxps://evil-login-check.test/path",
            host_context={"criticality": 0.7, "assetExposure": 0.6},
            rule_context={
                "severityScore": 0.8,
                "scannerAgreement": 0.7,
                "sourceTrust": 0.8,
                "sightingsCount": 8,
                "sightingsDistinctSources": 4,
                "evidenceConflict": 0.05,
            },
        )
    )
    high_conflict = scorer.score_case(
        ScoreCaseRequest(
            case_id="high-conflict",
            as_of_time=fixed_now,
            source_system="feed",
            ioc_type="url",
            ioc_value="hxxps://evil-login-check.test/path",
            host_context={"criticality": 0.7, "assetExposure": 0.6},
            rule_context={
                "severityScore": 0.8,
                "scannerAgreement": 0.7,
                "sourceTrust": 0.8,
                "sightingsCount": 1,
                "sightingsDistinctSources": 1,
                "evidenceConflict": 0.75,
            },
        )
    )
    assert high_corroboration.actionability_score > high_conflict.actionability_score
    assert high_conflict.evidence_gaps
    assert any(item.reason_code == "high_evidence_conflict" for item in high_conflict.evidence_gaps)


def test_graph_signal_is_context_only_for_score_diagnostics() -> None:
    fixed_now = datetime(2026, 3, 12, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    low_graph = scorer.score_case(
        ScoreCaseRequest(
            case_id="graph-low",
            as_of_time=fixed_now,
            source_system="feed",
            ioc_type="domain",
            ioc_value="example.org",
            host_context={"criticality": 0.8, "assetExposure": 0.7},
            rule_context={"severityScore": 0.6, "scannerAgreement": 0.6, "graphSignal": 0.1},
        )
    )
    high_graph = scorer.score_case(
        ScoreCaseRequest(
            case_id="graph-high",
            as_of_time=fixed_now,
            source_system="feed",
            ioc_type="domain",
            ioc_value="example.org",
            host_context={"criticality": 0.8, "assetExposure": 0.7},
            rule_context={"severityScore": 0.6, "scannerAgreement": 0.6, "graphSignal": 0.9},
        )
    )
    assert high_graph.blast_radius_score == low_graph.blast_radius_score
    assert high_graph.feature_groups["graph_signal"] > low_graph.feature_groups["graph_signal"]
