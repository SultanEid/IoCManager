from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from .action_plan_recommender import build_action_plan, derive_recommendation_severity_cap
from .contracts import (
    CaseScoreVectorResponse,
    DecisionProvenanceItemResponse,
    DecisionVerdict,
    EvidenceFusionDeduplicationResponse,
    EvidenceFusionEvidenceItemResponse,
    EvidenceFusionExplanationResponse,
    EvidenceFusionMissingItemResponse,
    GroundedDecisionResponse,
    HistoricalLearningContextResponse,
    SafetyDiagnosticsResponse,
    ScoreCaseRequest,
)
from .evidence_fusion import (
    EvidenceFusionResult,
    fuse_evidence,
)
from .promotion_suppression_engine import build_promotion_suppression_decision
from .scorer import BaselineScorer
from .snort_decision import SnortDecisionResult, adjudicate_snort
from .sigma_decision import SigmaDecisionResult, adjudicate_sigma
from .yara_decision import YaraDecisionResult, adjudicate_yara

MALICIOUS_MIN = 0.85
LIKELY_MALICIOUS_MIN = 0.62
SUSPICIOUS_MIN = 0.45
LIKELY_BENIGN_MAX = 0.20
BENIGN_MAX = 0.10

MALICIOUS_UNCERTAINTY_MAX = 0.18
LIKELY_UNCERTAINTY_MAX = 0.35
SUSPICIOUS_UNCERTAINTY_MAX = 0.50
BENIGN_UNCERTAINTY_MAX = 0.22
STRICT_BENIGN_UNCERTAINTY_MAX = 0.18

MALICIOUS_CONFLICT_MAX = 0.20
LIKELY_CONFLICT_MAX = 0.45
SUSPICIOUS_CONFLICT_MAX = 0.55
BENIGN_CONFLICT_MAX = 0.20
STRICT_BENIGN_CONFLICT_MAX = 0.12

MALICIOUS_SCANNER_MIN = 0.70
MALICIOUS_SIGHTINGS_MIN = 0.45
MALICIOUS_TRUST_MIN = 0.55
BENIGN_TRUST_MIN = 0.55
BENIGN_SIGHTINGS_MIN = 0.30
STRICT_BENIGN_TRUST_MIN = 0.70

INSUFFICIENT_UNCERTAINTY_MIN = 0.42
INSUFFICIENT_CONFLICT_MIN = 0.55
INSUFFICIENT_TRUST_MAX = 0.20
INSUFFICIENT_SIGHTINGS_MAX = 0.15
SAFETY_PARTIAL_EVIDENCE_MISSING_COUNT = 2

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class _SafetyInputs:
    family: str
    lexical_only_gate_triggered: bool
    non_lexical_corroborated: bool
    contradiction_score: float
    missing_score: float
    confidence: float
    false_positive_risk: float
    missing_critical_fields: tuple[str, ...]
    enrichment_status: str
    degradation_reasons: tuple[str, ...]
    partial_evidence: bool


@dataclass(frozen=True, slots=True)
class _SafetyOutcome:
    verdict: DecisionVerdict
    action: str
    confidence: float
    false_positive_risk: float
    abstain_reason: str | None
    review_priority: str
    safety_diagnostics: SafetyDiagnosticsResponse


def recommend_action(scorer: BaselineScorer, request: ScoreCaseRequest) -> GroundedDecisionResponse:
    score = scorer.score_case(request)
    return build_grounded_decision(
        score,
        request,
        historical_learning=_historical_learning_from_detection_package(request.detection_package),
    )


def request_more_evidence(scorer: BaselineScorer, request: ScoreCaseRequest) -> GroundedDecisionResponse:
    score = scorer.score_case(request)
    return build_grounded_decision(
        score,
        request,
        historical_learning=_historical_learning_from_detection_package(request.detection_package),
    )


def build_grounded_decision(
    score: CaseScoreVectorResponse,
    request: ScoreCaseRequest,
    *,
    historical_learning: HistoricalLearningContextResponse | None = None,
) -> GroundedDecisionResponse:
    effective_historical_learning = historical_learning or _historical_learning_from_detection_package(request.detection_package)
    rule = request.rule_context
    fusion, fusion_failure_reason = _build_evidence_fusion(request)
    if _is_snort_package(request):
        return _build_snort_grounded_decision(
            score=score,
            request=request,
            evidence_fusion=fusion,
            fusion_failure_reason=fusion_failure_reason,
            historical_learning=effective_historical_learning,
        )
    if _is_sigma_package(request):
        return _build_sigma_grounded_decision(
            score=score,
            request=request,
            evidence_fusion=fusion,
            fusion_failure_reason=fusion_failure_reason,
            historical_learning=effective_historical_learning,
        )
    if _is_yara_package(request):
        return _build_yara_grounded_decision(
            score=score,
            request=request,
            evidence_fusion=fusion,
            fusion_failure_reason=fusion_failure_reason,
            historical_learning=effective_historical_learning,
        )

    scanner_agreement = _context_float(rule, "scannerAgreement", "scanner_agreement", default=0.0)
    source_trust = _context_float(
        rule,
        "sourceTrust",
        "source_trust",
        default=float(score.feature_groups.get("source_trust_signal", 0.5)),
    )
    conflict = _context_float(
        rule,
        "evidenceConflict",
        "evidence_conflict",
        "conflictRatio",
        "conflict_ratio",
        default=float(score.feature_groups.get("evidence_conflict_signal", 0.0)),
    )
    sightings = _context_float(
        rule,
        "sightingsCorroboration",
        "sightings_corroboration",
        "sightingsDistinctSources",
        "sightings_distinct_sources",
        default=float(score.feature_groups.get("sightings_signal", 0.0)),
    )
    if sightings > 1.0:
        sightings = _clip01(sightings / 5.0)
    if fusion is not None:
        sightings = _clip01(max(sightings, _fusion_sightings_signal(fusion)))

    uncertainty = score.uncertainty_score
    maliciousness = score.maliciousness_score
    if fusion is not None:
        conflict = _clip01(max(conflict, _fusion_conflict_ratio(fusion)))
    non_string_corroborated = _has_non_string_corroboration(
        request,
        scanner_agreement,
        sightings,
        source_trust,
        evidence_fusion=fusion,
    )
    false_positive_signal = _false_positive_signal_present(request)
    stale_or_revoked_signal = _stale_or_revoked_signal_present(request)

    verdict = _select_verdict(
        maliciousness=maliciousness,
        uncertainty=uncertainty,
        conflict=conflict,
        source_trust=source_trust,
        scanner_agreement=scanner_agreement,
        sightings=sightings,
        non_string_corroborated=non_string_corroborated,
        false_positive_signal=false_positive_signal,
        stale_or_revoked_signal=stale_or_revoked_signal,
    )
    action = _select_action(
        verdict=verdict,
        uncertainty=uncertainty,
        blast_radius=score.blast_radius_score,
        deployability=score.deployability_score,
        request=request,
    )
    abstain_reason = _abstain_reason(
        verdict=verdict,
        uncertainty=uncertainty,
        conflict=conflict,
        source_trust=source_trust,
        sightings=sightings,
        non_string_corroborated=non_string_corroborated,
    )
    confidence = _confidence(
        verdict=verdict,
        maliciousness=maliciousness,
        uncertainty=uncertainty,
        conflict=conflict,
        source_trust=source_trust,
        scanner_agreement=scanner_agreement,
        sightings=sightings,
        non_string_corroborated=non_string_corroborated,
    )
    false_positive_risk = _false_positive_risk(
        verdict=verdict,
        confidence=confidence,
        uncertainty=uncertainty,
        conflict=conflict,
        maliciousness=maliciousness,
        source_trust=source_trust,
    )
    review_priority = _review_priority(
        verdict=verdict,
        confidence=confidence,
        blast_radius=score.blast_radius_score,
    )
    provenance = _provenance(
        score=score,
        request=request,
        evidence_fusion=fusion,
        historical_learning=effective_historical_learning,
    )
    reasons = _reasons(
        verdict=verdict,
        action=action,
        maliciousness=maliciousness,
        uncertainty=uncertainty,
        conflict=conflict,
        source_trust=source_trust,
        scanner_agreement=scanner_agreement,
        sightings=sightings,
        non_string_corroborated=non_string_corroborated,
        false_positive_signal=false_positive_signal,
        stale_or_revoked_signal=stale_or_revoked_signal,
        evidence_fusion=fusion,
    )
    return _finalize_grounded_decision(
        score=score,
        request=request,
        verdict=verdict,
        action=action,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        abstain_reason=abstain_reason,
        review_priority=review_priority,
        reasons=reasons,
        next_best_evidence=_next_best_evidence(score=score, verdict=verdict),
        provenance=provenance,
        evidence_fusion=fusion,
        historical_learning=effective_historical_learning,
        family="unknown",
        lexical_only_gate_triggered=False,
        non_lexical_corroborated=non_string_corroborated,
        contradiction_score=conflict,
        missing_score=_fusion_missing_ratio(fusion),
        fusion_failure_reason=fusion_failure_reason,
    )


