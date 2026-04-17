from __future__ import annotations

import json
import math
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np

from .config import Settings
from .feature_views import build_feature_snapshot
from .feedback_store import FeedbackStore
from .model_card import load_model_card
from .schemas import (
    AnalystOutcome,
    CaseScoreVectorResponse,
    EvidenceItem,
    FeatureViewSnapshot,
    IocEvent,
    ModelCardResponse,
    ModelDecisionTrace,
    ScoreResponse,
)

try:
    import joblib
except Exception:  # pragma: no cover
    joblib = None


DEFAULT_VIEW_WEIGHTS = {
    "lexical": 0.24,
    "tabular": 0.32,
    "graph": 0.22,
    "temporal": 0.22,
}

DEFAULT_THRESHOLDS = {
    "ip": {"critical": 0.65, "high": 0.50, "medium": 0.35},
    "domain": {"critical": 0.70, "high": 0.55, "medium": 0.40},
    "url": {"critical": 0.68, "high": 0.53, "medium": 0.38},
    "hash": {"critical": 0.72, "high": 0.58, "medium": 0.42},
    "default": {"critical": 0.70, "high": 0.55, "medium": 0.40},
}

ACTION_MAP = {
    "critical": ("immediate_containment", 2),
    "high": ("priority_triage", 8),
    "medium": ("analyst_review", 24),
    "low": ("monitor", 72),
}


@dataclass
class HistoryRecord:
    first_seen: datetime
    last_seen: datetime
    seen_count: int
    recent_events: deque[datetime]
    scanner_set_24h: set[str]


