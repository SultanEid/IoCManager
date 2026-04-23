from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from decision_service import llm_assist_phrasing
from decision_service.action_policy_matrix import clear_action_policy_matrix_cache
from decision_service.action_plan_recommender import DISRUPTIVE_ACTIONS, build_action_plan
from decision_service.contracts import ScoreCaseRequest


def _request(
    *,
    ioc_type: str = "ip",
    ioc_value: str = "198.51.100.44",
    criticality: str = "critical",
    environment: str = "prod",
    object_type: str = "process_event",
    related_count: int = 3,
    history_features: dict[str, float] | None = None,
    similar_detections: list[dict[str, object]] | None = None,
) -> ScoreCaseRequest:
    related = [
        {"detection_id": f"det-{idx}", "rule_family": "sigma", "relation_type": "supporting_signal"}
        for idx in range(related_count)
    ]
    return ScoreCaseRequest(
        case_id="case-plan-1",
        as_of_time=datetime.now(timezone.utc),
        source_system="feed",
        ioc_type=ioc_type,
        ioc_value=ioc_value,
        host_context={"criticality": criticality, "environment": environment, "hostId": "host-1"},
        rule_context={"ruleFamily": "sigma"},
        detection_package={
            "rule_family": "sigma",
            "object_metadata": {"object_type": object_type, "object_id": "obj-1"},
            "asset_context": {"criticality": criticality, "environment": environment},
            "related_detections": {"detections": related},
            "historical_learning_context": {
                "features": history_features or {},
                "feature_provenance": [],
                "quality": {"eligible_count": 3 if history_features else 0, "dropped_count": 0, "drop_reasons": {}, "lookback_days": 90},
                "similar_detections": similar_detections or [],
            },
        },
    )


def _actions(plan) -> list[str]:
    return [item.action for item in plan.recommended_actions]


def _action_score(plan, action: str) -> float:
    for item in plan.machine_readable.action_scores:
        if item.action == action:
            return item.score
    raise AssertionError(f"missing action score for {action}")


def test_action_plan_malicious_critical_host_prioritizes_containment() -> None:
    plan = build_action_plan(
        request=_request(ioc_type="ip", ioc_value="203.0.113.7", criticality="critical", environment="prod"),
        verdict="malicious",
        confidence=0.93,
        false_positive_risk=0.08,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Corroborated behavior and enrichment evidence."],
    )
    actions = _actions(plan)
    assert actions[0] in {"isolate_host", "block_ip"}
    assert any(action in {"isolate_host", "block_ip", "search_fleet"} for action in actions)


def test_action_plan_selected_actions_are_subset_of_policy_allowed_actions() -> None:
    plan = build_action_plan(
        request=_request(ioc_type="ip", ioc_value="203.0.113.10"),
        verdict="likely_malicious",
        confidence=0.74,
        false_positive_risk=0.81,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Signals conflict with prior benign history."],
    )
    selected_actions = {item.action for item in plan.recommended_actions}
    allowed_actions = set(plan.machine_readable.selection["policy_allowed_actions"])
    assert selected_actions.issubset(allowed_actions)
    assert not any(
        action in {"isolate_host", "quarantine_file", "block_hash", "block_domain", "block_url", "block_ip"}
        for action in selected_actions
    )
    assert plan.machine_readable.selection["severity_cap_applied"] is True
    assert plan.machine_readable.selection["max_recommendation_severity"] == "review_only"


def test_action_plan_object_type_gates_block_actions() -> None:
    domain_plan = build_action_plan(
        request=_request(ioc_type="domain", ioc_value="bad.example", object_type="network_flow"),
        verdict="likely_malicious",
        confidence=0.87,
        false_positive_risk=0.19,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Multiple detections reference the same domain."],
    )
    actions = _actions(domain_plan)
    assert "block_domain" in actions
    assert "block_hash" not in actions


def test_action_plan_related_detections_and_environment_influence_ranking() -> None:
    low_related = build_action_plan(
        request=_request(related_count=0, criticality="medium", environment="dev"),
        verdict="suspicious",
        confidence=0.78,
        false_positive_risk=0.22,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Suspicious execution signal."],
    )
    high_related = build_action_plan(
        request=_request(related_count=5, criticality="critical", environment="prod"),
        verdict="suspicious",
        confidence=0.78,
        false_positive_risk=0.22,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Suspicious execution signal."],
    )
    low_top_score = low_related.recommended_actions[0].score
    high_top_score = high_related.recommended_actions[0].score
    assert high_top_score >= low_top_score


