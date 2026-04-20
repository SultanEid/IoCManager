from __future__ import annotations

from copy import deepcopy

import pytest

from cti_service.snort_adjudication import adjudicate_snort


def _base_snort_package() -> dict[str, object]:
    return {
        "rule_family": "snort",
        "full_rule_text": (
            "alert tcp $HOME_NET any -> $EXTERNAL_NET 443 "
            "(msg:\"Suspicious periodic beacon cadence\"; flow:to_server,established; "
            "threshold:type both, track by_src, count 8, seconds 120; sid:551001; rev:3; classtype:trojan-activity;)"
        ),
        "rule_metadata": {
            "source": "unit",
            "rule_id": "SNORT-UNIT-1",
            "sid": 551001,
            "rev": 3,
            "msg": "Suspicious periodic beacon cadence",
            "classification": "trojan-activity",
            "protocol": "tcp",
            "metadata": {"deployment": "egress-ids"},
        },
        "raw_hit_payload": {
            "event_id": "evt-snort-unit-1",
            "network": {
                "five_tuple": {
                    "src_ip": "10.10.10.21",
                    "src_port": 52100,
                    "dst_ip": "198.51.100.44",
                    "dst_port": 443,
                    "protocol": "tcp",
                },
                "directionality": {"arrow": "->", "direction": "to_server", "flow": ["to_server", "established"]},
                "timing": {"observed_at": "2026-04-15T12:00:00Z"},
                "repetition": {"type": "both", "track": "by_src", "count": 8, "window_seconds": 120},
            },
        },
        "object_metadata": {
            "object_id": "flow-snort-unit-1",
            "object_type": "network_flow",
            "source_system": "ids",
            "custom_attributes": {"flow_id": "flow-snort-unit-1"},
        },
        "asset_context": {"asset_id": "asset-1", "criticality": "medium"},
        "time_prevalence_context": {
            "hit_count_24h": 4,
            "hit_count_7d": 4,
            "prevalence_ratio": 0.001,
            "recency_bucket": "new",
            "trend": "increasing",
        },
        "allowlist_baseline_context": {
            "allowlisted": False,
            "baseline_match": False,
            "baseline_name": "network-egress-baseline",
        },
    }


def _malicious_package() -> dict[str, object]:
    payload = _base_snort_package()
    payload["asset_context"] = {"asset_id": "asset-1", "criticality": "critical"}
    payload["linked_enrichment"] = {
        "enrichments": [
            {
                "kind": "threat_intel",
                "source": "intel-a",
                "value": {"classification": "malicious command-and-control trojan high"},
            }
        ]
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "likely_malicious", "timestamp": "2026-04-15T10:00:00Z"},
            {"analyst_id": "a2", "verdict": "confirmed_malicious", "timestamp": "2026-04-14T10:00:00Z"},
        ]
    }
    payload["related_detections"] = {
        "detections": [
            {
                "detection_id": "det-sigma-1",
                "rule_family": "sigma",
                "rule_id": "SIG-1",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-15T10:00:00Z",
            },
            {
                "detection_id": "det-yara-1",
                "rule_family": "yara",
                "rule_id": "YARA-1",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-15T10:01:00Z",
            },
        ]
    }
    payload["raw_hit_payload"]["network"]["repetition"] = {"count": 14, "window_seconds": 180, "track": "by_src", "type": "both"}
    payload["raw_hit_payload"]["network"]["pcap_metadata"] = {
        "capture_id": "pcap-1",
        "packet_count": 120,
        "byte_count": 40960,
        "capture_start": "2026-04-15T11:58:00Z",
    }
    return payload


def _likely_malicious_package() -> dict[str, object]:
    payload = _malicious_package()
    payload["asset_context"] = {"asset_id": "asset-2", "criticality": "medium"}
    payload["prior_analyst_outcomes"] = {
        "outcomes": [{"analyst_id": "a1", "verdict": "likely_malicious", "timestamp": "2026-04-15T10:00:00Z"}]
    }
    payload["related_detections"] = {
        "detections": [
            {
                "detection_id": "det-sigma-1",
                "rule_family": "sigma",
                "rule_id": "SIG-1",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-15T10:00:00Z",
            }
        ]
    }
    payload["raw_hit_payload"]["network"]["repetition"] = {"count": 6, "window_seconds": 600, "track": "by_src", "type": "both"}
    return payload


def _suspicious_package() -> dict[str, object]:
    payload = _base_snort_package()
    payload["linked_enrichment"] = {
        "enrichments": [{"kind": "threat_intel", "value": {"classification": "malicious activity"}}]
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [{"analyst_id": "a9", "verdict": "escalated", "timestamp": "2026-04-15T09:00:00Z"}]
    }
    payload["related_detections"] = {
        "detections": [
            {
                "detection_id": "det-rel-1",
                "rule_family": "sigma",
                "rule_id": "SIG-2",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-15T10:10:00Z",
            }
        ]
    }
    return payload


