from __future__ import annotations

from datetime import datetime, timedelta, timezone

from decision_service.calibration import LogisticCalibrator
from decision_service.contracts import ScoreCaseRequest
from decision_service.scorer import BaselineScorer, ScorerContext, ScoringThresholds, _compute_ioc_suspicion


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


def test_high_confidence_threatfox_row_moves_out_of_abstain() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="threatfox-strong",
            as_of_time=fixed_now,
            source_system="threatfox",
            ioc_type="domain",
            ioc_value="api-winupdate.example",
            host_context={"criticality": 0.6, "assetExposure": 0.4},
            rule_context={
                "severityScore": 0.8,
                "scannerAgreement": 0.72,
                "sourceTrust": 0.72,
                "externalSourceSignal": 0.84,
                "providerConfidence": 0.88,
                "indicatorStrength": 0.72,
                "enrichmentStrength": 0.84,
                "activitySignal": 0.70,
                "sightingsCount": 4,
                "sightingsDistinctSources": 2,
            },
        )
    )

    assert scored.decision_state != "abstain"
    assert scored.maliciousness_score >= 0.55


def test_online_urlhaus_row_is_not_treated_as_generic_low_context() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="urlhaus-online",
            as_of_time=fixed_now,
            source_system="urlhaus",
            ioc_type="url",
            ioc_value="https://bad.example/dropper.exe",
            host_context={"criticality": 0.5, "assetExposure": 0.5},
            rule_context={
                "severityScore": 0.78,
                "scannerAgreement": 0.65,
                "sourceTrust": 0.72,
                "externalSourceSignal": 0.82,
                "providerConfidence": 0.88,
                "indicatorStrength": 0.82,
                "enrichmentStrength": 0.78,
                "activitySignal": 0.90,
                "sightingsCount": 3,
                "sightingsDistinctSources": 2,
            },
        )
    )

    assert scored.decision_state != "abstain"
    assert scored.maliciousness_score >= 0.55


def test_medium_trust_reviewed_internal_signal_moves_out_of_abstain() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="reviewed-medium-trust-positive",
            as_of_time=fixed_now,
            source_system="siem",
            ioc_type="domain",
            ioc_value="relay-check.example.internal",
            host_context={"criticality": 0.55, "assetExposure": 0.40},
            rule_context={
                "sourceName": "internal-reviewed-telemetry",
                "severityScore": 0.62,
                "scannerAgreement": 0.66,
                "sourceTrust": 0.71,
                "externalSourceSignal": 0.60,
                "providerConfidence": 0.66,
                "indicatorStrength": 0.58,
                "enrichmentStrength": 0.54,
                "activitySignal": 0.46,
                "sightingsCount": 2,
                "sightingsDistinctSources": 1,
                "sourceThreatSignal": 0.60,
            },
        )
    )

    assert scored.decision_state != "abstain"
    assert scored.maliciousness_score >= 0.5


def test_medium_trust_reviewed_internal_benign_signal_stays_conservative() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="reviewed-medium-trust-benign",
            as_of_time=fixed_now,
            source_system="siem",
            ioc_type="domain",
            ioc_value="approved-helpdesk.internal",
            host_context={"criticality": 0.40, "assetExposure": 0.25},
            rule_context={
                "sourceName": "internal-reviewed-telemetry",
                "severityScore": 0.28,
                "scannerAgreement": 0.58,
                "sourceTrust": 0.71,
                "externalSourceSignal": 0.34,
                "providerConfidence": 0.34,
                "indicatorStrength": 0.48,
                "enrichmentStrength": 0.52,
                "activitySignal": 0.42,
                "sightingsCount": 4,
                "sightingsDistinctSources": 1,
                "benignContext": 0.76,
                "heuristicNoise": 0.20,
            },
        )
    )

    assert scored.maliciousness_score < 0.55


def test_low_confidence_external_row_can_still_abstain() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="external-weak",
            as_of_time=fixed_now,
            source_system="urlhaus",
            ioc_type="url",
            ioc_value="https://example.org/landing",
            host_context={"criticality": 0.3, "assetExposure": 0.2},
            rule_context={
                "severityScore": 0.38,
                "scannerAgreement": 0.35,
                "sourceTrust": 0.30,
                "externalSourceSignal": 0.20,
                "providerConfidence": 0.18,
                "indicatorStrength": 0.42,
                "enrichmentStrength": 0.15,
                "activitySignal": 0.20,
                "benignContext": 0.20,
                "heuristicNoise": 0.45,
            },
        )
    )

    assert scored.decision_state == "abstain"


