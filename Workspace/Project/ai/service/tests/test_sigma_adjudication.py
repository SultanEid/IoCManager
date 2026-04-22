from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

import pytest

from cti_service.sigma_adjudication import adjudicate_sigma


def _base_sigma_package() -> dict[str, object]:
    return {
        "rule_family": "sigma",
        "full_rule_text": (
            "title: Suspicious Script Host with Encoded Argument\n"
            "id: sigma-unit-1\n"
            "status: test\n"
            "logsource:\n"
            "  category: process_creation\n"
            "  product: windows\n"
            "detection:\n"
            "  selection:\n"
            "    Image|endswith: wscript.exe\n"
            "    CommandLine|contains: -enc\n"
            "  condition: selection"
        ),
        "rule_metadata": {
            "source": "unit",
            "rule_id": "SIGMA-UNIT-1",
            "title": "Suspicious Script Host with Encoded Argument",
            "id": "sigma-unit-1",
            "status": "test",
            "description": "Suspicious script host execution pattern.",
            "tags": ["suspicious", "defense_evasion"],
            "level": "medium",
            "logsource": {"category": "process_creation", "product": "windows"},
        },
        "raw_hit_payload": {
            "event_id": "evt-sigma-unit-1",
            "image": "C:/Windows/System32/wscript.exe",
            "command_line": "wscript.exe //E:jscript launcher.js -enc U0FNUExFX0RBVEE=",
            "lineage": {
                "process": [
                    {
                        "process_guid": "proc-1",
                        "image": "wscript.exe",
                        "command_line": "wscript.exe //E:jscript launcher.js -enc U0FNUExFX0RBVEE=",
                        "parent_process_guid": "proc-0",
                        "parent_image": "cmd.exe",
                    },
                    {
                        "process_guid": "proc-0",
                        "image": "cmd.exe",
                        "command_line": "cmd.exe /c launcher.cmd",
                    },
                ],
                "user": {"user_id": "u-1", "user_name": "alice"},
                "host": {"host_id": "h-1", "hostname": "wkstn-1"},
            },
        },
        "object_metadata": {
            "object_id": "proc-1",
            "object_type": "process_event",
            "source_system": "siem",
        },
        "time_prevalence_context": {
            "hit_count_24h": 2,
            "hit_count_7d": 2,
            "prevalence_ratio": 0.0004,
            "recency_bucket": "new",
            "trend": "increasing",
        },
        "allowlist_baseline_context": {
            "allowlisted": False,
            "baseline_match": False,
            "baseline_name": "office-endpoint-script-executions",
            "allowlist_source": "soc-baseline-registry",
        },
    }


def _malicious_package() -> dict[str, object]:
    payload = _base_sigma_package()
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
                "detection_id": "det-yara-1",
                "rule_family": "yara",
                "rule_id": "YARA-1",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-15T10:00:00Z",
            },
            {
                "detection_id": "det-snort-1",
                "rule_family": "snort",
                "rule_id": "SNORT-1",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-15T10:01:00Z",
            },
        ]
    }
    payload["raw_hit_payload"]["repetition"] = {"count": 12, "window_seconds": 120}
    return payload


def _likely_malicious_package() -> dict[str, object]:
    payload = _malicious_package()
    payload["asset_context"] = {"asset_id": "asset-2", "criticality": "medium"}
    payload["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "likely_malicious", "timestamp": "2026-04-15T10:00:00Z"},
        ]
    }
    payload["related_detections"] = {
        "detections": [
            {
                "detection_id": "det-yara-1",
                "rule_family": "yara",
                "rule_id": "YARA-1",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-15T10:00:00Z",
            }
        ]
    }
    payload["linked_enrichment"] = {
        "enrichments": [
            {"kind": "sandbox", "value": {"flags": ["suspicious"]}},
        ]
    }
    payload["behavior_report_references"]["reports"][0]["summary"] = "suspicious script execution and staged callback"
    payload["behavior_report_references"]["reports"][0]["extracted_behavior_features"] = {
        "suspicious_script_interpreter_usage": ["wscript.exe"],
    }
    payload["raw_hit_payload"]["repetition"] = {"count": 5, "window_seconds": 300}
    return payload


