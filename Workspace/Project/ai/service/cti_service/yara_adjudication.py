from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .contracts import DecisionVerdict


@dataclass(frozen=True, slots=True)
class YaraEvidenceBucketScores:
    positive_score: float
    negative_score: float
    contradictory_score: float
    missing_score: float


@dataclass(frozen=True, slots=True)
class YaraAdjudicationResult:
    verdict: DecisionVerdict
    confidence: float
    false_positive_risk: float
    abstain_reason: str | None
    explanation: str
    explanation_lines: list[str]
    suggested_next_checks: list[str]
    bucket_scores: YaraEvidenceBucketScores
    interpretable_features: dict[str, float]
    lexical_only_gate_triggered: bool
    non_lexical_corroborated: bool


@dataclass(frozen=True, slots=True)
class _NormalizedYaraInput:
    rule_text: str
    rule_metadata: dict[str, Any]
    match_details: dict[str, Any]
    file_metadata: dict[str, Any]
    signer_publisher: dict[str, Any]
    prevalence: dict[str, Any]
    prior_clean_environment_hits: float
    linked_enrichment: list[dict[str, Any]]
    behavior_reports: list[dict[str, Any]]
    prior_analyst_outcomes: list[dict[str, Any]]
    related_detections: list[dict[str, Any]]
    historical_learning_features: dict[str, float]
    stale_or_revoked_signal: float
    explicit_false_positive_signal: float


MALICIOUS_TOKENS = (
    "malicious",
    "trojan",
    "ransom",
    "inject",
    "credential",
    "lsass",
    "c2",
    "beacon",
    "obfuscat",
    "stealer",
    "dropper",
)
BENIGN_TOKENS = (
    "benign",
    "updater",
    "maintenance",
    "approved",
    "allowlist",
    "known_good",
    "remote_support",
    "helpdesk",
)
HIGH_RISK_ENRICHMENT_TOKENS = (
    "malicious",
    "high",
    "trojan",
    "ransom",
    "credential_access",
    "impact",
)
BENIGN_ENRICHMENT_TOKENS = (
    "benign",
    "approved",
    "known_good",
    "allowlisted",
    "trusted",
)


def adjudicate_yara(
    *,
    detection_package: dict[str, Any] | None,
    evidence_fusion: Any | None = None,
    historical_learning_features: dict[str, float] | None = None,
) -> YaraAdjudicationResult:
    package = detection_package if isinstance(detection_package, dict) else {}
    normalized = _normalize_input(package, historical_learning_features=historical_learning_features)
    features = _extract_features(normalized=normalized, evidence_fusion=evidence_fusion)
    scores = _score_buckets(features)

    lexical_signal = max(features["lexical_malicious_signal"], features["lexical_benign_signal"])
    non_lexical_corroborated = _non_lexical_corroboration(features)
    lexical_only_gate_triggered = lexical_signal >= 0.20 and not non_lexical_corroborated

    verdict, abstain_reason = _classify_verdict(
        scores=scores,
        features=features,
        lexical_only_gate_triggered=lexical_only_gate_triggered,
        stale_or_revoked_signal=normalized.stale_or_revoked_signal,
        explicit_false_positive_signal=normalized.explicit_false_positive_signal,
    )
    confidence = _confidence(verdict=verdict, scores=scores)
    false_positive_risk = _false_positive_risk(verdict=verdict, scores=scores, confidence=confidence)
    checks = _suggested_next_checks(features=features, scores=scores, lexical_only_gate_triggered=lexical_only_gate_triggered)
    explanation_lines = _explanation_lines(
        verdict=verdict,
        scores=scores,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        abstain_reason=abstain_reason,
        lexical_only_gate_triggered=lexical_only_gate_triggered,
        non_lexical_corroborated=non_lexical_corroborated,
    )

    return YaraAdjudicationResult(
        verdict=verdict,
        confidence=float(round(_clip01(confidence), 6)),
        false_positive_risk=float(round(_clip01(false_positive_risk), 6)),
        abstain_reason=abstain_reason,
        explanation=" ".join(explanation_lines),
        explanation_lines=explanation_lines,
        suggested_next_checks=checks,
        bucket_scores=YaraEvidenceBucketScores(
            positive_score=float(round(scores.positive_score, 6)),
            negative_score=float(round(scores.negative_score, 6)),
            contradictory_score=float(round(scores.contradictory_score, 6)),
            missing_score=float(round(scores.missing_score, 6)),
        ),
        interpretable_features={key: float(round(value, 6)) for key, value in sorted(features.items(), key=lambda item: item[0])},
        lexical_only_gate_triggered=lexical_only_gate_triggered,
        non_lexical_corroborated=non_lexical_corroborated,
    )