def test_known_good_and_heuristic_pressure_prevent_external_false_positive_promotion() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="malwarebazaar-false-positive",
            as_of_time=fixed_now,
            source_system="malwarebazaar",
            ioc_type="hash_sha256",
            ioc_value="a" * 64,
            host_context={"criticality": 0.4, "assetExposure": 0.2},
            rule_context={
                "severityScore": 0.52,
                "scannerAgreement": 0.55,
                "sourceTrust": 0.72,
                "externalSourceSignal": 0.56,
                "providerConfidence": 0.58,
                "indicatorStrength": 0.88,
                "enrichmentStrength": 0.60,
                "activitySignal": 0.50,
                "benignContext": 0.15,
                "heuristicNoise": 0.85,
                "sightingsCount": 2,
            },
        )
    )

    assert scored.maliciousness_score < 0.55


def test_sigmahq_official_rule_row_moves_into_positive_state() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="sigmahq-official",
            as_of_time=fixed_now,
            source_system="siem",
            ioc_type="domain",
            ioc_value="cobalt-control.example",
            host_context={"criticality": 0.8, "assetExposure": 0.6},
            rule_context={
                "severityScore": 0.86,
                "scannerAgreement": 0.80,
                "sourceTrust": 0.86,
                "sourceName": "sigmahq",
                "providerConfidence": 0.86,
                "indicatorStrength": 0.66,
                "enrichmentStrength": 0.74,
                "activitySignal": 0.48,
                "externalSourceSignal": 0.76,
                "sourceThreatSignal": 0.82,
                "sightingsCount": 3,
                "sightingsDistinctSources": 2,
            },
        )
    )

    assert scored.decision_state in {"recommend", "escalate"}
    assert scored.maliciousness_score >= 0.55


def test_official_network_rule_source_is_not_treated_as_generic_medium_trust() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="suricata-official",
            as_of_time=fixed_now,
            source_system="suricata",
            ioc_type="ip",
            ioc_value="203.0.113.80",
            host_context={"criticality": 0.7, "assetExposure": 0.5},
            rule_context={
                "severityScore": 0.86,
                "scannerAgreement": 0.82,
                "sourceTrust": 0.84,
                "sourceName": "et-open-suricata",
                "providerConfidence": 0.88,
                "indicatorStrength": 0.78,
                "enrichmentStrength": 0.70,
                "activitySignal": 0.62,
                "externalSourceSignal": 0.82,
                "sourceThreatSignal": 0.84,
                "sightingsCount": 2,
                "sightingsDistinctSources": 1,
            },
        )
    )

    assert scored.decision_state in {"recommend", "escalate", "defer"}
    assert scored.maliciousness_score >= 0.50


def test_internal_allowlist_row_stays_non_positive_despite_high_trust() -> None:
    fixed_now = datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    scored = scorer.score_case(
        ScoreCaseRequest(
            case_id="allowlist-known-good",
            as_of_time=fixed_now,
            source_system="siem",
            ioc_type="domain",
            ioc_value="agent-control.example.internal",
            host_context={"criticality": 0.4, "assetExposure": 0.2},
            rule_context={
                "severityScore": 0.22,
                "scannerAgreement": 0.60,
                "sourceTrust": 0.94,
                "sourceName": "internal-allowlists",
                "providerConfidence": 0.93,
                "indicatorStrength": 0.58,
                "enrichmentStrength": 0.76,
                "activitySignal": 0.50,
                "externalSourceSignal": 0.32,
                "benignContext": 0.92,
                "heuristicNoise": 0.05,
                "sourceThreatSignal": 0.02,
                "sightingsCount": 4,
                "sightingsDistinctSources": 2,
            },
        )
    )

    assert scored.decision_state in {"abstain", "defer"}
    assert scored.maliciousness_score < 0.45