def _build_sigma_grounded_decision(
    *,
    score: CaseScoreVectorResponse,
    request: ScoreCaseRequest,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    fusion_failure_reason: str | None,
    historical_learning: HistoricalLearningContextResponse | None,
) -> GroundedDecisionResponse:
    detection_package = request.detection_package if isinstance(request.detection_package, dict) else {}
    sigma_decision = adjudicate_sigma(
        detection_package=detection_package,
        evidence_fusion=evidence_fusion,
        historical_learning_features=_historical_learning_features(historical_learning),
    )
    verdict = sigma_decision.verdict
    action = _select_action(
        verdict=verdict,
        uncertainty=score.uncertainty_score,
        blast_radius=score.blast_radius_score,
        deployability=score.deployability_score,
        request=request,
    )
    confidence = sigma_decision.confidence
    false_positive_risk = sigma_decision.false_positive_risk
    confidence, false_positive_risk = _blend_family_confidence_and_risk(
        score=score,
        verdict=verdict,
        family_confidence=confidence,
        family_false_positive_risk=false_positive_risk,
        lexical_only_gate_triggered=sigma_decision.lexical_only_gate_triggered,
        non_lexical_corroborated=sigma_decision.non_lexical_corroborated,
        missing_score=sigma_decision.bucket_scores.missing_score,
    )
    review_priority = _review_priority(
        verdict=verdict,
        confidence=confidence,
        blast_radius=score.blast_radius_score,
    )
    reasons = list(sigma_decision.explanation_lines)[:4]
    if evidence_fusion is not None and len(reasons) < 4:
        reasons.append(
            "evidence_fusion="
            f"positive:{len(evidence_fusion.positive_evidence)}, "
            f"negative:{len(evidence_fusion.negative_evidence)}, "
            f"contradictory:{len(evidence_fusion.contradictory_evidence)}, "
            f"missing:{len(evidence_fusion.missing_evidence)}"
        )
    next_best_evidence = list(sigma_decision.suggested_next_checks)
    if not next_best_evidence:
        next_best_evidence = _next_best_evidence(score=score, verdict=verdict)
    abstain_reason = None
    if verdict == "insufficient_evidence":
        abstain_reason = sigma_decision.abstain_reason or "insufficient_correlated_evidence"
    provenance = _provenance(
        score=score,
        request=request,
        evidence_fusion=evidence_fusion,
        sigma_decision=sigma_decision,
        historical_learning=historical_learning,
    )
    return _finalize_grounded_decision(
        score=score,
        request=request,
        verdict=verdict,
        action=action,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        abstain_reason=abstain_reason,
        review_priority=review_priority,
        reasons=reasons,
        next_best_evidence=next_best_evidence[:4],
        provenance=provenance,
        evidence_fusion=evidence_fusion,
        historical_learning=historical_learning,
        family="sigma",
        lexical_only_gate_triggered=sigma_decision.lexical_only_gate_triggered,
        non_lexical_corroborated=sigma_decision.non_lexical_corroborated,
        contradiction_score=sigma_decision.bucket_scores.contradictory_score,
        missing_score=sigma_decision.bucket_scores.missing_score,
        fusion_failure_reason=fusion_failure_reason,
    )


def _build_snort_grounded_decision(
    *,
    score: CaseScoreVectorResponse,
    request: ScoreCaseRequest,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    fusion_failure_reason: str | None,
    historical_learning: HistoricalLearningContextResponse | None,
) -> GroundedDecisionResponse:
    detection_package = request.detection_package if isinstance(request.detection_package, dict) else {}
    snort_decision = adjudicate_snort(
        detection_package=detection_package,
        evidence_fusion=evidence_fusion,
        historical_learning_features=_historical_learning_features(historical_learning),
    )
    verdict = snort_decision.verdict
    action = _select_action(
        verdict=verdict,
        uncertainty=score.uncertainty_score,
        blast_radius=score.blast_radius_score,
        deployability=score.deployability_score,
        request=request,
    )
    confidence = snort_decision.confidence
    false_positive_risk = snort_decision.false_positive_risk
    confidence, false_positive_risk = _blend_family_confidence_and_risk(
        score=score,
        verdict=verdict,
        family_confidence=confidence,
        family_false_positive_risk=false_positive_risk,
        lexical_only_gate_triggered=snort_decision.lexical_only_gate_triggered,
        non_lexical_corroborated=snort_decision.non_lexical_corroborated,
        missing_score=snort_decision.bucket_scores.missing_score,
    )
    review_priority = _review_priority(
        verdict=verdict,
        confidence=confidence,
        blast_radius=score.blast_radius_score,
    )
    reasons = list(snort_decision.explanation_lines)[:4]
    if evidence_fusion is not None and len(reasons) < 4:
        reasons.append(
            "evidence_fusion="
            f"positive:{len(evidence_fusion.positive_evidence)}, "
            f"negative:{len(evidence_fusion.negative_evidence)}, "
            f"contradictory:{len(evidence_fusion.contradictory_evidence)}, "
            f"missing:{len(evidence_fusion.missing_evidence)}"
        )
    next_best_evidence = list(snort_decision.suggested_next_checks)
    if not next_best_evidence:
        next_best_evidence = _next_best_evidence(score=score, verdict=verdict)
    abstain_reason = None
    if verdict == "insufficient_evidence":
        abstain_reason = snort_decision.abstain_reason or "insufficient_correlated_evidence"
    provenance = _provenance(
        score=score,
        request=request,
        evidence_fusion=evidence_fusion,
        snort_decision=snort_decision,
        historical_learning=historical_learning,
    )
    return _finalize_grounded_decision(
        score=score,
        request=request,
        verdict=verdict,
        action=action,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        abstain_reason=abstain_reason,
        review_priority=review_priority,
        reasons=reasons,
        next_best_evidence=next_best_evidence[:4],
        provenance=provenance,
        evidence_fusion=evidence_fusion,
        historical_learning=historical_learning,
        family="snort",
        lexical_only_gate_triggered=snort_decision.lexical_only_gate_triggered,
        non_lexical_corroborated=snort_decision.non_lexical_corroborated,
        contradiction_score=snort_decision.bucket_scores.contradictory_score,
        missing_score=snort_decision.bucket_scores.missing_score,
        fusion_failure_reason=fusion_failure_reason,
    )