def _normalize_input(
    package: dict[str, Any],
    *,
    historical_learning_features: dict[str, float] | None = None,
) -> _NormalizedYaraInput:
    rule_metadata = _coerce_dict(package.get("rule_metadata"))
    raw_hit = _coerce_dict(package.get("raw_hit_payload"))
    object_metadata = _coerce_dict(package.get("object_metadata"))
    allowlist = _coerce_dict(package.get("allowlist_baseline_context"))
    prevalence = _coerce_dict(package.get("time_prevalence_context"))
    linked_enrichment = _coerce_list_of_dicts(_coerce_dict(package.get("linked_enrichment")).get("enrichments"))
    behavior_reports = _coerce_list_of_dicts(_coerce_dict(package.get("behavior_report_references")).get("reports"))
    prior_outcomes = _coerce_list_of_dicts(_coerce_dict(package.get("prior_analyst_outcomes")).get("outcomes"))
    related_detections = _coerce_list_of_dicts(_coerce_dict(package.get("related_detections")).get("detections"))
    historical_context = _coerce_dict(package.get("historical_learning_context"))
    historical_feature_map = _coerce_float_map(historical_context.get("features"))
    if historical_learning_features:
        for key, value in historical_learning_features.items():
            try:
                historical_feature_map[str(key)] = float(value)
            except (TypeError, ValueError):
                continue

    signer = _first_non_empty(
        raw_hit.get("signer"),
        raw_hit.get("certificate_subject"),
        _coerce_dict(object_metadata.get("custom_attributes")).get("signer"),
    )
    publisher = _first_non_empty(
        raw_hit.get("publisher"),
        _coerce_dict(object_metadata.get("custom_attributes")).get("publisher"),
    )
    signature_valid = _coerce_bool(raw_hit.get("signature_valid"))
    signed = _coerce_bool(raw_hit.get("is_signed"))

    prior_clean_hits = 0.0
    if _truthy(allowlist.get("allowlisted")):
        prior_clean_hits += 1.0
    if _truthy(allowlist.get("baseline_match")):
        prior_clean_hits += 1.0
    for outcome in prior_outcomes:
        verdict = str(outcome.get("verdict", "")).strip().lower()
        if verdict in {"false_positive", "benign", "likely_benign"}:
            prior_clean_hits += 1.0

    stale_or_revoked_signal = 0.0
    status = str(rule_metadata.get("status", "")).strip().lower()
    if status in {"revoked", "stale", "expired", "deprecated"}:
        stale_or_revoked_signal = 1.0
    if _truthy(rule_metadata.get("revoked")) or _truthy(rule_metadata.get("is_revoked")):
        stale_or_revoked_signal = 1.0

    explicit_false_positive_signal = 0.0
    if _truthy(allowlist.get("allowlisted")) and _truthy(allowlist.get("baseline_match")):
        explicit_false_positive_signal = 1.0

    match_details = {
        "matched_strings": _coerce_list_of_strings(raw_hit.get("matched_strings")),
        "match_count": _float(raw_hit.get("match_count"), default=0.0),
    }
    if match_details["match_count"] <= 0 and match_details["matched_strings"]:
        match_details["match_count"] = float(len(match_details["matched_strings"]))

    file_metadata = {
        "object_id": _first_non_empty(object_metadata.get("object_id")),
        "object_type": _first_non_empty(object_metadata.get("object_type")),
        "target_path": _first_non_empty(raw_hit.get("target_path")),
        "source_system": _first_non_empty(object_metadata.get("source_system")),
    }

    signer_publisher = {
        "signer": signer,
        "publisher": publisher,
        "signature_valid": signature_valid,
        "signed": signed,
    }

    return _NormalizedYaraInput(
        rule_text=_first_non_empty(package.get("full_rule_text")) or "",
        rule_metadata=rule_metadata,
        match_details=match_details,
        file_metadata=file_metadata,
        signer_publisher=signer_publisher,
        prevalence=prevalence,
        prior_clean_environment_hits=prior_clean_hits,
        linked_enrichment=linked_enrichment,
        behavior_reports=behavior_reports,
        prior_analyst_outcomes=prior_outcomes,
        related_detections=related_detections,
        historical_learning_features=historical_feature_map,
        stale_or_revoked_signal=stale_or_revoked_signal,
        explicit_false_positive_signal=explicit_false_positive_signal,
    )


