from __future__ import annotations

from datetime import datetime, timezone

from decision_service.eval_framework import (
    EvaluationMetricBundle,
    EvaluationRecord,
    backtest_by_time,
    compare_against_baselines,
    compute_metric_bundle,
    make_simple_baseline,
    metric_bundle_to_dict,
)
from decision_service.evaluation_metrics import EvaluationConfusionMatrix


def _record(
    case_id: str,
    event_time: datetime,
    label: int,
    score: float,
    decision_state: str,
    **kwargs,
) -> EvaluationRecord:
    return EvaluationRecord(
        case_id=case_id,
        event_time=event_time,
        label=label,
        score=score,
        decision_state=decision_state,
        **kwargs,
    )


def test_compute_metric_bundle_includes_required_metrics() -> None:
    now = datetime(2026, 3, 13, 0, 0, tzinfo=timezone.utc)
    rows = [
        _record(
            "c1",
            now,
            1,
            0.95,
            "recommend",
            analyst_overrode=False,
            high_impact=True,
            queue_rank=1,
            baseline_rank=4,
            canary_succeeded=True,
            rolled_back=False,
            realized_harm=0.05,
            alternative_harm=0.02,
        ),
        _record(
            "c2",
            now,
            0,
            0.80,
            "recommend",
            analyst_overrode=True,
            high_impact=False,
            queue_rank=2,
            baseline_rank=1,
            canary_succeeded=False,
            rolled_back=True,
            realized_harm=0.20,
            alternative_harm=0.05,
        ),
        _record(
            "c3",
            now,
            1,
            0.76,
            "escalate",
            analyst_overrode=False,
            high_impact=False,
            queue_rank=3,
            baseline_rank=2,
            canary_succeeded=True,
            rolled_back=False,
            realized_harm=0.03,
            alternative_harm=0.04,
        ),
        _record("c4", now, 0, 0.32, "abstain", queue_rank=4, baseline_rank=3),
        _record("c5", now, 1, 0.20, "defer", high_impact=True, queue_rank=5, baseline_rank=5),
    ]

    metrics = compute_metric_bundle(rows, top_k=3)

    assert metrics.sample_size == 5
    assert round(metrics.precision_at_k, 4) == 0.6667
    assert round(metrics.recall_at_k, 4) == 0.6667
    assert round(metrics.unsafe_recommendation_rate, 4) == 0.3333
    assert round(metrics.analyst_override_rate, 4) == 0.3333
    assert round(metrics.canary_success_rate, 4) == 0.6667
    assert round(metrics.rollback_rate, 4) == 0.3333
    assert round(metrics.queue_high_impact_lift, 4) == 0.5
    assert round(metrics.deployment_regret, 4) == 0.06
    assert metrics.confusion_matrix.tp == 2
    assert metrics.confusion_matrix.fp == 1
    assert metrics.confusion_matrix.fn == 1
    assert metrics.confusion_matrix.abstained_negative == 1
    assert metrics.false_positive_rate == 1.0
    assert round(metrics.false_negative_rate, 4) == 0.3333
    assert metrics.brier_score is not None
    assert metrics.calibration_bins
    assert metrics.outcomes["confident_correct"] == 2
    assert metrics.outcomes["confident_wrong"] == 1


def test_backtest_by_time_groups_monthly() -> None:
    rows = [
        _record("c1", datetime(2026, 1, 10, tzinfo=timezone.utc), 1, 0.9, "recommend"),
        _record("c2", datetime(2026, 1, 20, tzinfo=timezone.utc), 0, 0.7, "recommend"),
        _record("c3", datetime(2026, 2, 5, tzinfo=timezone.utc), 1, 0.8, "recommend"),
    ]

    slices = backtest_by_time(rows, top_k=2, bucket="month")

    assert [item.bucket for item in slices] == ["2026-01", "2026-02"]
    assert slices[0].metrics.sample_size == 2
    assert slices[1].metrics.sample_size == 1