def _build_yara_grounded_decision(
    *,
    score: CaseScoreVectorResponse,
    request: ScoreCaseRequest,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    fusion_failure_reason: str | None,
    historical_learning: HistoricalLearningContextResponse | None,
) -> GroundedDecisionResponse:
    detection_package = request.detection_package if isinstance(request.detection_package, dict) else {}
    yara_decision = adjudicate_yara(
        detection_package=detection_package,
        evidence_fusion=evidence_fusion,
        historical_learning_features=_historical_learning_features(historical_learning),
    )
    verdict = yara_decision.verdict
    action = _select_action(
        verdict=verdict,
        uncertainty=score.uncertainty_score,
        blast_radius=score.blast_radius_score,
        deployability=score.deployability_score,
        request=request,
    )
    confidence = yara_decision.confidence
    false_positive_risk = yara_decision.false_positive_risk
    confidence, false_positive_risk = _blend_family_confidence_and_risk(
        score=score,
        verdict=verdict,
        family_confidence=confidence,
        family_false_positive_risk=false_positive_risk,
        lexical_only_gate_triggered=yara_decision.lexical_only_gate_triggered,
        non_lexical_corroborated=yara_decision.non_lexical_corroborated,
        missing_score=yara_decision.bucket_scores.missing_score,
    )
    review_priority = _review_priority(
        verdict=verdict,
        confidence=confidence,
        blast_radius=score.blast_radius_score,
    )
    reasons = list(yara_decision.explanation_lines)[:4]
    if evidence_fusion is not None and len(reasons) < 4:
        reasons.append(
            "evidence_fusion="
            f"positive:{len(evidence_fusion.positive_evidence)}, "
            f"negative:{len(evidence_fusion.negative_evidence)}, "
            f"contradictory:{len(evidence_fusion.contradictory_evidence)}, "
            f"missing:{len(evidence_fusion.missing_evidence)}"
        )
    next_best_evidence = list(yara_decision.suggested_next_checks)
    if not next_best_evidence:
        next_best_evidence = _next_best_evidence(score=score, verdict=verdict)
    abstain_reason = None
    if verdict == "insufficient_evidence":
        abstain_reason = yara_decision.abstain_reason or "insufficient_correlated_evidence"
    provenance = _provenance(
        score=score,
        request=request,
        evidence_fusion=evidence_fusion,
        yara_decision=yara_decision,
        historical_learning=historical_learning,
    )
    return _finalize_grounded_decision(
        score=score,
        request=request,
        verdict=verdict,
        action=action,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        abstain_reason=abstain_reason,
        review_priority=review_priority,
        reasons=reasons,
        next_best_evidence=next_best_evidence[:4],
        provenance=provenance,
        evidence_fusion=evidence_fusion,
        historical_learning=historical_learning,
        family="yara",
        lexical_only_gate_triggered=yara_decision.lexical_only_gate_triggered,
        non_lexical_corroborated=yara_decision.non_lexical_corroborated,
        contradiction_score=yara_decision.bucket_scores.contradictory_score,
        missing_score=yara_decision.bucket_scores.missing_score,
        fusion_failure_reason=fusion_failure_reason,
    )


def _finalize_grounded_decision(
    *,
    score: CaseScoreVectorResponse,
    request: ScoreCaseRequest,
    verdict: DecisionVerdict,
    action: str,
    confidence: float,
    false_positive_risk: float,
    abstain_reason: str | None,
    review_priority: str,
    reasons: list[str],
    next_best_evidence: list[str],
    provenance: list[DecisionProvenanceItemResponse],
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    historical_learning: HistoricalLearningContextResponse | None,
    family: str,
    lexical_only_gate_triggered: bool,
    non_lexical_corroborated: bool,
    contradiction_score: float,
    missing_score: float,
    fusion_failure_reason: str | None,
) -> GroundedDecisionResponse:
    safety_inputs = _collect_safety_inputs(
        request=request,
        evidence_fusion=evidence_fusion,
        family=family,
        lexical_only_gate_triggered=lexical_only_gate_triggered,
        non_lexical_corroborated=non_lexical_corroborated,
        contradiction_score=contradiction_score,
        missing_score=missing_score,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        fusion_failure_reason=fusion_failure_reason,
    )
    safety_outcome = _apply_safety_rails(
        verdict=verdict,
        action=action,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        abstain_reason=abstain_reason,
        review_priority=review_priority,
        blast_radius=score.blast_radius_score,
        safety_inputs=safety_inputs,
    )

    final_reasons = _merge_unique_text(
        list(reasons)
        + _safety_reason_lines(safety_inputs=safety_inputs, safety_outcome=safety_outcome)
    )[:6]
    final_next_best_evidence = _merge_unique_text(
        list(next_best_evidence)
        + _safety_next_best_evidence(safety_inputs=safety_inputs)
    )[:5]

    promotion_suppression_decision = build_promotion_suppression_decision(
        verdict=safety_outcome.verdict,
        confidence=safety_outcome.confidence,
        false_positive_risk=safety_outcome.false_positive_risk,
        score=score,
        request=request,
        evidence_fusion=evidence_fusion,
        provenance=provenance,
    )
    action_plan = build_action_plan(
        request=request,
        verdict=safety_outcome.verdict,
        confidence=safety_outcome.confidence,
        false_positive_risk=safety_outcome.false_positive_risk,
        evidence_fusion=evidence_fusion,
        family=family,
        evidence_summary=final_reasons,
        historical_learning=historical_learning,
        contradiction_score=safety_inputs.contradiction_score,
        missing_critical_fields=list(safety_inputs.missing_critical_fields),
    )

    _log_grounded_decision_safety(
        request=request,
        verdict=safety_outcome.verdict,
        confidence=safety_outcome.confidence,
        false_positive_risk=safety_outcome.false_positive_risk,
        safety_inputs=safety_inputs,
        safety_outcome=safety_outcome,
    )

    return GroundedDecisionResponse(
        verdict=safety_outcome.verdict,
        action=safety_outcome.action,
        confidence=float(round(safety_outcome.confidence, 6)),
        false_positive_risk=float(round(safety_outcome.false_positive_risk, 6)),
        review_priority=safety_outcome.review_priority,
        should_promote_to_indicator=_should_promote_to_indicator(safety_outcome.verdict),
        should_suppress=_should_suppress(safety_outcome.verdict),
        should_allowlist=_should_allowlist(safety_outcome.verdict),
        should_escalate=_should_escalate(safety_outcome.verdict),
        provenance=provenance,
        reasons=final_reasons,
        abstain_reason=safety_outcome.abstain_reason,
        next_best_evidence=final_next_best_evidence,
        evidence_fusion=evidence_fusion,
        historical_learning=historical_learning,
        safety_diagnostics=safety_outcome.safety_diagnostics,
        promotion_suppression_decision=promotion_suppression_decision,
        action_plan=action_plan,
    )


def _blend_family_confidence_and_risk(
    *,
    score: CaseScoreVectorResponse,
    verdict: DecisionVerdict,
    family_confidence: float,
    family_false_positive_risk: float,
    lexical_only_gate_triggered: bool,
    non_lexical_corroborated: bool,
    missing_score: float,
) -> tuple[float, float]:
    blended_confidence = _clip01(family_confidence)
    blended_false_positive_risk = _clip01(family_false_positive_risk)
    if verdict != "insufficient_evidence" or lexical_only_gate_triggered:
        return blended_confidence, blended_false_positive_risk

    source_trust = _clip01(float(score.feature_groups.get("source_trust_signal", 0.5)))
    sightings = _clip01(float(score.feature_groups.get("sightings_signal", 0.0)))
    score_signal = _clip01(score.maliciousness_score)
    uncertainty = _clip01(score.uncertainty_score)
    contextual_support = _clip01(
        0.42 * score_signal
        + 0.18 * (1.0 - uncertainty)
        + 0.16 * source_trust
        + 0.12 * sightings
        + 0.12 * (1.0 - _clip01(missing_score))
    )

    confidence_floor = 0.08 + (0.26 * contextual_support)
    if non_lexical_corroborated:
        confidence_floor += 0.08
    else:
        confidence_floor += 0.03
    confidence_floor = max(0.08, min(0.38, confidence_floor))
    blended_confidence = max(blended_confidence, confidence_floor)

    score_risk = _clip01((1.0 - score_signal) + (0.10 * uncertainty))
    blended_false_positive_risk = _clip01((0.72 * blended_false_positive_risk) + (0.28 * score_risk))
    return blended_confidence, blended_false_positive_risk


def _collect_safety_inputs(
    *,
    request: ScoreCaseRequest,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    family: str,
    lexical_only_gate_triggered: bool,
    non_lexical_corroborated: bool,
    contradiction_score: float,
    missing_score: float,
    confidence: float,
    false_positive_risk: float,
    fusion_failure_reason: str | None,
) -> _SafetyInputs:
    missing_critical_fields = tuple(_missing_critical_fields(request=request, family=family))
    enrichment_status, degradation_reasons = _enrichment_status(
        request=request,
        evidence_fusion=evidence_fusion,
        fusion_failure_reason=fusion_failure_reason,
    )
    contradiction = _clip01(max(contradiction_score, _fusion_conflict_ratio(evidence_fusion)))
    missing = _clip01(max(missing_score, _fusion_missing_ratio(evidence_fusion)))
    partial_evidence = bool(
        missing_critical_fields
        or missing >= 0.35
        or (evidence_fusion is not None and len(evidence_fusion.missing_evidence) >= SAFETY_PARTIAL_EVIDENCE_MISSING_COUNT)
        or enrichment_status != "available"
    )
    return _SafetyInputs(
        family=family,
        lexical_only_gate_triggered=lexical_only_gate_triggered,
        non_lexical_corroborated=non_lexical_corroborated,
        contradiction_score=contradiction,
        missing_score=missing,
        confidence=_clip01(confidence),
        false_positive_risk=_clip01(false_positive_risk),
        missing_critical_fields=missing_critical_fields,
        enrichment_status=enrichment_status,
        degradation_reasons=tuple(degradation_reasons),
        partial_evidence=partial_evidence,
    )