def _extract_features(
    *,
    normalized: _NormalizedYaraInput,
    evidence_fusion: Any | None,
) -> dict[str, float]:
    text_blob = " ".join(
        part
        for part in (
            normalized.rule_text,
            " ".join(_coerce_list_of_strings(normalized.rule_metadata.get("tags"))),
            _first_non_empty(normalized.rule_metadata.get("description")) or "",
            _first_non_empty(normalized.rule_metadata.get("rule_name"), normalized.rule_metadata.get("title")) or "",
            " ".join(_coerce_list_of_strings(normalized.match_details.get("matched_strings"))),
        )
        if part
    ).lower()

    lexical_malicious_signal = _clip01(_token_count(text_blob, MALICIOUS_TOKENS) / 5.0)
    lexical_benign_signal = _clip01(_token_count(text_blob, BENIGN_TOKENS) / 4.0)

    match_strength_signal = _clip01(_float(normalized.match_details.get("match_count"), default=0.0) / 6.0)
    missing_match_details_signal = 0.0 if (normalized.match_details.get("matched_strings") or match_strength_signal > 0) else 1.0

    behavior_count = len(normalized.behavior_reports)
    behavior_malicious_markers = 0
    signer_contradictions = 0
    for report in normalized.behavior_reports:
        summary = str(report.get("summary", "")).lower()
        behavior_malicious_markers += _token_count(summary, MALICIOUS_TOKENS)
        extracted = _coerce_dict(report.get("extracted_behavior_features"))
        behavior_malicious_markers += len(_coerce_list_of_strings(extracted.get("suspicious_api_system_call_families")))
        behavior_malicious_markers += len(_coerce_list_of_strings(extracted.get("persistence_indicators")))
        behavior_malicious_markers += len(_coerce_list_of_strings(extracted.get("injected_processes")))
        behavior_malicious_markers += len(_coerce_list_of_strings(extracted.get("suspicious_script_interpreter_usage")))
        signer_contradictions += len(_coerce_list_of_dicts(extracted.get("signer_publisher_contradictions")))
    behavior_malicious_signal = _clip01((float(behavior_count) * 0.2) + (float(behavior_malicious_markers) / 10.0))

    enrichment_malicious_markers = 0
    enrichment_benign_markers = 0
    for item in normalized.linked_enrichment:
        kind = str(item.get("kind", "")).lower()
        blob = f"{kind} {item.get('value')}".lower()
        enrichment_malicious_markers += _token_count(blob, HIGH_RISK_ENRICHMENT_TOKENS)
        enrichment_benign_markers += _token_count(blob, BENIGN_ENRICHMENT_TOKENS)
    enrichment_malicious_signal = _clip01(float(enrichment_malicious_markers) / 4.0)
    enrichment_benign_signal = _clip01(float(enrichment_benign_markers) / 3.0)
    mixed_enrichment_signal = _clip01(min(enrichment_malicious_signal, enrichment_benign_signal) * 1.25)

    analyst_malicious = 0
    analyst_benign = 0
    for outcome in normalized.prior_analyst_outcomes:
        verdict = str(outcome.get("verdict", "")).strip().lower()
        if verdict in {"confirmed_malicious", "likely_malicious", "true_positive", "escalated", "malicious"}:
            analyst_malicious += 1
        elif verdict in {"false_positive", "benign", "likely_benign"}:
            analyst_benign += 1
    analyst_total = max(1, analyst_malicious + analyst_benign)
    analyst_malicious_signal = _clip01(analyst_malicious / analyst_total)
    analyst_benign_signal = _clip01(analyst_benign / analyst_total)
    analyst_conflict_signal = 1.0 if analyst_malicious > 0 and analyst_benign > 0 else 0.0

    supporting_related = 0
    contradictory_related = 0
    benign_related = 0
    for detection in normalized.related_detections:
        relation = str(detection.get("relation_type", "")).strip().lower()
        if relation in {"supporting_signal", "same_rule", "same_campaign", "same_object", "same_asset"}:
            supporting_related += 1
        elif relation == "contradictory_signal":
            contradictory_related += 1
        elif relation in {"benign", "allowlisted"}:
            benign_related += 1
    related_total = max(1, supporting_related + contradictory_related + benign_related)
    related_supporting_signal = _clip01(supporting_related / related_total)
    related_contradictory_signal = _clip01(contradictory_related / related_total)
    related_benign_signal = _clip01(benign_related / related_total)

    trusted_signer_signal = 0.0
    signer = str(normalized.signer_publisher.get("signer", "")).lower()
    publisher = str(normalized.signer_publisher.get("publisher", "")).lower()
    if any(token in signer for token in ("microsoft", "google", "apple", "adobe")):
        trusted_signer_signal = max(trusted_signer_signal, 0.7)
    if any(token in publisher for token in ("microsoft", "google", "apple", "adobe")):
        trusted_signer_signal = max(trusted_signer_signal, 0.7)
    if normalized.signer_publisher.get("signature_valid") is True:
        trusted_signer_signal = max(trusted_signer_signal, 1.0)

    signer_publisher_contradiction_signal = _clip01(float(signer_contradictions) / 2.0)
    if normalized.signer_publisher.get("signed") is True and normalized.signer_publisher.get("signature_valid") is False:
        signer_publisher_contradiction_signal = max(signer_publisher_contradiction_signal, 1.0)

    hit_count_24h = _float(normalized.prevalence.get("hit_count_24h"), default=0.0)
    hit_count_7d = _float(normalized.prevalence.get("hit_count_7d"), default=0.0)
    prevalence_ratio = _float(normalized.prevalence.get("prevalence_ratio"), default=0.0)
    trend = str(normalized.prevalence.get("trend", "")).lower()
    recency_bucket = str(normalized.prevalence.get("recency_bucket", "")).lower()

    has_prevalence_context = bool(normalized.prevalence)
    rare_emergent_prevalence_signal = 0.0
    if has_prevalence_context:
        if prevalence_ratio <= 0.01 and hit_count_7d <= 5:
            rare_emergent_prevalence_signal = 0.7
        if trend == "increasing" and recency_bucket == "new":
            rare_emergent_prevalence_signal = max(rare_emergent_prevalence_signal, 1.0)

    common_prevalence_signal = 0.0
    if has_prevalence_context:
        if hit_count_24h >= 10 or hit_count_7d >= 100:
            common_prevalence_signal = 0.7
        if prevalence_ratio >= 0.10 and trend in {"stable", "decreasing"}:
            common_prevalence_signal = max(common_prevalence_signal, 1.0)

    clean_environment_signal = _clip01(normalized.prior_clean_environment_hits / 3.0)
    if clean_environment_signal > 0.0 and common_prevalence_signal > 0.0:
        clean_environment_signal = _clip01(clean_environment_signal + 0.15)

    critical_asset_signal = 0.0
    criticality = str(_coerce_dict(normalized.rule_metadata.get("asset_context")).get("criticality", "")).lower()
    if not criticality:
        criticality = str(_coerce_dict(normalized.prevalence).get("criticality", "")).lower()
    if criticality in {"high", "critical"}:
        critical_asset_signal = 1.0

    missing_behavior_evidence_signal = 0.0 if behavior_count > 0 else 1.0
    missing_enrichment_signal = 0.0 if normalized.linked_enrichment else 1.0
    missing_analyst_history_signal = 0.0 if normalized.prior_analyst_outcomes else 1.0
    missing_prevalence_signal = 0.0 if normalized.prevalence else 1.0
    missing_file_metadata_signal = 0.0 if normalized.file_metadata.get("object_id") or normalized.file_metadata.get("target_path") else 1.0
    missing_signer_publisher_signal = 0.0 if normalized.signer_publisher.get("signer") or normalized.signer_publisher.get("publisher") else 1.0

    fusion_contradictory_ratio = _fusion_ratio(evidence_fusion, "contradictory")
    fusion_missing_ratio = _fusion_ratio(evidence_fusion, "missing")
    history_support_signal = _historical_feature(normalized.historical_learning_features, "history_support_signal")
    history_benign_pressure_signal = _historical_feature(normalized.historical_learning_features, "history_benign_pressure_signal")
    history_conflict_signal = _historical_feature(normalized.historical_learning_features, "history_conflict_rate")
    history_sample_size_signal = _historical_feature(normalized.historical_learning_features, "history_sample_size_signal")
    history_recency_signal = _historical_feature(normalized.historical_learning_features, "history_recency_signal")
    history_recommendation_accept_signal = _historical_feature(
        normalized.historical_learning_features, "history_recommendation_accept_rate"
    )
    history_recommendation_reject_signal = _historical_feature(
        normalized.historical_learning_features, "history_recommendation_reject_rate"
    )
    history_post_action_regression_signal = _historical_feature(
        normalized.historical_learning_features, "history_post_action_regression_rate"
    )
    history_rollback_signal = _historical_feature(normalized.historical_learning_features, "history_rollback_rate")
    history_allowlist_signal = _historical_feature(normalized.historical_learning_features, "history_allowlist_rate")
    history_suppression_signal = _historical_feature(normalized.historical_learning_features, "history_suppression_rate")

    features = {
        "lexical_malicious_signal": lexical_malicious_signal,
        "lexical_benign_signal": lexical_benign_signal,
        "match_strength_signal": match_strength_signal,
        "behavior_malicious_signal": behavior_malicious_signal,
        "enrichment_malicious_signal": enrichment_malicious_signal,
        "enrichment_benign_signal": enrichment_benign_signal,
        "mixed_enrichment_signal": mixed_enrichment_signal,
        "analyst_malicious_signal": analyst_malicious_signal,
        "analyst_benign_signal": analyst_benign_signal,
        "analyst_conflict_signal": analyst_conflict_signal,
        "related_supporting_signal": related_supporting_signal,
        "related_contradictory_signal": related_contradictory_signal,
        "related_benign_signal": related_benign_signal,
        "trusted_signer_signal": trusted_signer_signal,
        "signer_publisher_contradiction_signal": signer_publisher_contradiction_signal,
        "rare_emergent_prevalence_signal": rare_emergent_prevalence_signal,
        "common_prevalence_signal": common_prevalence_signal,
        "clean_environment_signal": clean_environment_signal,
        "critical_asset_signal": critical_asset_signal,
        "missing_match_details_signal": missing_match_details_signal,
        "missing_behavior_evidence_signal": missing_behavior_evidence_signal,
        "missing_enrichment_signal": missing_enrichment_signal,
        "missing_analyst_history_signal": missing_analyst_history_signal,
        "missing_prevalence_signal": missing_prevalence_signal,
        "missing_file_metadata_signal": missing_file_metadata_signal,
        "missing_signer_publisher_signal": missing_signer_publisher_signal,
        "fusion_contradictory_ratio": fusion_contradictory_ratio,
        "fusion_missing_ratio": fusion_missing_ratio,
        "history_support_signal": history_support_signal,
        "history_benign_pressure_signal": history_benign_pressure_signal,
        "history_conflict_signal": history_conflict_signal,
        "history_sample_size_signal": history_sample_size_signal,
        "history_recency_signal": history_recency_signal,
        "history_recommendation_accept_signal": history_recommendation_accept_signal,
        "history_recommendation_reject_signal": history_recommendation_reject_signal,
        "history_post_action_regression_signal": history_post_action_regression_signal,
        "history_rollback_signal": history_rollback_signal,
        "history_allowlist_signal": history_allowlist_signal,
        "history_suppression_signal": history_suppression_signal,
    }
    return {key: _clip01(value) for key, value in features.items()}


