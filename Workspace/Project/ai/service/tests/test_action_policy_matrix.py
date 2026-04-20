from __future__ import annotations

import json
from pathlib import Path

from cti_service.action_policy_matrix import (
    clear_action_policy_matrix_cache,
    get_action_policy_matrix,
    select_action_policy,
)


def _default_matrix_path() -> Path:
    return Path(__file__).resolve().parents[1] / "artifacts" / "action_policy_matrix.v1.json"


def test_policy_matrix_supports_exact_and_wildcard_row_matching() -> None:
    matrix = get_action_policy_matrix(_default_matrix_path())

    exact = select_action_policy(
        matrix=matrix,
        family="sigma",
        verdict="malicious",
        confidence=0.92,
        false_positive_risk=0.08,
        asset_criticality="critical",
        object_type="process",
    )
    assert exact.row_id == "malicious_high_low_critical"

    wildcard = select_action_policy(
        matrix=matrix,
        family="sigma",
        verdict="malicious",
        confidence=0.92,
        false_positive_risk=0.08,
        asset_criticality="medium",
        object_type="process",
    )
    assert wildcard.row_id == "malicious_high_low_default"


def test_policy_matrix_bucket_boundaries_are_deterministic() -> None:
    matrix = get_action_policy_matrix(_default_matrix_path())

    low_boundary = select_action_policy(
        matrix=matrix,
        family="sigma",
        verdict="insufficient_evidence",
        confidence=0.50,
        false_positive_risk=0.25,
        asset_criticality="low",
        object_type="network",
    )
    assert low_boundary.confidence_bucket == "medium"
    assert low_boundary.false_positive_risk_bucket == "low"

    high_boundary = select_action_policy(
        matrix=matrix,
        family="sigma",
        verdict="insufficient_evidence",
        confidence=0.80,
        false_positive_risk=0.25001,
        asset_criticality="low",
        object_type="network",
    )
    assert high_boundary.confidence_bucket == "high"
    assert high_boundary.false_positive_risk_bucket == "medium"


def test_policy_matrix_selection_prefers_highest_priority_then_first_row() -> None:
    payload = {
        "version": "v-test",
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
                "id": "same-priority-first",
                "priority": 50,
                "family": "*",
                "verdict": "malicious",
                "confidence_bucket": "high",
                "false_positive_risk_bucket": "low",
                "asset_criticality": "*",
                "object_type": "*",
                "allowed_actions": ["open_review", "no_immediate_action"],
                "escalation_target": "analyst_queue",
                "required_reviewer_role": "tier1_analyst",
            },
            {
                "id": "same-priority-second",
                "priority": 50,
                "family": "*",
                "verdict": "malicious",
                "confidence_bucket": "high",
                "false_positive_risk_bucket": "low",
                "asset_criticality": "*",
                "object_type": "*",
                "allowed_actions": ["notify_analyst", "no_immediate_action"],
                "escalation_target": "analyst_queue",
                "required_reviewer_role": "tier1_analyst",
            },
            {
                "id": "higher-priority",
                "priority": 60,
                "family": "*",
                "verdict": "malicious",
                "confidence_bucket": "high",
                "false_positive_risk_bucket": "low",
                "asset_criticality": "*",
                "object_type": "*",
                "allowed_actions": ["isolate_host", "no_immediate_action"],
                "escalation_target": "incident_response",
                "required_reviewer_role": "incident_responder",
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
                "allowed_actions": ["no_immediate_action"],
                "escalation_target": "none",
                "required_reviewer_role": "tier1_analyst",
            },
        ],
    }
    matrix_path = Path(__file__).resolve().parent / "_tmp_action_policy_matrix_precedence.json"
    try:
        matrix_path.write_text(json.dumps(payload), encoding="utf-8")

        clear_action_policy_matrix_cache()
        matrix = get_action_policy_matrix(matrix_path)
        selected = select_action_policy(
            matrix=matrix,
            family="sigma",
            verdict="malicious",
            confidence=0.93,
            false_positive_risk=0.10,
            asset_criticality="high",
            object_type="process",
        )
        assert selected.row_id == "higher-priority"

        payload["rows"][2]["priority"] = 40
        matrix_path.write_text(json.dumps(payload), encoding="utf-8")
        clear_action_policy_matrix_cache()
        matrix = get_action_policy_matrix(matrix_path)
        selected = select_action_policy(
            matrix=matrix,
            family="sigma",
            verdict="malicious",
            confidence=0.93,
            false_positive_risk=0.10,
            asset_criticality="high",
            object_type="process",
        )
        assert selected.row_id == "same-priority-first"
    finally:
        clear_action_policy_matrix_cache()
        matrix_path.unlink(missing_ok=True)