def _apply_safety_rails(
    *,
    verdict: DecisionVerdict,
    action: str,
    confidence: float,
    false_positive_risk: float,
    abstain_reason: str | None,
    review_priority: str,
    blast_radius: float,
    safety_inputs: _SafetyInputs,
) -> _SafetyOutcome:
    final_verdict = verdict
    final_action = action
    final_confidence = _clip01(confidence)
    final_false_positive_risk = _clip01(false_positive_risk)
    final_abstain_reason = abstain_reason

    if safety_inputs.contradiction_score >= 0.50:
        final_confidence = _clip01(final_confidence - 0.20)
        final_false_positive_risk = _clip01(final_false_positive_risk + 0.15)
    elif safety_inputs.contradiction_score >= 0.30:
        final_confidence = _clip01(final_confidence - 0.10)
        final_false_positive_risk = _clip01(final_false_positive_risk + 0.10)

    force_abstain = False
    if safety_inputs.missing_critical_fields:
        force_abstain = True
        final_abstain_reason = "missing_critical_fields"
    elif safety_inputs.lexical_only_gate_triggered:
        force_abstain = True
        final_abstain_reason = final_abstain_reason or "missing_non_string_corroboration"
    elif safety_inputs.missing_score >= 0.65:
        force_abstain = True
        final_abstain_reason = final_abstain_reason or "insufficient_correlated_evidence"
    elif safety_inputs.contradiction_score >= 0.70:
        force_abstain = True
        final_abstain_reason = "high_evidence_conflict"
    elif safety_inputs.enrichment_status == "unavailable" and not safety_inputs.non_lexical_corroborated:
        force_abstain = True
        final_abstain_reason = "enrichment_unavailable"

    if force_abstain:
        final_verdict = "insufficient_evidence"
        final_action = "hold"
        final_confidence = min(final_confidence, 0.49)
        final_false_positive_risk = max(final_false_positive_risk, 0.35)

    final_review_priority = _review_priority(final_verdict, final_confidence, blast_radius)
    severity_cap_applied, max_recommendation_severity = derive_recommendation_severity_cap(
        verdict=final_verdict,
        confidence=final_confidence,
        false_positive_risk=final_false_positive_risk,
        contradiction_score=safety_inputs.contradiction_score,
        missing_critical_fields=safety_inputs.missing_critical_fields,
    )
    weak_evidence = bool(
        safety_inputs.lexical_only_gate_triggered
        or safety_inputs.missing_score >= 0.65
        or safety_inputs.missing_critical_fields
        or not safety_inputs.non_lexical_corroborated
    )
    safety_diagnostics = SafetyDiagnosticsResponse(
        auto_remediation_allowed=False,
        weak_evidence=weak_evidence,
        contradictory_evidence=safety_inputs.contradiction_score >= 0.30,
        contradiction_score=float(round(safety_inputs.contradiction_score, 6)),
        missing_critical_fields=list(safety_inputs.missing_critical_fields),
        partial_evidence=safety_inputs.partial_evidence,
        enrichment_status=safety_inputs.enrichment_status,
        false_positive_risk=float(round(final_false_positive_risk, 6)),
        severity_cap_applied=severity_cap_applied,
        max_recommendation_severity=max_recommendation_severity,
        degradation_reasons=list(safety_inputs.degradation_reasons),
    )
    return _SafetyOutcome(
        verdict=final_verdict,
        action=final_action,
        confidence=final_confidence,
        false_positive_risk=final_false_positive_risk,
        abstain_reason=final_abstain_reason,
        review_priority=final_review_priority,
        safety_diagnostics=safety_diagnostics,
    )


def _missing_critical_fields(*, request: ScoreCaseRequest, family: str) -> list[str]:
    package = request.detection_package if isinstance(request.detection_package, dict) else {}
    object_metadata = _coerce_dict(package.get("object_metadata"))
    rule_metadata = _coerce_dict(package.get("rule_metadata"))
    raw_hit_payload = _coerce_dict(package.get("raw_hit_payload"))
    if family.strip().lower() in {"snort", "suricata"} and not raw_hit_payload:
        raw_hit_payload = _snort_flat_payload_from_package(package)
    if family.strip().lower() in {"snort", "suricata"} and not rule_metadata:
        alert = _coerce_dict(package.get("alert"))
        rule_metadata = _coerce_dict(alert.get("rule"))
    network = _coerce_dict(raw_hit_payload.get("network"))
    five_tuple = _coerce_dict(network.get("five_tuple"))
    resolved_family = family.strip().lower()

    missing: list[str] = []
    if not (_has_text(package.get("rule_family")) or resolved_family in {"sigma", "snort", "suricata", "yara"}):
        missing.append("rule_family")
    if not _has_text(object_metadata.get("object_id")):
        missing.append("object_metadata.object_id")
    if not _has_text(object_metadata.get("object_type")):
        missing.append("object_metadata.object_type")
    if not _has_text(object_metadata.get("source_system")):
        missing.append("object_metadata.source_system")

    if resolved_family == "sigma":
        if not (_has_text(rule_metadata.get("rule_id")) or _has_text(rule_metadata.get("title"))):
            missing.append("rule_metadata.rule_id_or_title")
        if not (
            _has_text(raw_hit_payload.get("command_line"))
            or _has_text(raw_hit_payload.get("image"))
            or _has_text(raw_hit_payload.get("event_id"))
        ):
            missing.append("raw_hit_payload.command_line_or_image_or_event_id")
    elif resolved_family in {"snort", "suricata"}:
        if not (
            _has_text(rule_metadata.get("rule_id"))
            or rule_metadata.get("sid") is not None
            or _has_text(rule_metadata.get("msg"))
        ):
            missing.append("rule_metadata.rule_id_or_sid_or_msg")
        if not (
            five_tuple
            or _snort_has_flat_replayable_network_evidence(
                package=package,
                raw_hit_payload=raw_hit_payload,
                rule_metadata=rule_metadata,
                object_metadata=object_metadata,
            )
            or _has_text(raw_hit_payload.get("message"))
            or _has_text(raw_hit_payload.get("event_id"))
        ):
            missing.append("raw_hit_payload.network.five_tuple_or_message_or_event_id")
    elif resolved_family == "yara":
        matched_strings = raw_hit_payload.get("matched_strings")
        has_matched_strings = isinstance(matched_strings, list) and any(_has_text(item) for item in matched_strings)
        has_match_count = raw_hit_payload.get("match_count") is not None
        if not (_has_text(rule_metadata.get("rule_id")) or _has_text(rule_metadata.get("rule_name"))):
            missing.append("rule_metadata.rule_id_or_rule_name")
        if not (has_matched_strings or has_match_count or _has_text(raw_hit_payload.get("event_id"))):
            missing.append("raw_hit_payload.matched_strings_or_match_count_or_event_id")
    return missing


def _enrichment_status(
    *,
    request: ScoreCaseRequest,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    fusion_failure_reason: str | None,
) -> tuple[str, list[str]]:
    package = request.detection_package if isinstance(request.detection_package, dict) else {}
    raw_linked = package.get("linked_enrichment")
    reasons: list[str] = []

    if fusion_failure_reason:
        reasons.append(fusion_failure_reason)
        return "degraded", reasons

    if raw_linked is None:
        reasons.append("linked_enrichment_unavailable")
        return "unavailable", reasons
    if not isinstance(raw_linked, dict):
        reasons.append("linked_enrichment_malformed")
        return "degraded", reasons

    enrichments = raw_linked.get("enrichments")
    valid_enrichments = [item for item in enrichments if isinstance(item, dict)] if isinstance(enrichments, list) else []
    if not valid_enrichments:
        reasons.append("linked_enrichment_unavailable")
        return "unavailable", reasons

    if evidence_fusion is None or not evidence_fusion.coverage.get("linked_enrichment", False):
        reasons.append("linked_enrichment_degraded")
        return "degraded", reasons
    return "available", reasons