def _score_buckets(features: dict[str, float]) -> YaraEvidenceBucketScores:
    positive = _clip01(
        0.26 * features["behavior_malicious_signal"]
        + 0.20 * features["enrichment_malicious_signal"]
        + 0.14 * features["analyst_malicious_signal"]
        + 0.10 * features["rare_emergent_prevalence_signal"]
        + 0.08 * features["related_supporting_signal"]
        + 0.08 * features["critical_asset_signal"]
        + 0.06 * features["match_strength_signal"]
        + 0.08 * features["lexical_malicious_signal"]
        + 0.08 * features["history_support_signal"]
        + 0.04 * features["history_recommendation_accept_signal"]
        + 0.03 * (features["history_sample_size_signal"] * features["history_recency_signal"])
    )
    negative = _clip01(
        0.30 * features["clean_environment_signal"]
        + 0.18 * features["analyst_benign_signal"]
        + 0.16 * features["enrichment_benign_signal"]
        + 0.10 * features["trusted_signer_signal"]
        + 0.12 * features["common_prevalence_signal"]
        + 0.06 * features["lexical_benign_signal"]
        + 0.08 * features["related_benign_signal"]
        + 0.10 * features["history_benign_pressure_signal"]
        + 0.05 * features["history_allowlist_signal"]
        + 0.04 * features["history_suppression_signal"]
        + 0.04 * features["history_recommendation_reject_signal"]
    )
    contradictory = _clip01(
        0.35 * features["analyst_conflict_signal"]
        + 0.25 * max(features["related_contradictory_signal"], features["fusion_contradictory_ratio"])
        + 0.20 * features["signer_publisher_contradiction_signal"]
        + 0.20 * features["mixed_enrichment_signal"]
        + 0.10 * features["history_conflict_signal"]
        + 0.06 * features["history_rollback_signal"]
        + 0.04 * features["history_post_action_regression_signal"]
    )
    missing = _clip01(
        0.24 * features["missing_behavior_evidence_signal"]
        + 0.20 * features["missing_enrichment_signal"]
        + 0.18 * features["missing_analyst_history_signal"]
        + 0.14 * features["missing_prevalence_signal"]
        + 0.12 * features["missing_match_details_signal"]
        + 0.06 * features["missing_file_metadata_signal"]
        + 0.06 * features["missing_signer_publisher_signal"]
    )
    missing = _clip01(max(missing, features["fusion_missing_ratio"]))

    return YaraEvidenceBucketScores(
        positive_score=positive,
        negative_score=negative,
        contradictory_score=contradictory,
        missing_score=missing,
    )


