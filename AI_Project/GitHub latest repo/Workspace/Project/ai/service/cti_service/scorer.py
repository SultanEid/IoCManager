from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable

from .calibration import LogisticCalibrator
from .contracts import (
    AxisExplanationResponse,
    CaseScoreVectorResponse,
    EvidenceGapItemResponse,
    EvidenceItemResponse,
    ReasonCodeResponse,
    ScoreCaseRequest,
)
from .graph import GraphFeatureProvider


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class ScoringThresholds:
    recommend: float = 0.55
    escalate: float = 0.80
    abstain: float = 0.35


@dataclass(frozen=True)
class ScorerContext:
    model_version: str
    dataset_version: str
    source_trust_map: dict[str, float] = field(default_factory=dict)
    scoring_profile_version: str = "heuristic-v1"
    feature_schema_version: str = "cti-feature-schema-v1"


@dataclass(frozen=True)
class FeatureVector:
    suspicious_ioc: float
    rule_severity: float
    scanner_agreement: float
    host_criticality: float
    asset_exposure: float
    source_trust_signal: float
    temporal_signal: float
    sightings_signal: float
    graph_signal: float
    evidence_conflict_signal: float

    @property
    def feature_groups(self) -> dict[str, float]:
        return {
            "source_trust_signal": self.source_trust_signal,
            "temporal_signal": self.temporal_signal,
            "sightings_signal": self.sightings_signal,
            "graph_signal": self.graph_signal,
            "evidence_conflict_signal": self.evidence_conflict_signal,
        }


