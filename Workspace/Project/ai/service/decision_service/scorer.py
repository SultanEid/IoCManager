from __future__ import annotations

import hashlib
import ipaddress
import json
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable
from urllib.parse import urlparse

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
    external_source_signal: float
    provider_confidence_signal: float
    indicator_strength_signal: float
    enrichment_strength_signal: float
    activity_signal: float
    benign_context_signal: float
    heuristic_noise_signal: float

    @property
    def feature_groups(self) -> dict[str, float]:
        return {
            "source_trust_signal": self.source_trust_signal,
            "temporal_signal": self.temporal_signal,
            "sightings_signal": self.sightings_signal,
            "graph_signal": self.graph_signal,
            "evidence_conflict_signal": self.evidence_conflict_signal,
            "external_source_signal": self.external_source_signal,
            "provider_confidence_signal": self.provider_confidence_signal,
            "indicator_strength_signal": self.indicator_strength_signal,
            "enrichment_strength_signal": self.enrichment_strength_signal,
            "activity_signal": self.activity_signal,
            "benign_context_signal": self.benign_context_signal,
            "heuristic_noise_signal": self.heuristic_noise_signal,
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
    def calibrator(self) -> LogisticCalibrator:
        return self._calibrator

    @property
    def scoring_profile_version(self) -> str:
        return self._context.scoring_profile_version

    @property
    def feature_schema_version(self) -> str:
        return self._context.feature_schema_version

    def raw_score(self, request: ScoreCaseRequest) -> float:
        features = self._feature_vector(request)
        raw = (
            0.11 * features.suspicious_ioc
            + 0.10 * features.rule_severity
            + 0.09 * features.scanner_agreement
            + 0.12 * features.source_trust_signal
            + 0.06 * features.temporal_signal
            + 0.08 * features.sightings_signal
            + 0.06 * (1.0 - features.evidence_conflict_signal)
            + 0.10 * features.external_source_signal
            + 0.09 * features.provider_confidence_signal
            + 0.08 * features.indicator_strength_signal
            + 0.08 * features.enrichment_strength_signal
            + 0.05 * features.activity_signal
            - 0.07 * features.benign_context_signal
            - 0.07 * features.heuristic_noise_signal
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
            * (
                0.28
                + 0.20 * features.sightings_signal
                + 0.17 * features.source_trust_signal
                + 0.17 * features.external_source_signal
                + 0.18 * features.provider_confidence_signal
            )
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
        source_aware = _source_aware_signals(request)

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
            external_source_signal=source_aware["external_source_signal"],
            provider_confidence_signal=source_aware["provider_confidence_signal"],
            indicator_strength_signal=source_aware["indicator_strength_signal"],
            enrichment_strength_signal=source_aware["enrichment_strength_signal"],
            activity_signal=source_aware["activity_signal"],
            benign_context_signal=source_aware["benign_context_signal"],
            heuristic_noise_signal=source_aware["heuristic_noise_signal"],
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
            - 0.07 * features.external_source_signal
            - 0.06 * features.provider_confidence_signal
            - 0.05 * features.enrichment_strength_signal
            + 0.06 * features.heuristic_noise_signal
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
        external_context = _clip01(
            (
                features.external_source_signal
                + features.provider_confidence_signal
                + features.enrichment_strength_signal
                + features.activity_signal
            )
            / 4.0
        )
        uncertainty_gate = 0.50 if external_context >= 0.65 else 0.42
        low_trust_gate = 0.16 if external_context >= 0.65 else 0.20
        malicious_gate = max(0.25, self._thresholds.abstain - (0.07 if external_context >= 0.65 else 0.0))

        if uncertainty >= uncertainty_gate:
            reason_codes.append("high_uncertainty")
        if features.source_trust_signal <= low_trust_gate:
            reason_codes.append("low_source_trust")
        if features.evidence_conflict_signal >= 0.55:
            reason_codes.append("high_evidence_conflict")
        if features.sightings_signal <= 0.20 and external_context < 0.55:
            reason_codes.append("low_sightings_corroboration")
        if maliciousness < malicious_gate:
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
            "source_trust_signal": 0.12 * features.source_trust_signal,
            "external_source_signal": 0.10 * features.external_source_signal,
            "provider_confidence_signal": 0.09 * features.provider_confidence_signal,
            "rule_severity": 0.10 * features.rule_severity,
            "indicator_strength_signal": 0.08 * features.indicator_strength_signal,
            "enrichment_strength_signal": 0.08 * features.enrichment_strength_signal,
            "sightings_signal": 0.08 * features.sightings_signal,
            "benign_context_penalty": -0.07 * features.benign_context_signal,
            "heuristic_noise_penalty": -0.05 * features.heuristic_noise_signal,
            "evidence_conflict_penalty": -0.06 * features.evidence_conflict_signal,
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
                    f"source_trust_signal={features.source_trust_signal:.3f}",
                    f"external_source_signal={features.external_source_signal:.3f}",
                    f"provider_confidence_signal={features.provider_confidence_signal:.3f}",
                ],
            ),
            AxisExplanationResponse(
                axis="actionability",
                summary=f"Actionability is {actionability:.3f} under decision '{decision_state}'.",
                drivers=[
                    f"sightings_signal={features.sightings_signal:.3f}",
                    f"activity_signal={features.activity_signal:.3f}",
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
                    f"provider_confidence_signal={features.provider_confidence_signal:.3f}",
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
    sightings_count = _read_context_float_optional(rule_context, "sightingsCount", "sightings_count") or 0.0
    if sightings_count <= 0.0:
        sightings_count = _read_context_float_optional(host_context, "sightingsCount", "sightings_count") or 0.0
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


def _source_aware_signals(request: ScoreCaseRequest) -> dict[str, float]:
    detection_package = request.detection_package if isinstance(request.detection_package, dict) else {}
    raw_hit_payload = _coerce_dict(detection_package.get("raw_hit_payload"))
    rule_metadata = _coerce_dict(detection_package.get("rule_metadata"))
    object_metadata = _coerce_dict(detection_package.get("object_metadata"))
    linked_enrichment = _coerce_dict(detection_package.get("linked_enrichment"))
    enrichments = _coerce_list(linked_enrichment.get("enrichments"))
    source_system = request.source_system.strip().lower()
    source_name = _read_context_text_optional(request.rule_context, "sourceName", "source_name") or source_system
    source_type = _read_context_text_optional(request.rule_context, "sourceType", "source_type") or "unknown"
    value_profile = _ioc_value_feature_profile(request.ioc_type, request.ioc_value)
    legacy_severity = _clip01(
        _read_context_float_optional(
            request.rule_context,
            "severityScore",
            "severity_score",
        )
        or 0.5
    )
    table_confidence = _read_context_float_optional(
        request.rule_context,
        "tableConfidence",
        "table_confidence",
    )

    provider_confidence = _read_context_float_optional(
        request.rule_context,
        "providerConfidence",
        "provider_confidence",
    )
    if provider_confidence is None:
        provider_confidence = _provider_confidence_from_package(source_system, raw_hit_payload, enrichments)
    provider_confidence_signal = _clip01(provider_confidence or 0.0)
    if table_confidence is not None and _is_ioc_table_context(source_system, object_metadata, raw_hit_payload, rule_metadata):
        provider_confidence_signal = max(provider_confidence_signal, _clip01(table_confidence))

    indicator_strength = _read_context_float_optional(
        request.rule_context,
        "indicatorStrength",
        "indicator_strength",
    )
    if indicator_strength is None:
        indicator_strength = _indicator_strength_from_package(
            source_system=source_system,
            ioc_type=request.ioc_type,
            raw_hit_payload=raw_hit_payload,
            object_metadata=object_metadata,
        )
    indicator_strength_signal = _clip01((indicator_strength or 0.0) + value_profile["indicator_strength_bonus"])

    enrichment_strength = _read_context_float_optional(
        request.rule_context,
        "enrichmentStrength",
        "enrichment_strength",
    )
    if enrichment_strength is None:
        enrichment_strength = _enrichment_strength_from_package(source_system, raw_hit_payload, rule_metadata, enrichments)
    enrichment_strength_signal = _clip01(enrichment_strength or 0.0)

    activity_signal = _read_context_float_optional(
        request.rule_context,
        "activitySignal",
        "activity_signal",
    )
    if activity_signal is None:
        activity_signal = _activity_signal_from_package(source_system, raw_hit_payload)
    activity_signal = _clip01(activity_signal or 0.0)

    benign_context = _read_context_float_optional(
        request.rule_context,
        "benignContext",
        "benign_context",
    )
    heuristic_noise = _read_context_float_optional(
        request.rule_context,
        "heuristicNoise",
        "heuristic_noise",
    )
    if benign_context is None or heuristic_noise is None:
        semantic_context = _semantic_context_signals(source_system, raw_hit_payload, rule_metadata, enrichments)
        if benign_context is None:
            benign_context = semantic_context["benign"]
        if heuristic_noise is None:
            heuristic_noise = semantic_context["heuristic"]
        threat_signal = semantic_context["threat"]
    else:
        threat_signal = _clip01(
            _read_context_float_optional(
                request.rule_context,
                "sourceThreatSignal",
                "source_threat_signal",
            )
            or 0.0
        )

    benign_context = _clip01(float(benign_context or 0.0) + value_profile["benign_context_bonus"])
    heuristic_noise = _clip01(float(heuristic_noise or 0.0) + value_profile["heuristic_noise_bonus"])
    threat_signal = _clip01(float(threat_signal or 0.0) + value_profile["threat_bonus"])

    source_category = _source_category_signal(source_type=source_type, source_name=source_name, source_system=source_system)
    provider_confidence_signal = _clip01(provider_confidence_signal + source_category["provider_bonus"])
    indicator_strength_signal = _clip01(indicator_strength_signal + source_category["indicator_bonus"])
    threat_signal = _clip01(threat_signal + source_category["threat_bonus"])
    benign_context = _clip01(benign_context + source_category["benign_bonus"])
    heuristic_noise = _clip01(heuristic_noise + source_category["heuristic_bonus"])

    linked_scan_count = _read_context_float_optional(
        request.rule_context,
        "linkedScanResultCount",
        "linked_scan_result_count",
        "linkedScanCount",
        "linked_scan_count",
    )
    if linked_scan_count is None:
        linked_scan_count = _read_context_float_optional(request.host_context, "linkedScanResultCount", "linkedScanCount")
    sightings_count = _read_context_float_optional(request.rule_context, "sightingsCount", "sightings_count") or 0.0
    target_exposure = _read_context_float_optional(request.rule_context, "targetExposure", "target_exposure")
    if target_exposure is None:
        target_exposure = _read_context_float_optional(request.host_context, "targetExposure", "target_exposure", "assetExposure", "asset_exposure")
    correlation = _clip01(
        min(0.18, max(0.0, float(linked_scan_count or 0.0)) * 0.045)
        + min(0.12, max(0.0, float(sightings_count or 0.0)) * 0.015)
        + 0.06 * _clip01(float(target_exposure or 0.0))
    )
    if correlation:
        enrichment_strength_signal = _clip01(enrichment_strength_signal + correlation)
        activity_signal = _clip01(activity_signal + (0.70 * correlation))
        threat_signal = _clip01(threat_signal + (0.65 * correlation))

    historical_outcome = _read_context_text_optional(
        request.rule_context,
        "analystOutcome",
        "analyst_outcome",
        "responseOutcome",
        "response_outcome",
        "historicalDecision",
        "historical_decision",
    )
    analyst_override = _read_context_text_optional(request.rule_context, "analystOverride", "analyst_override")
    if historical_outcome in {"true_positive", "malicious", "likely_malicious", "containment_success"}:
        provider_confidence_signal = max(provider_confidence_signal, 0.88)
        indicator_strength_signal = max(indicator_strength_signal, 0.84)
        enrichment_strength_signal = max(enrichment_strength_signal, 0.80)
        activity_signal = max(activity_signal, 0.72)
        threat_signal = max(threat_signal, 0.86)
        heuristic_noise = min(heuristic_noise, 0.12)
    elif historical_outcome in {"false_positive", "benign", "likely_benign", "allowlist", "stale", "revoked"} or analyst_override in {"false_positive", "benign", "allowlist"}:
        provider_confidence_signal = min(provider_confidence_signal, 0.44)
        indicator_strength_signal = min(indicator_strength_signal, 0.50)
        enrichment_strength_signal = min(enrichment_strength_signal, 0.44)
        activity_signal = min(activity_signal, 0.40)
        threat_signal = min(threat_signal, 0.18)
        benign_context = max(benign_context, 0.82)
        heuristic_noise = max(heuristic_noise, 0.18)

    if source_name in {"internal-clean-baselines", "internal-allowlists"}:
        provider_confidence_signal = min(provider_confidence_signal, 0.28) if provider_confidence_signal else 0.28
        indicator_strength_signal = min(indicator_strength_signal, 0.42) if indicator_strength_signal else 0.42
        enrichment_strength_signal = max(enrichment_strength_signal, 0.48)
        activity_signal = max(activity_signal, 0.38)
        benign_context = max(float(benign_context or 0.0), 0.90 if source_name == "internal-allowlists" else 0.84)
        heuristic_noise = max(min(float(heuristic_noise or 0.0), 0.08), 0.12)
        threat_signal = min(threat_signal, 0.05)
    elif source_name == "internal-reviewed-telemetry":
        provider_confidence_signal = max(provider_confidence_signal, 0.58)
        indicator_strength_signal = max(indicator_strength_signal, 0.56)
        enrichment_strength_signal = max(enrichment_strength_signal, 0.52)
        activity_signal = max(activity_signal, 0.44)
        if float(benign_context or 0.0) >= 0.68:
            heuristic_noise = max(float(heuristic_noise or 0.0), 0.12)
        else:
            threat_signal = max(threat_signal, 0.56)
    elif source_name == "legacy-ioc-explorer":
        provider_confidence_signal = max(provider_confidence_signal, 0.40 + (0.18 * legacy_severity))
        indicator_strength_signal = max(indicator_strength_signal, 0.42 + (0.22 * legacy_severity))
        enrichment_strength_signal = max(enrichment_strength_signal, 0.12 + (0.18 * legacy_severity))
        activity_signal = max(activity_signal, 0.26 + (0.20 * legacy_severity))
        threat_signal = max(threat_signal, 0.18 + (0.42 * legacy_severity))
        heuristic_noise = min(float(heuristic_noise or 0.0), 0.18)
    elif _is_ioc_table_context(source_system, object_metadata, raw_hit_payload, rule_metadata):
        table_confidence_signal = _clip01(table_confidence if table_confidence is not None else provider_confidence_signal)
        provider_confidence_signal = max(provider_confidence_signal, table_confidence_signal)
        indicator_strength_signal = max(indicator_strength_signal, 0.42 + (0.24 * legacy_severity))
        enrichment_strength_signal = max(enrichment_strength_signal, 0.18 + (0.22 * table_confidence_signal) + min(0.20, correlation))
        activity_signal = max(activity_signal, 0.14 + (0.16 * table_confidence_signal) + (0.45 * correlation))
        threat_signal = max(threat_signal, 0.24 + (0.46 * legacy_severity) + (0.12 * table_confidence_signal) + (0.35 * correlation))
        heuristic_noise = min(float(heuristic_noise or 0.0), 0.18)
    elif source_name == "sigmahq":
        provider_confidence_signal = max(provider_confidence_signal, 0.86)
        indicator_strength_signal = max(indicator_strength_signal, 0.66)
        enrichment_strength_signal = max(enrichment_strength_signal, 0.74)
        activity_signal = max(activity_signal, 0.48)
        threat_signal = max(threat_signal, 0.72)
        heuristic_noise = min(float(heuristic_noise or 0.0), 0.12)
    elif source_name in {"snort-community", "et-open-suricata"}:
        provider_confidence_signal = max(provider_confidence_signal, 0.88)
        indicator_strength_signal = max(indicator_strength_signal, 0.78)
        enrichment_strength_signal = max(enrichment_strength_signal, 0.70)
        activity_signal = max(activity_signal, 0.62)
        threat_signal = max(threat_signal, 0.78)
        heuristic_noise = min(float(heuristic_noise or 0.0), 0.10)

    external_source_signal = _read_context_float_optional(
        request.rule_context,
        "externalSourceSignal",
        "external_source_signal",
    )
    if external_source_signal is None:
        base_source = {
            "threatfox": 0.72,
            "urlhaus": 0.70,
            "malwarebazaar": 0.66,
            "yaraify": 0.62,
        }.get(source_system, 0.0)
        external_source_signal = _clip01(
            0.30 * base_source
            + 0.25 * provider_confidence_signal
            + 0.20 * enrichment_strength_signal
            + 0.15 * indicator_strength_signal
            + 0.10 * activity_signal
            + 0.12 * threat_signal
            - 0.10 * float(benign_context or 0.0)
        )
    if source_name == "sigmahq":
        external_source_signal = max(float(external_source_signal or 0.0), 0.76)
    elif source_name in {"snort-community", "et-open-suricata"}:
        external_source_signal = max(float(external_source_signal or 0.0), 0.82)
    elif source_name == "legacy-ioc-explorer":
        external_source_signal = max(float(external_source_signal or 0.0), 0.24 + (0.24 * legacy_severity))
    elif _is_ioc_table_context(source_system, object_metadata, raw_hit_payload, rule_metadata):
        table_confidence_signal = _clip01(table_confidence if table_confidence is not None else provider_confidence_signal)
        external_source_signal = max(
            float(external_source_signal or 0.0),
            _clip01(0.18 + (0.28 * legacy_severity) + (0.22 * table_confidence_signal)),
        )
    elif source_name == "internal-reviewed-telemetry":
        if float(benign_context or 0.0) >= 0.68:
            external_source_signal = min(max(float(external_source_signal or 0.0), 0.30), 0.42)
        elif threat_signal >= 0.56:
            external_source_signal = max(float(external_source_signal or 0.0), 0.58)
        else:
            external_source_signal = max(float(external_source_signal or 0.0), 0.46)
    elif source_name in {"internal-clean-baselines", "internal-allowlists"}:
        external_source_signal = min(max(float(external_source_signal or 0.0), 0.14), 0.22)

    return {
        "external_source_signal": _clip01(external_source_signal or 0.0),
        "provider_confidence_signal": provider_confidence_signal,
        "indicator_strength_signal": indicator_strength_signal,
        "enrichment_strength_signal": enrichment_strength_signal,
        "activity_signal": activity_signal,
        "benign_context_signal": _clip01(float(benign_context or 0.0)),
        "heuristic_noise_signal": _clip01(float(heuristic_noise or 0.0)),
    }


def _is_ioc_table_context(
    source_system: str,
    object_metadata: dict[str, object],
    raw_hit_payload: dict[str, object],
    rule_metadata: dict[str, object],
) -> bool:
    object_type = str(object_metadata.get("object_type", "")).strip().lower()
    rule_id = str(rule_metadata.get("rule_id", "")).strip().lower()
    has_indicator = raw_hit_payload.get("indicator") is not None
    return (
        source_system == "ioc_manager_ioc_table"
        or object_type == "ioc"
        or (has_indicator and rule_id.startswith("ioc-table-"))
    )


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


def _read_context_text_optional(context: dict[str, object], *keys: str) -> str | None:
    for key in keys:
        if key in context:
            value = context[key]
            if isinstance(value, str):
                text = value.strip().lower()
                if text:
                    return text
    return None


def _provider_confidence_from_package(
    source_system: str,
    raw_hit_payload: dict[str, object],
    enrichments: list[object],
) -> float:
    confidence_level = _float_from_any(raw_hit_payload.get("confidence_level"))
    if confidence_level is not None:
        return _clip01(confidence_level / 100.0 if confidence_level > 1.0 else confidence_level)

    if source_system == "urlhaus":
        status = str(raw_hit_payload.get("url_status", "")).strip().lower()
        if status in {"online", "active"}:
            return 0.88
        if status in {"offline", "disabled"}:
            return 0.35

    if source_system == "yaraify":
        metadata = _yaraify_metadata(enrichments)
        hint = str(_coerce_dict(metadata.get("meta")).get("confidence_hint", "")).strip().lower()
        if hint == "bulk":
            return 0.70
        if hint == "seed":
            return 0.55
        if str(raw_hit_payload.get("status", "")).strip().lower() == "match":
            return 0.60

    intelligence = _coerce_dict(raw_hit_payload.get("intelligence"))
    downloads = _float_from_any(intelligence.get("downloads")) or 0.0
    uploads = _float_from_any(intelligence.get("uploads")) or 0.0
    if downloads or uploads:
        return _clip01(0.35 + min(0.45, (downloads + uploads) / 20.0))

    if enrichments:
        return 0.60
    return 0.45


def _indicator_strength_from_package(
    *,
    source_system: str,
    ioc_type: str,
    raw_hit_payload: dict[str, object],
    object_metadata: dict[str, object],
) -> float:
    normalized_ioc = ioc_type.strip().lower()
    base = {
        "hash_sha256": 0.88,
        "hash_sha1": 0.82,
        "hash_md5": 0.78,
        "url": 0.74,
        "domain": 0.66,
        "ip": 0.62,
        "artifact": 0.55,
        "file": 0.80,
    }.get(normalized_ioc, 0.55)

    if normalized_ioc == "url" and source_system == "urlhaus":
        payloads = _coerce_list(raw_hit_payload.get("payloads"))
        base += 0.08 if payloads else 0.0
    if normalized_ioc.startswith("hash") or str(object_metadata.get("object_type", "")).strip().lower() == "file":
        base += 0.05
    return _clip01(base)


def _enrichment_strength_from_package(
    source_system: str,
    raw_hit_payload: dict[str, object],
    rule_metadata: dict[str, object],
    enrichments: list[object],
) -> float:
    tags = _normalized_texts(
        rule_metadata.get("tags"),
        raw_hit_payload.get("tags"),
        *[_coerce_dict(_coerce_dict(item).get("value")).get("tags") for item in enrichments],
    )
    tag_signal = min(0.35, len(tags) / 8.0)
    yara_rules = _coerce_list(raw_hit_payload.get("yara_rules"))
    payloads = _coerce_list(raw_hit_payload.get("payloads"))
    intelligence = _coerce_dict(raw_hit_payload.get("intelligence"))
    downloads = _float_from_any(intelligence.get("downloads")) or 0.0
    uploads = _float_from_any(intelligence.get("uploads")) or 0.0
    signature_present = 1.0 if _has_non_empty(raw_hit_payload.get("signature")) else 0.0
    malware_present = 1.0 if _has_non_empty(raw_hit_payload.get("malware")) else 0.0

    base = min(0.25, len(enrichments) * 0.12)
    base += tag_signal
    base += min(0.12, len(yara_rules) * 0.06)
    base += min(0.12, len(payloads) * 0.06)
    base += min(0.16, (downloads + uploads) / 30.0)
    base += 0.08 * signature_present
    base += 0.08 * malware_present
    if source_system == "threatfox" and _has_non_empty(raw_hit_payload.get("threat_type")):
        base += 0.08
    return _clip01(base)


def _activity_signal_from_package(source_system: str, raw_hit_payload: dict[str, object]) -> float:
    if source_system == "urlhaus":
        status = str(raw_hit_payload.get("url_status", "")).strip().lower()
        if status in {"online", "active"}:
            return 0.90
        if status in {"offline", "disabled"}:
            return 0.20
    status = str(raw_hit_payload.get("status", "")).strip().lower()
    if status == "match":
        return 0.72
    if _has_non_empty(raw_hit_payload.get("last_seen")) or _has_non_empty(raw_hit_payload.get("last_online")):
        return 0.68
    return 0.40 if _has_non_empty(raw_hit_payload.get("first_seen")) else 0.0


def _semantic_context_signals(
    source_system: str,
    raw_hit_payload: dict[str, object],
    rule_metadata: dict[str, object],
    enrichments: list[object],
) -> dict[str, float]:
    metadata = _yaraify_metadata(enrichments)
    texts = _normalized_texts(
        rule_metadata.get("title"),
        rule_metadata.get("rule_name"),
        rule_metadata.get("description"),
        rule_metadata.get("msg"),
        raw_hit_payload.get("signature"),
        raw_hit_payload.get("malware"),
        raw_hit_payload.get("threat"),
        raw_hit_payload.get("threat_type"),
        raw_hit_payload.get("threat_type_desc"),
        _coerce_dict(metadata.get("meta")).get("confidence_hint"),
        rule_metadata.get("tags"),
        raw_hit_payload.get("tags"),
        _coerce_dict(metadata).get("tags"),
    )
    joined = " ".join(texts)
    threat = _token_signal(
        joined,
        {
            "malicious",
            "stealer",
            "credential",
            "botnet",
            "c2",
            "loader",
            "dropper",
            "payload",
            "beacon",
            "phish",
            "trojan",
            "powershell",
            "suspicious",
            "thief",
        },
    )
    benign = _token_signal(
        joined,
        {
            "trusted",
            "utility",
            "maintenance",
            "cleanup",
            "clean",
            "benign",
            "allowlist",
            "whitelist",
        },
    )
    heuristic = _token_signal(
        joined,
        {
            "generic",
            "heuristic",
            "installer",
            "packer",
            "overbroad",
        },
    )
    if source_system == "urlhaus" and str(raw_hit_payload.get("threat", "")).strip().lower() == "malware_download":
        threat = _clip01(threat + 0.18)
    return {"threat": threat, "benign": benign, "heuristic": heuristic}


def _source_category_signal(*, source_type: str, source_name: str, source_system: str) -> dict[str, float]:
    normalized_type = str(source_type or "").strip().lower().replace("-", "_")
    normalized_name = str(source_name or source_system or "").strip().lower()
    if normalized_type in {"trusted_feed", "scanner", "analyst_review"}:
        return {
            "provider_bonus": 0.08,
            "indicator_bonus": 0.05,
            "threat_bonus": 0.06,
            "benign_bonus": 0.0,
            "heuristic_bonus": 0.0,
        }
    if normalized_type in {"low_trust_feed", "file_upload"}:
        return {
            "provider_bonus": -0.08,
            "indicator_bonus": -0.03,
            "threat_bonus": -0.04,
            "benign_bonus": 0.02,
            "heuristic_bonus": 0.05,
        }
    if normalized_type in {"manual_entry", "api_import"} or normalized_name in {"ioc_table", "manual_triage"}:
        return {
            "provider_bonus": 0.02,
            "indicator_bonus": 0.02,
            "threat_bonus": 0.01,
            "benign_bonus": 0.0,
            "heuristic_bonus": 0.02,
        }
    return {
        "provider_bonus": 0.0,
        "indicator_bonus": 0.0,
        "threat_bonus": 0.0,
        "benign_bonus": 0.0,
        "heuristic_bonus": 0.02,
    }


def _ioc_value_feature_profile(ioc_type: str, ioc_value: str) -> dict[str, float]:
    normalized_type = ioc_type.strip().lower().replace("-", "_")
    value = ioc_value.strip().lower()
    profile = {
        "suspicion_bonus": 0.0,
        "indicator_strength_bonus": 0.0,
        "benign_context_bonus": 0.0,
        "heuristic_noise_bonus": 0.0,
        "threat_bonus": 0.0,
    }

    if not value:
        profile["heuristic_noise_bonus"] += 0.20
        profile["benign_context_bonus"] += 0.08
        return profile

    if _is_documentation_or_private_ip(value):
        profile["benign_context_bonus"] += 0.48
        profile["heuristic_noise_bonus"] += 0.16
        profile["indicator_strength_bonus"] -= 0.18
        return profile

    if normalized_type in {"url", "uri"} or "://" in value:
        parsed = urlparse(value.replace("hxxp://", "http://").replace("hxxps://", "https://"))
        path = parsed.path or value
        host = parsed.hostname or ""
        if parsed.username or "@" in value:
            profile["suspicion_bonus"] += 0.10
        if any(token in path for token in ("/wp-admin", "/gate", "/panel", "/payload", "/dropper", ".exe", ".scr", ".ps1")):
            profile["suspicion_bonus"] += 0.20
            profile["indicator_strength_bonus"] += 0.08
            profile["threat_bonus"] += 0.08
        if len(path) > 80 or value.count("/") >= 5:
            profile["suspicion_bonus"] += 0.08
        if _has_risky_tld(host):
            profile["suspicion_bonus"] += 0.08
            profile["threat_bonus"] += 0.04

    if normalized_type == "domain":
        if _has_risky_tld(value):
            profile["suspicion_bonus"] += 0.08
        if value.count("-") >= 2 or re.search(r"\d{4,}", value):
            profile["suspicion_bonus"] += 0.08
        if value.endswith((".internal", ".local", ".test", ".example")):
            profile["benign_context_bonus"] += 0.10
            profile["heuristic_noise_bonus"] += 0.08

    if normalized_type in {"process", "artifact", "file"} or "\\" in value or "/" in value:
        if any(token in value for token in ("powershell", "pwsh", "cmd.exe", "wscript", "cscript", "mshta", "rundll32", "regsvr32")):
            profile["suspicion_bonus"] += 0.18
            profile["indicator_strength_bonus"] += 0.08
        if any(token in value for token in (" -enc", " -encodedcommand", " bypass", " hidden", "downloadstring", "frombase64string")):
            profile["suspicion_bonus"] += 0.22
            profile["threat_bonus"] += 0.10
        if any(token in value for token in ("\\currentversion\\run", "\\startup\\", "\\programdata\\", "\\appdata\\roaming\\", "/tmp/", "/var/tmp/")):
            profile["suspicion_bonus"] += 0.24
            profile["indicator_strength_bonus"] += 0.06
        if any(token in value for token in ("windows\\system32", "microsoft\\edge", "google\\chrome", "program files")):
            profile["benign_context_bonus"] += 0.08

    if normalized_type in {"hash", "hash_md5", "hash_sha1", "hash_sha256"}:
        hash_len = len(value)
        if re.fullmatch(r"[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64}", value):
            profile["indicator_strength_bonus"] += 0.10
            profile["suspicion_bonus"] += 0.03
        elif hash_len >= 16:
            profile["heuristic_noise_bonus"] += 0.14

    return {key: _clip01(val) if val >= 0 else val for key, val in profile.items()}


def _compute_ioc_suspicion(ioc_type: str, ioc_value: str) -> float:
    value = ioc_value.strip().lower()
    ioc_type = ioc_type.strip().lower()
    suspicion = 0.0
    value_profile = _ioc_value_feature_profile(ioc_type, ioc_value)

    if any(token in value for token in ("login", "verify", "secure", "update", "reset", "wallet")):
        suspicion += 0.22
    if any(token in value for token in ("hxxp://", "hxxps://", "@", "%00", "xn--")):
        suspicion += 0.20
    if sum(character.isdigit() for character in value) > max(2, len(value) * 0.25):
        suspicion += 0.16
    if value.count(".") >= 3:
        suspicion += 0.10
    if ioc_type in {"hash", "hash_md5", "hash_sha1", "hash_sha256"}:
        suspicion += 0.18
        if not re.fullmatch(r"[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64}", value):
            suspicion -= 0.10
    elif ioc_type == "url":
        suspicion += 0.12
    elif ioc_type == "ip":
        octets = [part for part in value.split(".") if part.isdigit()]
        if octets and any(int(part) in {0, 255} for part in octets) and not _is_documentation_or_private_ip(value):
            suspicion += 0.06

    entropy = _shannon_entropy(value)
    suspicion += min(0.18, entropy / 30.0)
    suspicion += value_profile["suspicion_bonus"]
    suspicion -= value_profile["benign_context_bonus"] * 0.35
    suspicion -= value_profile["heuristic_noise_bonus"] * 0.20
    return _clip01(suspicion)


def _is_documentation_or_private_ip(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value.strip())
    except ValueError:
        return False
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or value.startswith(("192.0.2.", "198.51.100.", "203.0.113."))
    )


def _has_risky_tld(value: str) -> bool:
    host = value.strip().lower().rstrip(".")
    return host.endswith((".zip", ".mov", ".top", ".xyz", ".click", ".country", ".gq", ".tk", ".ru"))


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


def _coerce_dict(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _coerce_list(value: object) -> list[object]:
    return value if isinstance(value, list) else []


def _float_from_any(value: object) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _has_non_empty(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _normalized_texts(*values: object) -> list[str]:
    output: list[str] = []
    for value in values:
        if isinstance(value, str):
            text = value.strip().lower()
            if text:
                output.append(text)
        elif isinstance(value, list):
            output.extend(_normalized_texts(*value))
        elif isinstance(value, dict):
            output.extend(_normalized_texts(*value.values()))
    return output


def _token_signal(text: str, tokens: set[str]) -> float:
    matches = sum(1 for token in tokens if token in text)
    return _clip01(matches / 3.0)


def _yaraify_metadata(enrichments: list[object]) -> dict[str, object]:
    for item in enrichments:
        value = _coerce_dict(_coerce_dict(item).get("value"))
        metadata = _coerce_dict(value.get("metadata"))
        if metadata:
            return metadata
    return {}
