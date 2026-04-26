from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class PromotionGateThresholds:
    min_sample_size: int = 20
    min_precision: float = 0.80
    min_recall: float = 0.70
    min_f1: float = 0.75
    min_pr_auc: float = 0.75
    max_calibration_error: float = 0.20
    max_brier_score: float = 0.25
    max_false_positive_rate: float = 0.20
    max_false_negative_rate: float = 0.35
    max_unsafe_recommendation_rate: float = 0.05
    min_coverage: float = 0.10
    required_slice_fields: tuple[str, ...] = (
        "ioc_type",
        "source_system",
        "rule_family",
        "recency_bucket",
        "trust_bucket",
        "evidence_availability_bucket",
    )


@dataclass(frozen=True)
class PromotionGateResult:
    passed: bool
    failures: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    checked_metrics: dict[str, float | int | None] = field(default_factory=dict)
    thresholds: PromotionGateThresholds = field(default_factory=PromotionGateThresholds)

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "failures": self.failures,
            "warnings": self.warnings,
            "checkedMetrics": self.checked_metrics,
            "thresholds": {
                "minSampleSize": self.thresholds.min_sample_size,
                "minPrecision": self.thresholds.min_precision,
                "minRecall": self.thresholds.min_recall,
                "minF1": self.thresholds.min_f1,
                "minPrAuc": self.thresholds.min_pr_auc,
                "maxCalibrationError": self.thresholds.max_calibration_error,
                "maxBrierScore": self.thresholds.max_brier_score,
                "maxFalsePositiveRate": self.thresholds.max_false_positive_rate,
                "maxFalseNegativeRate": self.thresholds.max_false_negative_rate,
                "maxUnsafeRecommendationRate": self.thresholds.max_unsafe_recommendation_rate,
                "minCoverage": self.thresholds.min_coverage,
                "requiredSliceFields": list(self.thresholds.required_slice_fields),
            },
        }


def evaluate_promotion_gates(
    report: dict[str, Any],
    *,
    thresholds: PromotionGateThresholds | None = None,
) -> PromotionGateResult:
    resolved = thresholds or PromotionGateThresholds()
    overall = _coerce_dict(report.get("overall"))
    sample_size = _coerce_int(report.get("sampleSize"))
    checked_metrics: dict[str, float | int | None] = {"sampleSize": sample_size}
    failures: list[str] = []
    warnings: list[str] = []

    if sample_size is None or sample_size < resolved.min_sample_size:
        failures.append(
            f"sampleSize below gate: value={sample_size}, minimum={resolved.min_sample_size}."
        )

    _require_min("precision", overall, resolved.min_precision, failures, checked_metrics)
    _require_min("recall", overall, resolved.min_recall, failures, checked_metrics)
    _require_min("f1", overall, resolved.min_f1, failures, checked_metrics)
    _require_min("prAuc", overall, resolved.min_pr_auc, failures, checked_metrics)
    _require_max("calibrationError", overall, resolved.max_calibration_error, failures, checked_metrics)
    _require_max("brierScore", overall, resolved.max_brier_score, failures, checked_metrics)
    _require_max("falsePositiveRate", overall, resolved.max_false_positive_rate, failures, checked_metrics)
    _require_max("falseNegativeRate", overall, resolved.max_false_negative_rate, failures, checked_metrics)
    _require_max(
        "unsafeRecommendationRate",
        overall,
        resolved.max_unsafe_recommendation_rate,
        failures,
        checked_metrics,
        unavailable_is_zero=True,
    )
    _require_min("coverage", overall, resolved.min_coverage, failures, checked_metrics)

    missing_slice_fields = _missing_slice_fields(report, resolved.required_slice_fields)
    if missing_slice_fields:
        failures.append(f"missing required evaluation slice fields: {', '.join(missing_slice_fields)}.")

    warnings.extend(_high_score_sanity_warnings(overall=overall, sample_size=sample_size))
    return PromotionGateResult(
        passed=not failures,
        failures=failures,
        warnings=warnings,
        checked_metrics=checked_metrics,
        thresholds=resolved,
    )


def _require_min(
    key: str,
    payload: dict[str, Any],
    minimum: float,
    failures: list[str],
    checked_metrics: dict[str, float | int | None],
) -> None:
    value = _coerce_float(payload.get(key))
    checked_metrics[key] = value
    if value is None:
        failures.append(f"{key} is unavailable.")
    elif value < minimum:
        failures.append(f"{key} below gate: value={value:.6f}, minimum={minimum:.6f}.")


def _require_max(
    key: str,
    payload: dict[str, Any],
    maximum: float,
    failures: list[str],
    checked_metrics: dict[str, float | int | None],
    *,
    unavailable_is_zero: bool = False,
) -> None:
    value = _coerce_float(payload.get(key))
    if value is None and unavailable_is_zero:
        value = 0.0
    checked_metrics[key] = value
    if value is None:
        failures.append(f"{key} is unavailable.")
    elif value > maximum:
        failures.append(f"{key} above gate: value={value:.6f}, maximum={maximum:.6f}.")


def _missing_slice_fields(report: dict[str, Any], required: tuple[str, ...]) -> list[str]:
    seen = {
        str(row.get("sliceField", row.get("slice_field", ""))).strip()
        for row in _coerce_list(report.get("slices"))
        if isinstance(row, dict)
    }
    return [field for field in required if field not in seen]


def _high_score_sanity_warnings(*, overall: dict[str, Any], sample_size: int | None) -> list[str]:
    warnings: list[str] = []
    precision = _coerce_float(overall.get("precision"))
    recall = _coerce_float(overall.get("recall"))
    pr_auc = _coerce_float(overall.get("prAuc"))
    calibration_error = _coerce_float(overall.get("calibrationError"))
    if (
        precision is not None
        and recall is not None
        and pr_auc is not None
        and precision >= 0.99
        and recall >= 0.99
        and pr_auc >= 0.995
    ):
        warnings.append(
            "near-perfect evaluation metrics require leakage/source-overlap review before production reliance."
        )
    if calibration_error is not None and calibration_error <= 0.005 and sample_size is not None and sample_size < 500:
        warnings.append(
            "very low calibration error on a small sample may indicate synthetic separation or narrow fixture coverage."
        )
    return warnings


def _coerce_dict(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def _coerce_list(value: Any) -> list[Any]:
    return list(value) if isinstance(value, list) else []


def _coerce_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None