class BaselineScorer:
    def __init__(
        self,
        context: ScorerContext,
        calibrator: LogisticCalibrator | None = None,
        thresholds: ScoringThresholds | None = None,
        graph_feature_providers: list[GraphFeatureProvider] | None = None,
        now_provider: Callable[[], datetime] = _utcnow,
    ) -> None:
        self._context = context
        self._calibrator = calibrator or LogisticCalibrator()
        self._thresholds = thresholds or ScoringThresholds()
        self._graph_feature_providers = graph_feature_providers or []
        self._now_provider = now_provider

    @property
    def model_version(self) -> str:
        return self._context.model_version

    @property
    def dataset_version(self) -> str:
        return self._context.dataset_version

    @property
    def thresholds(self) -> ScoringThresholds:
        return self._thresholds

    @property
    def scoring_profile_version(self) -> str:
        return self._context.scoring_profile_version

    @property
    def feature_schema_version(self) -> str:
        return self._context.feature_schema_version

    def raw_score(self, request: ScoreCaseRequest) -> float:
        features = self._feature_vector(request)
        raw = (
            0.18 * features.suspicious_ioc
            + 0.17 * features.rule_severity
            + 0.14 * features.scanner_agreement
            + 0.16 * features.source_trust_signal
            + 0.12 * features.temporal_signal
            + 0.13 * features.sightings_signal
            + 0.10 * (1.0 - features.evidence_conflict_signal)
        )
        return _clip01(raw)

    def score_case(self, request: ScoreCaseRequest) -> CaseScoreVectorResponse:
        as_of = request.as_of_time.astimezone(timezone.utc) if request.as_of_time else self._now_provider()
        raw = self.raw_score(request)
        maliciousness = self._calibrator.calibrate(raw)
        features = self._feature_vector(request)

        uncertainty = self._uncertainty(features)
        blast_radius = _clip01(
            0.65 * features.host_criticality
            + 0.35 * features.asset_exposure
        )
        actionability = _clip01(
            maliciousness
            * (1.0 - uncertainty)
            * (0.45 + 0.30 * features.sightings_signal + 0.25 * features.source_trust_signal)
            * (1.0 - 0.45 * features.evidence_conflict_signal)
        )
        deployability = _clip01(
            0.35 * features.scanner_agreement
            + 0.20 * features.rule_severity
            + 0.20 * (1.0 - blast_radius)
            + 0.15 * (1.0 - uncertainty)
            + 0.10 * (1.0 - features.evidence_conflict_signal)
        )
        decay = _clip01(1.0 - features.temporal_signal)
        uncertainty_band = [max(0.0, maliciousness - uncertainty), min(1.0, maliciousness + uncertainty)]

        decision_state, reason_codes = self._decision_state(
            maliciousness=maliciousness,
            actionability=actionability,
            uncertainty=uncertainty,
            blast_radius=blast_radius,
            features=features,
        )
        reason_models = self._reason_models(reason_codes)
        evidence_gaps = self._evidence_gaps(reason_codes)
        next_best = [item.recommended_collection for item in evidence_gaps[:3]]
        evidence = self._top_evidence(features)
        axis_explanations = self._axis_explanations(
            maliciousness=maliciousness,
            actionability=actionability,
            deployability=deployability,
            decay=decay,
            uncertainty=uncertainty,
            blast_radius=blast_radius,
            features=features,
            decision_state=decision_state,
        )
        snapshot_hash = self._feature_snapshot_hash(request, as_of, features, maliciousness)

        return CaseScoreVectorResponse(
            case_id=request.case_id,
            maliciousness_score=float(round(maliciousness, 6)),
            actionability_score=float(round(actionability, 6)),
            deployability_score=float(round(deployability, 6)),
            decay_score=float(round(decay, 6)),
            uncertainty_score=float(round(uncertainty, 6)),
            blast_radius_score=float(round(blast_radius, 6)),
            uncertainty_band=[float(round(item, 6)) for item in uncertainty_band],
            top_evidence=evidence,
            feature_groups={key: float(round(value, 6)) for key, value in features.feature_groups.items()},
            axis_explanations=axis_explanations,
            reason_codes=reason_models,
            evidence_gaps=evidence_gaps,
            model_version=self._context.model_version,
            dataset_version=self._context.dataset_version,
            feature_snapshot_hash=snapshot_hash,
            decision_state=decision_state,
            abstain_reason_codes=reason_codes,
            next_best_evidence=next_best,
            scored_at_utc=self._now_provider(),
        )

    def _feature_vector(self, request: ScoreCaseRequest) -> FeatureVector:
        now = self._now_provider()
        as_of = request.as_of_time.astimezone(timezone.utc) if request.as_of_time else now
        age_hours = max(0.0, (now - as_of).total_seconds() / 3600.0)
        temporal_signal = _clip01(1.0 - min(1.0, age_hours / 168.0))

        host_criticality = _read_context_float(request.host_context, "criticality", "hostCriticality", default=0.5)
        asset_exposure = _read_context_float(request.host_context, "assetExposure", "asset_exposure", default=0.5)
        scanner_agreement = _read_context_float(request.rule_context, "scannerAgreement", "scanner_agreement", default=0.4)
        rule_severity = _read_context_float(request.rule_context, "severityScore", "severity_score", default=0.4)

        source_trust = _read_context_float_optional(request.rule_context, "sourceTrust", "source_trust")
        if source_trust is None:
            source_trust = self._context.source_trust_map.get(request.source_system.strip().lower(), 0.5)
        source_trust = _clip01(float(source_trust))

        sightings_signal = _sightings_signal(request.host_context, request.rule_context)
        graph_signal = self._graph_signal(request)
        evidence_conflict_signal = _evidence_conflict_signal(request.host_context, request.rule_context)
        suspicious_ioc = _compute_ioc_suspicion(request.ioc_type, request.ioc_value)

        return FeatureVector(
            suspicious_ioc=suspicious_ioc,
            rule_severity=rule_severity,
            scanner_agreement=scanner_agreement,
            host_criticality=host_criticality,
            asset_exposure=asset_exposure,
            source_trust_signal=source_trust,
            temporal_signal=temporal_signal,
            sightings_signal=sightings_signal,
            graph_signal=graph_signal,
            evidence_conflict_signal=evidence_conflict_signal,
        )

    def _graph_signal(self, request: ScoreCaseRequest) -> float:
        explicit = _read_context_float_optional(
            request.rule_context,
            "graphSignal",
            "graph_signal",
            "graphRisk",
            "graph_risk",
        )
        if explicit is None:
            explicit = _read_context_float_optional(
                request.host_context,
                "graphSignal",
                "graph_signal",
                "graphRisk",
                "graph_risk",
            )
        explicit_value = _clip01(float(explicit)) if explicit is not None else None

        provider_values: list[float] = []
        for provider in self._graph_feature_providers:
            features = provider.get_features(request)
            for value in features.values():
                provider_values.append(_clip01(float(value)))
        provider_mean = _clip01(sum(provider_values) / len(provider_values)) if provider_values else None

        if explicit_value is not None and provider_mean is not None:
            return _clip01(0.60 * explicit_value + 0.40 * provider_mean)
        if explicit_value is not None:
            return explicit_value
        if provider_mean is not None:
            return provider_mean
        return 0.0

    def _uncertainty(self, features: FeatureVector) -> float:
        volatility = abs(features.rule_severity - features.scanner_agreement)
        uncertainty = (
            0.06
            + 0.24 * (1.0 - features.source_trust_signal)
            + 0.16 * (1.0 - features.temporal_signal)
            + 0.20 * features.evidence_conflict_signal
            + 0.14 * volatility
            + 0.20 * (1.0 - features.sightings_signal)
        )
        return _clip(float(uncertainty), 0.05, 0.55)

    def _decision_state(
        self,
        maliciousness: float,
        actionability: float,
        uncertainty: float,
        blast_radius: float,
        features: FeatureVector,
    ) -> tuple[str, list[str]]:
        reason_codes: list[str] = []
        if uncertainty >= 0.42:
            reason_codes.append("high_uncertainty")
        if features.source_trust_signal <= 0.20:
            reason_codes.append("low_source_trust")
        if features.evidence_conflict_signal >= 0.55:
            reason_codes.append("high_evidence_conflict")
        if features.sightings_signal <= 0.20:
            reason_codes.append("low_sightings_corroboration")
        if maliciousness < self._thresholds.abstain:
            reason_codes.append("low_malicious_signal")

        if any(code in {"high_uncertainty", "low_source_trust", "high_evidence_conflict", "low_malicious_signal"} for code in reason_codes):
            return "abstain", reason_codes
        if maliciousness >= self._thresholds.escalate or blast_radius >= 0.80:
            return "escalate", reason_codes
        if maliciousness >= self._thresholds.recommend and actionability >= 0.35:
            return "recommend", reason_codes
        if actionability < 0.35:
            reason_codes.append("insufficient_actionability")
        return "defer", reason_codes

    @staticmethod
    def _reason_models(reason_codes: list[str]) -> list[ReasonCodeResponse]:
        messages = {
            "high_uncertainty": "Evidence quality and consistency are currently too weak for safe autonomous action.",
            "low_source_trust": "The source trust signal is below policy threshold and needs corroboration.",
            "high_evidence_conflict": "Conflicting evidence was detected across source assertions.",
            "low_malicious_signal": "Observed maliciousness signal is below the baseline abstain threshold.",
            "low_sightings_corroboration": "Sightings corroboration is weak across distinct observations.",
            "insufficient_actionability": "Maliciousness exists but operational actionability remains limited.",
        }
        return [ReasonCodeResponse(code=code, message=messages.get(code, "Additional review required.")) for code in reason_codes]

    @staticmethod
    def _evidence_gaps(reason_codes: list[str]) -> list[EvidenceGapItemResponse]:
        catalog = {
            "high_uncertainty": EvidenceGapItemResponse(
                gap_id="behavior_replay",
                title="Behavior replay evidence",
                reason_code="high_uncertainty",
                confidence_impact=0.22,
                recommended_collection="run_behavior_replay_and_sandbox_observation",
                priority="high",
            ),
            "low_source_trust": EvidenceGapItemResponse(
                gap_id="source_corroboration",
                title="Independent high-trust corroboration",
                reason_code="low_source_trust",
                confidence_impact=0.20,
                recommended_collection="obtain_independent_high_trust_source_corroboration",
                priority="high",
            ),
            "high_evidence_conflict": EvidenceGapItemResponse(
                gap_id="conflict_resolution",
                title="Conflict resolution telemetry",
                reason_code="high_evidence_conflict",
                confidence_impact=0.18,
                recommended_collection="resolve_conflicting_assertions_with_host_and_network_telemetry",
                priority="high",
            ),
            "low_malicious_signal": EvidenceGapItemResponse(
                gap_id="endpoint_telemetry",
                title="Recent endpoint telemetry",
                reason_code="low_malicious_signal",
                confidence_impact=0.14,
                recommended_collection="collect_recent_endpoint_and_identity_telemetry",
                priority="medium",
            ),
            "low_sightings_corroboration": EvidenceGapItemResponse(
                gap_id="sightings_corroboration",
                title="Additional sightings corroboration",
                reason_code="low_sightings_corroboration",
                confidence_impact=0.16,
                recommended_collection="collect_additional_distinct_source_sightings",
                priority="medium",
            ),
            "insufficient_actionability": EvidenceGapItemResponse(
                gap_id="operational_readiness",
                title="Operational readiness checks",
                reason_code="insufficient_actionability",
                confidence_impact=0.10,
                recommended_collection="collect_environment_and_control_validation_signals",
                priority="low",
            ),
        }
        items = [catalog[code] for code in reason_codes if code in catalog]
        if not items:
            items.append(
                EvidenceGapItemResponse(
                    gap_id="post_action_validation",
                    title="Post-action validation",
                    reason_code="none",
                    confidence_impact=0.05,
                    recommended_collection="collect_post_action_validation_signals",
                    priority="low",
                )
            )
        return items[:4]

    @staticmethod
    def _top_evidence(features: FeatureVector) -> list[EvidenceItemResponse]:
        contributions = {
            "suspicious_ioc": 0.18 * features.suspicious_ioc,
            "rule_severity": 0.17 * features.rule_severity,
            "source_trust_signal": 0.16 * features.source_trust_signal,
            "temporal_signal": 0.12 * features.temporal_signal,
            "scanner_agreement": 0.14 * features.scanner_agreement,
            "sightings_signal": 0.13 * features.sightings_signal,
            "evidence_conflict_penalty": -0.10 * features.evidence_conflict_signal,
            "graph_related_evidence_context": 0.02 * features.graph_signal,
        }
        sorted_items = sorted(contributions.items(), key=lambda item: abs(item[1]), reverse=True)[:5]
        output: list[EvidenceItemResponse] = []
        for feature, contribution in sorted_items:
            direction = "increased" if contribution >= 0 else "decreased"
            output.append(
                EvidenceItemResponse(
                    feature=feature,
                    explanation=f"{feature} {direction} the baseline score by {abs(contribution):.3f}.",
                    contribution=float(round(contribution, 6)),
                )
            )
        return output

    @staticmethod
    def _axis_explanations(
        maliciousness: float,
        actionability: float,
        deployability: float,
        decay: float,
        uncertainty: float,
        blast_radius: float,
        features: FeatureVector,
        decision_state: str,
    ) -> list[AxisExplanationResponse]:
        return [
            AxisExplanationResponse(
                axis="maliciousness",
                summary=f"Calibrated maliciousness is {maliciousness:.3f}.",
                drivers=[
                    f"suspicious_ioc={features.suspicious_ioc:.3f}",
                    f"rule_severity={features.rule_severity:.3f}",
                    f"source_trust_signal={features.source_trust_signal:.3f}",
                ],
            ),
            AxisExplanationResponse(
                axis="actionability",
                summary=f"Actionability is {actionability:.3f} under decision '{decision_state}'.",
                drivers=[
                    f"sightings_signal={features.sightings_signal:.3f}",
                    f"evidence_conflict_signal={features.evidence_conflict_signal:.3f}",
                    f"uncertainty={uncertainty:.3f}",
                ],
            ),
            AxisExplanationResponse(
                axis="deployability",
                summary=f"Deployability is {deployability:.3f}.",
                drivers=[
                    f"scanner_agreement={features.scanner_agreement:.3f}",
                    f"rule_severity={features.rule_severity:.3f}",
                    f"blast_radius={blast_radius:.3f}",
                ],
            ),
            AxisExplanationResponse(
                axis="decay",
                summary=f"Decay score is {decay:.3f}.",
                drivers=[f"temporal_signal={features.temporal_signal:.3f}"],
            ),
            AxisExplanationResponse(
                axis="uncertainty",
                summary=f"Uncertainty score is {uncertainty:.3f}.",
                drivers=[
                    f"source_trust_signal={features.source_trust_signal:.3f}",
                    f"evidence_conflict_signal={features.evidence_conflict_signal:.3f}",
                    f"sightings_signal={features.sightings_signal:.3f}",
                ],
            ),
            AxisExplanationResponse(
                axis="blast_radius",
                summary=f"Blast radius score is {blast_radius:.3f}.",
                drivers=[
                    f"host_criticality={features.host_criticality:.3f}",
                    f"asset_exposure={features.asset_exposure:.3f}",
                    f"graph_signal={features.graph_signal:.3f} (context only)",
                ],
            ),
        ]

    def _feature_snapshot_hash(
        self,
        request: ScoreCaseRequest,
        as_of_utc: datetime,
        features: FeatureVector,
        score: float,
    ) -> str:
        payload = {
            "caseId": request.case_id,
            "iocType": request.ioc_type,
            "iocValue": request.ioc_value,
            "asOfTime": as_of_utc.isoformat(),
            "datasetVersion": self._context.dataset_version,
            "modelVersion": self._context.model_version,
            "scoringProfileVersion": self._context.scoring_profile_version,
            "featureSchemaVersion": self._context.feature_schema_version,
            "features": {key: round(value, 8) for key, value in sorted(features.feature_groups.items())},
            "score": round(score, 8),
        }
        blob = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(blob).hexdigest()


