from __future__ import annotations

from typing import Any

from .contracts import (
    CaseScoreVectorResponse,
    DecisionProvenanceItemResponse,
    DecisionVerdict,
    EvidenceFusionExplanationResponse,
    PromotionSuppressionDecisionResponse,
    ScoreCaseRequest,
)

MALICIOUS_ANALYST_VERDICTS = {
    "confirmed_malicious",
    "likely_malicious",
    "true_positive",
    "escalated",
    "malicious",
    "suspicious",
}
BENIGN_ANALYST_VERDICTS = {
    "false_positive",
    "benign",
    "likely_benign",
    "allowlisted",
}
MALICIOUS_LIKE_VERDICTS = {"malicious", "likely_malicious", "suspicious"}
BENIGN_LIKE_VERDICTS = {"benign", "likely_benign", "false_positive"}


def build_promotion_suppression_decision(
    *,
    verdict: DecisionVerdict,
    confidence: float,
    false_positive_risk: float,
    score: CaseScoreVectorResponse,
    request: ScoreCaseRequest,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    provenance: list[DecisionProvenanceItemResponse],
) -> PromotionSuppressionDecisionResponse:
    contradiction_ratio = _contradiction_ratio(score=score, evidence_fusion=evidence_fusion)
    missing_ratio = _missing_ratio(score=score, evidence_fusion=evidence_fusion)
    coverage_ratio = _coverage_ratio(request=request, evidence_fusion=evidence_fusion)
    provenance_ratio = _clip01(len(provenance) / 10.0)
    timeliness = _timeliness(score=score, request=request)
    environment_relevance = _environment_relevance(request=request)
    source_diversity = _source_diversity(request=request, evidence_fusion=evidence_fusion)
    positive_ratio = _positive_ratio(score=score, evidence_fusion=evidence_fusion)
    corroboration = _clip01(0.60 * source_diversity + 0.40 * positive_ratio)
    analyst_support_malicious, analyst_support_benign, analyst_conflict = _analyst_signals(request=request)
    allowlist_signal = _allowlist_signal(request=request)
    stale_signal = _stale_signal(verdict=verdict, request=request)

    evidence_strength = _clip01(
        0.50 * confidence
        + 0.30 * (1.0 - false_positive_risk)
        + 0.20 * (1.0 - contradiction_ratio)
    )
    reproducibility = _clip01(
        0.40 * coverage_ratio
        + 0.35 * provenance_ratio
        + 0.25 * (1.0 - missing_ratio)
    )

    promotion_score = _clip01(
        0.28 * confidence
        + 0.18 * evidence_strength
        + 0.14 * reproducibility
        + 0.12 * timeliness
        + 0.10 * environment_relevance
        + 0.12 * corroboration
        + 0.06 * analyst_support_malicious
        - 0.30 * false_positive_risk
        - 0.20 * analyst_support_benign
        - 0.10 * analyst_conflict
    )
    suppression_score = _clip01(
        0.24 * false_positive_risk
        + 0.20 * analyst_support_benign
        + 0.15 * (1.0 - evidence_strength)
        + 0.12 * (1.0 - corroboration)
        + 0.10 * (1.0 - reproducibility)
        + 0.08 * (1.0 - timeliness)
        + 0.06 * allowlist_signal
        + 0.05 * stale_signal
        - 0.18 * analyst_support_malicious
        - 0.15 * environment_relevance
    )
    review_pressure = _clip01(
        0.30 * (1.0 - confidence)
        + 0.20 * contradiction_ratio
        + 0.15 * missing_ratio
        + 0.15 * analyst_conflict
        + 0.10 * max(0.0, false_positive_risk - 0.55)
        + 0.10 * (1.0 - reproducibility)
    )

    if verdict == "stale_or_revoked" or timeliness <= 0.20:
        decision = "mark_stale_or_revoked"
        decision_confidence = _clip01(max(0.75, 1.0 - timeliness))
        role = None
        trigger = "stale/revoked or stale timeliness threshold triggered"
        signal_map = {
            "timeliness_decay": 1.0 - timeliness,
            "stale_signal": stale_signal,
            "suppression_score": suppression_score,
        }
    elif allowlist_signal > 0.0 and suppression_score >= 0.55:
        decision = "allowlist"
        decision_confidence = _clip01(max(0.60, suppression_score))
        role = None
        trigger = "explicit allowlist/baseline hit with suppression support"
        signal_map = {
            "allowlist_signal": allowlist_signal,
            "suppression_score": suppression_score,
            "false_positive_risk": false_positive_risk,
        }
    elif (
        verdict == "insufficient_evidence"
        or review_pressure >= 0.55
        or (abs(promotion_score - suppression_score) <= 0.10 and max(promotion_score, suppression_score) >= 0.55)
    ):
        decision = "needs_human_review"
        decision_confidence = _clip01(max(0.60, review_pressure))
        role = _required_reviewer_role(
            verdict=verdict,
            environment_relevance=environment_relevance,
            false_positive_risk=false_positive_risk,
            suppression_score=suppression_score,
            promotion_score=promotion_score,
        )
        trigger = "review pressure or ambiguity threshold triggered manual review"
        signal_map = {
            "review_pressure": review_pressure,
            "contradiction_ratio": contradiction_ratio,
            "missing_ratio": missing_ratio,
            "analyst_conflict": analyst_conflict,
        }
    elif (
        verdict in MALICIOUS_LIKE_VERDICTS
        and promotion_score >= 0.62
        and false_positive_risk <= 0.45
        and corroboration >= 0.45
    ):
        decision = "promote_to_indicator"
        decision_confidence = _clip01(promotion_score)
        role = None
        trigger = "malicious-like verdict met promotion guardrails"
        signal_map = {
            "promotion_score": promotion_score,
            "corroboration": corroboration,
            "evidence_strength": evidence_strength,
            "fp_safety": 1.0 - false_positive_risk,
        }
    elif verdict in BENIGN_LIKE_VERDICTS and suppression_score >= 0.62:
        decision = "suppress_as_benign"
        decision_confidence = _clip01(suppression_score)
        role = None
        trigger = "benign-like verdict met suppression guardrails"
        signal_map = {
            "suppression_score": suppression_score,
            "analyst_support_benign": analyst_support_benign,
            "false_positive_risk": false_positive_risk,
            "evidence_gap": 1.0 - evidence_strength,
        }
    else:
        decision = "keep_as_observable"
        decision_confidence = _clip01(0.50 + 0.50 * (1.0 - abs(promotion_score - suppression_score)))
        role = None
        trigger = "neither promotion nor suppression thresholds were met"
        signal_map = {
            "score_balance": 1.0 - abs(promotion_score - suppression_score),
            "promotion_score": promotion_score,
            "suppression_score": suppression_score,
        }

    rationale = _build_rationale(trigger=trigger, signal_map=signal_map)
    return PromotionSuppressionDecisionResponse(
        decision=decision,
        confidence=float(round(_clip01(decision_confidence), 6)),
        rationale=rationale,
        required_reviewer_role=role,
    )


