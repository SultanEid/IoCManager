from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any

from .contracts import DecisionVerdict


@dataclass(frozen=True, slots=True)
class SigmaEvidenceBucketScores:
    positive_score: float
    negative_score: float
    contradictory_score: float
    missing_score: float


@dataclass(frozen=True, slots=True)
class SigmaDecisionResult:
    verdict: DecisionVerdict
    confidence: float
    false_positive_risk: float
    abstain_reason: str | None
    explanation: str
    explanation_lines: list[str]
    suggested_next_checks: list[str]
    bucket_scores: SigmaEvidenceBucketScores
    interpretable_features: dict[str, float]
    lexical_only_gate_triggered: bool
    non_lexical_corroborated: bool


@dataclass(frozen=True, slots=True)
class _NormalizedSigmaInput:
    rule_text: str
    rule_metadata: dict[str, Any]
    raw_hit_payload: dict[str, Any]
    asset_context: dict[str, Any]
    process_lineage: list[dict[str, Any]]
    user_lineage: dict[str, Any]
    host_lineage: dict[str, Any]
    command_line: str
    image: str
    repetition_count: float
    repetition_window_seconds: float
    prevalence: dict[str, Any]
    allowlist_baseline: dict[str, Any]
    linked_enrichment: list[dict[str, Any]]
    behavior_reports: list[dict[str, Any]]
    prior_analyst_outcomes: list[dict[str, Any]]
    related_detections: list[dict[str, Any]]
    historical_learning_features: dict[str, float]
    stale_or_revoked_signal: float
    explicit_false_positive_signal: float


SUSPICIOUS_TOKENS = (
    "malicious",
    "ransom",
    "trojan",
    "beacon",
    "c2",
    "credential",
    "lsass",
    "encodedcommand",
    "downloadstring",
    "frombase64string",
    "vssadmin",
    "delete shadows",
    "wscript",
    "cscript",
    "rundll32",
    "mshta",
    "powershell -enc",
    "defense_evasion",
    "lateral_movement",
)
BENIGN_TOKENS = (
    "benign",
    "allowlist",
    "allowlisted",
    "known_good",
    "approved",
    "maintenance",
    "updater",
    "backup",
    "false_positive",
)
ADMIN_TOOLING_TOKENS = (
    "powershell",
    "pwsh",
    "wmic",
    "schtasks",
    "sc.exe",
    "net.exe",
    "cmd.exe",
    "winrs",
    "psexec",
    "backup",
    "installer",
    "patch",
    "intune",
    "sccm",
    "helpdesk",
    "admin",
)
OBFUSCATION_TOKENS = (
    "-enc",
    "encodedcommand",
    "frombase64string",
    "javascript:",
    "vbscript:",
    "char(",
    "iex",
    "invoke-expression",
    "obfuscat",
)
MALICIOUS_ENRICHMENT_TOKENS = (
    "malicious",
    "high",
    "trojan",
    "ransom",
    "command-and-control",
    "c2",
    "known_bad",
)
BENIGN_ENRICHMENT_TOKENS = (
    "benign",
    "approved",
    "known_good",
    "allowlisted",
    "trusted",
    "enterprise_it",
)