def _safety_reason_lines(*, safety_inputs: _SafetyInputs, safety_outcome: _SafetyOutcome) -> list[str]:
    reasons: list[str] = []
    if safety_inputs.missing_critical_fields:
        reasons.append(
            "Safety rails detected missing critical fields: " + ", ".join(safety_inputs.missing_critical_fields) + "."
        )
    if safety_inputs.contradiction_score >= 0.30:
        reasons.append(
            f"Contradictory evidence lowered confidence and increased false_positive_risk (contradiction_score={safety_inputs.contradiction_score:.2f})."
        )
    if safety_outcome.safety_diagnostics.severity_cap_applied:
        reasons.append("Safety cap restricted recommendations to review-only, non-disruptive actions.")
    if safety_inputs.enrichment_status != "available":
        reasons.append(
            "Enrichment was "
            + ("unavailable" if safety_inputs.enrichment_status == "unavailable" else "degraded")
            + "; decision continued with missing-evidence pressure."
        )
    return reasons


def _safety_next_best_evidence(safety_inputs: _SafetyInputs) -> list[str]:
    next_steps: list[str] = []
    if safety_inputs.missing_critical_fields:
        next_steps.append("populate_missing_critical_fields")
    if safety_inputs.enrichment_status != "available":
        next_steps.append("restore_linked_enrichment")
    if safety_inputs.contradiction_score >= 0.30:
        next_steps.append("resolve_contradictory_evidence")
    if safety_inputs.partial_evidence:
        next_steps.append("collect_partial_evidence_gaps")
    return next_steps


def _log_grounded_decision_safety(
    *,
    request: ScoreCaseRequest,
    verdict: DecisionVerdict,
    confidence: float,
    false_positive_risk: float,
    safety_inputs: _SafetyInputs,
    safety_outcome: _SafetyOutcome,
) -> None:
    log_fields = {
        "case_id": request.case_id,
        "rule_family": safety_inputs.family,
        "verdict": verdict,
        "confidence": float(round(confidence, 6)),
        "false_positive_risk": float(round(false_positive_risk, 6)),
        "missing_critical_fields": list(safety_inputs.missing_critical_fields),
        "contradiction_score": float(round(safety_inputs.contradiction_score, 6)),
        "partial_evidence": safety_inputs.partial_evidence,
        "enrichment_status": safety_inputs.enrichment_status,
        "severity_cap_applied": safety_outcome.safety_diagnostics.severity_cap_applied,
    }
    if verdict == "insufficient_evidence":
        _log_safety_event(logging.WARNING, "decision_abstained", **log_fields)
    if safety_inputs.partial_evidence:
        _log_safety_event(logging.INFO, "decision_partial_evidence", **log_fields)
    if safety_inputs.enrichment_status != "available":
        _log_safety_event(logging.INFO, "decision_enrichment_degraded", **log_fields)


def _log_safety_event(level: int, event: str, **fields: Any) -> None:
    logger.log(level, event, extra={"safety_event": event, **fields})


def _is_sigma_package(request: ScoreCaseRequest) -> bool:
    if not isinstance(request.detection_package, dict):
        return False
    family = request.detection_package.get("rule_family")
    if isinstance(family, str) and family.strip().lower() == "sigma":
        return True
    rule_family = request.rule_context.get("rule_family") or request.rule_context.get("ruleFamily")
    if isinstance(rule_family, str) and rule_family.strip().lower() == "sigma":
        return True
    return False


def _is_snort_package(request: ScoreCaseRequest) -> bool:
    if not isinstance(request.detection_package, dict):
        return False
    family = request.detection_package.get("rule_family")
    if isinstance(family, str) and family.strip().lower() in {"snort", "suricata"}:
        return True
    rule_family = request.rule_context.get("rule_family") or request.rule_context.get("ruleFamily")
    if isinstance(rule_family, str) and rule_family.strip().lower() in {"snort", "suricata"}:
        return True
    return False


def _is_yara_package(request: ScoreCaseRequest) -> bool:
    if not isinstance(request.detection_package, dict):
        return False
    family = request.detection_package.get("rule_family")
    if isinstance(family, str) and family.strip().lower() == "yara":
        return True
    rule_family = request.rule_context.get("rule_family") or request.rule_context.get("ruleFamily")
    if isinstance(rule_family, str) and rule_family.strip().lower() == "yara":
        return True
    return False


def _select_verdict(
    maliciousness: float,
    uncertainty: float,
    conflict: float,
    source_trust: float,
    scanner_agreement: float,
    sightings: float,
    non_string_corroborated: bool,
    false_positive_signal: bool,
    stale_or_revoked_signal: bool,
) -> DecisionVerdict:
    if stale_or_revoked_signal:
        return "stale_or_revoked"

    if false_positive_signal:
        return "false_positive"

    if (
        maliciousness >= MALICIOUS_MIN
        and uncertainty <= MALICIOUS_UNCERTAINTY_MAX
        and conflict <= MALICIOUS_CONFLICT_MAX
        and scanner_agreement >= MALICIOUS_SCANNER_MIN
        and sightings >= MALICIOUS_SIGHTINGS_MIN
        and source_trust >= MALICIOUS_TRUST_MIN
        and non_string_corroborated
    ):
        return "malicious"

    if _insufficient_evidence(uncertainty, conflict, source_trust, sightings, non_string_corroborated):
        return "insufficient_evidence"

    if (
        maliciousness >= LIKELY_MALICIOUS_MIN
        and uncertainty <= LIKELY_UNCERTAINTY_MAX
        and conflict <= LIKELY_CONFLICT_MAX
        and non_string_corroborated
    ):
        return "likely_malicious"

    if (
        maliciousness >= SUSPICIOUS_MIN
        and uncertainty <= SUSPICIOUS_UNCERTAINTY_MAX
        and conflict <= SUSPICIOUS_CONFLICT_MAX
    ):
        return "suspicious"

    if (
        maliciousness <= BENIGN_MAX
        and uncertainty <= STRICT_BENIGN_UNCERTAINTY_MAX
        and conflict <= STRICT_BENIGN_CONFLICT_MAX
        and source_trust >= STRICT_BENIGN_TRUST_MIN
        and non_string_corroborated
    ):
        return "benign"

    if (
        maliciousness <= LIKELY_BENIGN_MAX
        and uncertainty <= BENIGN_UNCERTAINTY_MAX
        and conflict <= BENIGN_CONFLICT_MAX
        and source_trust >= BENIGN_TRUST_MIN
        and sightings >= BENIGN_SIGHTINGS_MIN
        and non_string_corroborated
    ):
        return "likely_benign"

    return "insufficient_evidence"


def _select_action(
    verdict: DecisionVerdict,
    uncertainty: float,
    blast_radius: float,
    deployability: float,
    request: ScoreCaseRequest,
) -> str:
    if _rollback_signal_present(request):
        return "rollback"

    if verdict == "malicious":
        if blast_radius >= 0.70:
            return "quarantine_for_review"
        if deployability >= 0.75 and uncertainty <= 0.15 and blast_radius < 0.40:
            return "deploy"
        return "canary"

    if verdict == "likely_malicious":
        if blast_radius >= 0.65 or uncertainty >= 0.30:
            return "quarantine_for_review"
        if deployability >= 0.60:
            return "canary"
        return "monitor"

    if verdict == "suspicious":
        if blast_radius >= 0.60 or uncertainty >= 0.35:
            return "quarantine_for_review"
        return "monitor"

    if verdict in {"benign", "likely_benign"}:
        return "monitor"

    return "hold"


