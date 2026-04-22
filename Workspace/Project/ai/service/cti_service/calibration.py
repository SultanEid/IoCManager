from __future__ import annotations

from dataclasses import dataclass
from math import exp
from typing import Iterable

import numpy as np

try:
    from sklearn.linear_model import LogisticRegression
except Exception:  # pragma: no cover
    LogisticRegression = None

try:
    from sklearn.isotonic import IsotonicRegression
except Exception:  # pragma: no cover
    IsotonicRegression = None


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + exp(-value))


@dataclass(frozen=True)
class LogisticCalibrator:
    method: str = "logistic"
    slope: float = 4.5
    intercept: float = 0.0
    x_breakpoints: tuple[float, ...] = ()
    y_breakpoints: tuple[float, ...] = ()

    def calibrate(self, raw_score: float) -> float:
        if self.method == "isotonic" and self.x_breakpoints and self.y_breakpoints:
            return float(
                max(
                    0.0,
                    min(
                        1.0,
                        np.interp(
                            float(raw_score),
                            np.asarray(self.x_breakpoints, dtype=float),
                            np.asarray(self.y_breakpoints, dtype=float),
                        ),
                    ),
                )
            )
        centered = (raw_score - 0.5) * self.slope + self.intercept
        return float(max(0.0, min(1.0, _sigmoid(centered))))

    def to_dict(self) -> dict[str, object]:
        payload: dict[str, object] = {
            "method": self.method,
            "slope": float(self.slope),
            "intercept": float(self.intercept),
        }
        if self.x_breakpoints:
            payload["x_breakpoints"] = [float(item) for item in self.x_breakpoints]
        if self.y_breakpoints:
            payload["y_breakpoints"] = [float(item) for item in self.y_breakpoints]
        return payload

    @classmethod
    def from_dict(cls, payload: dict[str, object] | None) -> "LogisticCalibrator":
        if not payload:
            return cls()
        method = str(payload.get("method", "logistic")).strip().lower()
        slope = float(payload.get("slope", 4.5))
        intercept = float(payload.get("intercept", 0.0))
        x_breakpoints = tuple(float(item) for item in payload.get("x_breakpoints", []) or [])
        y_breakpoints = tuple(float(item) for item in payload.get("y_breakpoints", []) or [])
        if method == "isotonic" and x_breakpoints and y_breakpoints and len(x_breakpoints) == len(y_breakpoints):
            return cls(
                method=method,
                slope=slope,
                intercept=intercept,
                x_breakpoints=x_breakpoints,
                y_breakpoints=y_breakpoints,
            )
        return cls(method="logistic", slope=slope, intercept=intercept)


def train_logistic_calibrator(
    raw_scores: Iterable[float],
    labels: Iterable[int],
    sample_weights: Iterable[float] | None = None,
) -> LogisticCalibrator:
    x = np.asarray(list(raw_scores), dtype=float)
    y = np.asarray(list(labels), dtype=int)
    weights = _normalize_sample_weights(sample_weights, x.size)
    if x.size == 0 or y.size == 0 or x.size != y.size:
        return LogisticCalibrator()

    if len(np.unique(y)) < 2:
        return LogisticCalibrator()

    if LogisticRegression is None:
        return LogisticCalibrator()

    if x.size >= 24 and len(np.unique(x)) >= 8:
        split = max(8, int(round(x.size * 0.75)))
        split = min(split, x.size - 6)
        if split > 0 and split < x.size:
            train_x = x[:split]
            train_y = y[:split]
            train_w = weights[:split]
            val_x = x[split:]
            val_y = y[split:]
            val_w = weights[split:]
            if len(np.unique(train_y)) >= 2 and len(np.unique(val_y)) >= 2:
                candidates = _fit_calibration_candidates(train_x, train_y, sample_weights=train_w)
                if candidates:
                    scored = [
                        (_calibration_objective(candidate, val_x, val_y, sample_weights=val_w), candidate)
                        for candidate in candidates
                    ]
                    scored.sort(key=lambda item: item[0])
                    return scored[0][1]

    candidates = _fit_calibration_candidates(x, y, sample_weights=weights)
    return candidates[0] if candidates else LogisticCalibrator()


