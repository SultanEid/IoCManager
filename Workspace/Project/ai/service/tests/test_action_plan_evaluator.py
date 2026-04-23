from __future__ import annotations

from decision_service.action_plan_evaluator import evaluate_canonical_action_plan_rows


def _canonical_row(
    *,
    row_id: str,
    rule_family: str,
    verdict: str,
    approved_actions: list[str],
    feedback_disposition: str | None = None,
    evidence_used_count: int = 1,
    evidence_missing_count: int = 0,
) -> dict[str, object]:
    return {
        "row_id": row_id,
        "rule_family": rule_family,
        "event_time_utc": "2026-04-20T00:00:00Z",
        "eligible_tasks": ["action_plan_recommendation"],
        "package_payload": {
            "rule_family": rule_family,
            "ioc_type": "domain",
            "ioc_value": "login-secure-update.test",
            "object_metadata": {
                "object_id": f"obj-{row_id}",
                "object_type": "network_flow",
                "source_system": "siem",
            },
            "asset_context": {
                "criticality": "critical",
                "environment": "prod",
            },
            "related_detections": {
                "detections": [
                    {
                        "detection_id": f"det-{row_id}",
                        "rule_family": rule_family,
                        "rule_id": f"{rule_family}-1",
                        "relation_type": "supporting_signal",
                        "observed_at": "2026-04-20T00:00:00Z",
                        "confidence": 0.8,
                    }
                ]
            },
        },
        "target_payload": {
            "decision": {
                "verdict": verdict,
                "confidence": 0.82 if verdict != "false_positive" else 0.3,
                "false_positive_risk": 0.18 if verdict != "false_positive" else 0.78,
                "explanation": "Fixture evaluation row.",
                "evidence_used": [
                    {
                        "evidence_id": f"ev-{row_id}-{index}",
                        "source": rule_family,
                        "summary": "Supporting evidence",
                        "confidence": 0.8,
                    }
                    for index in range(evidence_used_count)
                ],
                "evidence_missing": [
                    {
                        "gap_id": f"gap-{row_id}-{index}",
                        "description": "Missing evidence",
                        "importance": "medium",
                    }
                    for index in range(evidence_missing_count)
                ],
                "contradictory_evidence": [],
            },
            "action_plan": {
                "recommended_actions": [
                    {
                        "action": action,
                        "rank": index,
                    }
                    for index, action in enumerate(approved_actions, start=1)
                ]
            },
            "recommendation_disposition": feedback_disposition,
        },
        "raw_payload": {
            "recommendation_feedback": {
                "disposition": feedback_disposition,
            }
        },
    }


def test_action_plan_evaluator_computes_exact_match_and_top_k_usefulness() -> None:
    rows = [
        _canonical_row(
            row_id="1",
            rule_family="sigma",
            verdict="likely_malicious",
            approved_actions=["isolate_host", "search_fleet", "open_review"],
            feedback_disposition="accepted",
            evidence_used_count=2,
        ),
        _canonical_row(
            row_id="2",
            rule_family="snort",
            verdict="false_positive",
            approved_actions=["no_immediate_action", "open_review"],
            feedback_disposition="rejected",
            evidence_used_count=0,
            evidence_missing_count=1,
        ),
    ]

    overall, slices, sample_size = evaluate_canonical_action_plan_rows(rows, top_k=2)

    assert sample_size == 2
    assert overall.exact_match_rate is not None
    assert overall.top_k_usefulness_rate is not None
    assert overall.analyst_acceptance_rate == 0.5
    assert overall.unsafe_recommendation_rate is not None
    assert overall.action_breakdown
    assert any(item.slice_field == "rule_family" for item in slices)
    assert any(item.slice_field == "evidence_availability_bucket" for item in slices)


def test_action_plan_evaluator_marks_acceptance_unavailable_without_feedback() -> None:
    rows = [
        _canonical_row(
            row_id="3",
            rule_family="yara",
            verdict="insufficient_evidence",
            approved_actions=["open_review", "no_immediate_action"],
            feedback_disposition=None,
            evidence_used_count=1,
            evidence_missing_count=1,
        )
    ]

    overall, _, sample_size = evaluate_canonical_action_plan_rows(rows, top_k=2)

    assert sample_size == 1
    assert overall.analyst_acceptance_rate is None
    assert "analyst_acceptance_rate" in overall.unavailable_metrics