def _abstain_reason(
    verdict: DecisionVerdict,
    uncertainty: float,
    conflict: float,
    source_trust: float,
    sightings: float,
    non_string_corroborated: bool,
) -> str | None:
    if verdict != "insufficient_evidence":
        return None
    if uncertainty >= INSUFFICIENT_UNCERTAINTY_MIN:
        return "high_uncertainty"
    if conflict >= INSUFFICIENT_CONFLICT_MIN:
        return "high_evidence_conflict"
    if source_trust <= INSUFFICIENT_TRUST_MAX:
        return "low_source_trust"
    if sightings <= INSUFFICIENT_SIGHTINGS_MAX:
        return "low_sightings_corroboration"
    if not non_string_corroborated:
        return "missing_non_string_corroboration"
    return "insufficient_correlated_evidence"


def _confidence(
    verdict: DecisionVerdict,
    maliciousness: float,
    uncertainty: float,
    conflict: float,
    source_trust: float,
    scanner_agreement: float,
    sightings: float,
    non_string_corroborated: bool,
) -> float:
    corroboration = _clip01(0.45 * scanner_agreement + 0.35 * sightings + 0.20 * source_trust)
    if not non_string_corroborated:
        corroboration *= 0.55

    if verdict == "malicious":
        return _clip01(maliciousness * (1.0 - uncertainty) * (1.0 - conflict) * (0.70 + 0.30 * corroboration))
    if verdict == "likely_malicious":
        return _clip01(maliciousness * (1.0 - uncertainty) * (0.55 + 0.45 * corroboration))
    if verdict == "suspicious":
        return _clip01((0.5 * maliciousness + 0.5 * (1.0 - uncertainty)) * (1.0 - 0.5 * conflict))
    if verdict in {"benign", "likely_benign"}:
        benign_signal = (1.0 - maliciousness) * (1.0 - uncertainty) * (1.0 - conflict)
        confidence_weight = 0.65 if verdict == "benign" else 0.50
        return _clip01(benign_signal * (confidence_weight + (1.0 - confidence_weight) * corroboration))
    if verdict in {"false_positive", "stale_or_revoked"}:
        return _clip01((1.0 - maliciousness) * (1.0 - conflict) * (0.55 + 0.45 * source_trust))

    insufficiency_signal = max(uncertainty, conflict, 1.0 - source_trust, 1.0 - corroboration)
    return _clip01(insufficiency_signal)


def _reasons(
    verdict: DecisionVerdict,
    action: str,
    maliciousness: float,
    uncertainty: float,
    conflict: float,
    source_trust: float,
    scanner_agreement: float,
    sightings: float,
    non_string_corroborated: bool,
    false_positive_signal: bool,
    stale_or_revoked_signal: bool,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
) -> list[str]:
    reasons: list[str] = [
        f"verdict={verdict} based on calibrated_signal={maliciousness:.2f}, uncertainty={uncertainty:.2f}, conflict={conflict:.2f}",
    ]

    if non_string_corroborated:
        reasons.append(
            f"corroboration(scanner={scanner_agreement:.2f}, sightings={sightings:.2f}, trust={source_trust:.2f}) meets decision evidence bar"
        )
    else:
        reasons.append("operational corroboration is insufficient beyond string-level indicators")

    if stale_or_revoked_signal:
        reasons.append("indicator freshness/revocation signals downgraded the verdict to stale_or_revoked")
    elif false_positive_signal:
        reasons.append("allowlist or analyst false-positive signal downgraded the verdict")
    elif verdict == "insufficient_evidence":
        reasons.append("decision abstained until stronger corroborated evidence is collected")
    else:
        reasons.append(f"action={action} selected for controlled operational response")

    if evidence_fusion is not None:
        reasons.append(
            "evidence_fusion="
            f"positive:{len(evidence_fusion.positive_evidence)}, "
            f"negative:{len(evidence_fusion.negative_evidence)}, "
            f"contradictory:{len(evidence_fusion.contradictory_evidence)}, "
            f"missing:{len(evidence_fusion.missing_evidence)}"
        )

    return reasons[:4]


def _provenance(
    score: CaseScoreVectorResponse,
    request: ScoreCaseRequest,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    historical_learning: HistoricalLearningContextResponse | None = None,
    yara_decision: YaraDecisionResult | None = None,
    sigma_decision: SigmaDecisionResult | None = None,
    snort_decision: SnortDecisionResult | None = None,
) -> list[DecisionProvenanceItemResponse]:
    output: list[DecisionProvenanceItemResponse] = []

    for key in (
        "scannerAgreement",
        "scanner_agreement",
        "severityScore",
        "severity_score",
        "sourceTrust",
        "source_trust",
        "sightingsCount",
        "sightings_count",
        "sightingsDistinctSources",
        "sightings_distinct_sources",
        "evidenceConflict",
        "evidence_conflict",
        "rollbackRequired",
        "rollback_required",
        "postDeployRegression",
        "post_deploy_regression",
    ):
        if key in request.rule_context:
            output.append(
                DecisionProvenanceItemResponse(
                    source="rule_context",
                    key=key,
                    value=str(request.rule_context[key]),
                )
            )

    for key in ("criticality", "hostCriticality", "assetExposure", "asset_exposure"):
        if key in request.host_context:
            output.append(
                DecisionProvenanceItemResponse(
                    source="host_context",
                    key=key,
                    value=str(request.host_context[key]),
                )
            )

    output.extend(
        [
            DecisionProvenanceItemResponse(source="score", key="maliciousness_score", value=f"{score.maliciousness_score:.6f}"),
            DecisionProvenanceItemResponse(source="score", key="uncertainty_score", value=f"{score.uncertainty_score:.6f}"),
            DecisionProvenanceItemResponse(source="score", key="deployability_score", value=f"{score.deployability_score:.6f}"),
            DecisionProvenanceItemResponse(source="score", key="blast_radius_score", value=f"{score.blast_radius_score:.6f}"),
        ]
    )

    for item in score.top_evidence[:4]:
        output.append(
            DecisionProvenanceItemResponse(
                source="top_evidence",
                key=item.feature,
                value=f"{item.contribution:.6f}",
            )
        )

    if evidence_fusion is not None:
        output.extend(
            [
                DecisionProvenanceItemResponse(
                    source="evidence_fusion",
                    key="positive_evidence_count",
                    value=str(len(evidence_fusion.positive_evidence)),
                ),
                DecisionProvenanceItemResponse(
                    source="evidence_fusion",
                    key="negative_evidence_count",
                    value=str(len(evidence_fusion.negative_evidence)),
                ),
                DecisionProvenanceItemResponse(
                    source="evidence_fusion",
                    key="contradictory_evidence_count",
                    value=str(len(evidence_fusion.contradictory_evidence)),
                ),
                DecisionProvenanceItemResponse(
                    source="evidence_fusion",
                    key="missing_evidence_count",
                    value=str(len(evidence_fusion.missing_evidence)),
                ),
                DecisionProvenanceItemResponse(
                    source="evidence_fusion",
                    key="deduplication",
                    value=(
                        f"input={evidence_fusion.deduplication.input_count},"
                        f"unique={evidence_fusion.deduplication.unique_count},"
                        f"duplicates={evidence_fusion.deduplication.duplicate_count}"
                    ),
                ),
            ]
        )

    if yara_decision is not None:
        output.extend(
            [
                DecisionProvenanceItemResponse(
                    source="yara_decision",
                    key="positive_score",
                    value=f"{yara_decision.bucket_scores.positive_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="yara_decision",
                    key="negative_score",
                    value=f"{yara_decision.bucket_scores.negative_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="yara_decision",
                    key="contradictory_score",
                    value=f"{yara_decision.bucket_scores.contradictory_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="yara_decision",
                    key="missing_score",
                    value=f"{yara_decision.bucket_scores.missing_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="yara_decision",
                    key="lexical_only_gate_triggered",
                    value=str(yara_decision.lexical_only_gate_triggered),
                ),
            ]
        )
        for key, value in list(yara_decision.interpretable_features.items())[:8]:
            output.append(
                DecisionProvenanceItemResponse(
                    source="yara_feature",
                    key=key,
                    value=f"{value:.6f}",
                )
            )

    if sigma_decision is not None:
        output.extend(
            [
                DecisionProvenanceItemResponse(
                    source="sigma_decision",
                    key="positive_score",
                    value=f"{sigma_decision.bucket_scores.positive_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="sigma_decision",
                    key="negative_score",
                    value=f"{sigma_decision.bucket_scores.negative_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="sigma_decision",
                    key="contradictory_score",
                    value=f"{sigma_decision.bucket_scores.contradictory_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="sigma_decision",
                    key="missing_score",
                    value=f"{sigma_decision.bucket_scores.missing_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="sigma_decision",
                    key="lexical_only_gate_triggered",
                    value=str(sigma_decision.lexical_only_gate_triggered),
                ),
            ]
        )
        for key, value in list(sigma_decision.interpretable_features.items())[:8]:
            output.append(
                DecisionProvenanceItemResponse(
                    source="sigma_feature",
                    key=key,
                    value=f"{value:.6f}",
                )
            )

    if snort_decision is not None:
        output.extend(
            [
                DecisionProvenanceItemResponse(
                    source="snort_decision",
                    key="positive_score",
                    value=f"{snort_decision.bucket_scores.positive_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="snort_decision",
                    key="negative_score",
                    value=f"{snort_decision.bucket_scores.negative_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="snort_decision",
                    key="contradictory_score",
                    value=f"{snort_decision.bucket_scores.contradictory_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="snort_decision",
                    key="missing_score",
                    value=f"{snort_decision.bucket_scores.missing_score:.6f}",
                ),
                DecisionProvenanceItemResponse(
                    source="snort_decision",
                    key="lexical_only_gate_triggered",
                    value=str(snort_decision.lexical_only_gate_triggered),
                ),
            ]
        )
        for key, value in list(snort_decision.interpretable_features.items())[:8]:
            output.append(
                DecisionProvenanceItemResponse(
                    source="snort_feature",
                    key=key,
                    value=f"{value:.6f}",
                )
            )

    if historical_learning is not None:
        provenance_by_feature: dict[str, list[str]] = {}
        for item in historical_learning.feature_provenance:
            event_ids = provenance_by_feature.setdefault(item.feature, [])
            if item.source_event_id not in event_ids:
                event_ids.append(item.source_event_id)

        for feature, value in sorted(historical_learning.features.items(), key=lambda item: item[0]):
            evidence_id = ",".join(provenance_by_feature.get(feature, [])[:3]) or None
            output.append(
                DecisionProvenanceItemResponse(
                    source="historical_learning_feature",
                    key=feature,
                    value=f"{value:.6f}",
                    evidence_id=evidence_id,
                )
            )
        output.append(
            DecisionProvenanceItemResponse(
                source="historical_learning_quality",
                key="quality_summary",
                value=(
                    f"eligible={historical_learning.quality.eligible_count},"
                    f"dropped={historical_learning.quality.dropped_count},"
                    f"lookback_days={historical_learning.quality.lookback_days},"
                    f"drop_reasons={len(historical_learning.quality.drop_reasons)}"
                ),
            )
        )

    return output


