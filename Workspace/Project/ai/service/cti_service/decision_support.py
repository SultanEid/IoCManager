from __future__ import annotations

from .contracts import (
    CaseScoreVectorResponse,
    DecisionProvenanceItemResponse,
    DecisionVerdict,
    GroundedDecisionResponse,
    ScoreCaseRequest,
)
from .scorer import BaselineScorer

CONFIRMED_MALICIOUS_MIN = 0.85
LIKELY_MALICIOUS_MIN = 0.62
LIKELY_BENIGN_MAX = 0.20

CONFIRMED_UNCERTAINTY_MAX = 0.18
LIKELY_UNCERTAINTY_MAX = 0.35
BENIGN_UNCERTAINTY_MAX = 0.22

CONFIRMED_CONFLICT_MAX = 0.20
LIKELY_CONFLICT_MAX = 0.45
BENIGN_CONFLICT_MAX = 0.20

CONFIRMED_SCANNER_MIN = 0.70
CONFIRMED_SIGHTINGS_MIN = 0.45
CONFIRMED_TRUST_MIN = 0.55
BENIGN_TRUST_MIN = 0.55
BENIGN_SIGHTINGS_MIN = 0.30

INSUFFICIENT_UNCERTAINTY_MIN = 0.42
INSUFFICIENT_CONFLICT_MIN = 0.55
INSUFFICIENT_TRUST_MAX = 0.20
INSUFFICIENT_SIGHTINGS_MAX = 0.15


def recommend_action(scorer: BaselineScorer, request: ScoreCaseRequest) -> GroundedDecisionResponse:
    score = scorer.score_case(request)
    return build_grounded_decision(score, request)


def request_more_evidence(scorer: BaselineScorer, request: ScoreCaseRequest) -> GroundedDecisionResponse:
    score = scorer.score_case(request)
    return build_grounded_decision(score, request)


def build_grounded_decision(score: CaseScoreVectorResponse, request: ScoreCaseRequest) -> GroundedDecisionResponse:
    rule = request.rule_context
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

    uncertainty = score.uncertainty_score
    maliciousness = score.maliciousness_score
    non_string_corroborated = _has_non_string_corroboration(request, scanner_agreement, sightings, source_trust)

    verdict = _select_verdict(
        maliciousness=maliciousness,
        uncertainty=uncertainty,
        conflict=conflict,
        source_trust=source_trust,
        scanner_agreement=scanner_agreement,
        sightings=sightings,
        non_string_corroborated=non_string_corroborated,
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

    return GroundedDecisionResponse(
        verdict=verdict,
        action=action,
        confidence=float(round(confidence, 6)),
        provenance=_provenance(score=score, request=request),
        reasons=_reasons(
            verdict=verdict,
            action=action,
            maliciousness=maliciousness,
            uncertainty=uncertainty,
            conflict=conflict,
            source_trust=source_trust,
            scanner_agreement=scanner_agreement,
            sightings=sightings,
            non_string_corroborated=non_string_corroborated,
        ),
        abstain_reason=abstain_reason,
        next_best_evidence=_next_best_evidence(score=score, verdict=verdict),
    )


def _select_verdict(
    maliciousness: float,
    uncertainty: float,
    conflict: float,
    source_trust: float,
    scanner_agreement: float,
    sightings: float,
    non_string_corroborated: bool,
) -> DecisionVerdict:
    if (
        maliciousness >= CONFIRMED_MALICIOUS_MIN
        and uncertainty <= CONFIRMED_UNCERTAINTY_MAX
        and conflict <= CONFIRMED_CONFLICT_MAX
        and scanner_agreement >= CONFIRMED_SCANNER_MIN
        and sightings >= CONFIRMED_SIGHTINGS_MIN
        and source_trust >= CONFIRMED_TRUST_MIN
        and non_string_corroborated
    ):
        return "confirmed_malicious"

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

    if verdict == "confirmed_malicious":
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

    if verdict == "likely_benign":
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

    if verdict == "confirmed_malicious":
        return _clip01(maliciousness * (1.0 - uncertainty) * (1.0 - conflict) * (0.70 + 0.30 * corroboration))
    if verdict == "likely_malicious":
        return _clip01(maliciousness * (1.0 - uncertainty) * (0.55 + 0.45 * corroboration))
    if verdict == "likely_benign":
        benign_signal = (1.0 - maliciousness) * (1.0 - uncertainty) * (1.0 - conflict)
        return _clip01(benign_signal * (0.50 + 0.50 * corroboration))

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

    if verdict == "insufficient_evidence":
        reasons.append("decision abstained until stronger corroborated evidence is collected")
    else:
        reasons.append(f"action={action} selected for controlled operational response")

    return reasons[:4]


def _provenance(score: CaseScoreVectorResponse, request: ScoreCaseRequest) -> list[DecisionProvenanceItemResponse]:
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

    return output


def _next_best_evidence(score: CaseScoreVectorResponse, verdict: DecisionVerdict) -> list[str]:
    if score.next_best_evidence:
        return list(dict.fromkeys(score.next_best_evidence))[:4]
    if verdict == "insufficient_evidence":
        return ["collect_independent_high_trust_corroboration"]
    return ["collect_post_action_validation_signals"]


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
) -> bool:
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
        scanner_agreement >= CONFIRMED_SCANNER_MIN
        and sightings >= CONFIRMED_SIGHTINGS_MIN
        and source_trust >= CONFIRMED_TRUST_MIN
    )


def _rollback_signal_present(request: ScoreCaseRequest) -> bool:
    for key in ("rollbackRequired", "rollback_required", "postDeployRegression", "post_deploy_regression"):
        value = request.rule_context.get(key)
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


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)
