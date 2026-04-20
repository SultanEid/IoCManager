from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

import numpy as np

try:
    from sklearn.metrics import average_precision_score
except Exception:  # pragma: no cover
    average_precision_score = None


BENIGN_VERDICTS = {"benign", "likely_benign", "false_positive", "stale_or_revoked"}
DISRUPTIVE_ACTIONS = {
    "isolate_host",
    "quarantine_file",
    "block_hash",
    "block_domain",
    "block_url",
    "block_ip",
}


@dataclass(frozen=True)
class EvaluationConfusionMatrix:
    tp: int
    fp: int
    tn: int
    fn: int
    abstained_positive: int
    abstained_negative: int


@dataclass(frozen=True)
class CalibrationBin:
    index: int
    lower_bound: float
    upper_bound: float
    sample_size: int
    average_confidence: float | None
    empirical_positive_rate: float | None


@dataclass(frozen=True)
class AdjudicationEvaluationRow:
    label: int
    score: float
    abstained: bool
    rule_family: str
    source_system: str
    ioc_type: str
    event_time: datetime
    source_trust: float
    evidence_used_count: int = 0
    evidence_missing_count: int = 0
    contradictory_evidence_count: int = 0
    analyst_overrode: bool = False
    rolled_back: bool | None = None


@dataclass(frozen=True)
class AdjudicationMetricSummary:
    precision: float | None
    recall: float | None
    f1: float | None
    precision_at_k: float | None
    recall_at_k: float | None
    pr_auc: float | None
    calibration_error: float | None
    brier_score: float | None
    false_positive_rate: float | None
    false_negative_rate: float | None
    unsafe_recommendation_rate: float | None
    analyst_override_rate: float | None
    rollback_rate: float | None
    abstain_rate: float | None
    coverage: float | None
    confusion_matrix: EvaluationConfusionMatrix
    calibration_bins: list[CalibrationBin]
    outcomes: dict[str, int]
    unavailable_metrics: list[str]
    sample_size: int


@dataclass(frozen=True)
class AdjudicationSliceSummary:
    slice_field: str
    slice_value: str
    sample_size: int
    positive_rate: float | None
    metrics: AdjudicationMetricSummary


@dataclass(frozen=True)
class ActionPlanEvaluationRow:
    rule_family: str
    event_time: datetime
    predicted_actions: tuple[str, ...]
    approved_actions: tuple[str, ...]
    useful_actions: tuple[str, ...]
    unsafe_recommendation: bool
    analyst_disposition: str | None = None
    evidence_used_count: int = 0
    evidence_missing_count: int = 0


@dataclass(frozen=True)
class ActionPlanMetricSummary:
    exact_match_rate: float | None
    top_k_usefulness_rate: float | None
    analyst_acceptance_rate: float | None
    unsafe_recommendation_rate: float | None
    over_escalation_rate: float | None
    under_escalation_rate: float | None
    outcomes: dict[str, int]
    action_breakdown: dict[str, dict[str, int]]
    unavailable_metrics: list[str]
    sample_size: int


@dataclass(frozen=True)
class ActionPlanSliceSummary:
    slice_field: str
    slice_value: str
    sample_size: int
    metrics: ActionPlanMetricSummary