def _classify_verdict(
    *,
    scores: YaraEvidenceBucketScores,
    features: dict[str, float],
    lexical_only_gate_triggered: bool,
    stale_or_revoked_signal: float,
    explicit_false_positive_signal: float,
) -> tuple[DecisionVerdict, str | None]:
    if stale_or_revoked_signal >= 0.90:
        return "stale_or_revoked", None

    if lexical_only_gate_triggered:
        return "insufficient_evidence", "missing_non_string_corroboration"

    if (
        explicit_false_positive_signal >= 0.90
        and scores.negative_score >= 0.68
        and (features["trusted_signer_signal"] >= 0.80 or features["common_prevalence_signal"] >= 0.80)
    ):
        return "benign", None

    if explicit_false_positive_signal >= 0.90 and scores.positive_score < 0.55:
        return "false_positive", None

    if scores.missing_score >= 0.70:
        return "insufficient_evidence", "insufficient_correlated_evidence"
    if scores.contradictory_score >= 0.68:
        return "insufficient_evidence", "high_evidence_conflict"

    malicious_index = _clip01(
        0.55 * scores.positive_score
        + 0.15 * (1.0 - scores.negative_score)
        + 0.15 * (1.0 - scores.contradictory_score)
        + 0.15 * (1.0 - scores.missing_score)
    )
    benign_index = _clip01(
        0.55 * scores.negative_score
        + 0.20 * (1.0 - scores.positive_score)
        + 0.15 * (1.0 - scores.contradictory_score)
        + 0.10 * (1.0 - scores.missing_score)
    )

    if (
        malicious_index >= 0.80
        and scores.positive_score >= 0.72
        and scores.negative_score <= 0.45
        and scores.contradictory_score <= 0.40
        and scores.missing_score <= 0.45
    ):
        return "malicious", None

    if (
        malicious_index >= 0.68
        and scores.positive_score >= 0.58
        and scores.contradictory_score <= 0.52
        and scores.missing_score <= 0.58
    ):
        return "likely_malicious", None

    if malicious_index >= 0.54 and scores.positive_score >= 0.42 and scores.missing_score <= 0.62:
        return "suspicious", None

    if (
        benign_index >= 0.78
        and scores.negative_score >= 0.68
        and scores.positive_score <= 0.45
        and scores.contradictory_score <= 0.40
    ):
        return "benign", None

    if benign_index >= 0.62 and scores.negative_score >= 0.50 and scores.contradictory_score <= 0.55:
        return "likely_benign", None

    if scores.negative_score >= 0.72 and scores.positive_score <= 0.50 and scores.contradictory_score <= 0.45:
        return "false_positive", None

    if scores.negative_score >= 0.30 and scores.positive_score >= 0.30 and features["analyst_conflict_signal"] >= 0.5:
        return "insufficient_evidence", "high_evidence_conflict"

    return "insufficient_evidence", "insufficient_correlated_evidence"


