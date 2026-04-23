from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

import pytest

from decision_service.yara_decision import adjudicate_yara


def _base_yara_package() -> dict[str, object]:
    return {
        "rule_family": "yara",
        "full_rule_text": "rule UnitRule { strings: $a = \"VirtualAllocEx\" ascii wide condition: $a }",
        "rule_metadata": {
            "source": "unit",
            "rule_id": "YARA-UNIT-1",
            "rule_name": "UnitRule",
            "tags": ["suspicious", "memory_injection"],
            "description": "Detects VirtualAllocEx usage.",
            "meta": {"severity": "high"},
        },
        "raw_hit_payload": {
            "event_id": "evt-unit-1",
            "matched_strings": ["VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread", "LSASS"],
            "match_count": 4,
            "target_path": "C:/Temp/payload.bin",
        },
        "object_metadata": {
            "object_id": "obj-unit-1",
            "object_type": "file",
            "source_system": "edr",
            "custom_attributes": {"sha256": "a" * 64},
        },
        "time_prevalence_context": {
            "hit_count_24h": 1,
            "hit_count_7d": 2,
            "prevalence_ratio": 0.0002,
            "recency_bucket": "new",
            "trend": "increasing",
        },
        "allowlist_baseline_context": {
            "allowlisted": False,
            "baseline_match": False,
            "baseline_name": "unknown",
        },
    }


def _malicious_package() -> dict[str, object]:
    payload = _base_yara_package()
    payload["linked_enrichment"] = {
        "enrichments": [
            {
                "kind": "threat_intel",
                "source": "intel-a",
                "value": {"classification": "malicious trojan high confidence"},
            }
        ]
    }
    payload["behavior_report_references"] = {
        "reports": [
            {
                "report_id": "rep-1",
                "source": "sandbox",
                "reference": "internal://rep-1",
                "summary": "malicious trojan credential steal inject process hollowing c2 beacon",
                "extracted_behavior_features": {
                    "suspicious_api_system_call_families": ["memory_injection_api", "credential_access_api"],
                    "persistence_indicators": ["registry run key", "scheduled task"],
                    "injected_processes": ["lsass.exe"],
                    "suspicious_script_interpreter_usage": ["powershell.exe"],
                },
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
                "detection_id": "det-1",
                "rule_family": "sigma",
                "rule_id": "SIG-1",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-15T10:00:00Z",
            }
        ]
    }
    return payload


def _likely_malicious_package() -> dict[str, object]:
    payload = _malicious_package()
    payload["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "likely_malicious", "timestamp": "2026-04-15T10:00:00Z"},
        ]
    }
    payload["linked_enrichment"] = {"enrichments": [{"kind": "sandbox", "value": {"flags": ["suspicious"]}}]}
    return payload


def _suspicious_package() -> dict[str, object]:
    payload = _base_yara_package()
    payload["linked_enrichment"] = {
        "enrichments": [{"kind": "threat_intel", "value": {"classification": "malicious activity"}}]
    }
    payload["behavior_report_references"] = {
        "reports": [
            {
                "report_id": "rep-susp",
                "source": "sandbox",
                "reference": "internal://rep-susp",
                "summary": "suspicious script with encoded command and callback",
                "extracted_behavior_features": {
                    "suspicious_script_interpreter_usage": ["powershell.exe"],
                },
            }
        ]
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a9", "verdict": "escalated", "timestamp": "2026-04-15T09:00:00Z"},
        ]
    }
    return payload


def _likely_benign_package() -> dict[str, object]:
    payload = _base_yara_package()
    payload["rule_metadata"] = {
        "source": "unit",
        "rule_id": "YARA-LB-1",
        "rule_name": "LikelyBenignRule",
        "tags": ["likely_benign", "updater"],
        "description": "Likely benign updater pattern",
    }
    payload["time_prevalence_context"] = {
        "hit_count_24h": 8,
        "hit_count_7d": 40,
        "prevalence_ratio": 0.04,
        "recency_bucket": "recurring",
        "trend": "stable",
    }
    payload["allowlist_baseline_context"] = {
        "allowlisted": False,
        "baseline_match": True,
        "baseline_name": "approved-tools",
    }
    payload["linked_enrichment"] = {
        "enrichments": [
            {
                "kind": "reputation",
                "value": {"classification": "benign approved known_good"},
            }
        ]
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "benign", "timestamp": "2026-04-14T10:00:00Z"},
        ]
    }
    return payload


