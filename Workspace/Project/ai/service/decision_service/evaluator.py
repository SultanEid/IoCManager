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
    DecisionEvaluationRow,
    DecisionMetricSummary,
    DecisionSliceSummary,
    compute_decision_metrics,
    slice_decision_metrics,
)
from .scorer import BaselineScorer
from .snapshots import TrainingExample, build_training_examples

DEFAULT_TOP_K = 10


def evaluate_examples(
    scorer: BaselineScorer,
    examples: Iterable[TrainingExample],
    slice_fields: list[str],
) -> tuple[EvaluationOverallMetrics, list[EvaluationSliceMetrics], int]:
    rows: list[DecisionEvaluationRow] = []
    for example in examples:
        scored = scorer.score_case(example.request)
        rule = example.request.rule_context
        rows.append(
            DecisionEvaluationRow(
                label=example.label,
                score=scored.maliciousness_score,
                abstained=(scored.decision_state == "abstain"),
                predicted_verdict=_predicted_verdict_from_state(scored.decision_state, scored.maliciousness_score),
                rule_family=str(rule.get("ruleFamily", rule.get("rule_family", "unknown"))).strip().lower() or "unknown",
                source_system=example.request.source_system,
                source_name=str(rule.get("sourceName", rule.get("source_name", example.request.source_system))).strip().lower() or "unknown",
                source_type=str(rule.get("sourceType", rule.get("source_type", "unknown"))).strip().lower() or "unknown",
                ioc_type=example.request.ioc_type,
                event_time=example.event_time,
                source_trust=example.source_trust,
                severity=_severity_label(rule.get("severity", rule.get("severityScore", rule.get("severity_score")))),
                table_confidence=_float_or_none(rule.get("tableConfidence", rule.get("table_confidence"))),
                evidence_tier=str(rule.get("evidenceTier", rule.get("evidence_tier", "attribute_only"))).strip().lower() or "attribute_only",
                label_provenance=str(rule.get("labelProvenance", rule.get("label_provenance", "snapshot_outcome"))).strip().lower() or "snapshot_outcome",
                scan_evidence_available=bool(rule.get("scanEvidenceAvailable", rule.get("scan_evidence_available", False))),
                weak_evidence=scored.decision_state == "abstain" or scored.uncertainty_score >= 0.42,
            )
        )

    reference_time = max((row.event_time for row in rows), default=datetime.now(timezone.utc))
    overall = _to_overall_metrics(
        compute_decision_metrics(
            rows,
            threshold=scorer.thresholds.recommend,
            top_k=min(DEFAULT_TOP_K, len(rows) or DEFAULT_TOP_K),
        )
    )
    slices = [
        _to_slice_metrics(item)
        for item in slice_decision_metrics(
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

def _to_overall_metrics(metrics: DecisionMetricSummary) -> EvaluationOverallMetrics:
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
        likely_malicious_precision=metrics.likely_malicious_precision,
        unsafe_recommendation_rate=metrics.unsafe_recommendation_rate,
        analyst_override_rate=metrics.analyst_override_rate,
        rollback_rate=metrics.rollback_rate,
        abstain_rate=metrics.abstain_rate,
        weak_evidence_rate=metrics.weak_evidence_rate,
        coverage=metrics.coverage,
        confidence_distribution=metrics.confidence_distribution,
        confusion_matrix=EvaluationConfusionMatrix.model_validate(metrics.confusion_matrix.__dict__),
        calibration_bins=[
            EvaluationCalibrationBin.model_validate(item.__dict__)
            for item in metrics.calibration_bins
        ],
        outcomes=metrics.outcomes,
        unavailable_metrics=metrics.unavailable_metrics,
    )


def _to_slice_metrics(slice_summary: DecisionSliceSummary) -> EvaluationSliceMetrics:
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
        likely_malicious_precision=metrics.likely_malicious_precision,
        analyst_override_rate=metrics.analyst_override_rate,
        rollback_rate=metrics.rollback_rate,
        abstain_rate=metrics.abstain_rate,
        weak_evidence_rate=metrics.weak_evidence_rate,
        coverage=metrics.coverage,
        confidence_distribution=metrics.confidence_distribution,
        confusion_matrix=EvaluationConfusionMatrix.model_validate(metrics.confusion_matrix.__dict__),
        calibration_bins=[
            EvaluationCalibrationBin.model_validate(item.__dict__)
            for item in metrics.calibration_bins
        ],
        outcomes=metrics.outcomes,
        unavailable_metrics=metrics.unavailable_metrics,
    )


def _predicted_verdict_from_state(decision_state: str, score: float) -> str:
    if decision_state == "abstain":
        return "insufficient_evidence"
    if score >= 0.85:
        return "malicious"
    if score >= 0.62:
        return "likely_malicious"
    if score >= 0.45:
        return "suspicious"
    if score <= 0.20:
        return "likely_benign"
    return "suspicious"


def _severity_label(value: object) -> str:
    if isinstance(value, (int, float)):
        numeric = float(value)
        if numeric >= 0.85:
            return "critical"
        if numeric >= 0.65:
            return "high"
        if numeric >= 0.35:
            return "medium"
        if numeric > 0:
            return "low"
        return "none"
    text = str(value or "").strip().lower()
    if text in {"critical", "high", "medium", "low", "none"}:
        return text
    return "unknown"


def _float_or_none(value: object) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None