def _suspicious_package() -> dict[str, object]:
    payload = _base_sigma_package()
    payload["linked_enrichment"] = {
        "enrichments": [
            {"kind": "threat_intel", "value": {"classification": "malicious activity"}},
        ]
    }
    payload["behavior_report_references"] = {
        "reports": [
            {
                "report_id": "rep-susp",
                "source": "sandbox",
                "reference": "internal://rep-susp",
                "summary": "suspicious script with encoded command and callback",
                "extracted_behavior_features": {"suspicious_script_interpreter_usage": ["wscript.exe"]},
            }
        ]
    }
    return payload


def _likely_benign_package() -> dict[str, object]:
    payload = _base_sigma_package()
    payload["full_rule_text"] = (
        "title: Approved Maintenance Script Runner\n"
        "detection:\n"
        "  selection:\n"
        "    Image|endswith: powershell.exe\n"
        "    CommandLine|contains: -File C:\\Scripts\\maintenance.ps1\n"
        "  condition: selection"
    )
    payload["rule_metadata"] = {
        "source": "unit",
        "rule_id": "SIGMA-LB-1",
        "title": "Approved Maintenance Script Runner",
        "id": "sigma-lb-1",
        "status": "stable",
        "description": "Likely benign maintenance pattern.",
        "tags": ["benign", "maintenance"],
        "logsource": {"category": "process_creation", "product": "windows"},
    }
    payload["raw_hit_payload"]["image"] = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
    payload["raw_hit_payload"]["command_line"] = "powershell.exe -File C:/Scripts/maintenance.ps1 -Verbose"
    payload["time_prevalence_context"] = {
        "hit_count_24h": 5,
        "hit_count_7d": 30,
        "prevalence_ratio": 0.04,
        "recency_bucket": "recurring",
        "trend": "stable",
    }
    payload["allowlist_baseline_context"] = {
        "allowlisted": False,
        "baseline_match": True,
        "baseline_name": "approved-maintenance-jobs",
        "allowlist_source": "soc-baseline-registry",
    }
    payload["linked_enrichment"] = {
        "enrichments": [
            {"kind": "reputation", "value": {"classification": "benign approved known_good"}},
        ]
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [{"analyst_id": "a1", "verdict": "benign", "timestamp": "2026-04-14T10:00:00Z"}]
    }
    return payload


def _benign_package() -> dict[str, object]:
    payload = _likely_benign_package()
    payload["allowlist_baseline_context"] = {
        "allowlisted": False,
        "baseline_match": True,
        "baseline_name": "approved-maintenance-jobs",
        "allowlist_source": "soc-baseline-registry",
    }
    payload["time_prevalence_context"] = {
        "hit_count_24h": 20,
        "hit_count_7d": 220,
        "prevalence_ratio": 0.21,
        "recency_bucket": "persistent",
        "trend": "stable",
    }
    payload["related_detections"] = {
        "detections": [
            {
                "detection_id": "det-benign-1",
                "rule_family": "sigma",
                "rule_id": "SIG-BENIGN-1",
                "relation_type": "benign",
                "observed_at": "2026-04-15T10:00:00Z",
            }
        ]
    }
    return payload


def _false_positive_package() -> dict[str, object]:
    payload = _likely_benign_package()
    payload["rule_metadata"]["tags"] = ["false_positive", "maintenance"]
    payload["allowlist_baseline_context"] = {
        "allowlisted": True,
        "baseline_match": True,
        "baseline_name": "engineering-bootstrap-processes",
        "allowlist_source": "devops-approved-tools",
    }
    payload["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "false_positive", "timestamp": "2026-04-14T10:00:00Z"},
            {"analyst_id": "a2", "verdict": "benign", "timestamp": "2026-04-15T10:00:00Z"},
        ]
    }
    return payload