def _benign_package() -> dict[str, object]:
    payload = _likely_benign_package()
    payload["allowlist_baseline_context"] = {
        "allowlisted": True,
        "baseline_match": True,
        "baseline_name": "approved-tools",
    }
    payload["raw_hit_payload"]["signature_valid"] = True
    payload["raw_hit_payload"]["signer"] = "Microsoft Windows"
    payload["time_prevalence_context"] = {
        "hit_count_24h": 21,
        "hit_count_7d": 280,
        "prevalence_ratio": 0.32,
        "recency_bucket": "persistent",
        "trend": "stable",
    }
    return payload


def _false_positive_package() -> dict[str, object]:
    payload = _likely_benign_package()
    payload["allowlist_baseline_context"] = {
        "allowlisted": True,
        "baseline_match": True,
        "baseline_name": "approved-installers",
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "false_positive", "timestamp": "2026-04-14T10:00:00Z"},
            {"analyst_id": "a2", "verdict": "benign", "timestamp": "2026-04-15T10:00:00Z"},
        ]
    }
    return payload


def _insufficient_evidence_package() -> dict[str, object]:
    payload = _base_yara_package()
    payload.pop("linked_enrichment", None)
    payload.pop("behavior_report_references", None)
    payload.pop("prior_analyst_outcomes", None)
    payload.pop("related_detections", None)
    payload.pop("time_prevalence_context", None)
    payload.pop("allowlist_baseline_context", None)
    return payload


def _stale_or_revoked_package() -> dict[str, object]:
    payload = _base_yara_package()
    payload["rule_metadata"]["status"] = "revoked"
    return payload


def _load_yara_fixture(name: str) -> dict[str, object]:
    path = Path(__file__).resolve().parents[2] / "fixtures" / "yara" / "scenarios" / name
    return json.loads(path.read_text(encoding="utf-8"))


def test_yara_decision_is_deterministic_for_identical_input() -> None:
    package = _malicious_package()
    first = adjudicate_yara(detection_package=package)
    second = adjudicate_yara(detection_package=package)
    assert first == second


def test_yara_decision_extracts_interpretable_features_for_all_required_inputs() -> None:
    result = adjudicate_yara(detection_package=_malicious_package())
    expected = {
        "lexical_malicious_signal",
        "match_strength_signal",
        "missing_file_metadata_signal",
        "trusted_signer_signal",
        "rare_emergent_prevalence_signal",
        "clean_environment_signal",
        "enrichment_malicious_signal",
        "behavior_malicious_signal",
        "analyst_malicious_signal",
    }
    assert expected.issubset(set(result.interpretable_features.keys()))


def test_yara_decision_scores_evidence_buckets_independently() -> None:
    result = adjudicate_yara(detection_package=_malicious_package())
    scores = result.bucket_scores
    values = {
        scores.positive_score,
        scores.negative_score,
        scores.contradictory_score,
        scores.missing_score,
    }
    assert all(0.0 <= value <= 1.0 for value in values)
    assert len(values) > 1


def test_yara_decision_hard_abstains_when_only_lexical_evidence_exists() -> None:
    result = adjudicate_yara(detection_package=_insufficient_evidence_package())
    assert result.verdict == "insufficient_evidence"
    assert result.abstain_reason == "missing_non_string_corroboration"
    assert result.lexical_only_gate_triggered is True


def test_yara_decision_history_signals_change_bucket_outputs() -> None:
    baseline = adjudicate_yara(detection_package=_malicious_package())
    with_history = deepcopy(_malicious_package())
    with_history["historical_learning_context"] = {
        "features": {
            "history_benign_pressure_signal": 0.9,
            "history_conflict_rate": 0.85,
            "history_rollback_rate": 0.8,
            "history_post_action_regression_rate": 0.75,
            "history_recommendation_reject_rate": 0.88,
            "history_sample_size_signal": 0.9,
            "history_recency_signal": 0.9,
        },
        "feature_provenance": [],
        "quality": {"eligible_count": 8, "dropped_count": 0, "drop_reasons": {}, "lookback_days": 90},
        "similar_detections": [],
    }
    history_result = adjudicate_yara(detection_package=with_history)
    assert history_result.interpretable_features["history_benign_pressure_signal"] > 0.0
    assert history_result.bucket_scores.negative_score >= baseline.bucket_scores.negative_score
    assert history_result.bucket_scores.contradictory_score >= baseline.bucket_scores.contradictory_score