def test_action_plan_high_rollback_rejection_history_penalizes_disruptive_actions() -> None:
    baseline = build_action_plan(
        request=_request(ioc_type="ip", ioc_value="203.0.113.20", history_features={}),
        verdict="malicious",
        confidence=0.92,
        false_positive_risk=0.10,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Corroborated malicious detection."],
    )
    penalized = build_action_plan(
        request=_request(
            ioc_type="ip",
            ioc_value="203.0.113.20",
            history_features={
                "history_rollback_rate": 0.9,
                "history_recommendation_reject_rate": 0.85,
                "history_post_action_regression_rate": 0.88,
                "history_sample_size_signal": 0.9,
                "history_recency_signal": 0.9,
            },
        ),
        verdict="malicious",
        confidence=0.92,
        false_positive_risk=0.10,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Corroborated malicious detection."],
    )
    assert _action_score(penalized, "isolate_host") <= _action_score(baseline, "isolate_host")
    assert _action_score(penalized, "block_ip") <= _action_score(baseline, "block_ip")


def test_action_plan_accepted_malicious_history_increases_spread_validation_priority() -> None:
    baseline = build_action_plan(
        request=_request(ioc_type="domain", ioc_value="spread-check.example", related_count=1, history_features={}),
        verdict="suspicious",
        confidence=0.78,
        false_positive_risk=0.20,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Suspicious execution signal."],
    )
    boosted = build_action_plan(
        request=_request(
            ioc_type="domain",
            ioc_value="spread-check.example",
            related_count=1,
            history_features={
                "history_support_signal": 0.9,
                "history_recommendation_accept_rate": 0.92,
                "history_sample_size_signal": 0.9,
                "history_recency_signal": 0.9,
            },
        ),
        verdict="suspicious",
        confidence=0.78,
        false_positive_risk=0.20,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Suspicious execution signal."],
    )
    assert _action_score(boosted, "search_fleet") >= _action_score(baseline, "search_fleet")


def test_action_plan_similarity_regression_signal_penalizes_disruptive_actions() -> None:
    baseline = build_action_plan(
        request=_request(ioc_type="ip", ioc_value="203.0.113.42", history_features={}, similar_detections=[]),
        verdict="malicious",
        confidence=0.92,
        false_positive_risk=0.10,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Corroborated malicious detection."],
    )
    regressed = build_action_plan(
        request=_request(
            ioc_type="ip",
            ioc_value="203.0.113.42",
            history_features={},
            similar_detections=[
                {
                    "detection_id": "det-sim-regression",
                    "rule_family": "sigma",
                    "rule_id": "SIG-SIM-1",
                    "relation_type": "supporting_signal",
                    "observed_at": "2026-04-16T09:00:00Z",
                    "confidence": 0.87,
                    "similarity_score": 0.92,
                    "similarity_reasons": ["same rule id", "same hash/domain/ip/url indicator"],
                    "prior_verdicts": ["malicious"],
                    "prior_accepted_actions": [],
                    "prior_outcomes": ["regression"],
                }
            ],
        ),
        verdict="malicious",
        confidence=0.92,
        false_positive_risk=0.10,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Corroborated malicious detection."],
    )
    assert _action_score(regressed, "isolate_host") <= _action_score(baseline, "isolate_host")
    assert _action_score(regressed, "block_ip") <= _action_score(baseline, "block_ip")
    snapshot = regressed.machine_readable.input_snapshot
    assert snapshot["history_similarity_strength_signal"] > 0.0
    assert snapshot["history_similar_regression_signal"] > 0.0
    isolate_score_row = next(item for item in regressed.machine_readable.action_scores if item.action == "isolate_host")
    assert "Historical rollback/regression pressure reduced disruptive ranking." in isolate_score_row.rationale


def test_action_plan_similarity_action_acceptance_boosts_matching_action() -> None:
    baseline = build_action_plan(
        request=_request(ioc_type="domain", ioc_value="spread-sim.example", history_features={}, similar_detections=[]),
        verdict="suspicious",
        confidence=0.78,
        false_positive_risk=0.20,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Suspicious execution signal."],
    )
    boosted = build_action_plan(
        request=_request(
            ioc_type="domain",
            ioc_value="spread-sim.example",
            history_features={},
            similar_detections=[
                {
                    "detection_id": "det-sim-acceptance",
                    "rule_family": "sigma",
                    "rule_id": "SIG-SIM-2",
                    "relation_type": "supporting_signal",
                    "observed_at": "2026-04-16T10:30:00Z",
                    "confidence": 0.84,
                    "similarity_score": 0.90,
                    "similarity_reasons": ["same rule family", "similar behavior patterns (script_host)"],
                    "prior_verdicts": ["malicious"],
                    "prior_accepted_actions": ["search_fleet"],
                    "prior_outcomes": ["success"],
                }
            ],
        ),
        verdict="suspicious",
        confidence=0.78,
        false_positive_risk=0.20,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Suspicious execution signal."],
    )
    assert _action_score(boosted, "search_fleet") >= _action_score(baseline, "search_fleet")
    snapshot = boosted.machine_readable.input_snapshot
    assert snapshot["history_similarity_strength_signal"] > 0.0
    assert snapshot["history_action_acceptance_signal"] > 0.0
    assert snapshot["history_action_acceptance_by_action"]["search_fleet"] > 0.0
    search_score_row = next(item for item in boosted.machine_readable.action_scores if item.action == "search_fleet")
    assert "High-confidence similar detections increased retrieval-driven spread checks." in search_score_row.rationale


