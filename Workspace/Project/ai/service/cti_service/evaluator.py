from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from .contracts import (
    EvaluationCalibrationBin,
    EvaluationConfusionMatrix,
    EvaluationOverallMetrics,
    EvaluationSliceMetrics,
)
from .evaluation_metrics import (
    AdjudicationEvaluationRow,
    AdjudicationMetricSummary,
    AdjudicationSliceSummary,
    compute_adjudication_metrics,
    slice_adjudication_metrics,
)
from .scorer import BaselineScorer
from .snapshots import TrainingExample, build_training_examples

DEFAULT_TOP_K = 10


def evaluate_examples(
    scorer: BaselineScorer,
    examples: Iterable[TrainingExample],
    slice_fields: list[str],
) -> tuple[EvaluationOverallMetrics, list[EvaluationSliceMetrics], int]:
    rows: list[AdjudicationEvaluationRow] = []
    for example in examples:
        scored = scorer.score_case(example.request)
        rows.append(
            AdjudicationEvaluationRow(
                label=example.label,
                score=scored.maliciousness_score,
                abstained=(scored.decision_state == "abstain"),
                rule_family=str(example.request.rule_context.get("ruleFamily", "unknown")).strip().lower() or "unknown",
                source_system=example.request.source_system,
                ioc_type=example.request.ioc_type,
                event_time=example.event_time,
                source_trust=example.source_trust,
            )
        )

    reference_time = max((row.event_time for row in rows), default=datetime.now(timezone.utc))
    overall = _to_overall_metrics(
        compute_adjudication_metrics(
            rows,
            threshold=scorer.thresholds.recommend,
            top_k=min(DEFAULT_TOP_K, len(rows) or DEFAULT_TOP_K),
        )
    )
    slices = [
        _to_slice_metrics(item)
        for item in slice_adjudication_metrics(
            rows,
            threshold=scorer.thresholds.recommend,
            slice_fields=slice_fields,
            top_k=min(DEFAULT_TOP_K, len(rows) or DEFAULT_TOP_K),
            reference_time=reference_time,
        )
    ]
    return overall, slices, len(rows)


def evaluate_snapshot(
    scorer: BaselineScorer,
    snapshot,
    horizon_hours: int,
    window_start_utc: datetime | None,
    window_end_utc: datetime | None,
    slice_fields: list[str],
) -> tuple[EvaluationOverallMetrics, list[EvaluationSliceMetrics], int]:
    examples = build_training_examples(
        snapshot=snapshot,
        horizon_hours=horizon_hours,
        window_start_utc=window_start_utc,
        window_end_utc=window_end_utc,
    )
    return evaluate_examples(scorer=scorer, examples=examples, slice_fields=slice_fields)

def _to_overall_metrics(metrics: AdjudicationMetricSummary) -> EvaluationOverallMetrics:
    return EvaluationOverallMetrics(
        precision=metrics.precision,
        recall=metrics.recall,
        f1=metrics.f1,
        precision_at_k=metrics.precision_at_k,
        recall_at_k=metrics.recall_at_k,
        pr_auc=metrics.pr_auc,
        calibration_error=metrics.calibration_error,
        brier_score=metrics.brier_score,
        false_positive_rate=metrics.false_positive_rate,
        false_negative_rate=metrics.false_negative_rate,
        unsafe_recommendation_rate=metrics.unsafe_recommendation_rate,
        analyst_override_rate=metrics.analyst_override_rate,
        rollback_rate=metrics.rollback_rate,
        abstain_rate=metrics.abstain_rate,
        coverage=metrics.coverage,
        confusion_matrix=EvaluationConfusionMatrix.model_validate(metrics.confusion_matrix.__dict__),
        calibration_bins=[
            EvaluationCalibrationBin.model_validate(item.__dict__)
            for item in metrics.calibration_bins
        ],
        outcomes=metrics.outcomes,
        unavailable_metrics=metrics.unavailable_metrics,
    )


def _to_slice_metrics(slice_summary: AdjudicationSliceSummary) -> EvaluationSliceMetrics:
    metrics = slice_summary.metrics
    return EvaluationSliceMetrics(
        slice_field=slice_summary.slice_field,
        slice_value=slice_summary.slice_value,
        sample_size=slice_summary.sample_size,
        positive_rate=slice_summary.positive_rate,
        precision=metrics.precision,
        recall=metrics.recall,
        f1=metrics.f1,
        pr_auc=metrics.pr_auc,
        calibration_error=metrics.calibration_error,
        brier_score=metrics.brier_score,
        false_positive_rate=metrics.false_positive_rate,
        false_negative_rate=metrics.false_negative_rate,
        analyst_override_rate=metrics.analyst_override_rate,
        rollback_rate=metrics.rollback_rate,
        abstain_rate=metrics.abstain_rate,
        coverage=metrics.coverage,
        confusion_matrix=EvaluationConfusionMatrix.model_validate(metrics.confusion_matrix.__dict__),
        calibration_bins=[
            EvaluationCalibrationBin.model_validate(item.__dict__)
            for item in metrics.calibration_bins
        ],
        outcomes=metrics.outcomes,
        unavailable_metrics=metrics.unavailable_metrics,
    )
