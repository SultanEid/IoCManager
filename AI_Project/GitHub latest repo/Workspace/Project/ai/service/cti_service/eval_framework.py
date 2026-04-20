from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import math
from typing import Iterable


@dataclass(frozen=True)
class EvaluationRecord:
    case_id: str
    event_time: datetime
    label: int
    score: float
    decision_state: str
    model_version: str | None = None
    dataset_version: str | None = None
    source_trust: float = 0.5
    analyst_overrode: bool = False
    high_impact: bool = False
    queue_rank: int | None = None
    baseline_rank: int | None = None
    canary_succeeded: bool | None = None
    rolled_back: bool | None = None
    realized_harm: float | None = None
    alternative_harm: float | None = None
    baseline_score: float | None = None

    @property
    def is_recommendation(self) -> bool:
        state = self.decision_state.strip().lower()
        return state in {"recommend", "escalate"}

    @property
    def is_abstention(self) -> bool:
        return self.decision_state.strip().lower() == "abstain"


@dataclass(frozen=True)
class EvaluationMetricBundle:
    precision_at_k: float | None
    recall_at_k: float | None
    calibration_error: float | None
    unsafe_recommendation_rate: float | None
    analyst_override_rate: float | None
    canary_success_rate: float | None
    rollback_rate: float | None
    queue_high_impact_lift: float | None
    deployment_regret: float | None
    outcomes: dict[str, int]
    unavailable_metrics: list[str]
    sample_size: int


@dataclass(frozen=True)
class BacktestSlice:
    bucket: str
    metrics: EvaluationMetricBundle


@dataclass(frozen=True)
class ComplexityGateResult:
    passed: bool
    reasons: list[str]


def compute_metric_bundle(records: Iterable[EvaluationRecord], top_k: int = 10) -> EvaluationMetricBundle:
    rows = list(records)
    if not rows:
        return EvaluationMetricBundle(
            precision_at_k=None,
            recall_at_k=None,
            calibration_error=None,
            unsafe_recommendation_rate=None,
            analyst_override_rate=None,
            canary_success_rate=None,
            rollback_rate=None,
            queue_high_impact_lift=None,
            deployment_regret=None,
            outcomes={},
            unavailable_metrics=[
                "precision_at_k",
                "recall_at_k",
                "calibration_error",
                "unsafe_recommendation_rate",
                "analyst_override_rate",
                "canary_success_rate",
                "rollback_rate",
                "queue_high_impact_lift",
                "deployment_regret",
                "outcomes.confident_correct",
                "outcomes.confident_wrong",
                "outcomes.abstained",
                "outcomes.overridden",
                "outcomes.rolled_back",
            ],
            sample_size=0,
        )

    ranked = sorted(rows, key=lambda item: item.score, reverse=True)
    k = max(1, min(top_k, len(ranked)))
    positives = sum(1 for item in rows if item.label == 1)
    hits_at_k = sum(1 for item in ranked[:k] if item.label == 1)

    recommended = [item for item in rows if item.is_recommendation]
    unsafe_recommendations = [item for item in recommended if item.label == 0]
    overrides = [item for item in recommended if item.analyst_overrode]
    canary_rows = [item for item in rows if item.canary_succeeded is not None]
    rollback_rows = [item for item in rows if item.rolled_back is not None]
    scored_rows = [item for item in rows if item.score >= 0.0]

    unavailable_metrics: list[str] = []
    unsafe_recommendation_rate = float(len(unsafe_recommendations) / len(recommended)) if recommended else None
    analyst_override_rate = float(len(overrides) / len(recommended)) if recommended else None
    canary_success_rate = (
        float(sum(1 for item in canary_rows if item.canary_succeeded) / len(canary_rows))
        if canary_rows
        else None
    )
    rollback_rate = (
        float(sum(1 for item in rollback_rows if item.rolled_back) / len(rollback_rows))
        if rollback_rows
        else None
    )
    queue_high_impact_lift = _queue_high_impact_lift(rows)
    deployment_regret = _deployment_regret(rows)

    if unsafe_recommendation_rate is None:
        unavailable_metrics.append("unsafe_recommendation_rate")
    if analyst_override_rate is None:
        unavailable_metrics.append("analyst_override_rate")
    if canary_success_rate is None:
        unavailable_metrics.append("canary_success_rate")
    if rollback_rate is None:
        unavailable_metrics.append("rollback_rate")
    if queue_high_impact_lift is None:
        unavailable_metrics.append("queue_high_impact_lift")
    if deployment_regret is None:
        unavailable_metrics.append("deployment_regret")
    if not rollback_rows:
        unavailable_metrics.append("outcomes.rolled_back")
    if not recommended:
        unavailable_metrics.append("outcomes.overridden")

    return EvaluationMetricBundle(
        precision_at_k=float(hits_at_k / k),
        recall_at_k=float(hits_at_k / max(1, positives)),
        calibration_error=_expected_calibration_error(scored_rows, bins=10),
        unsafe_recommendation_rate=unsafe_recommendation_rate,
        analyst_override_rate=analyst_override_rate,
        canary_success_rate=canary_success_rate,
        rollback_rate=rollback_rate,
        queue_high_impact_lift=queue_high_impact_lift,
        deployment_regret=deployment_regret,
        outcomes={
            "confident_correct": sum(1 for item in recommended if item.label == 1),
            "confident_wrong": len(unsafe_recommendations),
            "abstained": sum(1 for item in rows if item.is_abstention),
            "overridden": len(overrides),
            "rolled_back": sum(1 for item in rollback_rows if item.rolled_back),
        },
        unavailable_metrics=unavailable_metrics,
        sample_size=len(rows),
    )


