from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import math
from typing import Iterable

from .evaluation_metrics import (
    DecisionEvaluationRow,
    ActionPlanMetricSummary,
    ActionPlanSliceSummary,
    CalibrationBin,
    EvaluationConfusionMatrix,
    compute_action_plan_metrics,
    compute_decision_metrics,
    determine_evidence_availability_bucket,
    slice_action_plan_metrics,
    slice_decision_metrics,
)


@dataclass(frozen=True)
class EvaluationRecord:
    case_id: str
    event_time: datetime
    label: int
    score: float
    decision_state: str
    model_version: str | None = None
    dataset_version: str | None = None
    rule_family: str = "unknown"
    source_system: str = "unknown"
    ioc_type: str = "unknown"
    source_trust: float = 0.5
    evidence_used_count: int = 0
    evidence_missing_count: int = 0
    contradictory_evidence_count: int = 0
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
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    precision_at_k: float | None = None
    recall_at_k: float | None = None
    pr_auc: float | None = None
    calibration_error: float | None = None
    brier_score: float | None = None
    false_positive_rate: float | None = None
    false_negative_rate: float | None = None
    unsafe_recommendation_rate: float | None = None
    analyst_override_rate: float | None = None
    canary_success_rate: float | None = None
    rollback_rate: float | None = None
    abstain_rate: float | None = None
    coverage: float | None = None
    queue_high_impact_lift: float | None = None
    deployment_regret: float | None = None
    confusion_matrix: EvaluationConfusionMatrix = EvaluationConfusionMatrix(0, 0, 0, 0, 0, 0)
    calibration_bins: list[CalibrationBin] = None  # type: ignore[assignment]
    outcomes: dict[str, int] = None  # type: ignore[assignment]
    unavailable_metrics: list[str] = None  # type: ignore[assignment]
    sample_size: int = 0

    def __post_init__(self) -> None:
        object.__setattr__(self, "calibration_bins", list(self.calibration_bins or []))
        object.__setattr__(self, "outcomes", dict(self.outcomes or {}))
        object.__setattr__(self, "unavailable_metrics", list(self.unavailable_metrics or []))


@dataclass(frozen=True)
class BacktestSlice:
    bucket: str
    metrics: EvaluationMetricBundle


@dataclass(frozen=True)
class ActionPlanEvaluationReport:
    generated_at_utc: str
    input_file: str
    sample_size: int
    top_k: int
    overall: ActionPlanMetricSummary
    slices: list[ActionPlanSliceSummary]


@dataclass(frozen=True)
class DecisionEvaluationReport:
    generated_at_utc: str
    input_file: str
    sample_size: int
    top_k: int
    candidate: EvaluationMetricBundle
    baselines: dict[str, dict[str, float | int | None | list[str] | dict[str, int] | dict[str, object]]]
    time_backtest: list[BacktestSlice]


@dataclass(frozen=True)
class ComplexityGateResult:
    passed: bool
    reasons: list[str]


def compute_metric_bundle(records: Iterable[EvaluationRecord], top_k: int = 10) -> EvaluationMetricBundle:
    rows = list(records)
    if not rows:
        return EvaluationMetricBundle(
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
            canary_success_rate=None,
            rollback_rate=None,
            abstain_rate=None,
            coverage=None,
            queue_high_impact_lift=None,
            deployment_regret=None,
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
                "canary_success_rate",
                "rollback_rate",
                "abstain_rate",
                "coverage",
                "queue_high_impact_lift",
                "deployment_regret",
                "confusion_matrix",
                "calibration_bins",
                "outcomes.confident_correct",
                "outcomes.confident_wrong",
                "outcomes.abstained",
                "outcomes.overridden",
                "outcomes.rolled_back",
            ],
            sample_size=0,
        )

    decision_rows = [
        DecisionEvaluationRow(
            label=item.label,
            score=item.score,
            abstained=item.is_abstention,
            rule_family=item.rule_family,
            source_system=item.source_system,
            ioc_type=item.ioc_type,
            event_time=item.event_time,
            source_trust=item.source_trust,
            evidence_used_count=item.evidence_used_count,
            evidence_missing_count=item.evidence_missing_count,
            contradictory_evidence_count=item.contradictory_evidence_count,
            analyst_overrode=item.analyst_overrode,
            rolled_back=item.rolled_back,
        )
        for item in rows
    ]
    decision_metrics = compute_decision_metrics(
        decision_rows,
        threshold=0.55,
        top_k=top_k,
    )

    recommended = [item for item in rows if item.is_recommendation]
    overrides = [item for item in recommended if item.analyst_overrode]
    canary_rows = [item for item in rows if item.canary_succeeded is not None]
    rollback_rows = [item for item in rows if item.rolled_back is not None]

    unavailable_metrics: list[str] = []
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

    if decision_metrics.unsafe_recommendation_rate is None:
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
        precision=decision_metrics.precision,
        recall=decision_metrics.recall,
        f1=decision_metrics.f1,
        precision_at_k=decision_metrics.precision_at_k,
        recall_at_k=decision_metrics.recall_at_k,
        pr_auc=decision_metrics.pr_auc,
        calibration_error=decision_metrics.calibration_error,
        brier_score=decision_metrics.brier_score,
        false_positive_rate=decision_metrics.false_positive_rate,
        false_negative_rate=decision_metrics.false_negative_rate,
        unsafe_recommendation_rate=decision_metrics.unsafe_recommendation_rate,
        analyst_override_rate=analyst_override_rate,
        canary_success_rate=canary_success_rate,
        rollback_rate=rollback_rate,
        abstain_rate=decision_metrics.abstain_rate,
        coverage=decision_metrics.coverage,
        queue_high_impact_lift=queue_high_impact_lift,
        deployment_regret=deployment_regret,
        confusion_matrix=decision_metrics.confusion_matrix,
        calibration_bins=decision_metrics.calibration_bins,
        outcomes={
            **decision_metrics.outcomes,
            "overridden": len(overrides),
            "rolled_back": sum(1 for item in rollback_rows if item.rolled_back),
        },
        unavailable_metrics=sorted(set(decision_metrics.unavailable_metrics + unavailable_metrics)),
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