def adjudicate_sigma(
    *,
    detection_package: dict[str, Any] | None,
    evidence_fusion: Any | None = None,
    historical_learning_features: dict[str, float] | None = None,
) -> SigmaDecisionResult:
    package = detection_package if isinstance(detection_package, dict) else {}
    normalized = _normalize_input(package, historical_learning_features=historical_learning_features)
    features = _extract_features(normalized=normalized, evidence_fusion=evidence_fusion)
    scores = _score_buckets(features)

    lexical_signal = max(
        features["lexical_suspicious_signal"],
        features["lexical_benign_signal"],
        features["admin_tooling_signal"],
    )
    non_lexical_corroborated = _non_lexical_corroboration(features)
    lexical_only_gate_triggered = lexical_signal >= 0.10 and not non_lexical_corroborated

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

    return SigmaDecisionResult(
        verdict=verdict,
        confidence=float(round(_clip01(confidence), 6)),
        false_positive_risk=float(round(_clip01(false_positive_risk), 6)),
        abstain_reason=abstain_reason,
        explanation=" ".join(explanation_lines),
        explanation_lines=explanation_lines,
        suggested_next_checks=checks,
        bucket_scores=SigmaEvidenceBucketScores(
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
) -> _NormalizedSigmaInput:
    rule_metadata = _coerce_dict(package.get("rule_metadata"))
    raw_hit_payload = _coerce_dict(package.get("raw_hit_payload"))
    object_metadata = _coerce_dict(package.get("object_metadata"))
    custom_attributes = _coerce_dict(object_metadata.get("custom_attributes"))
    asset_context = _coerce_dict(package.get("asset_context"))
    prevalence = _coerce_dict(package.get("time_prevalence_context"))
    allowlist_baseline = _coerce_dict(package.get("allowlist_baseline_context"))
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

    lineage = _coerce_dict(raw_hit_payload.get("lineage"))
    if not lineage:
        lineage = _coerce_dict(custom_attributes.get("lineage"))

    process_lineage = _coerce_lineage_process(lineage.get("process"))
    if not process_lineage:
        process_block = _coerce_dict(raw_hit_payload.get("process"))
        synthetic = _remove_none_values(
            {
                "process_guid": _first_non_empty(process_block.get("process_guid"), process_block.get("guid"), raw_hit_payload.get("process_guid")),
                "pid": _first_non_empty(process_block.get("pid"), process_block.get("process_id"), raw_hit_payload.get("pid")),
                "image": _first_non_empty(process_block.get("image"), raw_hit_payload.get("image")),
                "command_line": _first_non_empty(process_block.get("command_line"), raw_hit_payload.get("command_line")),
                "parent_process_guid": _first_non_empty(
                    process_block.get("parent_process_guid"),
                    process_block.get("parent_guid"),
                    raw_hit_payload.get("parent_process_guid"),
                ),
                "parent_pid": _first_non_empty(process_block.get("parent_pid"), process_block.get("ppid"), raw_hit_payload.get("parent_pid")),
                "parent_image": _first_non_empty(process_block.get("parent_image"), raw_hit_payload.get("parent_image")),
            }
        )
        if synthetic:
            process_lineage = [synthetic]

    user_lineage = _coerce_dict(lineage.get("user"))
    if not user_lineage:
        user_lineage = _coerce_dict(raw_hit_payload.get("user"))
    if not user_lineage:
        user_text = _first_non_empty(raw_hit_payload.get("user_name"), raw_hit_payload.get("user"), raw_hit_payload.get("username"))
        if user_text:
            user_lineage = {"user_name": user_text}

    host_lineage = _coerce_dict(lineage.get("host"))
    if not host_lineage:
        host_lineage = _coerce_dict(raw_hit_payload.get("host"))
    if not host_lineage:
        host_text = _first_non_empty(raw_hit_payload.get("hostname"), raw_hit_payload.get("host"), raw_hit_payload.get("computer_name"))
        if host_text:
            host_lineage = {"hostname": host_text}

    command_line = _first_non_empty(
        raw_hit_payload.get("command_line"),
        _coerce_dict(raw_hit_payload.get("process")).get("command_line"),
        _coerce_dict(raw_hit_payload.get("event")).get("command_line"),
    ) or ""
    image = _first_non_empty(
        raw_hit_payload.get("image"),
        _coerce_dict(raw_hit_payload.get("process")).get("image"),
        _coerce_dict(raw_hit_payload.get("event")).get("image"),
    ) or ""

    repetition_count = _float(
        _first_non_empty(
            _coerce_dict(raw_hit_payload.get("repetition")).get("count"),
            _coerce_dict(raw_hit_payload.get("threshold")).get("count"),
            _coerce_dict(raw_hit_payload.get("event")).get("repeat_count"),
            prevalence.get("hit_count_24h"),
        ),
        default=0.0,
    )
    repetition_window_seconds = _float(
        _first_non_empty(
            _coerce_dict(raw_hit_payload.get("repetition")).get("window_seconds"),
            _coerce_dict(raw_hit_payload.get("threshold")).get("seconds"),
            _coerce_dict(raw_hit_payload.get("event")).get("repeat_window_seconds"),
        ),
        default=0.0,
    )

    stale_or_revoked_signal = 0.0
    status = str(rule_metadata.get("status", "")).strip().lower()
    if status in {"revoked", "stale", "expired", "deprecated"}:
        stale_or_revoked_signal = 1.0
    if _truthy(rule_metadata.get("revoked")) or _truthy(rule_metadata.get("is_revoked")):
        stale_or_revoked_signal = 1.0

    explicit_false_positive_signal = 0.0
    if _truthy(allowlist_baseline.get("allowlisted")) and _truthy(allowlist_baseline.get("baseline_match")):
        explicit_false_positive_signal = 1.0
    if "false_positive" in _coerce_list_of_strings(rule_metadata.get("tags")):
        explicit_false_positive_signal = max(explicit_false_positive_signal, 1.20)

    return _NormalizedSigmaInput(
        rule_text=_first_non_empty(package.get("full_rule_text")) or "",
        rule_metadata=rule_metadata,
        raw_hit_payload=raw_hit_payload,
        asset_context=asset_context,
        process_lineage=process_lineage,
        user_lineage=user_lineage,
        host_lineage=host_lineage,
        command_line=command_line,
        image=image,
        repetition_count=repetition_count,
        repetition_window_seconds=repetition_window_seconds,
        prevalence=prevalence,
        allowlist_baseline=allowlist_baseline,
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
    normalized: _NormalizedSigmaInput,
    evidence_fusion: Any | None,
) -> dict[str, float]:
    process_blob = " ".join(
        part
        for node in normalized.process_lineage
        for part in (
            _first_non_empty(node.get("image")) or "",
            _first_non_empty(node.get("command_line")) or "",
            _first_non_empty(node.get("parent_image")) or "",
        )
        if part
    )
    rule_blob = " ".join(
        part
        for part in (
            normalized.rule_text,
            _first_non_empty(normalized.rule_metadata.get("title"), normalized.rule_metadata.get("rule_name"), normalized.rule_metadata.get("name")) or "",
            _first_non_empty(normalized.rule_metadata.get("description")) or "",
            " ".join(_coerce_list_of_strings(normalized.rule_metadata.get("tags"))),
        )
        if part
    )
    command_blob = " ".join(part for part in (normalized.command_line, normalized.image, process_blob) if part)
    lexical_blob = f"{rule_blob} {command_blob}".lower()

    lexical_suspicious_signal = _clip01(_token_count(lexical_blob, SUSPICIOUS_TOKENS) / 7.0)
    lexical_benign_signal = _clip01(_token_count(lexical_blob, BENIGN_TOKENS) / 5.0)
    admin_tooling_signal = _clip01(_token_count(command_blob.lower(), ADMIN_TOOLING_TOKENS) / 5.0)
    obfuscation_signal = _clip01(_token_count(command_blob.lower(), OBFUSCATION_TOKENS) / 4.0)
    if "-enc" in command_blob.lower() or "encodedcommand" in command_blob.lower():
        obfuscation_signal = max(obfuscation_signal, 0.80)

    behavior_count = len(normalized.behavior_reports)
    behavior_markers = 0
    for report in normalized.behavior_reports:
        summary = str(report.get("summary", "")).lower()
        behavior_markers += _token_count(summary, SUSPICIOUS_TOKENS)
        extracted = _coerce_dict(report.get("extracted_behavior_features"))
        behavior_markers += len(_coerce_list_of_strings(extracted.get("suspicious_api_system_call_families")))
        behavior_markers += len(_coerce_list_of_strings(extracted.get("persistence_indicators")))
        behavior_markers += len(_coerce_list_of_strings(extracted.get("injected_processes")))
        behavior_markers += len(_coerce_list_of_strings(extracted.get("suspicious_script_interpreter_usage")))
    behavior_malicious_signal = _clip01((float(behavior_count) * 0.2) + (float(behavior_markers) / 10.0))

    enrichment_malicious_markers = 0
    enrichment_benign_markers = 0
    for item in normalized.linked_enrichment:
        kind = str(item.get("kind", "")).lower()
        value_text = _to_text(item.get("value")).lower()
        blob = f"{kind} {value_text}"
        enrichment_malicious_markers += _token_count(blob, MALICIOUS_ENRICHMENT_TOKENS)
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

    process_nodes = len(normalized.process_lineage)
    has_user = bool(normalized.user_lineage)
    has_host = bool(normalized.host_lineage)
    lineage_quality_signal = _clip01((0.5 if process_nodes > 0 else 0.0) + (0.25 if has_user else 0.0) + (0.25 if has_host else 0.0))
    lineage_anomalies = 0
    for node in normalized.process_lineage:
        if not _first_non_empty(node.get("image"), node.get("command_line")):
            lineage_anomalies += 1
        if _first_non_empty(node.get("process_guid")) and _first_non_empty(node.get("parent_process_guid")):
            if str(node.get("process_guid")) == str(node.get("parent_process_guid")):
                lineage_anomalies += 1
    if process_nodes <= 0:
        lineage_anomaly_signal = 1.0
    else:
        lineage_anomaly_signal = _clip01(float(lineage_anomalies) / max(1.0, float(process_nodes)))

    hit_count_24h = _float(normalized.prevalence.get("hit_count_24h"), default=0.0)
    hit_count_7d = _float(normalized.prevalence.get("hit_count_7d"), default=0.0)
    prevalence_ratio = _float(normalized.prevalence.get("prevalence_ratio"), default=0.0)
    trend = str(normalized.prevalence.get("trend", "")).lower()
    recency_bucket = str(normalized.prevalence.get("recency_bucket", "")).lower()

    has_prevalence_context = bool(normalized.prevalence)
    rare_new_prevalence_signal = 0.0
    if has_prevalence_context:
        if prevalence_ratio <= 0.01 and hit_count_7d <= 5:
            rare_new_prevalence_signal = 0.7
        if trend == "increasing" and recency_bucket == "new":
            rare_new_prevalence_signal = max(rare_new_prevalence_signal, 1.0)

    stable_widespread_signal = 0.0
    if has_prevalence_context:
        if hit_count_24h >= 10 or hit_count_7d >= 100:
            stable_widespread_signal = 0.7
        if prevalence_ratio >= 0.10 and trend in {"stable", "decreasing"}:
            stable_widespread_signal = max(stable_widespread_signal, 1.0)

    repetition_burst_signal = 0.0
    if normalized.repetition_count >= 10 and 0 < normalized.repetition_window_seconds <= 300:
        repetition_burst_signal = 1.0
    elif normalized.repetition_count >= 5:
        repetition_burst_signal = 0.7
    elif hit_count_24h >= 20 and trend == "increasing":
        repetition_burst_signal = 0.6

    baseline_allowlist_signal = 0.0
    if _truthy(normalized.allowlist_baseline.get("allowlisted")):
        baseline_allowlist_signal += 0.55
    if _truthy(normalized.allowlist_baseline.get("baseline_match")):
        baseline_allowlist_signal += 0.45
    baseline_allowlist_signal = _clip01(baseline_allowlist_signal)

    benign_admin_signal = _clip01(
        0.45 * admin_tooling_signal
        + 0.35 * baseline_allowlist_signal
        + 0.20 * stable_widespread_signal
    )

    admin_mismatch_signal = _clip01(
        admin_tooling_signal
        * (
            0.45 * obfuscation_signal
            + 0.30 * rare_new_prevalence_signal
            + 0.25 * (1.0 - baseline_allowlist_signal)
        )
    )

    suspicious_execution_signal = _clip01(
        0.40 * lexical_suspicious_signal
        + 0.25 * obfuscation_signal
        + 0.20 * behavior_malicious_signal
        + 0.15 * admin_mismatch_signal
    )

    criticality = str(normalized.asset_context.get("criticality", "")).lower()
    if not criticality:
        criticality = str(_coerce_dict(normalized.rule_metadata.get("asset_context")).get("criticality", "")).lower()
    critical_asset_signal = 1.0 if criticality in {"high", "critical"} else 0.0

    missing_lineage_signal = 1.0
    if process_nodes > 0 and (has_user or has_host):
        missing_lineage_signal = 0.0
    elif process_nodes > 0:
        missing_lineage_signal = 0.35
    missing_behavior_evidence_signal = 0.0 if normalized.behavior_reports else 1.0
    missing_enrichment_signal = 0.0 if normalized.linked_enrichment else 1.0
    missing_analyst_history_signal = 0.0 if normalized.prior_analyst_outcomes else 1.0
    missing_prevalence_signal = 0.0 if normalized.prevalence else 1.0
    missing_allowlist_signal = 0.0 if normalized.allowlist_baseline else 1.0
    missing_command_signal = 0.0 if normalized.command_line or normalized.image else 1.0

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
        "lexical_suspicious_signal": lexical_suspicious_signal,
        "lexical_benign_signal": lexical_benign_signal,
        "admin_tooling_signal": admin_tooling_signal,
        "obfuscation_signal": obfuscation_signal,
        "suspicious_execution_signal": suspicious_execution_signal,
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
        "lineage_quality_signal": lineage_quality_signal,
        "lineage_anomaly_signal": lineage_anomaly_signal,
        "rare_new_prevalence_signal": rare_new_prevalence_signal,
        "stable_widespread_signal": stable_widespread_signal,
        "repetition_burst_signal": repetition_burst_signal,
        "baseline_allowlist_signal": baseline_allowlist_signal,
        "benign_admin_signal": benign_admin_signal,
        "admin_mismatch_signal": admin_mismatch_signal,
        "critical_asset_signal": critical_asset_signal,
        "missing_lineage_signal": missing_lineage_signal,
        "missing_behavior_evidence_signal": missing_behavior_evidence_signal,
        "missing_enrichment_signal": missing_enrichment_signal,
        "missing_analyst_history_signal": missing_analyst_history_signal,
        "missing_prevalence_signal": missing_prevalence_signal,
        "missing_allowlist_signal": missing_allowlist_signal,
        "missing_command_signal": missing_command_signal,
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


def _score_buckets(features: dict[str, float]) -> SigmaEvidenceBucketScores:
    positive = _clip01(
        0.22 * features["suspicious_execution_signal"]
        + 0.18 * features["behavior_malicious_signal"]
        + 0.12 * features["enrichment_malicious_signal"]
        + 0.12 * features["analyst_malicious_signal"]
        + 0.10 * features["related_supporting_signal"]
        + 0.08 * features["rare_new_prevalence_signal"]
        + 0.08 * features["repetition_burst_signal"]
        + 0.06 * features["critical_asset_signal"]
        + 0.04 * features["admin_mismatch_signal"]
        + 0.08 * features["history_support_signal"]
        + 0.04 * features["history_recommendation_accept_signal"]
        + 0.03 * (features["history_sample_size_signal"] * features["history_recency_signal"])
    )
    negative = _clip01(
        0.24 * features["benign_admin_signal"]
        + 0.22 * features["baseline_allowlist_signal"]
        + 0.14 * features["analyst_benign_signal"]
        + 0.14 * features["enrichment_benign_signal"]
        + 0.10 * features["stable_widespread_signal"]
        + 0.08 * features["lineage_quality_signal"]
        + 0.08 * features["related_benign_signal"]
        + 0.10 * features["history_benign_pressure_signal"]
        + 0.05 * features["history_allowlist_signal"]
        + 0.04 * features["history_suppression_signal"]
        + 0.04 * features["history_recommendation_reject_signal"]
    )
    contradictory = _clip01(
        0.34 * features["analyst_conflict_signal"]
        + 0.24 * max(features["related_contradictory_signal"], features["fusion_contradictory_ratio"])
        + 0.20 * features["mixed_enrichment_signal"]
        + 0.14 * features["lineage_anomaly_signal"]
        + 0.08 * features["admin_mismatch_signal"]
        + 0.10 * features["history_conflict_signal"]
        + 0.06 * features["history_rollback_signal"]
        + 0.04 * features["history_post_action_regression_signal"]
    )
    missing = _clip01(
        0.24 * features["missing_lineage_signal"]
        + 0.18 * features["missing_behavior_evidence_signal"]
        + 0.14 * features["missing_enrichment_signal"]
        + 0.14 * features["missing_analyst_history_signal"]
        + 0.10 * features["missing_prevalence_signal"]
        + 0.10 * features["missing_allowlist_signal"]
        + 0.10 * features["missing_command_signal"]
    )
    missing = _clip01(max(missing, features["fusion_missing_ratio"]))

    return SigmaEvidenceBucketScores(
        positive_score=positive,
        negative_score=negative,
        contradictory_score=contradictory,
        missing_score=missing,
    )


def _classify_verdict(
    *,
    scores: SigmaEvidenceBucketScores,
    features: dict[str, float],
    lexical_only_gate_triggered: bool,
    stale_or_revoked_signal: float,
    explicit_false_positive_signal: float,
) -> tuple[DecisionVerdict, str | None]:
    if stale_or_revoked_signal >= 0.90:
        return "stale_or_revoked", None

    if lexical_only_gate_triggered:
        return "insufficient_evidence", "missing_non_string_corroboration"

    if explicit_false_positive_signal >= 0.90 and scores.positive_score < 0.55:
        if (
            explicit_false_positive_signal < 1.10
            and
            scores.negative_score >= 0.65
            and features["baseline_allowlist_signal"] >= 0.90
            and features["analyst_benign_signal"] >= 0.80
            and features["stable_widespread_signal"] >= 0.90
            and features["benign_admin_signal"] >= 0.55
            and features["admin_mismatch_signal"] <= 0.10
            and features["lexical_benign_signal"] >= 0.20
        ):
            return "benign", None
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
        scores.positive_score >= 0.34
        and scores.negative_score <= 0.20
        and scores.contradictory_score <= 0.20
        and scores.missing_score <= 0.35
        and features["critical_asset_signal"] >= 0.90
        and features["related_supporting_signal"] >= 0.80
        and features["rare_new_prevalence_signal"] >= 0.70
        and features["lexical_suspicious_signal"] >= 0.65
        and features["suspicious_execution_signal"] >= 0.32
    ):
        return "malicious", None

    if (
        malicious_index >= 0.82
        and scores.positive_score >= 0.72
        and scores.negative_score <= 0.45
        and scores.contradictory_score <= 0.40
        and scores.missing_score <= 0.45
    ):
        return "malicious", None

    if (
        malicious_index >= 0.68
        and scores.positive_score >= 0.50
        and scores.contradictory_score <= 0.52
        and scores.missing_score <= 0.58
    ):
        return "likely_malicious", None

    if malicious_index >= 0.54 and scores.positive_score >= 0.25 and scores.missing_score <= 0.62:
        return "suspicious", None

    if (
        benign_index >= 0.80
        and scores.negative_score >= 0.68
        and scores.positive_score <= 0.42
        and scores.contradictory_score <= 0.40
    ):
        return "benign", None

    if benign_index >= 0.64 and scores.negative_score >= 0.50 and scores.contradictory_score <= 0.55:
        return "likely_benign", None

    if scores.negative_score >= 0.72 and scores.positive_score <= 0.50 and scores.contradictory_score <= 0.45:
        return "false_positive", None

    if scores.negative_score >= 0.30 and scores.positive_score >= 0.30 and features["analyst_conflict_signal"] >= 0.5:
        return "insufficient_evidence", "high_evidence_conflict"

    if (
        features["admin_mismatch_signal"] >= 0.30
        and features["suspicious_execution_signal"] >= 0.35
        and features["obfuscation_signal"] >= 0.70
        and features["rare_new_prevalence_signal"] >= 0.70
        and features["baseline_allowlist_signal"] <= 0.10
        and scores.contradictory_score <= 0.45
        and scores.missing_score <= 0.62
    ):
        return "suspicious", None

    return "insufficient_evidence", "insufficient_correlated_evidence"