def _fit_calibration_candidates(
    x: np.ndarray,
    y: np.ndarray,
    sample_weights: np.ndarray | None = None,
) -> list[LogisticCalibrator]:
    candidates: list[LogisticCalibrator] = []
    if LogisticRegression is not None:
        model = LogisticRegression(max_iter=1000, class_weight="balanced")
        model.fit(x.reshape(-1, 1), y, sample_weight=sample_weights)
        slope = float(model.coef_[0][0])
        intercept = float(model.intercept_[0])
        centered_intercept = intercept + (0.5 * slope)
        candidates.append(LogisticCalibrator(method="logistic", slope=slope, intercept=centered_intercept))

    if IsotonicRegression is not None and len(np.unique(x)) >= 4:
        model = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        model.fit(x, y, sample_weight=sample_weights)
        x_breakpoints = tuple(float(item) for item in np.asarray(model.X_thresholds_, dtype=float))
        y_breakpoints = tuple(float(item) for item in np.asarray(model.y_thresholds_, dtype=float))
        if x_breakpoints and y_breakpoints and len(x_breakpoints) == len(y_breakpoints):
            candidates.append(
                LogisticCalibrator(
                    method="isotonic",
                    x_breakpoints=x_breakpoints,
                    y_breakpoints=y_breakpoints,
                )
            )
    return candidates


def _calibration_objective(
    calibrator: LogisticCalibrator,
    x: np.ndarray,
    y: np.ndarray,
    sample_weights: np.ndarray | None = None,
) -> float:
    predictions = np.asarray([calibrator.calibrate(float(item)) for item in x], dtype=float)
    brier = _weighted_mean((predictions - y) ** 2, sample_weights)
    ece = _expected_calibration_error(predictions, y, sample_weights=sample_weights)
    return brier + (0.5 * ece)


def _expected_calibration_error(
    predictions: np.ndarray,
    labels: np.ndarray,
    bins: int = 10,
    sample_weights: np.ndarray | None = None,
) -> float:
    if predictions.size == 0:
        return 0.0
    weights = _normalize_sample_weights(sample_weights, predictions.size)
    edges = np.linspace(0.0, 1.0, bins + 1)
    error = 0.0
    total = float(np.sum(weights))
    for index in range(bins):
        lower = edges[index]
        upper = edges[index + 1]
        if index == bins - 1:
            mask = (predictions >= lower) & (predictions <= upper)
        else:
            mask = (predictions >= lower) & (predictions < upper)
        if not np.any(mask):
            continue
        bucket_predictions = predictions[mask]
        bucket_labels = labels[mask]
        bucket_weights = weights[mask]
        bucket_total = float(np.sum(bucket_weights))
        confidence = _weighted_mean(bucket_predictions, bucket_weights)
        accuracy = _weighted_mean(bucket_labels, bucket_weights)
        error += (bucket_total / total) * abs(confidence - accuracy)
    return error


def _normalize_sample_weights(sample_weights: Iterable[float] | None, size: int) -> np.ndarray:
    if size <= 0:
        return np.asarray([], dtype=float)
    if sample_weights is None:
        return np.ones(size, dtype=float)
    weights = np.asarray(list(sample_weights), dtype=float)
    if weights.size != size:
        return np.ones(size, dtype=float)
    return np.clip(weights, 0.05, None)


def _weighted_mean(values: np.ndarray, sample_weights: np.ndarray | None = None) -> float:
    if values.size == 0:
        return 0.0
    if sample_weights is None or sample_weights.size != values.size:
        return float(np.mean(values))
    total_weight = float(np.sum(sample_weights))
    if total_weight <= 0.0:
        return float(np.mean(values))
    return float(np.average(values, weights=sample_weights))
