from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from decision_service.calibration import LogisticCalibrator
from decision_service.evaluator import evaluate_snapshot
from decision_service.scorer import BaselineScorer, ScorerContext, ScoringThresholds
from decision_service.snapshots import SnapshotLoader


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

