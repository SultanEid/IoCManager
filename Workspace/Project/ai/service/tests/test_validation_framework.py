from __future__ import annotations

import logging
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

    low_payload = dict(base_payload)
    low_payload["rule_context"] = {**base_payload["rule_context"], "evidenceConflict": 0.1}
    low_conflict = scorer.score_case(ScoreCaseRequest(case_id="case-low-conflict", **low_payload))

    high_payload = dict(base_payload)
    high_payload["rule_context"] = {**base_payload["rule_context"], "evidenceConflict": 0.8}
    high_conflict = scorer.score_case(ScoreCaseRequest(case_id="case-high-conflict", **high_payload))

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
    assert grounded.safety_diagnostics.auto_remediation_allowed is False


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


def test_evidence_fusion_conflict_escalates_to_insufficient_evidence() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)
    request = ScoreCaseRequest(
        case_id="case-fusion-conflict",
        as_of_time=now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="secure-login-update.example",
        host_context={"criticality": 0.8, "assetExposure": 0.7},
        rule_context={
            "severityScore": 0.85,
            "scannerAgreement": 0.8,
            "sourceTrust": 0.8,
            "sightingsDistinctSources": 4,
            "evidenceConflict": 0.05,
        },
        detection_package={
            "rule_family": "sigma",
            "rule_metadata": {"source": "soc", "rule_id": "SIG-VAL-1", "tags": ["suspicious"]},
            "raw_hit_payload": {"event_id": "evt-1", "message": "malicious script execution"},
            "object_metadata": {"object_id": "obj-1", "object_type": "process_event", "source_system": "siem"},
            "asset_context": {"asset_id": "asset-1", "criticality": "critical"},
            "linked_enrichment": {"enrichments": [{"kind": "reputation", "source": "intel", "value": {"score": 95}}]},
            "behavior_report_references": {"reports": [{"report_id": "rep-1", "source": "sandbox", "summary": "C2 beacon observed"}]},
            "prior_analyst_outcomes": {
                "outcomes": [
                    {
                        "analyst_id": "analyst-1",
                        "decision_id": "dec-1",
                        "verdict": "likely_malicious",
                        "notes": "Prior malicious chain for same anchor.",
                    },
                    {
                        "analyst_id": "analyst-2",
                        "decision_id": "dec-1",
                        "verdict": "false_positive",
                        "notes": "Known benign installer for same anchor.",
                    },
                ]
            },
        },
    )

    diagnostics = scorer.score_case(request)
    grounded = build_grounded_decision(diagnostics, request)
    assert grounded.evidence_fusion is not None
    assert grounded.evidence_fusion.contradictory_evidence
    assert grounded.verdict == "insufficient_evidence"
    assert grounded.abstain_reason in {"high_evidence_conflict", "high_uncertainty", "insufficient_correlated_evidence"}
    assert grounded.safety_diagnostics.contradictory_evidence is True
    assert grounded.safety_diagnostics.contradiction_score >= 0.30


def test_grounded_decision_uses_sigma_deterministic_path_and_provenance() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)
    request = ScoreCaseRequest(
        case_id="case-sigma-deterministic",
        as_of_time=now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="secure-login-update.example",
        host_context={"criticality": 0.6, "assetExposure": 0.5},
        rule_context={"ruleFamily": "sigma"},
        detection_package={
            "rule_family": "sigma",
            "full_rule_text": "title: Suspicious Script Host\ncondition: selection",
            "rule_metadata": {
                "source": "soc",
                "rule_id": "SIG-DET-1",
                "title": "Suspicious Script Host",
                "id": "sig-det-1",
                "status": "test",
                "tags": ["suspicious"],
                "logsource": {"category": "process_creation", "product": "windows"},
            },
            "raw_hit_payload": {
                "event_id": "evt-sigma-det-1",
                "command_line": "wscript.exe //E:jscript launcher.js -enc U0FNUExFX0RBVEE=",
                "image": "C:/Windows/System32/wscript.exe",
            },
            "object_metadata": {"object_id": "obj-sigma-det-1", "object_type": "process_event", "source_system": "siem"},
        },
    )

    diagnostics = scorer.score_case(request)
    grounded = build_grounded_decision(diagnostics, request)
    assert grounded.verdict == "insufficient_evidence"
    assert grounded.abstain_reason == "missing_non_string_corroboration"
    assert any(item.source == "sigma_adjudication" for item in grounded.provenance)
    assert any(item.source == "sigma_feature" for item in grounded.provenance)
    assert grounded.reasons
    assert "SIGMA deterministic adjudication produced verdict=" in grounded.reasons[0]
    assert any("Lexical-only evidence was detected" in reason for reason in grounded.reasons)
    assert grounded.safety_diagnostics.weak_evidence is True