def backtest_by_time(
    records: Iterable[EvaluationRecord],
    top_k: int = 10,
    bucket: str = "month",
) -> list[BacktestSlice]:
    grouped: dict[str, list[EvaluationRecord]] = defaultdict(list)
    for row in records:
        grouped[_bucket_key(row.event_time, bucket)].append(row)

    slices: list[BacktestSlice] = []
    for key in sorted(grouped.keys()):
        slices.append(BacktestSlice(bucket=key, metrics=compute_metric_bundle(grouped[key], top_k=top_k)))
    return slices


def make_simple_baseline(
    records: Iterable[EvaluationRecord],
    strategy: str,
) -> list[EvaluationRecord]:
    items = list(records)
    result: list[EvaluationRecord] = []

    for item in items:
        if strategy == "provided":
            score = item.baseline_score if item.baseline_score is not None else item.source_trust
        elif strategy == "source_trust":
            score = _clip01(item.source_trust)
        elif strategy == "random":
            score = _stable_random_score(item.case_id)
        elif strategy == "uniform":
            score = 0.5
        else:
            raise ValueError(f"Unknown baseline strategy '{strategy}'.")

        decision_state = _decision_state_from_score(score)
        result.append(
            EvaluationRecord(
                case_id=item.case_id,
                event_time=item.event_time,
                label=item.label,
                score=score,
                decision_state=decision_state,
                model_version=item.model_version,
                dataset_version=item.dataset_version,
                source_trust=item.source_trust,
                analyst_overrode=item.analyst_overrode,
                high_impact=item.high_impact,
                queue_rank=item.queue_rank,
                baseline_rank=item.baseline_rank,
                canary_succeeded=item.canary_succeeded,
                rolled_back=item.rolled_back,
                realized_harm=item.realized_harm,
                alternative_harm=item.alternative_harm,
                baseline_score=item.baseline_score,
            )
        )
    return result