def _likely_benign_package() -> dict[str, object]:
    payload = _base_snort_package()
    payload["full_rule_text"] = (
        "alert tcp $HOME_NET any -> $EXTERNAL_NET 443 "
        "(msg:\"Policy informational API health probe\"; flow:to_server,established; sid:551011; rev:1; classtype:policy-violation;)"
    )
    payload["rule_metadata"] = {
        "source": "unit",
        "rule_id": "SNORT-LB-1",
        "sid": 551011,
        "rev": 1,
        "msg": "Policy informational API health probe",
        "classification": "policy-violation",
        "protocol": "tcp",
        "tags": ["informational", "policy"],
    }
    payload["time_prevalence_context"] = {
        "hit_count_24h": 35,
        "hit_count_7d": 220,
        "prevalence_ratio": 0.19,
        "recency_bucket": "persistent",
        "trend": "stable",
    }
    payload["allowlist_baseline_context"] = {
        "allowlisted": False,
        "baseline_match": True,
        "baseline_name": "approved-scanner-traffic",
    }
    payload["linked_enrichment"] = {
        "enrichments": [{"kind": "reputation", "value": {"classification": "benign approved known_good"}}]
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [{"analyst_id": "a1", "verdict": "benign", "timestamp": "2026-04-14T10:00:00Z"}]
    }
    return payload


def _benign_package() -> dict[str, object]:
    payload = _likely_benign_package()
    payload["allowlist_baseline_context"] = {
        "allowlisted": True,
        "baseline_match": True,
        "baseline_name": "approved-scanner-traffic",
    }
    payload["related_detections"] = {
        "detections": [
            {
                "detection_id": "det-benign-1",
                "rule_family": "snort",
                "rule_id": "SNORT-BENIGN-1",
                "relation_type": "benign",
                "observed_at": "2026-04-15T10:00:00Z",
            }
        ]
    }
    return payload


def _false_positive_package() -> dict[str, object]:
    payload = _likely_benign_package()
    payload["rule_metadata"]["tags"] = ["false_positive", "policy"]
    payload["allowlist_baseline_context"] = {
        "allowlisted": True,
        "baseline_match": True,
        "baseline_name": "internal-qa-scanners",
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "false_positive", "timestamp": "2026-04-14T10:00:00Z"},
            {"analyst_id": "a2", "verdict": "benign", "timestamp": "2026-04-15T10:00:00Z"},
        ]
    }
    return payload


def _insufficient_evidence_package() -> dict[str, object]:
    payload = _base_snort_package()
    payload["raw_hit_payload"] = {
        "event_id": "evt-snort-lexical-only",
        "message": "Suspicious periodic beacon cadence",
    }
    payload.pop("time_prevalence_context", None)
    payload.pop("allowlist_baseline_context", None)
    payload.pop("linked_enrichment", None)
    payload.pop("prior_analyst_outcomes", None)
    payload.pop("related_detections", None)
    return payload


def _stale_or_revoked_package() -> dict[str, object]:
    payload = _base_snort_package()
    payload["rule_metadata"]["status"] = "deprecated"
    return payload


def test_snort_adjudication_is_deterministic_for_identical_input() -> None:
    package = _malicious_package()
    first = adjudicate_snort(detection_package=package)
    second = adjudicate_snort(detection_package=package)
    assert first == second


def test_snort_adjudication_extracts_interpretable_features_for_required_inputs() -> None:
    result = adjudicate_snort(detection_package=_malicious_package())
    expected = {
        "threat_driver_signal",
        "policy_noise_signal",
        "tuple_quality_signal",
        "directionality_quality_signal",
        "burstiness_signal",
        "correlated_flow_metadata_signal",
        "baseline_allowlist_signal",
        "analyst_malicious_signal",
        "related_supporting_signal",
    }
    assert expected.issubset(set(result.interpretable_features.keys()))


def test_snort_adjudication_scores_evidence_buckets_independently() -> None:
    result = adjudicate_snort(detection_package=_malicious_package())
    scores = result.bucket_scores
    values = {
        scores.positive_score,
        scores.negative_score,
        scores.contradictory_score,
        scores.missing_score,
    }
    assert all(0.0 <= value <= 1.0 for value in values)
    assert len(values) > 1


def test_snort_adjudication_hard_abstains_when_only_lexical_evidence_exists() -> None:
    result = adjudicate_snort(detection_package=_insufficient_evidence_package())
    assert result.verdict == "insufficient_evidence"
    assert result.abstain_reason == "missing_non_string_corroboration"
    assert result.lexical_only_gate_triggered is True