def _required_reviewer_role(
    *,
    verdict: DecisionVerdict,
    environment_relevance: float,
    false_positive_risk: float,
    suppression_score: float,
    promotion_score: float,
) -> str:
    if verdict in MALICIOUS_LIKE_VERDICTS and environment_relevance >= 0.70:
        return "incident_responder"
    if false_positive_risk >= 0.60 or suppression_score > promotion_score:
        return "tier2_detection_engineer"
    return "tier1_analyst"


def _build_rationale(*, trigger: str, signal_map: dict[str, float]) -> str:
    strongest = sorted(signal_map.items(), key=lambda item: item[1], reverse=True)[:2]
    detail = ", ".join(f"{name}={value:.2f}" for name, value in strongest)
    if detail:
        return f"{trigger}; strongest_signals: {detail}."
    return f"{trigger}."


def _timeliness(*, score: CaseScoreVectorResponse, request: ScoreCaseRequest) -> float:
    explicit = score.feature_groups.get("temporal_signal")
    if explicit is not None:
        return _clip01(float(explicit))

    recency_bucket = _first_non_empty(
        request.rule_context.get("recency_bucket"),
        request.rule_context.get("recencyBucket"),
        request.host_context.get("recency_bucket"),
        request.host_context.get("recencyBucket"),
        _coerce_dict(_coerce_dict(request.detection_package).get("time_prevalence_context")).get("recency_bucket"),
    )
    mapping = {
        "new": 1.0,
        "recurring": 0.7,
        "persistent": 0.5,
        "stale": 0.2,
    }
    return _clip01(mapping.get((recency_bucket or "").strip().lower(), 0.5))


