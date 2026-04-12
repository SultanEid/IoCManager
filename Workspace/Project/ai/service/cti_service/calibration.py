from __future__ import annotations

from dataclasses import dataclass
from math import exp
from typing import Iterable

import numpy as np

try:
    from sklearn.linear_model import LogisticRegression
except Exception:  # pragma: no cover
    LogisticRegression = None


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + exp(-value))


@dataclass(frozen=True)
class LogisticCalibrator:
    slope: float = 4.5
    intercept: float = 0.0

    def calibrate(self, raw_score: float) -> float:
        centered = (raw_score - 0.5) * self.slope + self.intercept
        return float(max(0.0, min(1.0, _sigmoid(centered))))

    def to_dict(self) -> dict[str, float]:
        return {"slope": float(self.slope), "intercept": float(self.intercept)}

    @classmethod
    def from_dict(cls, payload: dict[str, float] | None) -> "LogisticCalibrator":
        if not payload:
            return cls()
        slope = float(payload.get("slope", 4.5))
        intercept = float(payload.get("intercept", 0.0))
        return cls(slope=slope, intercept=intercept)


def train_logistic_calibrator(raw_scores: Iterable[float], labels: Iterable[int]) -> LogisticCalibrator:
    x = np.asarray(list(raw_scores), dtype=float)
    y = np.asarray(list(labels), dtype=int)
    if x.size == 0 or y.size == 0 or x.size != y.size:
        return LogisticCalibrator()

    if len(np.unique(y)) < 2:
        return LogisticCalibrator()

    if LogisticRegression is None:
        return LogisticCalibrator()

    model = LogisticRegression(max_iter=1000)
    model.fit(x.reshape(-1, 1), y)
    slope = float(model.coef_[0][0])
    intercept = float(model.intercept_[0])
    # Align slope/intercept with centered scoring: score = sigmoid((x - 0.5) * slope + intercept)
    centered_intercept = intercept + (0.5 * slope)
    return LogisticCalibrator(slope=slope, intercept=centered_intercept)