def test_yara_history_support_does_not_override_lexical_only_abstain_gate() -> None:
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
    result = adjudicate_yara(detection_package=payload)
    assert result.lexical_only_gate_triggered is True
    assert result.verdict == "insufficient_evidence"
    assert result.abstain_reason == "missing_non_string_corroboration"


@pytest.mark.parametrize(
    ("builder", "expected_verdict"),
    [
        (_benign_package, "benign"),
        (_likely_benign_package, "likely_benign"),
        (_suspicious_package, "likely_malicious"),
        (_likely_malicious_package, "malicious"),
        (_malicious_package, "malicious"),
        (_false_positive_package, "false_positive"),
        (_insufficient_evidence_package, "insufficient_evidence"),
        (_stale_or_revoked_package, "stale_or_revoked"),
    ],
)
def test_yara_decision_classifies_into_runtime_verdict_taxonomy(
    builder,
    expected_verdict: str,
) -> None:
    result = adjudicate_yara(detection_package=builder())
    assert result.verdict == expected_verdict


def test_false_positive_risk_increases_with_contradictory_or_benign_signals() -> None:
    baseline = adjudicate_yara(detection_package=_malicious_package())

    contradictory_package = _malicious_package()
    contradictory_package["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "likely_malicious", "timestamp": "2026-04-15T10:00:00Z"},
            {"analyst_id": "a2", "verdict": "false_positive", "timestamp": "2026-04-15T11:00:00Z"},
        ]
    }
    contradictory = adjudicate_yara(detection_package=contradictory_package)
    assert contradictory.false_positive_risk > baseline.false_positive_risk

    benign_boost_package = deepcopy(_malicious_package())
    benign_boost_package["linked_enrichment"]["enrichments"].append(
        {"kind": "reputation", "value": {"classification": "benign approved known_good"}}
    )
    benign_boost = adjudicate_yara(detection_package=benign_boost_package)
    assert benign_boost.false_positive_risk > baseline.false_positive_risk


def test_yara_decision_produces_explanation_and_suggested_checks() -> None:
    result = adjudicate_yara(detection_package=_insufficient_evidence_package())
    assert "YARA deterministic decision produced verdict=" in result.explanation
    assert result.explanation_lines
    assert result.suggested_next_checks


def test_yara_trust_heuristics_do_not_depend_on_placeholder_signer_tokens() -> None:
    payload = _benign_package()
    payload["raw_hit_payload"]["signer"] = "Contoso Security"
    payload["raw_hit_payload"]["publisher"] = "Generic Vendor"
    payload["raw_hit_payload"]["signature_valid"] = False

    result = adjudicate_yara(detection_package=payload)

    assert result.interpretable_features["trusted_signer_signal"] == 0.0


def test_yara_explanation_discloses_lexical_signals_as_heuristic_context() -> None:
    result = adjudicate_yara(detection_package=_malicious_package())

    assert any("Lexical indicators remained heuristic-only context" in line for line in result.explanation_lines)


def test_yara_asset_context_strengthens_positive_signal() -> None:
    with_asset = _likely_malicious_package()
    with_asset["asset_context"] = {"asset_id": "asset-critical-1", "criticality": "critical"}
    without_asset = deepcopy(with_asset)
    without_asset.pop("asset_context", None)

    without_result = adjudicate_yara(detection_package=without_asset)
    with_result = adjudicate_yara(detection_package=with_asset)

    assert without_result.interpretable_features["critical_asset_signal"] == 0.0
    assert with_result.interpretable_features["critical_asset_signal"] == 1.0
    assert with_result.bucket_scores.positive_score > without_result.bucket_scores.positive_score


def test_yara_false_positive_fixture_stays_separate_from_benign() -> None:
    result = adjudicate_yara(detection_package=_load_yara_fixture("yara-false_positive.example.json"))

    assert result.verdict == "false_positive"


def test_yara_malicious_fixture_promotes_to_malicious_when_high_confidence_stack_exists() -> None:
    result = adjudicate_yara(detection_package=_load_yara_fixture("yara-malicious.example.json"))

    assert result.verdict == "malicious"