def test_action_plan_likely_benign_prefers_rule_hygiene_actions() -> None:
    plan = build_action_plan(
        request=_request(ioc_type="domain", ioc_value="possibly-benign.example", criticality="low", environment="dev", related_count=0),
        verdict="likely_benign",
        confidence=0.52,
        false_positive_risk=0.24,
        evidence_fusion=None,
        family="unknown",
        evidence_summary=["Benign signals dominate and confidence is limited."],
    )
    assert plan.recommended_actions[0].action in {"suppress_rule_candidate", "tighten_rule", "no_immediate_action"}
    assert not any(action in {"isolate_host", "block_domain", "block_ip"} for action in _actions(plan))


def test_action_plan_includes_policy_driven_escalation_and_reviewer_fields() -> None:
    plan = build_action_plan(
        request=_request(),
        verdict="insufficient_evidence",
        confidence=0.40,
        false_positive_risk=0.44,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Insufficient correlated evidence."],
    )
    assert all(item.execution_mode == "manual_only" for item in plan.recommended_actions)
    assert all(item.requires_human_approval is True for item in plan.recommended_actions)
    assert all(item.escalation_target == "analyst_queue" for item in plan.recommended_actions)
    assert all(item.required_reviewer_role == "tier1_analyst" for item in plan.recommended_actions)
    assert plan.machine_readable.selection["matched_policy_row_id"] == "insufficient_evidence_default"
    assert plan.machine_readable.selection["derived_confidence_bucket"] == "low"
    assert plan.machine_readable.selection["derived_false_positive_risk_bucket"] == "medium"
    assert plan.machine_readable.selection["severity_cap_applied"] is True


def test_action_plan_matrix_override_changes_allowed_actions_without_code_changes(
    monkeypatch,
) -> None:
    payload = {
        "version": "v-test-override",
        "confidence_buckets": [
            {"name": "low", "min": 0.0, "max": 0.5, "min_inclusive": True, "max_inclusive": False},
            {"name": "medium", "min": 0.5, "max": 0.8, "min_inclusive": True, "max_inclusive": False},
            {"name": "high", "min": 0.8, "max": 1.0, "min_inclusive": True, "max_inclusive": True},
        ],
        "false_positive_risk_buckets": [
            {"name": "low", "min": 0.0, "max": 0.5, "min_inclusive": True, "max_inclusive": True},
            {"name": "medium", "min": 0.5, "max": 0.8, "min_inclusive": False, "max_inclusive": True},
            {"name": "high", "min": 0.8, "max": 1.0, "min_inclusive": False, "max_inclusive": True},
        ],
        "rows": [
            {
                "id": "malicious-restricted",
                "priority": 100,
                "family": "*",
                "verdict": "malicious",
                "confidence_bucket": "*",
                "false_positive_risk_bucket": "*",
                "asset_criticality": "*",
                "object_type": "*",
                "allowed_actions": ["notify_analyst", "no_immediate_action"],
                "escalation_target": "analyst_queue",
                "required_reviewer_role": "tier1_analyst",
            },
            {
                "id": "catch-all",
                "priority": 1,
                "family": "*",
                "verdict": "*",
                "confidence_bucket": "*",
                "false_positive_risk_bucket": "*",
                "asset_criticality": "*",
                "object_type": "*",
                "allowed_actions": ["notify_analyst", "no_immediate_action"],
                "escalation_target": "none",
                "required_reviewer_role": "tier1_analyst",
            },
        ],
    }
    matrix_path = Path(__file__).resolve().parent / "_tmp_action_policy_matrix_override.json"
    try:
        matrix_path.write_text(json.dumps(payload), encoding="utf-8")
        monkeypatch.setenv("CTI_SIDECAR_ACTION_POLICY_MATRIX_PATH", str(matrix_path))
        clear_action_policy_matrix_cache()

        plan = build_action_plan(
            request=_request(),
            verdict="malicious",
            confidence=0.95,
            false_positive_risk=0.02,
            evidence_fusion=None,
            family="sigma",
            evidence_summary=["Policy override validation."],
        )

        assert {item.action for item in plan.recommended_actions}.issubset({"notify_analyst", "no_immediate_action"})
        assert plan.machine_readable.selection["matched_policy_row_id"] == "malicious-restricted"
        assert plan.recommended_actions[0].action == "no_immediate_action"
    finally:
        clear_action_policy_matrix_cache()
        matrix_path.unlink(missing_ok=True)