def _environment_relevance(*, request: ScoreCaseRequest) -> float:
    package = _coerce_dict(request.detection_package)
    asset_context = _coerce_dict(package.get("asset_context"))
    criticality_signal = max(
        _criticality_to_signal(request.host_context.get("criticality")),
        _criticality_to_signal(request.host_context.get("hostCriticality")),
        _criticality_to_signal(asset_context.get("criticality")),
    )
    prod_signal = _prod_signal(
        request.host_context.get("environment"),
        request.host_context.get("env"),
        asset_context.get("environment"),
    )
    return _clip01(0.70 * criticality_signal + 0.30 * prod_signal)


def _analyst_signals(*, request: ScoreCaseRequest) -> tuple[float, float, float]:
    outcomes = _coerce_list_of_dicts(
        _coerce_dict(_coerce_dict(request.detection_package).get("prior_analyst_outcomes")).get("outcomes")
    )
    if not outcomes:
        return 0.0, 0.0, 0.0

    malicious = 0
    benign = 0
    for outcome in outcomes:
        verdict = str(outcome.get("verdict", "")).strip().lower()
        if verdict in MALICIOUS_ANALYST_VERDICTS:
            malicious += 1
        elif verdict in BENIGN_ANALYST_VERDICTS:
            benign += 1
    total = max(1, malicious + benign)
    malicious_signal = _clip01(malicious / total)
    benign_signal = _clip01(benign / total)
    conflict_signal = 1.0 if malicious > 0 and benign > 0 else 0.0
    return malicious_signal, benign_signal, conflict_signal


def _allowlist_signal(*, request: ScoreCaseRequest) -> float:
    rule_context = request.rule_context
    package = _coerce_dict(request.detection_package)
    allowlist = _coerce_dict(package.get("allowlist_baseline_context"))

    rule_hit = any(
        _truthy(rule_context.get(key))
        for key in (
            "allowlistHit",
            "allowlist_hit",
            "knownBenign",
            "known_benign",
            "allowlisted",
            "baseline_match",
        )
    )
    allowlisted = _truthy(allowlist.get("allowlisted"))
    baseline_match = _truthy(allowlist.get("baseline_match"))
    if allowlisted and baseline_match:
        return 1.0
    if rule_hit and (allowlisted or baseline_match):
        return 0.85
    if allowlisted or baseline_match or rule_hit:
        return 0.65
    return 0.0


def _stale_signal(*, verdict: DecisionVerdict, request: ScoreCaseRequest) -> float:
    if verdict == "stale_or_revoked":
        return 1.0
    rule_context = request.rule_context
    if any(
        _truthy(rule_context.get(key))
        for key in ("staleIndicator", "stale_indicator", "revokedIndicator", "revoked_indicator", "isRevoked", "is_revoked")
    ):
        return 1.0
    metadata = _coerce_dict(_coerce_dict(request.detection_package).get("rule_metadata"))
    status = str(metadata.get("status", "")).strip().lower()
    if status in {"stale", "revoked", "expired", "deprecated"}:
        return 1.0
    if _truthy(metadata.get("revoked")) or _truthy(metadata.get("is_revoked")):
        return 1.0
    return 0.0


def _contradiction_ratio(*, score: CaseScoreVectorResponse, evidence_fusion: EvidenceFusionExplanationResponse | None) -> float:
    if evidence_fusion is not None:
        contradictory = len(evidence_fusion.contradictory_evidence)
        total = len(evidence_fusion.positive_evidence) + len(evidence_fusion.negative_evidence) + contradictory
        if total > 0:
            return _clip01(contradictory / total)
    return _clip01(float(score.feature_groups.get("evidence_conflict_signal", 0.0)))