def _historical_learning_from_detection_package(
    detection_package: dict[str, object] | None,
) -> HistoricalLearningContextResponse | None:
    if not isinstance(detection_package, dict):
        return None
    raw_context = detection_package.get("historical_learning_context")
    if not isinstance(raw_context, dict):
        return None
    try:
        context = HistoricalLearningContextResponse.model_validate(raw_context)
    except Exception:
        return None
    if context.features or context.feature_provenance or context.similar_detections or context.quality.eligible_count > 0:
        return context
    return None


def _historical_learning_features(historical_learning: HistoricalLearningContextResponse | None) -> dict[str, float]:
    if historical_learning is None:
        return {}
    return {key: float(value) for key, value in historical_learning.features.items()}


def _next_best_evidence(score: CaseScoreVectorResponse, verdict: DecisionVerdict) -> list[str]:
    if score.next_best_evidence:
        return list(dict.fromkeys(score.next_best_evidence))[:4]
    if verdict == "insufficient_evidence":
        return ["collect_independent_high_trust_corroboration"]
    return ["collect_post_action_validation_signals"]


def _false_positive_risk(
    verdict: DecisionVerdict,
    confidence: float,
    uncertainty: float,
    conflict: float,
    maliciousness: float,
    source_trust: float,
) -> float:
    base_risk = _clip01((1.0 - confidence) * 0.65 + uncertainty * 0.20 + conflict * 0.15)
    if verdict in {"malicious", "likely_malicious", "suspicious", "insufficient_evidence"}:
        return _clip01(base_risk)

    adjusted = _clip01(base_risk * 0.55 + (1.0 - source_trust) * 0.20 + maliciousness * 0.10)
    return adjusted


def _review_priority(verdict: DecisionVerdict, confidence: float, blast_radius: float) -> str:
    if verdict == "malicious":
        return "critical" if blast_radius >= 0.65 else "high"
    if verdict in {"likely_malicious", "suspicious"}:
        return "high" if confidence >= 0.55 else "medium"
    if verdict == "insufficient_evidence":
        return "medium"
    return "low"


def _should_promote_to_indicator(verdict: DecisionVerdict) -> bool:
    return verdict in {"suspicious", "likely_malicious", "malicious"}


def _should_suppress(verdict: DecisionVerdict) -> bool:
    return verdict in {"false_positive", "stale_or_revoked"}


def _should_allowlist(verdict: DecisionVerdict) -> bool:
    return verdict in {"benign", "likely_benign", "false_positive"}


def _should_escalate(verdict: DecisionVerdict) -> bool:
    return verdict in {"suspicious", "likely_malicious", "malicious", "insufficient_evidence"}


def _build_evidence_fusion(request: ScoreCaseRequest) -> tuple[EvidenceFusionExplanationResponse | None, str | None]:
    if not isinstance(request.detection_package, dict):
        return None, None
    try:
        fused = fuse_evidence(
            detection_package=request.detection_package,
            host_context=request.host_context,
            rule_context=request.rule_context,
        )
    except Exception as exc:  # pragma: no cover
        _log_safety_event(
            logging.ERROR,
            "decision_failure",
            case_id=request.case_id,
            rule_family=_resolved_family(request),
            verdict="insufficient_evidence",
            confidence=0.0,
            false_positive_risk=0.0,
            missing_critical_fields=[],
            contradiction_score=0.0,
            partial_evidence=True,
            enrichment_status="degraded",
            severity_cap_applied=True,
            error=str(exc),
        )
        return None, "linked_enrichment_processing_failed"
    return _to_evidence_fusion_response(fused), None


def _to_evidence_fusion_response(fused: EvidenceFusionResult) -> EvidenceFusionExplanationResponse:
    def _to_item(atom: object) -> EvidenceFusionEvidenceItemResponse:
        return EvidenceFusionEvidenceItemResponse(
            channel=getattr(atom, "channel"),
            source=getattr(atom, "source"),
            evidence_id=getattr(atom, "evidence_id"),
            reference=getattr(atom, "reference"),
            category=getattr(atom, "category"),
            polarity=getattr(atom, "polarity"),
            confidence=getattr(atom, "confidence"),
            summary=getattr(atom, "summary"),
            anchor=getattr(atom, "anchor"),
        )

    return EvidenceFusionExplanationResponse(
        positive_evidence=[_to_item(item) for item in fused.positive_evidence],
        negative_evidence=[_to_item(item) for item in fused.negative_evidence],
        contradictory_evidence=[_to_item(item) for item in fused.contradictory_evidence],
        missing_evidence=[
            EvidenceFusionMissingItemResponse(
                gap_id=item.gap_id,
                channel=item.channel,
                description=item.description,
                importance=item.importance,
            )
            for item in fused.missing_evidence
        ],
        coverage=dict(sorted(fused.coverage.items(), key=lambda item: item[0])),
        deduplication=EvidenceFusionDeduplicationResponse(
            input_count=fused.deduplication.input_count,
            unique_count=fused.deduplication.unique_count,
            duplicate_count=fused.deduplication.duplicate_count,
        ),
        explanation_lines=list(fused.explanation_lines),
    )


def _fusion_conflict_ratio(evidence_fusion: EvidenceFusionExplanationResponse | None) -> float:
    if evidence_fusion is None:
        return 0.0
    contradictory = len(evidence_fusion.contradictory_evidence)
    total = (
        len(evidence_fusion.positive_evidence)
        + len(evidence_fusion.negative_evidence)
        + contradictory
    )
    if total <= 0:
        return 0.0
    return _clip01(contradictory / total)