def _sightings_signal(host_context: dict[str, object], rule_context: dict[str, object]) -> float:
    sightings_count = _read_context_float(rule_context, "sightingsCount", "sightings_count", default=0.0)
    if sightings_count <= 0.0:
        sightings_count = _read_context_float(host_context, "sightingsCount", "sightings_count", default=0.0)
    count_signal = _clip01(sightings_count / 12.0)

    corroboration = _read_context_float_optional(
        rule_context,
        "sightingsCorroboration",
        "sightings_corroboration",
        "sightingsDistinctSources",
        "sightings_distinct_sources",
    )
    if corroboration is None:
        corroboration = _read_context_float_optional(
            host_context,
            "sightingsCorroboration",
            "sightings_corroboration",
            "sightingsDistinctSources",
            "sightings_distinct_sources",
        )
    if corroboration is None:
        corroboration = 0.0
    if corroboration > 1.0:
        corroboration = corroboration / 5.0
    corroboration_signal = _clip01(float(corroboration))
    return _clip01(0.65 * count_signal + 0.35 * corroboration_signal)


def _evidence_conflict_signal(host_context: dict[str, object], rule_context: dict[str, object]) -> float:
    conflict = _read_context_float_optional(
        rule_context,
        "evidenceConflict",
        "evidence_conflict",
        "conflictRatio",
        "conflict_ratio",
    )
    if conflict is None:
        conflict = _read_context_float_optional(
            host_context,
            "evidenceConflict",
            "evidence_conflict",
            "conflictRatio",
            "conflict_ratio",
        )

    if conflict is None:
        conflicting = _read_context_float_optional(rule_context, "conflictingSightings", "conflicting_sightings")
        total = _read_context_float_optional(rule_context, "totalSightings", "total_sightings")
        if conflicting is not None and total is not None and total > 0:
            conflict = conflicting / total

    if conflict is None:
        return 0.0
    return _clip01(float(conflict))


