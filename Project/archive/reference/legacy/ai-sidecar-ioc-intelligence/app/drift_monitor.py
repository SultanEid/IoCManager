from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DriftMonitor:
    total_scores: int = 0
    running_risk_sum: float = 0.0
    running_confidence_sum: float = 0.0
    by_type: dict[str, int] = field(default_factory=dict)

    def register_score(self, ioc_type: str, risk_score: float, confidence: float) -> None:
        self.total_scores += 1
        self.running_risk_sum += risk_score
        self.running_confidence_sum += confidence
        self.by_type[ioc_type] = self.by_type.get(ioc_type, 0) + 1

    def snapshot(self) -> dict[str, float | int | dict[str, int]]:
        if self.total_scores == 0:
            avg_risk = 0.0
            avg_confidence = 0.0
        else:
            avg_risk = self.running_risk_sum / self.total_scores
            avg_confidence = self.running_confidence_sum / self.total_scores

        return {
            "total_scores": self.total_scores,
            "avg_risk": round(avg_risk, 6),
            "avg_confidence": round(avg_confidence, 6),
            "by_type": dict(self.by_type),
        }