def test_ioc_value_features_cover_url_process_ip_and_hash_controls() -> None:
    assert _compute_ioc_suspicion("url", "hxxps://login-wallet.example.zip/payload/dropper.exe") > 0.55
    assert _compute_ioc_suspicion("process", "powershell.exe -NoP -EncodedCommand SQBFAFgA") > 0.45
    assert _compute_ioc_suspicion("artifact", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svc") > 0.35
    assert _compute_ioc_suspicion("ip", "203.0.113.10") < 0.20
    assert _compute_ioc_suspicion("hash_sha256", "a" * 64) > _compute_ioc_suspicion("hash_sha256", "not-a-real-hash")


def test_table_confidence_source_trust_and_recency_are_monotonic_for_ioc_rows() -> None:
    fixed_now = datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    weak = scorer.score_case(
        _ioc_table_request(
            case_id="weak",
            now=fixed_now,
            severity=0.55,
            table_confidence=0.40,
            source_trust=0.40,
            last_seen_hours_ago=72,
        )
    )
    strong = scorer.score_case(
        _ioc_table_request(
            case_id="strong",
            now=fixed_now,
            severity=0.90,
            table_confidence=0.92,
            source_trust=0.86,
            last_seen_hours_ago=2,
        )
    )

    assert strong.maliciousness_score > weak.maliciousness_score
    assert strong.feature_groups["provider_confidence_signal"] > weak.feature_groups["provider_confidence_signal"]
    assert strong.feature_groups["temporal_signal"] > weak.feature_groups["temporal_signal"]


def test_correlation_and_analyst_outcomes_raise_or_downgrade_ioc_context() -> None:
    fixed_now = datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc)
    scorer = BaselineScorer(
        context=ScorerContext(model_version="v1", dataset_version="d1"),
        now_provider=lambda: fixed_now,
    )

    attribute_only = scorer.score_case(_ioc_table_request(case_id="attribute", now=fixed_now))
    scan_correlated = scorer.score_case(
        _ioc_table_request(
            case_id="scan",
            now=fixed_now,
            linked_scan_count=4,
            sightings_count=8,
            target_exposure=0.7,
        )
    )
    analyst_true_positive = scorer.score_case(
        _ioc_table_request(
            case_id="analyst-tp",
            now=fixed_now,
            linked_scan_count=4,
            sightings_count=8,
            analyst_outcome="true_positive",
        )
    )
    analyst_false_positive = scorer.score_case(
        _ioc_table_request(
            case_id="analyst-fp",
            now=fixed_now,
            analyst_outcome="false_positive",
        )
    )

    assert scan_correlated.feature_groups["enrichment_strength_signal"] > attribute_only.feature_groups["enrichment_strength_signal"]
    assert scan_correlated.feature_groups["activity_signal"] > attribute_only.feature_groups["activity_signal"]
    assert analyst_true_positive.maliciousness_score >= scan_correlated.maliciousness_score
    assert analyst_false_positive.maliciousness_score < attribute_only.maliciousness_score
    assert analyst_false_positive.feature_groups["benign_context_signal"] >= 0.80


def _ioc_table_request(
    *,
    case_id: str,
    now: datetime,
    severity: float = 0.85,
    table_confidence: float = 0.82,
    source_trust: float = 0.75,
    last_seen_hours_ago: int = 12,
    linked_scan_count: int = 0,
    sightings_count: int = 1,
    target_exposure: float = 0.3,
    analyst_outcome: str | None = None,
) -> ScoreCaseRequest:
    rule_context = {
        "severityScore": severity,
        "scannerAgreement": table_confidence,
        "sourceTrust": source_trust,
        "sourceType": "manual_entry",
        "tableConfidence": table_confidence,
        "linkedScanResultCount": linked_scan_count,
        "sightingsCount": sightings_count,
        "targetExposure": target_exposure,
    }
    if analyst_outcome:
        rule_context["analystOutcome"] = analyst_outcome
    return ScoreCaseRequest(
        case_id=case_id,
        as_of_time=now - timedelta(hours=last_seen_hours_ago),
        source_system="ioc_manager_ioc_table",
        ioc_type="domain",
        ioc_value="login-wallet-update.example.zip",
        host_context={"criticality": 0.5, "assetExposure": target_exposure},
        rule_context=rule_context,
        detection_package={
            "rule_family": "generic",
            "object_metadata": {
                "object_id": case_id,
                "object_type": "ioc",
                "source_system": "ioc_manager_ioc_table",
            },
            "rule_metadata": {"rule_id": f"ioc-table-{case_id}"},
            "raw_hit_payload": {"indicator": "login-wallet-update.example.zip"},
        },
    )