def test_compare_against_baselines_fails_when_no_measured_gain() -> None:
    candidate = EvaluationMetricBundle(
        precision=0.60,
        recall=0.50,
        f1=0.5454,
        precision_at_k=0.60,
        recall_at_k=0.52,
        pr_auc=0.62,
        calibration_error=0.11,
        brier_score=0.18,
        false_positive_rate=0.25,
        false_negative_rate=0.40,
        unsafe_recommendation_rate=0.21,
        analyst_override_rate=0.10,
        canary_success_rate=0.80,
        rollback_rate=0.15,
        abstain_rate=0.30,
        coverage=0.70,
        queue_high_impact_lift=0.02,
        deployment_regret=0.08,
        confusion_matrix=EvaluationConfusionMatrix(tp=30, fp=10, tn=20, fn=20, abstained_positive=10, abstained_negative=10),
        calibration_bins=[],
        outcomes={"confident_correct": 50, "confident_wrong": 20, "abstained": 30, "overridden": 10, "rolled_back": 5},
        unavailable_metrics=[],
        sample_size=100,
    )
    baseline = EvaluationMetricBundle(
        precision=0.61,
        recall=0.48,
        f1=0.5374,
        precision_at_k=0.61,
        recall_at_k=0.50,
        pr_auc=0.61,
        calibration_error=0.13,
        brier_score=0.19,
        false_positive_rate=0.23,
        false_negative_rate=0.39,
        unsafe_recommendation_rate=0.18,
        analyst_override_rate=0.12,
        canary_success_rate=0.75,
        rollback_rate=0.18,
        abstain_rate=0.30,
        coverage=0.70,
        queue_high_impact_lift=0.03,
        deployment_regret=0.05,
        confusion_matrix=EvaluationConfusionMatrix(tp=29, fp=9, tn=21, fn=20, abstained_positive=11, abstained_negative=10),
        calibration_bins=[],
        outcomes={"confident_correct": 52, "confident_wrong": 18, "abstained": 30, "overridden": 11, "rolled_back": 4},
        unavailable_metrics=[],
        sample_size=100,
    )

    gate = compare_against_baselines(candidate, {"simple": baseline}, min_precision_gain=0.01)

    assert gate.passed is False
    assert gate.reasons


def test_make_simple_baseline_supports_source_trust_strategy() -> None:
    rows = [
        _record(
            "c1",
            datetime(2026, 3, 1, tzinfo=timezone.utc),
            1,
            0.9,
            "recommend",
            source_trust=0.80,
        ),
        _record(
            "c2",
            datetime(2026, 3, 1, tzinfo=timezone.utc),
            0,
            0.3,
            "abstain",
            source_trust=0.20,
        ),
    ]

    baseline = make_simple_baseline(rows, strategy="source_trust")
    assert baseline[0].score == 0.8
    assert baseline[0].decision_state in {"recommend", "escalate"}
    assert baseline[1].score == 0.2
    assert baseline[1].decision_state == "abstain"


def test_metric_bundle_to_dict_exposes_override_alias() -> None:
    bundle = EvaluationMetricBundle(
        precision=0.55,
        recall=0.50,
        f1=0.5238,
        precision_at_k=0.6,
        recall_at_k=0.5,
        pr_auc=0.58,
        calibration_error=0.1,
        brier_score=0.19,
        false_positive_rate=0.30,
        false_negative_rate=0.40,
        unsafe_recommendation_rate=0.2,
        analyst_override_rate=0.13,
        canary_success_rate=0.7,
        rollback_rate=0.15,
        abstain_rate=0.20,
        coverage=0.80,
        queue_high_impact_lift=0.08,
        deployment_regret=0.03,
        confusion_matrix=EvaluationConfusionMatrix(tp=24, fp=16, tn=10, fn=16, abstained_positive=8, abstained_negative=2),
        calibration_bins=[],
        outcomes={"confident_correct": 24, "confident_wrong": 16, "abstained": 8, "overridden": 4, "rolled_back": 2},
        unavailable_metrics=[],
        sample_size=40,
    )

    payload = metric_bundle_to_dict(bundle)
    assert payload["analyst_override_rate"] == 0.13
    assert payload["override_rate"] == 0.13


def test_compute_metric_bundle_reports_unavailable_metrics_explicitly() -> None:
    rows = [
        _record("c1", datetime(2026, 3, 1, tzinfo=timezone.utc), 1, 0.2, "abstain"),
        _record("c2", datetime(2026, 3, 1, tzinfo=timezone.utc), 0, 0.1, "abstain"),
    ]

    metrics = compute_metric_bundle(rows, top_k=2)
    assert metrics.unsafe_recommendation_rate is None
    assert "unsafe_recommendation_rate" in metrics.unavailable_metrics
    assert "false_positive_rate" in metrics.unavailable_metrics