def test_action_plan_includes_llm_assist_diagnostics_when_disabled(monkeypatch) -> None:
    monkeypatch.delenv("CTI_ENABLE_LLM_ASSIST", raising=False)
    monkeypatch.delenv("CTI_LLM_ASSIST_PROVIDER", raising=False)

    plan = build_action_plan(
        request=_request(),
        verdict="likely_malicious",
        confidence=0.74,
        false_positive_risk=0.18,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Deterministic baseline for diagnostics."],
    )

    llm_assist = plan.machine_readable.input_snapshot.get("llm_assist")
    assert isinstance(llm_assist, dict)
    assert llm_assist["status"] == "disabled"


def test_action_plan_llm_assist_applies_phrase_only_without_policy_or_execution_changes(monkeypatch) -> None:
    request = _request(ioc_type="domain", ioc_value="integration-llm-assist.example", related_count=2)
    monkeypatch.delenv("CTI_ENABLE_LLM_ASSIST", raising=False)
    monkeypatch.delenv("CTI_LLM_ASSIST_PROVIDER", raising=False)
    baseline = build_action_plan(
        request=request,
        verdict="suspicious",
        confidence=0.78,
        false_positive_risk=0.20,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Deterministic baseline for phrasing-only rewrite."],
    )
    rewritten_action = baseline.recommended_actions[0].action

    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")
    monkeypatch.setitem(
        llm_assist_phrasing._PROVIDER_GATEWAY,
        "unit",
        lambda _system, _user, _model, _timeout: json.dumps(
            {
                "abstain": False,
                "abstain_reason": None,
                "summary": "Rephrased summary while preserving deterministic selections.",
                "action_rationales": {
                    rewritten_action: f"{rewritten_action} rephrased rationale based on deterministic evidence context."
                },
            }
        ),
    )
    assisted = build_action_plan(
        request=request,
        verdict="suspicious",
        confidence=0.78,
        false_positive_risk=0.20,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Deterministic baseline for phrasing-only rewrite."],
    )

    assert [item.action for item in assisted.recommended_actions] == [item.action for item in baseline.recommended_actions]
    assert [item.rank for item in assisted.recommended_actions] == [item.rank for item in baseline.recommended_actions]
    assert [item.score for item in assisted.recommended_actions] == [item.score for item in baseline.recommended_actions]
    assert assisted.summary == "Rephrased summary while preserving deterministic selections."
    assisted_rationale = {item.action: item.rationale for item in assisted.recommended_actions}
    baseline_rationale = {item.action: item.rationale for item in baseline.recommended_actions}
    assert assisted_rationale[rewritten_action] != baseline_rationale[rewritten_action]
    assert all(item.execution_mode == "manual_only" for item in assisted.recommended_actions)
    assert all(item.requires_human_approval is True for item in assisted.recommended_actions)
    assert assisted.machine_readable.input_snapshot["llm_assist"]["status"] == "applied"


def test_action_plan_low_confidence_caps_disruptive_actions() -> None:
    plan = build_action_plan(
        request=_request(ioc_type="ip", ioc_value="203.0.113.51"),
        verdict="malicious",
        confidence=0.42,
        false_positive_risk=0.12,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Malicious-like evidence exists but confidence remains low."],
    )

    assert not any(action in DISRUPTIVE_ACTIONS for action in _actions(plan))
    assert plan.machine_readable.selection["severity_cap_applied"] is True


def test_action_plan_contradiction_cap_blocks_disruptive_actions() -> None:
    plan = build_action_plan(
        request=_request(ioc_type="ip", ioc_value="203.0.113.60"),
        verdict="likely_malicious",
        confidence=0.82,
        false_positive_risk=0.18,
        evidence_fusion=None,
        family="sigma",
        evidence_summary=["Corroborated evidence with unresolved contradictions."],
        contradiction_score=0.35,
    )

    assert not any(action in DISRUPTIVE_ACTIONS for action in _actions(plan))
    assert plan.machine_readable.input_snapshot["contradiction_score"] == 0.35
    assert plan.machine_readable.selection["severity_cap_applied"] is True