def _confidence(*, verdict: DecisionVerdict, scores: YaraEvidenceBucketScores) -> float:
    if verdict in {"malicious", "likely_malicious", "suspicious"}:
        return _clip01(
            0.42 * scores.positive_score
            + 0.18 * (1.0 - scores.negative_score)
            + 0.20 * (1.0 - scores.contradictory_score)
            + 0.20 * (1.0 - scores.missing_score)
        )
    if verdict in {"benign", "likely_benign", "false_positive"}:
        return _clip01(
            0.42 * scores.negative_score
            + 0.18 * (1.0 - scores.positive_score)
            + 0.20 * (1.0 - scores.contradictory_score)
            + 0.20 * (1.0 - scores.missing_score)
        )
    if verdict == "stale_or_revoked":
        return _clip01(0.62 - 0.20 * scores.contradictory_score + 0.10 * (1.0 - scores.missing_score))
    return _clip01(
        0.28
        + 0.15 * max(scores.positive_score, scores.negative_score)
        - 0.25 * max(scores.contradictory_score, scores.missing_score)
    )


def _false_positive_risk(
    *,
    verdict: DecisionVerdict,
    scores: YaraEvidenceBucketScores,
    confidence: float,
) -> float:
    base = _clip01(
        0.45 * scores.contradictory_score
        + 0.30 * scores.missing_score
        + 0.15 * scores.negative_score
        + 0.10 * (1.0 - confidence)
    )
    if verdict in {"malicious", "likely_malicious", "suspicious"}:
        return _clip01(base + 0.20 * scores.negative_score - 0.10 * scores.positive_score)
    if verdict in {"benign", "likely_benign", "false_positive"}:
        return _clip01(base * 0.70 + 0.10 * scores.positive_score)
    if verdict == "stale_or_revoked":
        return _clip01(0.35 + 0.35 * scores.contradictory_score + 0.20 * scores.missing_score)
    return _clip01(base + 0.10)