def _insufficient_evidence_package() -> dict[str, object]:
    payload = _base_sigma_package()
    payload["raw_hit_payload"] = {
        "event_id": "evt-sigma-lexical-only",
        "image": "C:/Windows/System32/wscript.exe",
        "command_line": "wscript.exe //E:jscript launcher.js -enc U0FNUExFX0RBVEE=",
    }
    payload.pop("time_prevalence_context", None)
    payload.pop("allowlist_baseline_context", None)
    payload.pop("linked_enrichment", None)
    payload.pop("behavior_report_references", None)
    payload.pop("prior_analyst_outcomes", None)
    payload.pop("related_detections", None)
    return payload


def _stale_or_revoked_package() -> dict[str, object]:
    payload = _base_sigma_package()
    payload["rule_metadata"]["status"] = "deprecated"
    return payload


def _load_sigma_fixture(name: str) -> dict[str, object]:
    path = Path(__file__).resolve().parents[2] / "fixtures" / "sigma" / "scenarios" / name
    return json.loads(path.read_text(encoding="utf-8"))


def test_sigma_adjudication_is_deterministic_for_identical_input() -> None:
    package = _malicious_package()
    first = adjudicate_sigma(detection_package=package)
    second = adjudicate_sigma(detection_package=package)
    assert first == second


def test_sigma_adjudication_extracts_interpretable_features_for_required_inputs() -> None:
    result = adjudicate_sigma(detection_package=_malicious_package())
    expected = {
        "suspicious_execution_signal",
        "benign_admin_signal",
        "admin_mismatch_signal",
        "lineage_quality_signal",
        "lineage_anomaly_signal",
        "repetition_burst_signal",
        "baseline_allowlist_signal",
        "related_supporting_signal",
        "analyst_malicious_signal",
    }
    assert expected.issubset(set(result.interpretable_features.keys()))


def test_sigma_adjudication_scores_evidence_buckets_independently() -> None:
    result = adjudicate_sigma(detection_package=_malicious_package())
    scores = result.bucket_scores
    values = {
        scores.positive_score,
        scores.negative_score,
        scores.contradictory_score,
        scores.missing_score,
    }
    assert all(0.0 <= value <= 1.0 for value in values)
    assert len(values) > 1


def test_sigma_adjudication_hard_abstains_when_only_lexical_evidence_exists() -> None:
    result = adjudicate_sigma(detection_package=_insufficient_evidence_package())
    assert result.verdict == "insufficient_evidence"
    assert result.abstain_reason == "missing_non_string_corroboration"
    assert result.lexical_only_gate_triggered is True


def test_sigma_adjudication_history_signals_change_bucket_outputs() -> None:
    baseline = adjudicate_sigma(detection_package=_malicious_package())
    with_history = deepcopy(_malicious_package())
    with_history["historical_learning_context"] = {
        "features": {
            "history_benign_pressure_signal": 0.9,
            "history_conflict_rate": 0.8,
            "history_rollback_rate": 0.7,
            "history_post_action_regression_rate": 0.8,
            "history_recommendation_reject_rate": 0.85,
            "history_sample_size_signal": 0.9,
            "history_recency_signal": 0.9,
        },
        "feature_provenance": [],
        "quality": {"eligible_count": 6, "dropped_count": 0, "drop_reasons": {}, "lookback_days": 90},
        "similar_detections": [],
    }
    history_result = adjudicate_sigma(detection_package=with_history)
    assert history_result.interpretable_features["history_benign_pressure_signal"] > 0.0
    assert history_result.bucket_scores.negative_score >= baseline.bucket_scores.negative_score
    assert history_result.bucket_scores.contradictory_score >= baseline.bucket_scores.contradictory_score