def compare_against_baselines(
    candidate: EvaluationMetricBundle,
    baselines: dict[str, EvaluationMetricBundle],
    min_precision_gain: float = 0.01,
    max_unsafe_rate_increase: float = 0.0,
    max_regret_increase: float = 0.0,
) -> ComplexityGateResult:
    reasons: list[str] = []
    if not baselines:
        return ComplexityGateResult(passed=True, reasons=[])

    precision_values = [item.precision_at_k for item in baselines.values() if item.precision_at_k is not None]
    unsafe_values = [item.unsafe_recommendation_rate for item in baselines.values() if item.unsafe_recommendation_rate is not None]
    lift_values = [item.queue_high_impact_lift for item in baselines.values() if item.queue_high_impact_lift is not None]
    regret_values = [item.deployment_regret for item in baselines.values() if item.deployment_regret is not None]

    best_baseline_precision = max(precision_values) if precision_values else None
    best_baseline_unsafe = min(unsafe_values) if unsafe_values else None
    best_baseline_lift = max(lift_values) if lift_values else None
    best_baseline_regret = min(regret_values) if regret_values else None

    if candidate.precision_at_k is None or best_baseline_precision is None:
        reasons.append("Precision@K comparison unavailable.")
    elif candidate.precision_at_k < best_baseline_precision + min_precision_gain:
        reasons.append(
            f"Precision@K gain too small: candidate={candidate.precision_at_k:.4f}, best_baseline={best_baseline_precision:.4f}."
        )

    if (
        candidate.unsafe_recommendation_rate is not None
        and best_baseline_unsafe is not None
        and candidate.unsafe_recommendation_rate > best_baseline_unsafe + max_unsafe_rate_increase
    ):
        reasons.append(
            "Unsafe recommendation rate worsened relative to simpler baselines."
        )
    elif candidate.unsafe_recommendation_rate is None or best_baseline_unsafe is None:
        reasons.append("Unsafe recommendation rate comparison unavailable.")

    if candidate.queue_high_impact_lift is None or best_baseline_lift is None:
        reasons.append("Queue high-impact lift comparison unavailable.")
    elif candidate.queue_high_impact_lift < best_baseline_lift:
        reasons.append("Queue high-impact lift does not beat the best simple baseline.")

    if candidate.deployment_regret is None or best_baseline_regret is None:
        reasons.append("Deployment regret comparison unavailable.")
    elif candidate.deployment_regret > best_baseline_regret + max_regret_increase:
        reasons.append("Deployment regret increased versus simpler baselines.")

    return ComplexityGateResult(passed=len(reasons) == 0, reasons=reasons)


def metric_bundle_to_dict(bundle: EvaluationMetricBundle) -> dict[str, float | int | None | list[str] | dict[str, int]]:
    payload = asdict(bundle)
    payload["override_rate"] = payload["analyst_override_rate"]
    return payload


def _bucket_key(value: datetime, bucket: str) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    value = value.astimezone(timezone.utc)
    if bucket == "week":
        year, week, _ = value.isocalendar()
        return f"{year}-W{week:02d}"
    return value.strftime("%Y-%m")


def _queue_high_impact_lift(records: list[EvaluationRecord], top_fraction: float = 0.2) -> float | None:
    eligible = [row for row in records if row.queue_rank is not None and row.baseline_rank is not None]
    if not eligible:
        return None

    top_n = max(1, math.ceil(len(eligible) * top_fraction))
    total_high = sum(1 for row in eligible if row.high_impact)
    if total_high == 0:
        return None

    candidate_hits = sum(1 for row in eligible if row.high_impact and row.queue_rank <= top_n)
    baseline_hits = sum(1 for row in eligible if row.high_impact and row.baseline_rank <= top_n)
    return float((candidate_hits / total_high) - (baseline_hits / total_high))


def _deployment_regret(records: list[EvaluationRecord]) -> float | None:
    regrets: list[float] = []
    for row in records:
        if not row.is_recommendation:
            continue
        if row.realized_harm is None or row.alternative_harm is None:
            continue
        regrets.append(max(0.0, row.realized_harm - row.alternative_harm))

    if not regrets:
        return None
    return float(sum(regrets) / len(regrets))


def _decision_state_from_score(score: float) -> str:
    if score < 0.35:
        return "abstain"
    if score >= 0.80:
        return "escalate"
    if score >= 0.55:
        return "recommend"
    return "defer"


def _expected_calibration_error(records: list[EvaluationRecord], bins: int) -> float:
    if not records:
        return 0.0

    ece = 0.0
    n = len(records)
    for index in range(bins):
        lower = index / bins
        upper = (index + 1) / bins
        bucket = [item for item in records if lower <= item.score < upper or (index == bins - 1 and item.score == 1.0)]
        if not bucket:
            continue

        avg_confidence = sum(item.score for item in bucket) / len(bucket)
        avg_accuracy = sum(item.label for item in bucket) / len(bucket)
        ece += abs(avg_confidence - avg_accuracy) * (len(bucket) / n)

    return float(ece)


def _stable_random_score(case_id: str) -> float:
    digest = hashlib.sha256(case_id.encode("utf-8")).hexdigest()
    value = int(digest[:8], 16)
    return _clip01(value / 0xFFFFFFFF)


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)
