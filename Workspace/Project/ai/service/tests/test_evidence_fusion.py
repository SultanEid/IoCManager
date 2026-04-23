from __future__ import annotations

from decision_service.evidence_fusion import fuse_evidence


def _full_detection_package() -> dict[str, object]:
    return {
        "rule_family": "sigma",
        "full_rule_text": "title: Suspicious Script Host",
        "rule_metadata": {
            "source": "soc-content",
            "rule_id": "SIG-EF-1",
            "title": "Suspicious Script Host",
            "tags": ["suspicious", "attack.execution"],
            "level": "high",
        },
        "raw_hit_payload": {
            "event_id": "evt-ef-1",
            "command_line": "wscript.exe launcher.js",
            "message": "malicious script behavior",
        },
        "object_metadata": {
            "object_id": "obj-ef-1",
            "object_type": "process_event",
            "source_system": "siem",
            "custom_attributes": {
                "environment_context": {
                    "environment": "prod",
                    "sensor": "sensor-1",
                }
            },
        },
        "asset_context": {
            "asset_id": "asset-ef-1",
            "criticality": "critical",
            "environment": "prod",
        },
        "time_prevalence_context": {
            "hit_time": "2026-04-16T10:00:00Z",
            "trend": "increasing",
            "recency_bucket": "new",
        },
        "linked_enrichment": {
            "enrichments": [
                {"kind": "reputation", "source": "intel-feed", "value": {"score": 96}, "confidence": 0.9}
            ]
        },
        "behavior_report_references": {
            "reports": [
                {
                    "report_id": "rep-ef-1",
                    "source": "sandbox-cluster",
                    "reference": "internal://reports/rep-ef-1",
                    "summary": "Observed C2 beacon and staged tasking.",
                    "behavior_evidence_snippets": ["Suspicious script/interpreter usage: wscript.exe."],
                }
            ]
        },
        "prior_analyst_outcomes": {
            "outcomes": [
                {
                    "analyst_id": "analyst-1",
                    "decision_id": "dec-ef-1",
                    "verdict": "likely_malicious",
                    "notes": "Consistent with previous malicious execution chain.",
                }
            ]
        },
    }


def test_fusion_merges_all_required_channels() -> None:
    result = fuse_evidence(detection_package=_full_detection_package())

    assert result.coverage["rule_semantics"] is True
    assert result.coverage["hit_payload"] is True
    assert result.coverage["environment_context"] is True
    assert result.coverage["linked_enrichment"] is True
    assert result.coverage["behavior_evidence"] is True
    assert result.coverage["analyst_history"] is True
    assert result.explanation_lines


def test_fusion_deduplicates_duplicate_sources_without_double_counting() -> None:
    package = _full_detection_package()
    package["linked_enrichment"] = {
        "enrichments": [
            {"kind": "reputation", "source": "intel-feed", "value": {"score": 96}, "confidence": 0.9},
            {"kind": "reputation", "source": "intel-feed", "value": {"score": 96}, "confidence": 0.9},
        ]
    }

    result = fuse_evidence(detection_package=package)
    assert result.deduplication.duplicate_count >= 1
    assert result.deduplication.unique_count < result.deduplication.input_count
    assert len(result.deduplication_ledger) == result.deduplication.duplicate_count


def test_fusion_keeps_negative_and_contradictory_evidence_separate() -> None:
    package = _full_detection_package()
    package["prior_analyst_outcomes"] = {
        "outcomes": [
            {"analyst_id": "a1", "decision_id": "d1", "verdict": "likely_malicious", "notes": "Malicious chain."},
            {"analyst_id": "a2", "decision_id": "d1", "verdict": "false_positive", "notes": "Benign installer."},
            {"analyst_id": "a3", "decision_id": "d3", "verdict": "false_positive", "notes": "Known benign maintenance task."},
        ]
    }

    result = fuse_evidence(detection_package=package)

    assert result.contradictory_evidence
    assert result.negative_evidence
    contradictory_anchors = {item.anchor for item in result.contradictory_evidence}
    assert "d3" not in contradictory_anchors


def test_fusion_emits_missing_evidence_for_sparse_inputs() -> None:
    result = fuse_evidence(
        detection_package={
            "rule_metadata": {"source": "unit", "rule_id": "SIG-SPARSE-1", "title": "Sparse"},
            "raw_hit_payload": {"event_id": "evt-sparse-1"},
            "object_metadata": {"object_id": "obj-sparse-1", "object_type": "process_event"},
        }
    )

    missing_channels = {item.channel for item in result.missing_evidence}
    assert "linked_enrichment" in missing_channels
    assert "behavior_evidence" in missing_channels
    assert "analyst_history" in missing_channels


def test_fusion_output_is_deterministic_for_identical_input() -> None:
    package = _full_detection_package()
    first = fuse_evidence(detection_package=package)
    second = fuse_evidence(detection_package=package)

    assert first.deduplication == second.deduplication
    assert [item.summary for item in first.positive_evidence] == [item.summary for item in second.positive_evidence]
    assert [item.summary for item in first.contradictory_evidence] == [item.summary for item in second.contradictory_evidence]
    assert first.explanation_lines == second.explanation_lines

