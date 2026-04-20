from __future__ import annotations

import json

from cti_service.llm_assist_phrasing import (
    ActionPlanPhrasingAction,
    ActionPlanPhrasingEvidence,
    ExplanationPhrasingEvidence,
    apply_action_plan_phrasing,
    apply_explanation_phrasing,
)


def _action_evidence(*, lexical_only_guard_triggered: bool = False) -> ActionPlanPhrasingEvidence:
    return ActionPlanPhrasingEvidence(
        verdict="likely_malicious",
        confidence=0.82,
        false_positive_risk=0.14,
        evidence_positive_count=4,
        evidence_contradictory_count=1,
        evidence_missing_count=1,
        lexical_only_guard_triggered=lexical_only_guard_triggered,
        deterministic_summary="Generated deterministic manual-only action plan.",
        deterministic_actions=[
            ActionPlanPhrasingAction(
                action="search_fleet",
                rank=1,
                score=0.77,
                rationale="search_fleet prioritized to validate spread across related detections.",
            ),
            ActionPlanPhrasingAction(
                action="notify_analyst",
                rank=2,
                score=0.64,
                rationale="notify_analyst prioritized for controlled communication.",
            ),
        ],
        deterministic_guardrails={
            "never_auto_executes": True,
            "manual_only": True,
            "policy_constrained": True,
            "evidence_based": True,
        },
        policy_row_id="likely_malicious_default",
        policy_matrix_version="v1",
    )


def _explanation_evidence(*, lexical_only_guard_triggered: bool = False) -> ExplanationPhrasingEvidence:
    return ExplanationPhrasingEvidence(
        decision_state="recommend",
        recommended_action="contain_and_monitor",
        evidence_total=3,
        evidence_conflict_count=1,
        source_trust=0.63,
        criticality=0.71,
        lexical_only_guard_triggered=lexical_only_guard_triggered,
        deterministic_summary="Contain after review (state=recommend, policy=p1, model=v1-test).",
        deterministic_rationale=[
            "Decision state is 'recommend' with recommendation 'contain_and_monitor'.",
            "Evidence references: 3 total, 1 conflicting.",
        ],
        policy_version="p1",
        model_version="v1-test",
        dataset_version="test-v1",
    )


def test_action_plan_llm_disabled_keeps_deterministic_text(monkeypatch) -> None:
    monkeypatch.delenv("CTI_ENABLE_LLM_ASSIST", raising=False)
    monkeypatch.delenv("CTI_LLM_ASSIST_PROVIDER", raising=False)
    evidence = _action_evidence()

    result = apply_action_plan_phrasing(
        evidence=evidence,
        provider_call=lambda _s, _u, _m, _t: json.dumps({"abstain": False}),
    )

    assert result.summary == evidence.deterministic_summary
    assert result.action_rationale_overrides == {}
    assert result.diagnostics["status"] == "disabled"


def test_action_plan_llm_enabled_without_provider_falls_back(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.delenv("CTI_LLM_ASSIST_PROVIDER", raising=False)

    result = apply_action_plan_phrasing(evidence=_action_evidence())

    assert result.summary == _action_evidence().deterministic_summary
    assert result.action_rationale_overrides == {}
    assert result.diagnostics["status"] == "provider_unavailable"


def test_action_plan_malformed_output_falls_back(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")

    result = apply_action_plan_phrasing(
        evidence=_action_evidence(),
        provider_call=lambda _s, _u, _m, _t: "not-json",
    )

    assert result.action_rationale_overrides == {}
    assert result.diagnostics["status"] == "malformed_output"


def test_action_plan_schema_invalid_output_falls_back(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")

    result = apply_action_plan_phrasing(
        evidence=_action_evidence(),
        provider_call=lambda _s, _u, _m, _t: json.dumps(
            {
                "abstain": False,
                "abstain_reason": None,
                "summary": "",
                "action_rationales": {},
            }
        ),
    )

    assert result.action_rationale_overrides == {}
    assert result.diagnostics["status"] == "schema_validation_failed"


def test_action_plan_explicit_abstention_falls_back(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")

    result = apply_action_plan_phrasing(
        evidence=_action_evidence(),
        provider_call=lambda _s, _u, _m, _t: json.dumps(
            {
                "abstain": True,
                "abstain_reason": "insufficient_structured_evidence",
                "summary": None,
                "action_rationales": {},
            }
        ),
    )

    assert result.action_rationale_overrides == {}
    assert result.diagnostics["status"] == "abstained"


def test_action_plan_guardrail_rejection_falls_back(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")

    result = apply_action_plan_phrasing(
        evidence=_action_evidence(),
        provider_call=lambda _s, _u, _m, _t: json.dumps(
            {
                "abstain": False,
                "abstain_reason": None,
                "summary": "Automatically execute isolation without human approval.",
                "action_rationales": {
                    "search_fleet": "Automatically execute immediate containment.",
                },
            }
        ),
    )

    assert result.summary == _action_evidence().deterministic_summary
    assert result.action_rationale_overrides == {}
    assert result.diagnostics["status"] == "guardrail_rejected"


def test_action_plan_valid_output_applies_phrase_only(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")
    evidence = _action_evidence()

    result = apply_action_plan_phrasing(
        evidence=evidence,
        provider_call=lambda _s, _u, _m, _t: json.dumps(
            {
                "abstain": False,
                "abstain_reason": None,
                "summary": "Generated manual-only actions from deterministic policy gates.",
                "action_rationales": {
                    "search_fleet": "search_fleet prioritized to verify spread before irreversible controls.",
                },
            }
        ),
    )

    assert result.summary == "Generated manual-only actions from deterministic policy gates."
    assert result.action_rationale_overrides == {
        "search_fleet": "search_fleet prioritized to verify spread before irreversible controls."
    }
    assert result.diagnostics["status"] == "applied"


def test_explanation_llm_valid_output_applies(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")

    result = apply_explanation_phrasing(
        evidence=_explanation_evidence(),
        provider_call=lambda _s, _u, _m, _t: json.dumps(
            {
                "abstain": False,
                "abstain_reason": None,
                "summary": "Contain after review with deterministic evidence support.",
                "rationale": [
                    "Decision remains deterministic and evidence-backed.",
                    "Evidence conflicts are tracked and require manual review.",
                ],
            }
        ),
    )

    assert result.summary == "Contain after review with deterministic evidence support."
    assert result.rationale[0] == "Decision remains deterministic and evidence-backed."
    assert result.diagnostics["status"] == "applied"


def test_explanation_lexical_only_guard_rejects_strong_malicious_claim(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")
    evidence = _explanation_evidence(lexical_only_guard_triggered=True)

    result = apply_explanation_phrasing(
        evidence=evidence,
        provider_call=lambda _s, _u, _m, _t: json.dumps(
            {
                "abstain": False,
                "abstain_reason": None,
                "summary": "This indicator is malicious and confirmed malicious.",
                "rationale": [
                    "Known malware behavior confirms compromise.",
                ],
            }
        ),
    )

    assert result.summary == evidence.deterministic_summary
    assert result.rationale == evidence.deterministic_rationale
    assert result.diagnostics["status"] == "guardrail_rejected"