def compute_adjudication_metrics(
    rows: Iterable[AdjudicationEvaluationRow],
    *,
    threshold: float,
    top_k: int = 10,
    calibration_bins: int = 10,
) -> AdjudicationMetricSummary:
    items = list(rows)
    if not items:
        return AdjudicationMetricSummary(
            precision=None,
            recall=None,
            f1=None,
            precision_at_k=None,
            recall_at_k=None,
            pr_auc=None,
            calibration_error=None,
            brier_score=None,
            false_positive_rate=None,
            false_negative_rate=None,
            unsafe_recommendation_rate=None,
            analyst_override_rate=None,
            rollback_rate=None,
            abstain_rate=None,
            coverage=None,
            confusion_matrix=EvaluationConfusionMatrix(0, 0, 0, 0, 0, 0),
            calibration_bins=[],
            outcomes={},
            unavailable_metrics=[
                "precision",
                "recall",
                "f1",
                "precision_at_k",
                "recall_at_k",
                "pr_auc",
                "calibration_error",
                "brier_score",
                "false_positive_rate",
                "false_negative_rate",
                "unsafe_recommendation_rate",
                "analyst_override_rate",
                "rollback_rate",
                "abstain_rate",
                "coverage",
                "confusion_matrix",
                "calibration_bins",
            ],
            sample_size=0,
        )

    labels = np.asarray([1 if item.label > 0 else 0 for item in items], dtype=int)
    scores = np.asarray([_clip01(item.score) for item in items], dtype=float)
    abstentions = np.asarray([1 if item.abstained else 0 for item in items], dtype=int)
    positive_predictions = np.asarray(
        [1 if item.score >= threshold and not item.abstained else 0 for item in items],
        dtype=int,
    )
    explicit_negative_predictions = np.asarray(
        [1 if item.score < threshold and not item.abstained else 0 for item in items],
        dtype=int,
    )

    tp = int(((positive_predictions == 1) & (labels == 1)).sum())
    fp = int(((positive_predictions == 1) & (labels == 0)).sum())
    tn = int(((explicit_negative_predictions == 1) & (labels == 0)).sum())
    fn = int(((explicit_negative_predictions == 1) & (labels == 1)).sum())
    abstained_positive = int(((abstentions == 1) & (labels == 1)).sum())
    abstained_negative = int(((abstentions == 1) & (labels == 0)).sum())

    confusion_matrix = EvaluationConfusionMatrix(
        tp=tp,
        fp=fp,
        tn=tn,
        fn=fn,
        abstained_positive=abstained_positive,
        abstained_negative=abstained_negative,
    )

    recommendation_count = tp + fp
    positive_label_count = tp + fn + abstained_positive
    precision = _safe_ratio(tp, recommendation_count)
    recall = _safe_ratio(tp, positive_label_count)
    f1 = None
    if precision is not None and recall is not None and (precision + recall) > 0:
        f1 = float((2.0 * precision * recall) / (precision + recall))

    precision_at_k, recall_at_k = _precision_recall_at_k(labels, scores, top_k=top_k)
    pr_auc = _pr_auc(labels, scores)
    calibration_error = _expected_calibration_error(labels, scores, bins=calibration_bins)
    brier_score = float(np.mean(np.square(scores - labels.astype(float)))) if len(items) else None
    false_positive_rate = _safe_ratio(fp, fp + tn)
    false_negative_rate = _safe_ratio(fn, fn + tp)
    unsafe_recommendation_rate = _safe_ratio(fp, recommendation_count)
    analyst_override_rate = _safe_ratio(
        sum(1 for item in items if item.analyst_overrode),
        len(items),
    )
    rollback_rows = [item for item in items if item.rolled_back is not None]
    rollback_rate = _safe_ratio(sum(1 for item in rollback_rows if item.rolled_back), len(rollback_rows))
    abstain_rate = _safe_ratio(abstentions.sum().item(), len(items))
    coverage = None if abstain_rate is None else float(1.0 - abstain_rate)
    bins = build_calibration_bins(labels, scores, bins=calibration_bins)

    unavailable_metrics: list[str] = []
    for metric_name, metric_value in (
        ("precision", precision),
        ("recall", recall),
        ("f1", f1),
        ("precision_at_k", precision_at_k),
        ("recall_at_k", recall_at_k),
        ("pr_auc", pr_auc),
        ("calibration_error", calibration_error),
        ("brier_score", brier_score),
        ("false_positive_rate", false_positive_rate),
        ("false_negative_rate", false_negative_rate),
        ("unsafe_recommendation_rate", unsafe_recommendation_rate),
        ("abstain_rate", abstain_rate),
        ("coverage", coverage),
    ):
        if metric_value is None:
            unavailable_metrics.append(metric_name)
    if analyst_override_rate is None:
        unavailable_metrics.append("analyst_override_rate")
    if rollback_rate is None:
        unavailable_metrics.append("rollback_rate")
    if not bins:
        unavailable_metrics.append("calibration_bins")

    return AdjudicationMetricSummary(
        precision=precision,
        recall=recall,
        f1=f1,
        precision_at_k=precision_at_k,
        recall_at_k=recall_at_k,
        pr_auc=pr_auc,
        calibration_error=calibration_error,
        brier_score=brier_score,
        false_positive_rate=false_positive_rate,
        false_negative_rate=false_negative_rate,
        unsafe_recommendation_rate=unsafe_recommendation_rate,
        analyst_override_rate=analyst_override_rate,
        rollback_rate=rollback_rate,
        abstain_rate=abstain_rate,
        coverage=coverage,
        confusion_matrix=confusion_matrix,
        calibration_bins=bins,
        outcomes={
            "confident_correct": tp,
            "confident_wrong": fp,
            "true_negative": tn,
            "false_negative": fn,
            "abstained_positive": abstained_positive,
            "abstained_negative": abstained_negative,
        },
        unavailable_metrics=unavailable_metrics,
        sample_size=len(items),
    )


