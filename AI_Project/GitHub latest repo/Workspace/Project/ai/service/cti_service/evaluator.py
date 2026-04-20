from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

import numpy as np

try:
    from sklearn.metrics import average_precision_score
except Exception:  # pragma: no cover
    average_precision_score = None

from .contracts import EvaluationOverallMetrics, EvaluationSliceMetrics
from .scorer import BaselineScorer
from .snapshots import TrainingExample, build_training_examples

DEFAULT_TOP_K = 10


@dataclass(frozen=True)
class EvaluatedRow:
    label: int
    score: float
    abstained: bool
    source_system: str
    ioc_type: str
    event_time: datetime
    source_trust: float


def evaluate_examples(
    scorer: BaselineScorer,
    examples: Iterable[TrainingExample],
    slice_fields: list[str],
) -> tuple[EvaluationOverallMetrics, list[EvaluationSliceMetrics], int]:
    rows: list[EvaluatedRow] = []
    for example in examples:
        scored = scorer.score_case(example.request)
        rows.append(
            EvaluatedRow(
                label=example.label,
                score=scored.maliciousness_score,
                abstained=(scored.decision_state == "abstain"),
                source_system=example.request.source_system,
                ioc_type=example.request.ioc_type,
                event_time=example.event_time,
                source_trust=example.source_trust,
            )
        )

    overall = _compute_metrics(rows, scorer.thresholds.recommend)
    slices = _slice_metrics(rows, scorer.thresholds.recommend, slice_fields)
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


def _slice_metrics(
    rows: list[EvaluatedRow],
    threshold: float,
    slice_fields: list[str],
) -> list[EvaluationSliceMetrics]:
    output: list[EvaluationSliceMetrics] = []
    for field in slice_fields:
        grouped: dict[str, list[EvaluatedRow]] = {}
        for row in rows:
            key = _slice_value(field, row)
            grouped.setdefault(key, []).append(row)
        for key, group in sorted(grouped.items(), key=lambda item: item[0]):
            if not group:
                continue
            metrics = _compute_metrics(group, threshold)
            output.append(
                EvaluationSliceMetrics(
                    slice_field=field,
                    slice_value=key,
                    sample_size=len(group),
                    positive_rate=float(sum(item.label for item in group) / len(group)),
                    precision=metrics.precision,
                    recall=metrics.recall,
                    f1=metrics.f1,
                    pr_auc=metrics.pr_auc,
                    calibration_error=metrics.calibration_error,
                    analyst_override_rate=metrics.analyst_override_rate,
                    rollback_rate=metrics.rollback_rate,
                    abstain_rate=metrics.abstain_rate,
                    coverage=metrics.coverage,
                    outcomes=metrics.outcomes,
                    unavailable_metrics=metrics.unavailable_metrics,
                )
            )
    return output


def _slice_value(field: str, row: EvaluatedRow) -> str:
    if field == "ioc_type":
        return row.ioc_type
    if field == "source_system":
        return row.source_system
    if field == "time_bucket":
        return row.event_time.strftime("%Y-%m")
    if field == "recency_bucket":
        age_hours = max(0.0, (datetime.now(timezone.utc) - row.event_time).total_seconds() / 3600.0)
        if age_hours <= 24:
            return "0_24h"
        if age_hours <= 168:
            return "24_168h"
        return "168h_plus"
    if field == "trust_bucket":
        if row.source_trust < 0.33:
            return "low"
        if row.source_trust < 0.66:
            return "medium"
        return "high"
    return "unknown"


def _compute_metrics(rows: list[EvaluatedRow], threshold: float) -> EvaluationOverallMetrics:
    if not rows:
        return EvaluationOverallMetrics(
            precision=None,
            recall=None,
            f1=None,
            precision_at_k=None,
            recall_at_k=None,
            pr_auc=None,
            calibration_error=None,
            unsafe_recommendation_rate=None,
            analyst_override_rate=None,
            rollback_rate=None,
            abstain_rate=None,
            coverage=None,
            outcomes={},
            unavailable_metrics=[
                "precision",
                "recall",
                "f1",
                "precision_at_k",
                "recall_at_k",
                "pr_auc",
                "calibration_error",
                "unsafe_recommendation_rate",
                "analyst_override_rate",
                "rollback_rate",
                "abstain_rate",
                "coverage",
                "outcomes.confident_correct",
                "outcomes.confident_wrong",
                "outcomes.abstained",
                "outcomes.overridden",
                "outcomes.rolled_back",
            ],
        )

    labels = np.asarray([row.label for row in rows], dtype=int)
    scores = np.asarray([row.score for row in rows], dtype=float)
    abstentions = np.asarray([1 if row.abstained else 0 for row in rows], dtype=int)
    predictions = np.asarray([1 if score >= threshold and not abstain else 0 for score, abstain in zip(scores, abstentions)], dtype=int)

    tp = int(((predictions == 1) & (labels == 1)).sum())
    fp = int(((predictions == 1) & (labels == 0)).sum())
    fn = int(((predictions == 0) & (labels == 1)).sum())

    precision = float(tp / max(1, tp + fp))
    recall = float(tp / max(1, tp + fn))
    f1 = float((2 * precision * recall) / max(1e-12, precision + recall))
    precision_at_k, recall_at_k = _precision_recall_at_k(labels, scores, k=min(DEFAULT_TOP_K, len(rows)))
    pr_auc = _pr_auc(labels, scores)
    calibration_error = float(np.mean(np.abs(labels - scores)))
    recommendation_count = tp + fp
    unsafe_recommendation_rate = float(fp / recommendation_count) if recommendation_count > 0 else None
    abstain_rate = float(abstentions.mean())
    coverage = float(1.0 - abstain_rate)
    unavailable_metrics = ["analyst_override_rate", "rollback_rate", "outcomes.overridden", "outcomes.rolled_back"]

    return EvaluationOverallMetrics(
        precision=precision,
        recall=recall,
        f1=f1,
        precision_at_k=precision_at_k,
        recall_at_k=recall_at_k,
        pr_auc=pr_auc,
        calibration_error=calibration_error,
        unsafe_recommendation_rate=unsafe_recommendation_rate,
        analyst_override_rate=None,
        rollback_rate=None,
        abstain_rate=abstain_rate,
        coverage=coverage,
        outcomes={
            "confident_correct": tp,
            "confident_wrong": fp,
            "abstained": int(abstentions.sum()),
        },
        unavailable_metrics=unavailable_metrics,
    )


def _pr_auc(labels: np.ndarray, scores: np.ndarray) -> float:
    if labels.size == 0 or len(np.unique(labels)) < 2:
        return 0.0
    if average_precision_score is None:
        return float(scores.mean())
    return float(average_precision_score(labels, scores))


def _precision_recall_at_k(labels: np.ndarray, scores: np.ndarray, k: int) -> tuple[float, float]:
    if labels.size == 0 or k <= 0:
        return 0.0, 0.0

    top_k = min(k, labels.size)
    ranked_indices = np.argsort(-scores)
    top_k_labels = labels[ranked_indices[:top_k]]

    hits = int(top_k_labels.sum())
    precision_at_k = float(hits / top_k)
    positives = int(labels.sum())
    recall_at_k = float(hits / max(1, positives))
    return precision_at_k, recall_at_k