def test_grounded_decision_uses_snort_deterministic_path_and_provenance() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)
    request = ScoreCaseRequest(
        case_id="case-snort-deterministic",
        as_of_time=now,
        source_system="feed",
        ioc_type="ip",
        ioc_value="198.51.100.44",
        host_context={"criticality": 0.6, "assetExposure": 0.5},
        rule_context={"ruleFamily": "snort"},
        detection_package={
            "rule_family": "snort",
            "full_rule_text": (
                "alert tcp any any -> any 443 "
                "(msg:\"Suspicious periodic beacon cadence\"; sid:551001; rev:3; classtype:trojan-activity;)"
            ),
            "rule_metadata": {
                "source": "soc",
                "rule_id": "SNORT-DET-1",
                "sid": 551001,
                "rev": 3,
                "msg": "Suspicious periodic beacon cadence",
                "classification": "trojan-activity",
                "protocol": "tcp",
            },
            "raw_hit_payload": {
                "event_id": "evt-snort-det-1",
                "message": "Suspicious periodic beacon cadence",
            },
            "object_metadata": {"object_id": "obj-snort-det-1", "object_type": "network_flow", "source_system": "ids"},
        },
    )

    diagnostics = scorer.score_case(request)
    grounded = build_grounded_decision(diagnostics, request)
    assert grounded.verdict == "insufficient_evidence"
    assert grounded.abstain_reason == "missing_non_string_corroboration"
    assert any(item.source == "snort_adjudication" for item in grounded.provenance)
    assert any(item.source == "snort_feature" for item in grounded.provenance)
    assert grounded.reasons
    assert "SNORT deterministic adjudication produced verdict=" in grounded.reasons[0]
    assert any("Lexical-only evidence was detected" in reason for reason in grounded.reasons)
    assert grounded.safety_diagnostics.weak_evidence is True


def test_missing_critical_fields_force_safety_abstention() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)
    request = ScoreCaseRequest(
        case_id="case-missing-critical",
        as_of_time=now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="missing-critical.example",
        host_context={"criticality": 0.6, "assetExposure": 0.5},
        rule_context={"ruleFamily": "sigma"},
        detection_package={
            "rule_family": "sigma",
            "rule_metadata": {"source": "soc", "title": "Missing object metadata"},
            "raw_hit_payload": {"event_id": "evt-missing-critical", "command_line": "powershell.exe -enc SQA="},
            "object_metadata": {"object_type": "process_event"},
        },
    )

    diagnostics = scorer.score_case(request)
    grounded = build_grounded_decision(diagnostics, request)

    assert grounded.verdict == "insufficient_evidence"
    assert grounded.abstain_reason == "missing_critical_fields"
    assert "object_metadata.object_id" in grounded.safety_diagnostics.missing_critical_fields
    assert grounded.safety_diagnostics.severity_cap_applied is True


def test_missing_enrichment_degrades_gracefully_instead_of_failing() -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)
    request = ScoreCaseRequest(
        case_id="case-missing-enrichment",
        as_of_time=now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="missing-enrichment.example",
        host_context={"criticality": 0.8, "assetExposure": 0.6},
        rule_context={"ruleFamily": "sigma"},
        detection_package={
            "rule_family": "sigma",
            "full_rule_text": "title: Suspicious Script Host\ncondition: selection",
            "rule_metadata": {
                "source": "soc",
                "rule_id": "SIG-DEG-1",
                "title": "Suspicious Script Host",
                "tags": ["suspicious"],
            },
            "raw_hit_payload": {
                "event_id": "evt-deg-1",
                "command_line": "wscript.exe launcher.js",
                "image": "C:/Windows/System32/wscript.exe",
            },
            "object_metadata": {"object_id": "obj-deg-1", "object_type": "process_event", "source_system": "siem"},
            "linked_enrichment": {"enrichments": []},
        },
    )

    diagnostics = scorer.score_case(request)
    grounded = build_grounded_decision(diagnostics, request)

    assert grounded.safety_diagnostics.enrichment_status == "unavailable"
    assert "linked_enrichment_unavailable" in grounded.safety_diagnostics.degradation_reasons
    assert grounded.action_plan.never_auto_executes is True


def test_logging_emits_abstention_partial_evidence_and_enrichment_events(caplog) -> None:
    now = datetime(2026, 3, 13, 12, 0, tzinfo=timezone.utc)
    scorer = _build_scorer(now)
    request = ScoreCaseRequest(
        case_id="case-safety-log",
        as_of_time=now,
        source_system="feed",
        ioc_type="domain",
        ioc_value="safety-log.example",
        host_context={"criticality": 0.6, "assetExposure": 0.5},
        rule_context={"ruleFamily": "sigma"},
        detection_package={
            "rule_family": "sigma",
            "rule_metadata": {"source": "soc", "title": "Sparse sigma"},
            "raw_hit_payload": {"event_id": "evt-safety-log"},
            "object_metadata": {"object_id": "obj-safety-log", "object_type": "process_event", "source_system": "siem"},
            "linked_enrichment": {"enrichments": []},
        },
    )

    diagnostics = scorer.score_case(request)
    with caplog.at_level(logging.INFO, logger="cti_service.decision_support"):
        grounded = build_grounded_decision(diagnostics, request)

    assert grounded.verdict == "insufficient_evidence"
    messages = {record.message for record in caplog.records}
    assert "adjudication_abstained" in messages
    assert "adjudication_partial_evidence" in messages
    assert "adjudication_enrichment_degraded" in messages
    abstained_record = next(record for record in caplog.records if record.message == "adjudication_abstained")
    assert abstained_record.case_id == "case-safety-log"
    assert abstained_record.rule_family == "sigma"
    assert abstained_record.enrichment_status == "unavailable"


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