def slice_adjudication_metrics(
    rows: Iterable[AdjudicationEvaluationRow],
    *,
    threshold: float,
    slice_fields: list[str],
    top_k: int = 10,
    calibration_bins: int = 10,
    reference_time: datetime | None = None,
) -> list[AdjudicationSliceSummary]:
    items = list(rows)
    if not items:
        return []

    resolved_reference_time = reference_time or max(item.event_time for item in items)
    grouped: dict[tuple[str, str], list[AdjudicationEvaluationRow]] = {}
    for field in slice_fields:
        for item in items:
            key = _adjudication_slice_value(field, item, resolved_reference_time)
            grouped.setdefault((field, key), []).append(item)

    output: list[AdjudicationSliceSummary] = []
    for (field, value), group in sorted(grouped.items(), key=lambda item: (item[0][0], item[0][1])):
        label_sum = sum(item.label for item in group)
        output.append(
            AdjudicationSliceSummary(
                slice_field=field,
                slice_value=value,
                sample_size=len(group),
                positive_rate=_safe_ratio(label_sum, len(group)),
                metrics=compute_adjudication_metrics(
                    group,
                    threshold=threshold,
                    top_k=min(top_k, len(group)),
                    calibration_bins=calibration_bins,
                ),
            )
        )
    return output


def compute_action_plan_metrics(
    rows: Iterable[ActionPlanEvaluationRow],
    *,
    top_k: int = 3,
) -> ActionPlanMetricSummary:
    items = list(rows)
    if not items:
        return ActionPlanMetricSummary(
            exact_match_rate=None,
            top_k_usefulness_rate=None,
            analyst_acceptance_rate=None,
            unsafe_recommendation_rate=None,
            over_escalation_rate=None,
            under_escalation_rate=None,
            outcomes={},
            action_breakdown={},
            unavailable_metrics=[
                "exact_match_rate",
                "top_k_usefulness_rate",
                "analyst_acceptance_rate",
                "unsafe_recommendation_rate",
                "over_escalation_rate",
                "under_escalation_rate",
            ],
            sample_size=0,
        )

    exact_match_count = 0
    top_k_useful_count = 0
    unsafe_count = 0
    over_escalation_count = 0
    under_escalation_count = 0
    action_breakdown: dict[str, dict[str, int]] = {}
    acceptance_observations = 0
    acceptance_positive = 0

    exact_match_eligible = 0
    usefulness_eligible = 0
    escalation_eligible = 0

    for item in items:
        approved = tuple(action for action in item.approved_actions if action)
        predicted = tuple(action for action in item.predicted_actions if action)
        useful = set(action for action in item.useful_actions if action)
        if approved:
            exact_match_eligible += 1
            usefulness_eligible += 1
            if predicted == approved:
                exact_match_count += 1
            if any(action in useful for action in predicted[: max(1, top_k)]):
                top_k_useful_count += 1

            predicted_severity = _highest_action_severity(predicted)
            approved_severity = _highest_action_severity(approved)
            if predicted_severity is not None and approved_severity is not None:
                escalation_eligible += 1
                if predicted_severity > approved_severity:
                    over_escalation_count += 1
                elif predicted_severity < approved_severity:
                    under_escalation_count += 1

        if item.unsafe_recommendation:
            unsafe_count += 1

        normalized_disposition = _normalize_disposition(item.analyst_disposition)
        if normalized_disposition in {"accepted", "rejected"}:
            acceptance_observations += 1
            if normalized_disposition == "accepted":
                acceptance_positive += 1

        for action in predicted:
            breakdown = action_breakdown.setdefault(action, {"predicted": 0, "approved": 0, "useful": 0})
            breakdown["predicted"] += 1
        for action in approved:
            breakdown = action_breakdown.setdefault(action, {"predicted": 0, "approved": 0, "useful": 0})
            breakdown["approved"] += 1
        for action in useful:
            breakdown = action_breakdown.setdefault(action, {"predicted": 0, "approved": 0, "useful": 0})
            breakdown["useful"] += 1

    exact_match_rate = _safe_ratio(exact_match_count, exact_match_eligible)
    top_k_usefulness_rate = _safe_ratio(top_k_useful_count, usefulness_eligible)
    analyst_acceptance_rate = _safe_ratio(acceptance_positive, acceptance_observations)
    unsafe_recommendation_rate = _safe_ratio(unsafe_count, len(items))
    over_escalation_rate = _safe_ratio(over_escalation_count, escalation_eligible)
    under_escalation_rate = _safe_ratio(under_escalation_count, escalation_eligible)

    unavailable_metrics: list[str] = []
    for name, value in (
        ("exact_match_rate", exact_match_rate),
        ("top_k_usefulness_rate", top_k_usefulness_rate),
        ("unsafe_recommendation_rate", unsafe_recommendation_rate),
        ("over_escalation_rate", over_escalation_rate),
        ("under_escalation_rate", under_escalation_rate),
    ):
        if value is None:
            unavailable_metrics.append(name)
    if analyst_acceptance_rate is None:
        unavailable_metrics.append("analyst_acceptance_rate")

    return ActionPlanMetricSummary(
        exact_match_rate=exact_match_rate,
        top_k_usefulness_rate=top_k_usefulness_rate,
        analyst_acceptance_rate=analyst_acceptance_rate,
        unsafe_recommendation_rate=unsafe_recommendation_rate,
        over_escalation_rate=over_escalation_rate,
        under_escalation_rate=under_escalation_rate,
        outcomes={
            "exact_match_count": exact_match_count,
            "top_k_useful_count": top_k_useful_count,
            "unsafe_count": unsafe_count,
            "accepted_count": acceptance_positive,
            "rejected_count": max(0, acceptance_observations - acceptance_positive),
            "over_escalation_count": over_escalation_count,
            "under_escalation_count": under_escalation_count,
        },
        action_breakdown=dict(sorted(action_breakdown.items(), key=lambda item: item[0])),
        unavailable_metrics=unavailable_metrics,
        sample_size=len(items),
    )