def test_sigma_history_support_does_not_override_lexical_only_abstain_gate() -> None:
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
    result = adjudicate_sigma(detection_package=payload)
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
def test_sigma_adjudication_classifies_into_runtime_verdict_taxonomy(
    builder,
    expected_verdict: str,
) -> None:
    result = adjudicate_sigma(detection_package=builder())
    assert result.verdict == expected_verdict


def test_false_positive_risk_increases_with_contradictory_or_benign_signals() -> None:
    baseline = adjudicate_sigma(detection_package=_malicious_package())

    contradictory_package = _malicious_package()
    contradictory_package["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "verdict": "likely_malicious", "timestamp": "2026-04-15T10:00:00Z"},
            {"analyst_id": "a2", "verdict": "false_positive", "timestamp": "2026-04-15T11:00:00Z"},
        ]
    }
    contradictory = adjudicate_sigma(detection_package=contradictory_package)
    assert contradictory.false_positive_risk > baseline.false_positive_risk

    benign_boost_package = deepcopy(_malicious_package())
    benign_boost_package["linked_enrichment"]["enrichments"].append(
        {"kind": "reputation", "value": {"classification": "benign approved known_good"}}
    )
    benign_boost = adjudicate_sigma(detection_package=benign_boost_package)
    assert benign_boost.false_positive_risk > baseline.false_positive_risk


def test_sigma_adjudication_distinguishes_benign_admin_from_suspicious_admin_mismatch() -> None:
    benign_admin = _benign_package()
    benign_admin["raw_hit_payload"]["command_line"] = "powershell.exe -File C:/Scripts/backup-maintenance.ps1"
    benign_admin_result = adjudicate_sigma(detection_package=benign_admin)

    suspicious_admin = _base_sigma_package()
    suspicious_admin["raw_hit_payload"]["image"] = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
    suspicious_admin["raw_hit_payload"]["command_line"] = (
        "powershell.exe -NoProfile -ExecutionPolicy bypass -enc SQBFAFgA"
    )
    suspicious_admin["time_prevalence_context"] = {
        "hit_count_24h": 1,
        "hit_count_7d": 1,
        "prevalence_ratio": 0.0001,
        "recency_bucket": "new",
        "trend": "increasing",
    }
    suspicious_admin["allowlist_baseline_context"] = {
        "allowlisted": False,
        "baseline_match": False,
        "baseline_name": "admin-maintenance-jobs",
        "allowlist_source": "soc-baseline-registry",
    }
    suspicious_admin_result = adjudicate_sigma(detection_package=suspicious_admin)

    assert benign_admin_result.verdict in {"benign", "likely_benign", "false_positive"}
    assert suspicious_admin_result.verdict in {"suspicious", "likely_malicious", "malicious"}
    assert benign_admin_result.interpretable_features["benign_admin_signal"] > suspicious_admin_result.interpretable_features["benign_admin_signal"]
    assert suspicious_admin_result.interpretable_features["admin_mismatch_signal"] > benign_admin_result.interpretable_features["admin_mismatch_signal"]


def test_sigma_adjudication_produces_explanation_and_suggested_checks() -> None:
    result = adjudicate_sigma(detection_package=_insufficient_evidence_package())
    assert "SIGMA deterministic adjudication produced verdict=" in result.explanation
    assert result.explanation_lines
    assert result.suggested_next_checks


def test_sigma_benign_fixture_promotes_to_benign_without_becoming_false_positive() -> None:
    result = adjudicate_sigma(detection_package=_load_sigma_fixture("sigma-benign.example.json"))

    assert result.verdict == "benign"


def test_sigma_malicious_fixture_promotes_above_suspicious_without_coarse_regression() -> None:
    result = adjudicate_sigma(detection_package=_load_sigma_fixture("sigma-malicious.example.json"))

    assert result.verdict == "malicious"