def _missing_ratio(*, score: CaseScoreVectorResponse, evidence_fusion: EvidenceFusionExplanationResponse | None) -> float:
    if evidence_fusion is not None:
        return _clip01(len(evidence_fusion.missing_evidence) / 6.0)
    return _clip01(len(score.evidence_gaps) / 4.0)


def _coverage_ratio(*, request: ScoreCaseRequest, evidence_fusion: EvidenceFusionExplanationResponse | None) -> float:
    if evidence_fusion is not None and evidence_fusion.coverage:
        true_count = sum(1 for value in evidence_fusion.coverage.values() if value)
        return _clip01(true_count / max(1, len(evidence_fusion.coverage)))

    package = _coerce_dict(request.detection_package)
    checks = [
        bool(_coerce_dict(package.get("rule_metadata"))),
        bool(_coerce_dict(package.get("raw_hit_payload"))),
        bool(_coerce_dict(package.get("object_metadata"))),
        bool(_coerce_dict(package.get("asset_context"))),
        bool(_coerce_dict(package.get("time_prevalence_context"))),
        bool(_coerce_dict(package.get("allowlist_baseline_context"))),
        len(_coerce_list_of_dicts(_coerce_dict(package.get("linked_enrichment")).get("enrichments"))) > 0,
        len(_coerce_list_of_dicts(_coerce_dict(package.get("behavior_report_references")).get("reports"))) > 0,
        len(_coerce_list_of_dicts(_coerce_dict(package.get("prior_analyst_outcomes")).get("outcomes"))) > 0,
    ]
    return _clip01(sum(1 for present in checks if present) / len(checks))


def _source_diversity(*, request: ScoreCaseRequest, evidence_fusion: EvidenceFusionExplanationResponse | None) -> float:
    if evidence_fusion is not None:
        atoms = (
            list(evidence_fusion.positive_evidence)
            + list(evidence_fusion.negative_evidence)
            + list(evidence_fusion.contradictory_evidence)
        )
        if atoms:
            unique_sources = {str(item.source).strip().lower() for item in atoms if str(item.source).strip()}
            return _clip01(len(unique_sources) / max(1, min(4, len(atoms))))

    sightings = _float(
        request.rule_context.get("sightingsDistinctSources", request.rule_context.get("sightings_distinct_sources")),
        default=0.0,
    )
    if sightings <= 0.0:
        sightings = _float(
            request.rule_context.get("sightingsCount", request.rule_context.get("sightings_count")),
            default=0.0,
        )
    if sightings > 1.0:
        sightings = sightings / 5.0
    return _clip01(sightings)


def _positive_ratio(*, score: CaseScoreVectorResponse, evidence_fusion: EvidenceFusionExplanationResponse | None) -> float:
    if evidence_fusion is not None:
        positive = len(evidence_fusion.positive_evidence)
        total = positive + len(evidence_fusion.negative_evidence) + len(evidence_fusion.contradictory_evidence)
        if total > 0:
            return _clip01(positive / total)
    return _clip01(float(score.feature_groups.get("sightings_signal", 0.0)))


def _criticality_to_signal(value: Any) -> float:
    if isinstance(value, (int, float)):
        numeric = float(value)
        if numeric > 1.0:
            return _clip01(numeric / 5.0)
        return _clip01(numeric)
    text = _first_non_empty(value)
    if text is None:
        return 0.0
    mapping = {
        "low": 0.25,
        "medium": 0.50,
        "high": 0.75,
        "critical": 1.0,
        "prod_critical": 1.0,
    }
    return _clip01(mapping.get(text.strip().lower(), 0.0))


def _prod_signal(*values: Any) -> float:
    for value in values:
        text = _first_non_empty(value)
        if text is None:
            continue
        if text.strip().lower() in {"prod", "production"}:
            return 1.0
    return 0.0


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return float(value) > 0.0
    text = _first_non_empty(value)
    if text is None:
        return False
    return text.strip().lower() in {"true", "1", "yes", "y"}


def _first_non_empty(*values: Any) -> str | None:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _coerce_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _coerce_list_of_dicts(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _float(value: Any, *, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)