def _suggested_next_checks(
    *,
    features: dict[str, float],
    scores: YaraEvidenceBucketScores,
    lexical_only_gate_triggered: bool,
) -> list[str]:
    checks: list[str] = []
    if lexical_only_gate_triggered:
        checks.append("Collect non-lexical corroboration (behavior telemetry or trusted enrichment) before adjudication.")
    if features["missing_behavior_evidence_signal"] >= 0.5:
        checks.append("Collect sandbox/behavior report evidence for the matched sample.")
    if features["missing_enrichment_signal"] >= 0.5:
        checks.append("Fetch linked enrichment (reputation/intel) and attach source confidence.")
    if features["missing_analyst_history_signal"] >= 0.5:
        checks.append("Review prior analyst outcomes for matching object/rule lineage.")
    if features["missing_prevalence_signal"] >= 0.5:
        checks.append("Compute environment prevalence and prior clean-environment hit baseline.")
    if scores.contradictory_score >= 0.45 or features["analyst_conflict_signal"] >= 0.5:
        checks.append("Resolve contradictory evidence across analyst history and related detections.")
    if features["signer_publisher_contradiction_signal"] >= 0.5:
        checks.append("Validate signer/publisher chain and signature integrity for the file artifact.")
    if not checks:
        checks.append("Collect post-decision validation telemetry for continuous calibration.")
    return _dedupe_texts(checks)[:5]