class HybridRiskEngine:
    def __init__(self, settings: Settings, feedback_store: FeedbackStore) -> None:
        self._settings = settings
        self._feedback_store = feedback_store
        self._history: dict[tuple[str, str], HistoryRecord] = {}
        self._model_bundle = self._load_model_bundle(settings.model_bundle_path)
        self._view_weights = self._load_view_weights()
        self._thresholds = self._load_thresholds(settings.thresholds_path)
        self._model_card = load_model_card(settings.model_card_path, settings.default_model_version)

    @property
    def model_card(self) -> ModelCardResponse:
        return self._model_card

    def score(self, event: IocEvent) -> ModelDecisionTrace:
        key = (event.ioc_type, event.ioc_value.lower())
        history_features = self._history_features(key, event)
        feedback_stats = self._feedback_store.get_stats(event.ioc_type, event.ioc_value)
        snapshot = build_feature_snapshot(event, history_features, feedback_stats)

        view_scores = self._score_views(snapshot)
        risk_score = self._stack_and_calibrate(view_scores)
        risk_tier = self._risk_tier(event.ioc_type, risk_score)
        uncertainty_set, confidence = self._uncertainty(view_scores, risk_score, snapshot.anti_database)
        recommended_action, ttl_hours = ACTION_MAP[risk_tier]
        top_evidence = self._top_evidence(snapshot, view_scores)

        trace = ModelDecisionTrace(
            event=event,
            snapshot=snapshot,
            view_scores=view_scores,
            risk_score=float(round(risk_score, 6)),
            risk_tier=risk_tier,
            confidence=float(round(confidence, 6)),
            uncertainty_set=[float(round(uncertainty_set[0], 6)), float(round(uncertainty_set[1], 6))],
            top_evidence=top_evidence,
            recommended_action=recommended_action,
            ttl_hours=ttl_hours,
            model_version=self._model_card.model_version,
            scored_at=datetime.now(timezone.utc),
        )

        self._update_history(key, event)
        return trace

    def score_response(self, event: IocEvent) -> ScoreResponse:
        trace = self.score(event)
        return ScoreResponse(
            risk_score=trace.risk_score,
            risk_tier=trace.risk_tier,
            confidence=trace.confidence,
            uncertainty_set=trace.uncertainty_set,
            top_evidence=trace.top_evidence,
            recommended_action=trace.recommended_action,
            ttl_hours=trace.ttl_hours,
            model_version=trace.model_version,
        )

    def score_case_vector(self, event: IocEvent) -> CaseScoreVectorResponse:
        trace = self.score(event)
        maliciousness = trace.risk_score
        actionability = _clip01((trace.risk_score * 0.6) + (1.0 - trace.snapshot.anti_database["confidence_decay"]) * 0.4)
        deployability = _clip01((trace.snapshot.tabular["scanner_agreement"] * 0.5) + (trace.snapshot.tabular["rule_severity"] * 0.5))
        decay = _clip01(trace.snapshot.anti_database["confidence_decay"])
        uncertainty = _clip01(1.0 - trace.confidence)
        blast_radius = _clip01(
            (trace.snapshot.tabular["host_criticality"] * 0.45)
            + (trace.snapshot.tabular["asset_exposure"] * 0.35)
            + (trace.snapshot.graph["cluster_density"] * 0.20)
        )
        dataset_version = f"stream-{trace.scored_at.strftime('%Y%m%d')}"
        feature_hash = _hash_string(
            f"{event.ioc_type}|{event.ioc_value}|{trace.scored_at.isoformat()}|{trace.risk_score:.6f}|{dataset_version}"
        )

        return CaseScoreVectorResponse(
            maliciousness_score=float(round(maliciousness, 6)),
            actionability_score=float(round(actionability, 6)),
            deployability_score=float(round(deployability, 6)),
            decay_score=float(round(decay, 6)),
            uncertainty_score=float(round(uncertainty, 6)),
            blast_radius_score=float(round(blast_radius, 6)),
            uncertainty_band=trace.uncertainty_set,
            top_evidence=trace.top_evidence,
            model_version=trace.model_version,
            dataset_version=dataset_version,
            feature_snapshot_hash=feature_hash,
        )

    def register_feedback(self, outcome: AnalystOutcome) -> datetime:
        return self._feedback_store.store(outcome)

    def _load_model_bundle(self, path: Path) -> Any | None:
        if not path.exists() or joblib is None:
            return None
        try:
            return joblib.load(path)
        except Exception:
            return None

    def _load_view_weights(self) -> dict[str, float]:
        if isinstance(self._model_bundle, dict):
            maybe = self._model_bundle.get("view_weights")
            if isinstance(maybe, dict):
                return {k: float(v) for k, v in maybe.items()}
        return dict(DEFAULT_VIEW_WEIGHTS)

    def _load_thresholds(self, path: Path) -> dict[str, dict[str, float]]:
        if path.exists():
            with path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            return {
                key.lower(): {
                    "critical": float(value["critical"]),
                    "high": float(value["high"]),
                    "medium": float(value["medium"]),
                }
                for key, value in payload.items()
            }
        return dict(DEFAULT_THRESHOLDS)

    def _history_features(self, key: tuple[str, str], event: IocEvent) -> dict[str, Any]:
        record = self._history.get(key)
        if record is None:
            return {}

        now = event.event_time.astimezone(timezone.utc)
        recent_1h = [t for t in record.recent_events if now - t <= timedelta(hours=1)]
        recent_24h = [t for t in record.recent_events if now - t <= timedelta(hours=24)]
        scanner_consensus = min(1.0, len(record.scanner_set_24h) / 4.0)

        return {
            "first_seen": record.first_seen,
            "last_seen": record.last_seen,
            "seen_count": record.seen_count,
            "burst_1h": float(len(recent_1h)),
            "burst_24h": float(len(recent_24h)),
            "scanner_consensus_24h": scanner_consensus,
        }

    def _update_history(self, key: tuple[str, str], event: IocEvent) -> None:
        now = event.event_time.astimezone(timezone.utc)
        scanner = str(event.rule_context.get("scanner_family", event.source_system))

        record = self._history.get(key)
        if record is None:
            record = HistoryRecord(
                first_seen=now,
                last_seen=now,
                seen_count=1,
                recent_events=deque([now], maxlen=500),
                scanner_set_24h={scanner},
            )
            self._history[key] = record
            return

        record.last_seen = now
        record.seen_count += 1
        record.recent_events.append(now)
        record.scanner_set_24h.add(scanner)

        cutoff = now - timedelta(hours=24)
        while record.recent_events and record.recent_events[0] < cutoff:
            record.recent_events.popleft()

    def _score_views(self, snapshot: FeatureViewSnapshot) -> dict[str, float]:
        if self._model_bundle:
            return self._score_views_with_bundle(snapshot)

        lexical = snapshot.lexical
        tabular = snapshot.tabular
        graph = snapshot.graph
        temporal = snapshot.temporal
        anti = snapshot.anti_database

        lexical_score = _clip01(
            0.10 * lexical["entropy"]
            + 0.12 * lexical["digit_ratio"]
            + 0.18 * lexical["special_ratio"]
            + 0.08 * lexical["subdomain_depth"]
            + 0.22 * lexical["has_suspicious_tld"]
            + 0.20 * lexical["has_suspicious_keyword"]
            + 0.10 * lexical["has_ip_like_pattern"]
        )
        tabular_score = _clip01(
            0.18 * tabular["host_criticality"]
            + 0.14 * tabular["asset_exposure"]
            + 0.22 * tabular["scanner_agreement"]
            + 0.16 * tabular["rule_severity"]
            + 0.10 * tabular["protocol_risk"]
            + 0.10 * tabular["path_risk"]
            + 0.05 * _squash(tabular["historical_hits"], 25.0)
            + 0.05 * tabular["source_reputation"]
        )
        graph_score = _clip01(
            0.18 * _squash(graph["shared_host_count"], 20.0)
            + 0.15 * _squash(graph["shared_rule_count"], 20.0)
            + 0.25 * graph["cluster_density"]
            + 0.22 * graph["campaign_link_score"]
            + 0.20 * graph["neighbor_malicious_ratio"]
        )
        temporal_score = _clip01(
            0.20 * _squash(temporal["seen_count"], 30.0)
            + 0.18 * _inverse_squash(temporal["age_hours"], 168.0)
            + 0.18 * _inverse_squash(temporal["since_last_hours"], 72.0)
            + 0.18 * _squash(temporal["burst_1h"], 20.0)
            + 0.14 * _squash(temporal["burst_24h"], 40.0)
            + 0.12 * temporal["scanner_consensus_24h"]
        )

        # Anti-database behavior keeps the model adaptive and not just a static IOC catalog.
        novelty = anti["novelty_score"]
        contradiction = anti["contradiction_signal"]
        decay = anti["confidence_decay"]
        freshness = _inverse_squash(anti["evidence_freshness_hours"], 96.0)
        temporal_score = _clip01(temporal_score * (0.9 + 0.2 * freshness))
        graph_score = _clip01(graph_score * (1.0 - 0.30 * contradiction))
        tabular_score = _clip01(tabular_score * (0.9 + 0.15 * novelty))
        lexical_score = _clip01(lexical_score * (1.0 - 0.10 * decay))

        return {
            "lexical": lexical_score,
            "tabular": tabular_score,
            "graph": graph_score,
            "temporal": temporal_score,
        }

    def _score_views_with_bundle(self, snapshot: FeatureViewSnapshot) -> dict[str, float]:
        bundle = self._model_bundle
        feature_orders = bundle.get("feature_orders", {})
        vector_map = {
            "lexical": np.array([snapshot.lexical[name] for name in feature_orders.get("lexical", sorted(snapshot.lexical))]).reshape(1, -1),
            "tabular": np.array([snapshot.tabular[name] for name in feature_orders.get("tabular", sorted(snapshot.tabular))]).reshape(1, -1),
            "graph": np.array([snapshot.graph[name] for name in feature_orders.get("graph", sorted(snapshot.graph))]).reshape(1, -1),
            "temporal": np.array([snapshot.temporal[name] for name in feature_orders.get("temporal", sorted(snapshot.temporal))]).reshape(1, -1),
        }

        scores: dict[str, float] = {}
        for view_name, vector in vector_map.items():
            model = bundle.get("view_models", {}).get(view_name)
            if model is None:
                scores[view_name] = 0.5
                continue
            if hasattr(model, "predict_proba"):
                view_score = float(model.predict_proba(vector)[0, 1])
            else:
                view_score = float(model.predict(vector)[0])
            scores[view_name] = _clip01(view_score)
        return scores

    def _stack_and_calibrate(self, view_scores: dict[str, float]) -> float:
        weighted_sum = 0.0
        for view_name, view_score in view_scores.items():
            weighted_sum += self._view_weights.get(view_name, 0.25) * view_score

        if self._model_bundle and "meta_model" in self._model_bundle:
            meta_model = self._model_bundle["meta_model"]
            view_vector = np.array([[view_scores["lexical"], view_scores["tabular"], view_scores["graph"], view_scores["temporal"]]])
            if hasattr(meta_model, "predict_proba"):
                weighted_sum = float(meta_model.predict_proba(view_vector)[0, 1])
            else:
                weighted_sum = float(meta_model.predict(view_vector)[0])

        if self._model_bundle and "calibrator" in self._model_bundle:
            calibrator = self._model_bundle["calibrator"]
            calibrated = float(calibrator.predict(np.array([weighted_sum]))[0])
        else:
            temperature = max(0.2, self._settings.calibration_temperature)
            calibrated = 1.0 / (1.0 + math.exp(-((weighted_sum - 0.5) / temperature)))
        return _clip01(calibrated)

    def _uncertainty(
        self,
        view_scores: dict[str, float],
        risk_score: float,
        anti_database: dict[str, float],
    ) -> tuple[list[float], float]:
        disagreement = float(np.std(np.array(list(view_scores.values()), dtype=float)))
        contradiction = anti_database.get("contradiction_signal", 0.0)
        base_width = 0.10 + 0.55 * disagreement + 0.20 * contradiction
        width = float(np.clip(base_width, self._settings.uncertainty_floor, self._settings.uncertainty_ceiling))
        interval = [max(0.0, risk_score - width), min(1.0, risk_score + width)]
        confidence = 1.0 - width
        return interval, _clip01(confidence)

    def _risk_tier(self, ioc_type: str, score: float) -> str:
        thresholds = self._thresholds.get(ioc_type, self._thresholds["default"])
        if score >= thresholds["critical"]:
            return "critical"
        if score >= thresholds["high"]:
            return "high"
        if score >= thresholds["medium"]:
            return "medium"
        return "low"

    def _top_evidence(self, snapshot: FeatureViewSnapshot, view_scores: dict[str, float]) -> list[EvidenceItem]:
        evidence: list[EvidenceItem] = []
        strongest_view = max(view_scores.items(), key=lambda item: item[1])[0]
        if strongest_view == "lexical":
            lexical = snapshot.lexical
            evidence = [
                EvidenceItem(feature="entropy", explanation="High string entropy suggests obfuscation/randomization.", contribution=lexical["entropy"]),
                EvidenceItem(feature="has_suspicious_tld", explanation="Suspicious TLD is common in fast-turnover malicious domains.", contribution=lexical["has_suspicious_tld"]),
                EvidenceItem(feature="special_ratio", explanation="Unusual character density indicates phishing/obfuscated payloads.", contribution=lexical["special_ratio"]),
            ]
        elif strongest_view == "tabular":
            tabular = snapshot.tabular
            evidence = [
                EvidenceItem(feature="scanner_agreement", explanation="Multiple scanner families agree on suspicious behavior.", contribution=tabular["scanner_agreement"]),
                EvidenceItem(feature="rule_severity", explanation="Matched rules carry high severity in current policy.", contribution=tabular["rule_severity"]),
                EvidenceItem(feature="host_criticality", explanation="Indicator impacts a higher criticality host.", contribution=tabular["host_criticality"]),
            ]
        elif strongest_view == "graph":
            graph = snapshot.graph
            evidence = [
                EvidenceItem(feature="campaign_link_score", explanation="Indicator links to known campaign-level graph neighborhood.", contribution=graph["campaign_link_score"]),
                EvidenceItem(feature="neighbor_malicious_ratio", explanation="Adjacent graph nodes are predominantly malicious.", contribution=graph["neighbor_malicious_ratio"]),
                EvidenceItem(feature="cluster_density", explanation="Dense cluster context elevates confidence.", contribution=graph["cluster_density"]),
            ]
        else:
            temporal = snapshot.temporal
            evidence = [
                EvidenceItem(feature="burst_1h", explanation="Recent burst in detections indicates active behavior.", contribution=temporal["burst_1h"]),
                EvidenceItem(feature="scanner_consensus_24h", explanation="Cross-scanner temporal consensus increases risk.", contribution=temporal["scanner_consensus_24h"]),
                EvidenceItem(feature="since_last_hours", explanation="Short gap since last sighting suggests ongoing activity.", contribution=1.0 - _inverse_squash(temporal["since_last_hours"], 72.0)),
            ]
        return evidence


def _clip01(value: float) -> float:
    return float(np.clip(value, 0.0, 1.0))


def _squash(value: float, scale: float) -> float:
    return 1.0 - math.exp(-max(0.0, value) / max(1.0, scale))


def _inverse_squash(value: float, scale: float) -> float:
    return 1.0 - _squash(value, scale)


def _hash_string(value: str) -> str:
    import hashlib

    return hashlib.sha256(value.encode("utf-8")).hexdigest()