def _fusion_sightings_signal(evidence_fusion: EvidenceFusionExplanationResponse) -> float:
    positive = len(evidence_fusion.positive_evidence)
    negative = len(evidence_fusion.negative_evidence)
    if positive + negative <= 0:
        return 0.0
    return _clip01(positive / max(1, positive + negative))


def _fusion_missing_ratio(evidence_fusion: EvidenceFusionExplanationResponse | None) -> float:
    if evidence_fusion is None:
        return 0.0
    total_channels = max(1, len(evidence_fusion.coverage) or 6)
    return _clip01(len(evidence_fusion.missing_evidence) / total_channels)


def _insufficient_evidence(
    uncertainty: float,
    conflict: float,
    source_trust: float,
    sightings: float,
    non_string_corroborated: bool,
) -> bool:
    if uncertainty >= INSUFFICIENT_UNCERTAINTY_MIN:
        return True
    if conflict >= INSUFFICIENT_CONFLICT_MIN:
        return True
    if source_trust <= INSUFFICIENT_TRUST_MAX:
        return True
    if sightings <= INSUFFICIENT_SIGHTINGS_MAX:
        return True
    if not non_string_corroborated:
        return True
    return False


def _has_non_string_corroboration(
    request: ScoreCaseRequest,
    scanner_agreement: float,
    sightings: float,
    source_trust: float,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
) -> bool:
    if evidence_fusion is not None:
        has_rich_channel = any(
            evidence_fusion.coverage.get(channel, False)
            for channel in ("behavior_evidence", "linked_enrichment", "environment_context")
        )
        return (
            len(evidence_fusion.positive_evidence) >= 1
            and has_rich_channel
            and len(evidence_fusion.missing_evidence) < 6
        )

    rule = request.rule_context
    explicit_evidence_inputs = any(
        key in rule
        for key in (
            "scannerAgreement",
            "scanner_agreement",
            "sightingsCount",
            "sightings_count",
            "sightingsDistinctSources",
            "sightings_distinct_sources",
            "sourceTrust",
            "source_trust",
            "evidenceConflict",
            "evidence_conflict",
        )
    )
    if not explicit_evidence_inputs:
        return False
    return (
        scanner_agreement >= MALICIOUS_SCANNER_MIN
        and sightings >= MALICIOUS_SIGHTINGS_MIN
        and source_trust >= MALICIOUS_TRUST_MIN
    )


def _rollback_signal_present(request: ScoreCaseRequest) -> bool:
    return _signal_present(request.rule_context, "rollbackRequired", "rollback_required", "postDeployRegression", "post_deploy_regression")


def _false_positive_signal_present(request: ScoreCaseRequest) -> bool:
    return _signal_present(
        request.rule_context,
        "falsePositiveSignal",
        "false_positive_signal",
        "isFalsePositive",
        "is_false_positive",
        "allowlistHit",
        "allowlist_hit",
        "knownBenign",
        "known_benign",
    )


def _stale_or_revoked_signal_present(request: ScoreCaseRequest) -> bool:
    return _signal_present(
        request.rule_context,
        "staleIndicator",
        "stale_indicator",
        "revokedIndicator",
        "revoked_indicator",
        "isRevoked",
        "is_revoked",
    )


def _signal_present(context: dict[str, object], *keys: str) -> bool:
    for key in keys:
        value = context.get(key)
        if isinstance(value, bool) and value:
            return True
        if isinstance(value, str) and value.strip().lower() in {"true", "1", "yes", "y"}:
            return True
        if isinstance(value, (int, float)) and float(value) > 0:
            return True
    return False


def _context_float(context: dict[str, object], *keys: str, default: float) -> float:
    for key in keys:
        if key not in context:
            continue
        try:
            return _clip01(float(context[key]))
        except (TypeError, ValueError):
            continue
    return _clip01(default)


def _coerce_dict(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    return {}


def _snort_has_flat_replayable_network_evidence(
    *,
    package: dict[str, object] | None,
    raw_hit_payload: dict[str, object],
    rule_metadata: dict[str, object],
    object_metadata: dict[str, object],
) -> bool:
    if not raw_hit_payload and package:
        raw_hit_payload = _snort_flat_payload_from_package(package)
    src_ip = _first_text(
        raw_hit_payload.get("src_ip"),
        raw_hit_payload.get("source_ip"),
        raw_hit_payload.get("src"),
    )
    dst_ip = _first_text(
        raw_hit_payload.get("dst_ip"),
        raw_hit_payload.get("destination_ip"),
        raw_hit_payload.get("dst"),
    )
    src_port = _first_text(
        raw_hit_payload.get("src_port"),
        raw_hit_payload.get("source_port"),
        raw_hit_payload.get("sport"),
    )
    dst_port = _first_scalar_text(
        raw_hit_payload.get("dst_port"),
        raw_hit_payload.get("destination_port"),
        raw_hit_payload.get("dport"),
    )
    protocol = _first_text(
        raw_hit_payload.get("protocol"),
        raw_hit_payload.get("proto"),
        rule_metadata.get("protocol"),
    )
    custom_attributes = _coerce_dict(object_metadata.get("custom_attributes"))
    flow_id = _first_text(
        raw_hit_payload.get("flow_id"),
        custom_attributes.get("flow_id"),
    )
    replayable_context = (
        _coerce_dict(raw_hit_payload.get("http_headers"))
        or _coerce_dict(raw_hit_payload.get("tls"))
        or _has_text(raw_hit_payload.get("query_name"))
        or _has_text(raw_hit_payload.get("uri"))
        or _has_text(raw_hit_payload.get("http_uri"))
        or _has_text(raw_hit_payload.get("uri_path"))
    )

    has_tuple_anchor = _has_text(src_ip) and _has_text(dst_ip)
    has_replayable_detail = any(
        (
            _has_text(src_port),
            _has_text(dst_port),
            _has_text(protocol),
            _has_text(flow_id),
            bool(replayable_context),
        )
    )
    return has_tuple_anchor and has_replayable_detail


def _snort_flat_payload_from_package(package: dict[str, object]) -> dict[str, object]:
    alert = _coerce_dict(package.get("alert"))
    alert_rule = _coerce_dict(alert.get("rule"))
    flow = _coerce_dict(package.get("flow"))
    pcap = _coerce_dict(package.get("pcap"))

    payload: dict[str, object] = {}
    if alert:
        payload.update(
            {
                "event_id": alert.get("event_id"),
                "timestamp": alert.get("timestamp"),
                "sensor": alert.get("sensor"),
                "src_ip": alert.get("src_ip"),
                "src_port": alert.get("src_port"),
                "dst_ip": alert.get("dst_ip"),
                "dst_port": alert.get("dst_port"),
                "flow": alert.get("flow"),
                "threshold": alert.get("threshold"),
                "message": alert_rule.get("msg"),
                "protocol": alert.get("protocol") or alert_rule.get("protocol"),
            }
        )
    if flow:
        payload.update(
            {
                "flow_id": flow.get("flow_id"),
                "src_ip": flow.get("src_ip") or payload.get("src_ip"),
                "src_port": flow.get("src_port") or payload.get("src_port"),
                "dst_ip": flow.get("dst_ip") or payload.get("dst_ip"),
                "dst_port": flow.get("dst_port") or payload.get("dst_port"),
                "protocol": flow.get("protocol") or payload.get("protocol"),
                "direction": flow.get("directionality"),
                "observed_at": flow.get("observed_at"),
            }
        )
    if pcap:
        payload["pcap_metadata"] = pcap
    return {key: value for key, value in payload.items() if value is not None}


def _first_text(*values: object) -> str | None:
    for value in values:
        if _has_text(value):
            return str(value).strip()
    return None


def _first_scalar_text(*values: object) -> str | None:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            if value.strip():
                return value.strip()
            continue
        if isinstance(value, (int, float)):
            return str(value)
    return None


def _has_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _merge_unique_text(values: list[str]) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for item in values:
        text = str(item).strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(text)
    return output


def _resolved_family(request: ScoreCaseRequest) -> str:
    if isinstance(request.detection_package, dict):
        family = request.detection_package.get("rule_family")
        if isinstance(family, str) and family.strip():
            return family.strip().lower()
    for key in ("rule_family", "ruleFamily"):
        family = request.rule_context.get(key)
        if isinstance(family, str) and family.strip():
            return family.strip().lower()
    return "unknown"


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)