def _confidence(*, verdict: DecisionVerdict, scores: SigmaEvidenceBucketScores) -> float:
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
    scores: SigmaEvidenceBucketScores,
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
    scores: SigmaEvidenceBucketScores,
    lexical_only_gate_triggered: bool,
) -> list[str]:
    checks: list[str] = []
    if lexical_only_gate_triggered:
        checks.append("Collect non-lexical corroboration before adjudicating this Sigma detection.")
    if features["missing_lineage_signal"] >= 0.5:
        checks.append("Validate user/host/process lineage completeness and parent-child integrity.")
    if features["missing_behavior_evidence_signal"] >= 0.5:
        checks.append("Collect behavior telemetry or sandbox evidence for the flagged execution chain.")
    if features["missing_enrichment_signal"] >= 0.5:
        checks.append("Fetch linked enrichment and retain source confidence for replayable evidence.")
    if features["missing_analyst_history_signal"] >= 0.5:
        checks.append("Review prior analyst outcomes for matching host/process/rule lineage.")
    if features["missing_prevalence_signal"] >= 0.5:
        checks.append("Compute prevalence, spread, and repetition context for this rule hit.")
    if scores.contradictory_score >= 0.45 or features["analyst_conflict_signal"] >= 0.5:
        checks.append("Resolve contradictory evidence across analyst history and related detections.")
    if features["admin_mismatch_signal"] >= 0.45:
        checks.append("Verify whether admin tooling usage aligns with approved runbook and baseline context.")
    if not checks:
        checks.append("Collect post-decision validation telemetry for deterministic score calibration.")
    return _dedupe_texts(checks)[:5]


