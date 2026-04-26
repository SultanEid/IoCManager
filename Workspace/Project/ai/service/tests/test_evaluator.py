from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from decision_service.calibration import LogisticCalibrator
from decision_service.evaluator import evaluate_snapshot
from decision_service.scorer import BaselineScorer, ScorerContext, ScoringThresholds
from decision_service.snapshots import SnapshotLoader
from decision_service.evaluation_metrics import DecisionEvaluationRow, compute_decision_metrics, slice_decision_metrics


def test_evaluator_respects_time_window(snapshot_root: Path) -> None:
    loader = SnapshotLoader(snapshot_root)
    snapshot = loader.load("test-v1")
    scorer = BaselineScorer(
        context=ScorerContext(
            model_version="v1",
            dataset_version="test-v1",
            source_trust_map=snapshot.source_trust_map,
        ),
        calibrator=LogisticCalibrator(),
        thresholds=ScoringThresholds(),
    )

    overall_all, _, sample_all = evaluate_snapshot(
        scorer=scorer,
        snapshot=snapshot,
        horizon_hours=72,
        window_start_utc=None,
        window_end_utc=None,
        slice_fields=["time_bucket"],
    )
    overall_recent, _, sample_recent = evaluate_snapshot(
        scorer=scorer,
        snapshot=snapshot,
        horizon_hours=72,
        window_start_utc=datetime(2026, 3, 12, 6, 0, tzinfo=timezone.utc),
        window_end_utc=None,
        slice_fields=["time_bucket"],
    )

    assert sample_all > sample_recent
    assert 0.0 <= overall_all.pr_auc <= 1.0
    assert overall_recent.pr_auc is None or 0.0 <= overall_recent.pr_auc <= 1.0
    assert overall_all.confusion_matrix.tp >= 0
    assert overall_all.confusion_matrix.abstained_positive >= 0
    assert overall_all.calibration_bins
    assert overall_all.brier_score is not None
    assert "analyst_override_rate" not in overall_all.unavailable_metrics
    assert "rollback_rate" in overall_all.unavailable_metrics


def test_ioc_decision_metrics_include_likely_malicious_calibration_and_weak_evidence() -> None:
    now = datetime(2026, 4, 26, 12, 0, tzinfo=timezone.utc)
    rows = [
        DecisionEvaluationRow(
            label=1,
            score=0.91,
            abstained=False,
            predicted_verdict="likely_malicious",
            rule_family="sigma",
            source_system="ioc_manager",
            source_name="trusted_feed",
            source_type="trusted_feed",
            ioc_type="url",
            severity="critical",
            table_confidence=0.94,
            evidence_tier="scan_correlated",
            label_provenance="trusted_feed",
            scan_evidence_available=True,
            event_time=now,
            source_trust=0.9,
        ),
        DecisionEvaluationRow(
            label=0,
            score=0.72,
            abstained=False,
            predicted_verdict="likely_malicious",
            rule_family="sigma",
            source_system="ioc_manager",
            source_name="manual",
            source_type="manual_entry",
            ioc_type="domain",
            severity="high",
            table_confidence=0.72,
            evidence_tier="attribute_only",
            label_provenance="weak_table_label",
            scan_evidence_available=False,
            weak_evidence=True,
            event_time=now,
            source_trust=0.6,
        ),
        DecisionEvaluationRow(
            label=0,
            score=0.18,
            abstained=False,
            predicted_verdict="false_positive",
            rule_family="generic",
            source_system="ioc_manager",
            source_name="internal-allowlists",
            source_type="internal_allowlist",
            ioc_type="domain",
            severity="low",
            table_confidence=0.90,
            evidence_tier="analyst_outcome",
            label_provenance="internal_allowlist",
            scan_evidence_available=False,
            event_time=now,
            source_trust=0.95,
        ),
        DecisionEvaluationRow(
            label=1,
            score=0.48,
            abstained=True,
            predicted_verdict="insufficient_evidence",
            rule_family="generic",
            source_system="ioc_manager",
            source_name="manual",
            source_type="manual_entry",
            ioc_type="process",
            severity="high",
            table_confidence=0.70,
            evidence_tier="attribute_only",
            label_provenance="weak_table_label",
            scan_evidence_available=False,
            weak_evidence=True,
            event_time=now,
            source_trust=0.6,
        ),
    ]

    metrics = compute_decision_metrics(rows, threshold=0.55)
    assert metrics.likely_malicious_precision == 0.5
    assert metrics.weak_evidence_rate == 0.5
    assert metrics.confidence_distribution["high"] == 1
    assert metrics.confidence_distribution["very_high"] == 1

    slices = slice_decision_metrics(
        rows,
        threshold=0.55,
        slice_fields=[
            "source_name",
            "source_type",
            "severity",
            "table_confidence_bucket",
            "age_bucket",
            "evidence_tier",
            "label_provenance",
            "scan_evidence_available",
        ],
        reference_time=now,
    )
    fields = {item.slice_field for item in slices}
    assert {"source_name", "source_type", "severity", "table_confidence_bucket", "age_bucket", "evidence_tier", "label_provenance", "scan_evidence_available"}.issubset(fields)