def slice_action_plan_metrics(
    rows: Iterable[ActionPlanEvaluationRow],
    *,
    slice_fields: list[str],
    top_k: int = 3,
    reference_time: datetime | None = None,
) -> list[ActionPlanSliceSummary]:
    items = list(rows)
    if not items:
        return []

    resolved_reference_time = reference_time or max(item.event_time for item in items)
    grouped: dict[tuple[str, str], list[ActionPlanEvaluationRow]] = {}
    for field in slice_fields:
        for item in items:
            key = _action_plan_slice_value(field, item, resolved_reference_time)
            grouped.setdefault((field, key), []).append(item)

    output: list[ActionPlanSliceSummary] = []
    for (field, value), group in sorted(grouped.items(), key=lambda item: (item[0][0], item[0][1])):
        output.append(
            ActionPlanSliceSummary(
                slice_field=field,
                slice_value=value,
                sample_size=len(group),
                metrics=compute_action_plan_metrics(group, top_k=top_k),
            )
        )
    return output


def build_calibration_bins(labels: np.ndarray, scores: np.ndarray, *, bins: int) -> list[CalibrationBin]:
    if labels.size == 0 or scores.size == 0:
        return []

    output: list[CalibrationBin] = []
    for index in range(max(1, bins)):
        lower = index / bins
        upper = (index + 1) / bins
        bucket_mask = np.asarray(
            [
                lower <= score < upper or (index == bins - 1 and score == 1.0)
                for score in scores.tolist()
            ],
            dtype=bool,
        )
        if not bucket_mask.any():
            continue

        bucket_scores = scores[bucket_mask]
        bucket_labels = labels[bucket_mask]
        output.append(
            CalibrationBin(
                index=index,
                lower_bound=float(lower),
                upper_bound=float(upper),
                sample_size=int(bucket_scores.size),
                average_confidence=float(bucket_scores.mean()),
                empirical_positive_rate=float(bucket_labels.mean()),
            )
        )
    return output


def determine_evidence_availability_bucket(
    evidence_used_count: int,
    evidence_missing_count: int,
) -> str:
    if evidence_used_count >= 2 and evidence_missing_count == 0:
        return "rich"
    if evidence_used_count >= 1 and evidence_missing_count >= 1:
        return "partial"
    return "sparse"