def _explanation_lines(
    *,
    verdict: DecisionVerdict,
    scores: SigmaEvidenceBucketScores,
    confidence: float,
    false_positive_risk: float,
    abstain_reason: str | None,
    lexical_only_gate_triggered: bool,
    non_lexical_corroborated: bool,
) -> list[str]:
    lines = [
        (
            "SIGMA deterministic decision produced "
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
        lines.append("Lexical-only evidence was detected; decision abstained pending non-lexical corroboration.")
    else:
        lines.append(
            "Lexical indicators remained heuristic-only context; "
            + (
                "non-lexical corroboration is present and was weighted in deterministic scoring."
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
            "related_supporting_signal",
            "related_benign_signal",
            "rare_new_prevalence_signal",
            "stable_widespread_signal",
            "baseline_allowlist_signal",
            "repetition_burst_signal",
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


def _coerce_lineage_process(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict):
        return [_remove_none_values(dict(value))]
    if not isinstance(value, list):
        return []
    output: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        normalized = _remove_none_values(dict(item))
        if normalized:
            output.append(normalized)
    return output


def _remove_none_values(value: dict[str, Any]) -> dict[str, Any]:
    return {key: item for key, item in value.items() if item is not None}


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (dict, list, tuple)):
        try:
            return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
        except (TypeError, ValueError):
            return str(value)
    return str(value)


def _token_count(text: str, tokens: tuple[str, ...]) -> int:
    if not text:
        return 0
    lowered = text.lower()
    return sum(1 for token in tokens if token in lowered)


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