def test_snort_adjudication_history_signals_change_bucket_outputs() -> None:
    baseline = adjudicate_snort(detection_package=_malicious_package())
    with_history = deepcopy(_malicious_package())
    with_history["historical_learning_context"] = {
        "features": {
            "history_benign_pressure_signal": 0.92,
            "history_conflict_rate": 0.82,
            "history_rollback_rate": 0.75,
            "history_post_action_regression_rate": 0.8,
            "history_recommendation_reject_rate": 0.9,
            "history_sample_size_signal": 0.9,
            "history_recency_signal": 0.9,
        },
        "feature_provenance": [],
        "quality": {"eligible_count": 7, "dropped_count": 0, "drop_reasons": {}, "lookback_days": 90},
        "similar_detections": [],
    }
    history_result = adjudicate_snort(detection_package=with_history)
    assert history_result.interpretable_features["history_benign_pressure_signal"] > 0.0
    assert history_result.bucket_scores.negative_score >= baseline.bucket_scores.negative_score
    assert history_result.bucket_scores.contradictory_score >= baseline.bucket_scores.contradictory_score


def test_snort_history_support_does_not_override_lexical_only_abstain_gate() -> None:
    payload = _insufficient_evidence_package()
    payload["historical_learning_context"] = {
        "features": {
            "history_support_signal": 1.0,
            "history_recommendation_accept_rate": 1.0,
            "history_sample_size_signal": 1.0,
            "history_recency_signal": 1.0,
        },
        "feature_provenance": [],
        "quality": {"eligible_count": 9, "dropped_count": 0, "drop_reasons": {}, "lookback_days": 90},
        "similar_detections": [],
    }
    result = adjudicate_snort(detection_package=payload)
    assert result.lexical_only_gate_triggered is True
    assert result.verdict == "insufficient_evidence"
    assert result.abstain_reason == "missing_non_string_corroboration"


@pytest.mark.parametrize(
    ("builder", "expected_verdict"),
    [
        (_benign_package, "benign"),
        (_likely_benign_package, "likely_benign"),
        (_suspicious_package, "suspicious"),
        (_likely_malicious_package, "likely_malicious"),
        (_malicious_package, "malicious"),
        (_false_positive_package, "false_positive"),
        (_insufficient_evidence_package, "insufficient_evidence"),
        (_stale_or_revoked_package, "stale_or_revoked"),
    ],
)
def test_snort_adjudication_classifies_into_runtime_verdict_taxonomy(
    builder,
    expected_verdict: str,
) -> None:
    result = adjudicate_snort(detection_package=builder())
    assert result.verdict == expected_verdict


def test_false_positive_risk_increases_with_contradictory_or_benign_signals() -> None:
    baseline = adjudicate_snort(detection_package=_malicious_package())

    contradictory_package = _malicious_package()
    contradictory_package["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "likely_malicious", "timestamp": "2026-04-15T10:00:00Z"},
            {"analyst_id": "a2", "verdict": "false_positive", "timestamp": "2026-04-15T11:00:00Z"},
        ]
    }
    contradictory = adjudicate_snort(detection_package=contradictory_package)
    assert contradictory.false_positive_risk > baseline.false_positive_risk

    benign_boost_package = deepcopy(_malicious_package())
    benign_boost_package["linked_enrichment"]["enrichments"].append(
        {"kind": "reputation", "value": {"classification": "benign approved known_good"}}
    )
    benign_boost = adjudicate_snort(detection_package=benign_boost_package)
    assert benign_boost.false_positive_risk > baseline.false_positive_risk


def test_snort_adjudication_distinguishes_policy_noise_from_threat_driven_detections() -> None:
    policy_noise = _benign_package()
    policy_noise_result = adjudicate_snort(detection_package=policy_noise)

    threat_driven = _malicious_package()
    threat_driven_result = adjudicate_snort(detection_package=threat_driven)

    assert policy_noise_result.verdict in {"benign", "likely_benign", "false_positive"}
    assert threat_driven_result.verdict in {"suspicious", "likely_malicious", "malicious"}
    assert policy_noise_result.interpretable_features["policy_noise_signal"] > threat_driven_result.interpretable_features["policy_noise_signal"]
    assert threat_driven_result.interpretable_features["threat_driver_signal"] > policy_noise_result.interpretable_features["threat_driver_signal"]


def test_snort_adjudication_produces_explanation_and_suggested_checks() -> None:
    result = adjudicate_snort(detection_package=_insufficient_evidence_package())
    assert "SNORT deterministic adjudication produced verdict=" in result.explanation
    assert result.explanation_lines
    assert result.suggested_next_checks