def _explanation_lines(
    *,
    verdict: DecisionVerdict,
    scores: YaraEvidenceBucketScores,
    confidence: float,
    false_positive_risk: float,
    abstain_reason: str | None,
    lexical_only_gate_triggered: bool,
    non_lexical_corroborated: bool,
) -> list[str]:
    lines = [
        (
            "YARA deterministic adjudication produced "
            f"verdict={verdict} with confidence={confidence:.2f} and false_positive_risk={false_positive_risk:.2f}."
        ),
        (
            "Evidence bucket scores are "
            f"positive={scores.positive_score:.2f}, "
            f"negative={scores.negative_score:.2f}, "
            f"contradictory={scores.contradictory_score:.2f}, "
            f"missing={scores.missing_score:.2f}."
        ),
    ]
    if lexical_only_gate_triggered:
        lines.append("Lexical-only evidence was detected; adjudication abstained until non-lexical corroboration is available.")
    else:
        lines.append(
            "Lexical indicators remained heuristic-only context; "
            + (
                "non-lexical corroboration is present and was weighted in scoring."
                if non_lexical_corroborated
                else "non-lexical corroboration is weak, increasing abstention pressure."
            )
        )
    if abstain_reason:
        lines.append(f"Abstain reason: {abstain_reason}.")
    return lines[:4]


def _non_lexical_corroboration(features: dict[str, float]) -> bool:
    return any(
        features[key] >= 0.20
        for key in (
            "behavior_malicious_signal",
            "enrichment_malicious_signal",
            "enrichment_benign_signal",
            "analyst_malicious_signal",
            "analyst_benign_signal",
            "trusted_signer_signal",
            "rare_emergent_prevalence_signal",
            "common_prevalence_signal",
            "clean_environment_signal",
            "related_supporting_signal",
            "related_contradictory_signal",
        )
    )


def _fusion_ratio(evidence_fusion: Any | None, category: str) -> float:
    if evidence_fusion is None:
        return 0.0
    contradictory = _collection_count(_extract_fusion_collection(evidence_fusion, "contradictory_evidence"))
    missing = _collection_count(_extract_fusion_collection(evidence_fusion, "missing_evidence"))
    positive = _collection_count(_extract_fusion_collection(evidence_fusion, "positive_evidence"))
    negative = _collection_count(_extract_fusion_collection(evidence_fusion, "negative_evidence"))
    if category == "missing":
        total_channels = 6.0
        return _clip01(float(missing) / total_channels)
    total = max(1.0, float(positive + negative + contradictory))
    return _clip01(float(contradictory) / total)


def _extract_fusion_collection(evidence_fusion: Any, key: str) -> Any:
    if isinstance(evidence_fusion, dict):
        return evidence_fusion.get(key)
    return getattr(evidence_fusion, key, None)


def _collection_count(value: Any) -> int:
    if isinstance(value, list):
        return len(value)
    return 0


def _token_count(text: str, tokens: tuple[str, ...]) -> int:
    if not text:
        return 0
    return sum(1 for token in tokens if token in text)


def _coerce_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _coerce_list_of_dicts(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _coerce_list_of_strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _coerce_float_map(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}
    output: dict[str, float] = {}
    for key, raw in value.items():
        name = str(key).strip()
        if not name:
            continue
        try:
            output[name] = float(raw)
        except (TypeError, ValueError):
            continue
    return output


def _historical_feature(features: dict[str, float], key: str) -> float:
    return _clip01(_float(features.get(key), default=0.0))


def _coerce_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = _first_non_empty(value)
    if text is None:
        return None
    lowered = text.lower()
    if lowered in {"true", "1", "yes", "y"}:
        return True
    if lowered in {"false", "0", "no", "n"}:
        return False
    return None


def _truthy(value: Any) -> bool:
    parsed = _coerce_bool(value)
    return bool(parsed)


def _float(value: Any, *, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _first_non_empty(*values: Any) -> str | None:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _dedupe_texts(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        key = value.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(value.strip())
    return output


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)