def is_unsafe_action_plan(
    *,
    predicted_actions: Iterable[str],
    allowed_actions: Iterable[str] | None = None,
    ground_truth_verdict: str | None = None,
) -> bool:
    predicted = [str(action).strip() for action in predicted_actions if str(action).strip()]
    allowed = {str(action).strip() for action in (allowed_actions or []) if str(action).strip()}
    if allowed and any(action not in allowed for action in predicted):
        return True

    normalized_verdict = str(ground_truth_verdict or "").strip().lower()
    if normalized_verdict in BENIGN_VERDICTS | {"insufficient_evidence"}:
        return any(action in DISRUPTIVE_ACTIONS for action in predicted)
    return False


def _precision_recall_at_k(labels: np.ndarray, scores: np.ndarray, *, top_k: int) -> tuple[float | None, float | None]:
    if labels.size == 0 or top_k <= 0:
        return None, None

    k = min(int(top_k), int(labels.size))
    ranked_indices = np.argsort(-scores)
    top_k_labels = labels[ranked_indices[:k]]
    hits = int(top_k_labels.sum())
    positives = int(labels.sum())
    return float(hits / k), float(hits / max(1, positives))


def _pr_auc(labels: np.ndarray, scores: np.ndarray) -> float | None:
    if labels.size == 0 or len(np.unique(labels)) < 2:
        return None
    if average_precision_score is None:
        return float(scores.mean())
    return float(average_precision_score(labels, scores))


def _expected_calibration_error(labels: np.ndarray, scores: np.ndarray, *, bins: int) -> float | None:
    calibration_bins = build_calibration_bins(labels, scores, bins=bins)
    if not calibration_bins:
        return None

    total = sum(item.sample_size for item in calibration_bins)
    if total <= 0:
        return None

    error = 0.0
    for item in calibration_bins:
        if item.average_confidence is None or item.empirical_positive_rate is None:
            continue
        error += abs(item.average_confidence - item.empirical_positive_rate) * (item.sample_size / total)
    return float(error)


def _adjudication_slice_value(field: str, row: AdjudicationEvaluationRow, reference_time: datetime) -> str:
    if field == "rule_family":
        return row.rule_family or "unknown"
    if field == "ioc_type":
        return row.ioc_type or "unknown"
    if field == "source_system":
        return row.source_system or "unknown"
    if field == "time_bucket":
        return _ensure_utc(row.event_time).strftime("%Y-%m")
    if field == "recency_bucket":
        age_hours = max(0.0, (_ensure_utc(reference_time) - _ensure_utc(row.event_time)).total_seconds() / 3600.0)
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
    if field == "evidence_availability_bucket":
        return determine_evidence_availability_bucket(row.evidence_used_count, row.evidence_missing_count)
    return "unknown"


def _action_plan_slice_value(field: str, row: ActionPlanEvaluationRow, reference_time: datetime) -> str:
    if field == "rule_family":
        return row.rule_family or "unknown"
    if field == "time_bucket":
        return _ensure_utc(row.event_time).strftime("%Y-%m")
    if field == "recency_bucket":
        age_hours = max(0.0, (_ensure_utc(reference_time) - _ensure_utc(row.event_time)).total_seconds() / 3600.0)
        if age_hours <= 24:
            return "0_24h"
        if age_hours <= 168:
            return "24_168h"
        return "168h_plus"
    if field == "evidence_availability_bucket":
        return determine_evidence_availability_bucket(row.evidence_used_count, row.evidence_missing_count)
    return "unknown"


def _highest_action_severity(actions: tuple[str, ...]) -> int | None:
    if not actions:
        return None
    return max(_action_severity(action) for action in actions)


def _action_severity(action: str) -> int:
    normalized = str(action).strip().lower()
    if normalized in DISRUPTIVE_ACTIONS:
        return 3
    if normalized in {
        "search_fleet",
        "collect_memory",
        "collect_process_tree",
        "collect_persistence_artifacts",
        "collect_network_context",
    }:
        return 2
    if normalized in {
        "open_review",
        "notify_admin",
        "notify_analyst",
        "notify_it_operator",
        "tighten_rule",
        "suppress_rule_candidate",
    }:
        return 1
    return 0


def _normalize_disposition(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    return normalized or None


def _safe_ratio(numerator: int, denominator: int) -> float | None:
    if denominator <= 0:
        return None
    return float(numerator / denominator)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)