def _read_context_float(context: dict[str, object], *keys: str, default: float) -> float:
    for key in keys:
        if key in context:
            value = context[key]
            try:
                return _clip01(float(value))
            except (TypeError, ValueError):
                continue
    return _clip01(default)


def _read_context_float_optional(context: dict[str, object], *keys: str) -> float | None:
    for key in keys:
        if key in context:
            value = context[key]
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return None


def _compute_ioc_suspicion(ioc_type: str, ioc_value: str) -> float:
    value = ioc_value.strip().lower()
    ioc_type = ioc_type.strip().lower()
    suspicion = 0.0

    if any(token in value for token in ("login", "verify", "secure", "update", "reset", "wallet")):
        suspicion += 0.22
    if any(token in value for token in ("hxxp://", "hxxps://", "@", "%00", "xn--")):
        suspicion += 0.20
    if sum(character.isdigit() for character in value) > max(2, len(value) * 0.25):
        suspicion += 0.16
    if value.count(".") >= 3:
        suspicion += 0.10
    if ioc_type == "hash":
        suspicion += 0.18
    elif ioc_type == "url":
        suspicion += 0.12
    elif ioc_type == "ip":
        octets = [part for part in value.split(".") if part.isdigit()]
        if octets and any(int(part) in {0, 255} for part in octets):
            suspicion += 0.06

    entropy = _shannon_entropy(value)
    suspicion += min(0.18, entropy / 30.0)
    return _clip01(suspicion)


def _shannon_entropy(value: str) -> float:
    if not value:
        return 0.0
    counts: dict[str, int] = {}
    for character in value:
        counts[character] = counts.get(character, 0) + 1
    total = float(len(value))
    entropy = 0.0
    for count in counts.values():
        probability = count / total
        entropy -= probability * math.log2(probability)
    return float(entropy)


def _clip01(value: float) -> float:
    return _clip(float(value), 0.0, 1.0)


def _clip(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))
