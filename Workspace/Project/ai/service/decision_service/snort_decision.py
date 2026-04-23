from __future__ import annotations

from dataclasses import dataclass
import ipaddress
import json
from typing import Any

from .contracts import DecisionVerdict


@dataclass(frozen=True, slots=True)
class SnortEvidenceBucketScores:
    positive_score: float
    negative_score: float
    contradictory_score: float
    missing_score: float


@dataclass(frozen=True, slots=True)
class SnortDecisionResult:
    verdict: DecisionVerdict
    confidence: float
    false_positive_risk: float
    abstain_reason: str | None
    explanation: str
    explanation_lines: list[str]
    suggested_next_checks: list[str]
    bucket_scores: SnortEvidenceBucketScores
    interpretable_features: dict[str, float]
    lexical_only_gate_triggered: bool
    non_lexical_corroborated: bool


@dataclass(frozen=True, slots=True)
class _NormalizedSnortInput:
    rule_text: str
    rule_metadata: dict[str, Any]
    raw_hit_payload: dict[str, Any]
    network: dict[str, Any]
    asset_context: dict[str, Any]
    prevalence: dict[str, Any]
    allowlist_baseline: dict[str, Any]
    linked_enrichment: list[dict[str, Any]]
    prior_analyst_outcomes: list[dict[str, Any]]
    related_detections: list[dict[str, Any]]
    historical_learning_features: dict[str, float]
    stale_or_revoked_signal: float
    explicit_false_positive_signal: float


THREAT_MSG_TOKENS = (
    "malicious",
    "c2",
    "command-and-control",
    "trojan",
    "beacon",
    "tasking",
    "staged",
    "exfil",
    "credential",
    "botnet",
    "payload",
)
POLICY_NOISE_TOKENS = (
    "policy",
    "informational",
    "not-suspicious",
    "health",
    "heartbeat",
    "scanner",
    "qa",
    "update",
    "baseline",
    "allowlist",
    "known_good",
    "benign",
)
THREAT_CATEGORY_TOKENS = (
    "trojan",
    "c2",
    "command-and-control",
    "attempted-admin",
    "attempted-user",
    "shellcode",
    "malware",
    "botnet",
    "bad-traffic",
)
POLICY_CATEGORY_TOKENS = (
    "policy",
    "policy-violation",
    "not-suspicious",
    "misc-activity",
    "informational",
    "unknown",
)
MALICIOUS_ENRICHMENT_TOKENS = (
    "malicious",
    "high",
    "known_bad",
    "botnet",
    "trojan",
    "c2",
    "command-and-control",
)
BENIGN_ENRICHMENT_TOKENS = (
    "benign",
    "known_good",
    "approved",
    "allowlisted",
    "trusted",
    "internal_probe",
    "scanner",
)
HIGH_SIGNAL_RULE_TOKENS = (
    "trojan-activity",
    "bad-traffic",
    "attempted-admin",
    "attempted-user",
    "command-and-control",
    "c2",
    "shellcode",
)


def adjudicate_snort(
    *,
    detection_package: dict[str, Any] | None,
    evidence_fusion: Any | None = None,
    historical_learning_features: dict[str, float] | None = None,
) -> SnortDecisionResult:
    package = detection_package if isinstance(detection_package, dict) else {}
    normalized = _normalize_input(package, historical_learning_features=historical_learning_features)
    features = _extract_features(normalized=normalized, evidence_fusion=evidence_fusion)
    scores = _score_buckets(features)

    lexical_signal = max(
        features["lexical_threat_signal"],
        features["lexical_policy_noise_signal"],
        features["policy_category_signal"],
    )
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

    return SnortDecisionResult(
        verdict=verdict,
        confidence=float(round(_clip01(confidence), 6)),
        false_positive_risk=float(round(_clip01(false_positive_risk), 6)),
        abstain_reason=abstain_reason,
        explanation=" ".join(explanation_lines),
        explanation_lines=explanation_lines,
        suggested_next_checks=checks,
        bucket_scores=SnortEvidenceBucketScores(
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
) -> _NormalizedSnortInput:
    alert = _coerce_dict(package.get("alert"))
    alert_rule = _coerce_dict(alert.get("rule"))
    flow = _coerce_dict(package.get("flow"))
    pcap = _coerce_dict(package.get("pcap"))

    rule_metadata = _coerce_dict(package.get("rule_metadata"))
    if not rule_metadata and alert_rule:
        rule_metadata = alert_rule

    raw_hit_payload = _coerce_dict(package.get("raw_hit_payload"))
    if not raw_hit_payload and alert:
        raw_hit_payload = _snort_raw_payload_from_alert(alert)
    if flow or pcap:
        raw_hit_payload = _merge_snort_raw_hit_payload(raw_hit_payload, _snort_raw_payload_from_flow(flow, pcap))

    object_metadata = _coerce_dict(package.get("object_metadata"))
    custom_attributes = _coerce_dict(object_metadata.get("custom_attributes"))
    custom_network = _coerce_dict(custom_attributes.get("network"))

    network = _coerce_dict(raw_hit_payload.get("network"))
    if not network and custom_network:
        network = custom_network
    rule_text = _first_non_empty(package.get("full_rule_text"), alert_rule.get("text")) or ""

    existing_five_tuple = _coerce_dict(network.get("five_tuple"))
    inferred_five_tuple = _remove_none_values(
        {
            "src_ip": _first_non_empty(
                existing_five_tuple.get("src_ip"),
                raw_hit_payload.get("src_ip"),
                raw_hit_payload.get("source_ip"),
                raw_hit_payload.get("src"),
            ),
            "src_port": _coerce_port(
                _first_non_empty(
                    existing_five_tuple.get("src_port"),
                    raw_hit_payload.get("src_port"),
                    raw_hit_payload.get("source_port"),
                    raw_hit_payload.get("sport"),
                )
            ),
            "dst_ip": _first_non_empty(
                existing_five_tuple.get("dst_ip"),
                raw_hit_payload.get("dst_ip"),
                raw_hit_payload.get("destination_ip"),
                raw_hit_payload.get("dst"),
            ),
            "dst_port": _coerce_port(
                _first_non_empty(
                    existing_five_tuple.get("dst_port"),
                    raw_hit_payload.get("dst_port"),
                    raw_hit_payload.get("destination_port"),
                    raw_hit_payload.get("dport"),
                )
            ),
            "protocol": _first_non_empty(
                existing_five_tuple.get("protocol"),
                raw_hit_payload.get("protocol"),
                raw_hit_payload.get("proto"),
                rule_metadata.get("protocol"),
                _infer_protocol_from_rule_text(rule_text),
            ),
        }
    )
    existing_directionality = _coerce_dict(network.get("directionality"))
    inferred_directionality = _infer_directionality_from_rule_text(rule_text)
    directionality = _remove_none_values(
        {
            "arrow": _first_non_empty(
                existing_directionality.get("arrow"),
                raw_hit_payload.get("direction_arrow"),
                raw_hit_payload.get("arrow"),
                inferred_directionality.get("arrow"),
            ),
            "direction": _first_non_empty(
                existing_directionality.get("direction"),
                raw_hit_payload.get("direction"),
                raw_hit_payload.get("directionality"),
                inferred_directionality.get("direction"),
            ),
            "flow": _coerce_flow_terms(
                existing_directionality.get("flow")
                or raw_hit_payload.get("flow")
                or inferred_directionality.get("flow")
            ),
        }
    )
    existing_timing = _coerce_dict(network.get("timing"))
    timing = _remove_none_values(
        {
            "observed_at": _first_non_empty(
                existing_timing.get("observed_at"),
                raw_hit_payload.get("observed_at"),
                raw_hit_payload.get("timestamp"),
                raw_hit_payload.get("event_time"),
                raw_hit_payload.get("event_time_utc"),
            ),
            "first_seen": _first_non_empty(existing_timing.get("first_seen"), raw_hit_payload.get("first_seen")),
            "last_seen": _first_non_empty(existing_timing.get("last_seen"), raw_hit_payload.get("last_seen")),
            "window_seconds": _int_or_none(
                _first_non_empty(
                    existing_timing.get("window_seconds"),
                    raw_hit_payload.get("window_seconds"),
                    raw_hit_payload.get("duration_seconds"),
                )
            ),
        }
    )
    repetition_block = _coerce_dict(raw_hit_payload.get("repetition"))
    threshold_block = _coerce_dict(raw_hit_payload.get("threshold"))
    rule_text_threshold = _threshold_from_rule_text(rule_text)
    existing_repetition = _coerce_dict(network.get("repetition"))
    repetition = _remove_none_values(
        {
            "type": _first_non_empty(
                existing_repetition.get("type"),
                repetition_block.get("type"),
                threshold_block.get("type"),
                rule_text_threshold.get("type"),
            ),
            "track": _first_non_empty(
                existing_repetition.get("track"),
                repetition_block.get("track"),
                threshold_block.get("track"),
                rule_text_threshold.get("track"),
            ),
            "count": _int_or_none(
                _first_non_empty(
                    existing_repetition.get("count"),
                    repetition_block.get("count"),
                    threshold_block.get("count"),
                    rule_text_threshold.get("count"),
                    raw_hit_payload.get("repetition_count"),
                    raw_hit_payload.get("repeat_count"),
                )
            ),
            "window_seconds": _int_or_none(
                _first_non_empty(
                    existing_repetition.get("window_seconds"),
                    repetition_block.get("window_seconds"),
                    threshold_block.get("seconds"),
                    rule_text_threshold.get("seconds"),
                    raw_hit_payload.get("repeat_window_seconds"),
                )
            ),
        }
    )
    pcap_metadata = _remove_none_values(
        {
            **_coerce_dict(network.get("pcap_metadata")),
            **_coerce_dict(raw_hit_payload.get("pcap_metadata")),
        }
    )
    network = _remove_none_values(
        {
            "five_tuple": inferred_five_tuple,
            "directionality": directionality,
            "timing": timing,
            "repetition": repetition,
            "pcap_metadata": pcap_metadata,
        }
    )

    asset_context = _coerce_dict(package.get("asset_context"))
    prevalence = _coerce_dict(package.get("time_prevalence_context"))
    allowlist_baseline = _coerce_dict(package.get("allowlist_baseline_context"))
    linked_enrichment = _coerce_list_of_dicts(_coerce_dict(package.get("linked_enrichment")).get("enrichments"))
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

    stale_or_revoked_signal = 0.0
    status = str(rule_metadata.get("status", "")).strip().lower()
    if status in {"revoked", "stale", "expired", "deprecated"}:
        stale_or_revoked_signal = 1.0
    if _truthy(rule_metadata.get("revoked")) or _truthy(rule_metadata.get("is_revoked")):
        stale_or_revoked_signal = 1.0

    explicit_false_positive_signal = 0.0
    if _truthy(allowlist_baseline.get("allowlisted")) and _truthy(allowlist_baseline.get("baseline_match")):
        explicit_false_positive_signal = 0.75
    if "false_positive" in _coerce_list_of_strings(rule_metadata.get("tags")):
        explicit_false_positive_signal = max(explicit_false_positive_signal, 1.0)
    if any(
        str(outcome.get("verdict", "")).strip().lower() == "false_positive"
        for outcome in prior_outcomes
    ):
        explicit_false_positive_signal = max(explicit_false_positive_signal, 1.0)

    return _NormalizedSnortInput(
        rule_text=rule_text,
        rule_metadata=rule_metadata,
        raw_hit_payload=raw_hit_payload,
        network=network,
        asset_context=asset_context,
        prevalence=prevalence,
        allowlist_baseline=allowlist_baseline,
        linked_enrichment=linked_enrichment,
        prior_analyst_outcomes=prior_outcomes,
        related_detections=related_detections,
        historical_learning_features=historical_feature_map,
        stale_or_revoked_signal=stale_or_revoked_signal,
        explicit_false_positive_signal=explicit_false_positive_signal,
    )


def _extract_features(
    *,
    normalized: _NormalizedSnortInput,
    evidence_fusion: Any | None,
) -> dict[str, float]:
    msg = _first_non_empty(
        normalized.rule_metadata.get("msg"),
        normalized.rule_metadata.get("message"),
    ) or ""
    classification = _first_non_empty(
        normalized.rule_metadata.get("classification"),
        normalized.rule_metadata.get("classtype"),
        normalized.rule_metadata.get("category"),
    ) or ""
    metadata_blob = _to_text(normalized.rule_metadata.get("metadata"))
    tags_blob = " ".join(_coerce_list_of_strings(normalized.rule_metadata.get("tags")))
    lexical_blob = " ".join(part for part in (msg, classification, metadata_blob, tags_blob, normalized.rule_text) if part).lower()
    category_blob = " ".join(part for part in (classification, tags_blob) if part).lower()

    lexical_threat_signal = _clip01(_token_count(lexical_blob, THREAT_MSG_TOKENS) / 6.0)
    lexical_policy_noise_signal = _clip01(_token_count(lexical_blob, POLICY_NOISE_TOKENS) / 6.0)
    threat_category_signal = _clip01(_token_count(category_blob, THREAT_CATEGORY_TOKENS) / 3.0)
    policy_category_signal = _clip01(_token_count(category_blob, POLICY_CATEGORY_TOKENS) / 3.0)

    network = _coerce_dict(normalized.network)
    five_tuple = _coerce_dict(network.get("five_tuple"))
    directionality = _coerce_dict(network.get("directionality"))
    timing = _coerce_dict(network.get("timing"))
    repetition = _coerce_dict(network.get("repetition"))
    pcap_metadata = _coerce_dict(network.get("pcap_metadata"))

    tuple_fields_present = 0
    for key in ("src_ip", "src_port", "dst_ip", "dst_port", "protocol"):
        if _field_present(five_tuple.get(key)):
            tuple_fields_present += 1
    tuple_quality_signal = _clip01(float(tuple_fields_present) / 5.0)

    flow_terms = _coerce_flow_terms(directionality.get("flow"))
    directionality_quality_signal = _clip01(
        (0.50 if _first_non_empty(directionality.get("arrow")) else 0.0)
        + (0.30 if _first_non_empty(directionality.get("direction")) else 0.0)
        + (0.20 if flow_terms else 0.0)
    )
    to_server = bool(
        _first_non_empty(directionality.get("direction"), directionality.get("arrow")) in {"to_server", "->"}
        or "to_server" in flow_terms
    )
    external_destination_signal = 0.0
    src_ip = _first_non_empty(five_tuple.get("src_ip"))
    dst_ip = _first_non_empty(five_tuple.get("dst_ip"))
    if src_ip and dst_ip:
        if _is_private_ip(src_ip) and not _is_private_ip(dst_ip):
            external_destination_signal = 1.0
        elif not _is_private_ip(src_ip) and _is_private_ip(dst_ip):
            external_destination_signal = 0.2
        else:
            external_destination_signal = 0.4 if to_server else 0.2

    tuple_anomaly_count = 0
    if src_ip and dst_ip and src_ip == dst_ip:
        tuple_anomaly_count += 1
    if tuple_quality_signal > 0 and not _first_non_empty(five_tuple.get("protocol")):
        tuple_anomaly_count += 1
    tuple_anomaly_signal = _clip01(float(tuple_anomaly_count) / 2.0)

    repetition_count = _float(
        _first_non_empty(
            repetition.get("count"),
            normalized.prevalence.get("hit_count_24h"),
        ),
        default=0.0,
    )
    repetition_window_seconds = _float(
        _first_non_empty(
            repetition.get("window_seconds"),
            timing.get("window_seconds"),
        ),
        default=0.0,
    )
    burstiness_signal = 0.0
    if repetition_count >= 10 and 0 < repetition_window_seconds <= 300:
        burstiness_signal = 1.0
    elif repetition_count >= 5 and 0 < repetition_window_seconds <= 600:
        burstiness_signal = 0.7

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
        if hit_count_24h >= 25 or hit_count_7d >= 200:
            stable_widespread_signal = 0.7
        if prevalence_ratio >= 0.10 and trend in {"stable", "decreasing"}:
            stable_widespread_signal = max(stable_widespread_signal, 1.0)

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
        elif relation in {"benign", "allowlisted", "false_positive"}:
            benign_related += 1
    related_total = max(1, supporting_related + contradictory_related + benign_related)
    related_supporting_signal = _clip01(supporting_related / related_total)
    related_contradictory_signal = _clip01(contradictory_related / related_total)
    related_benign_signal = _clip01(benign_related / related_total)

    baseline_allowlist_signal = 0.0
    if _truthy(normalized.allowlist_baseline.get("allowlisted")):
        baseline_allowlist_signal += 0.55
    if _truthy(normalized.allowlist_baseline.get("baseline_match")):
        baseline_allowlist_signal += 0.45
    baseline_allowlist_signal = _clip01(baseline_allowlist_signal)

    criticality = str(normalized.asset_context.get("criticality", "")).lower()
    if not criticality:
        criticality = str(_coerce_dict(normalized.rule_metadata.get("asset_context")).get("criticality", "")).lower()
    critical_asset_signal = 1.0 if criticality in {"high", "critical"} else 0.0

    pcap_fields_present = 0
    for key in ("capture_id", "file_path", "packet_count", "byte_count", "capture_start", "capture_end"):
        if _field_present(pcap_metadata.get(key)):
            pcap_fields_present += 1
    replayable_context_fields = 0
    if _coerce_dict(normalized.raw_hit_payload.get("http_headers")):
        replayable_context_fields += 1
    if _coerce_dict(normalized.raw_hit_payload.get("tls")):
        replayable_context_fields += 1
    if _first_non_empty(
        normalized.raw_hit_payload.get("uri_path"),
        normalized.raw_hit_payload.get("uri"),
        normalized.raw_hit_payload.get("http_uri"),
        normalized.raw_hit_payload.get("query_name"),
    ):
        replayable_context_fields += 1
    correlated_flow_metadata_signal = 0.0
    if pcap_fields_present >= 3:
        correlated_flow_metadata_signal = 1.0
    elif pcap_fields_present == 2:
        correlated_flow_metadata_signal = 0.7
    elif pcap_fields_present == 1:
        correlated_flow_metadata_signal = 0.4
    if replayable_context_fields >= 2:
        correlated_flow_metadata_signal = max(correlated_flow_metadata_signal, 0.8)
    elif replayable_context_fields == 1:
        correlated_flow_metadata_signal = max(correlated_flow_metadata_signal, 0.45)
    if _first_non_empty(normalized.raw_hit_payload.get("flow_id")):
        correlated_flow_metadata_signal = _clip01(correlated_flow_metadata_signal + 0.20)

    policy_noise_signal = _clip01(
        0.30 * lexical_policy_noise_signal
        + 0.25 * policy_category_signal
        + 0.20 * baseline_allowlist_signal
        + 0.15 * stable_widespread_signal
        + 0.10 * analyst_benign_signal
    )
    threat_driver_signal = _clip01(
        0.22 * lexical_threat_signal
        + 0.10 * _clip01(_token_count(category_blob, HIGH_SIGNAL_RULE_TOKENS) / 3.0)
        + 0.20 * threat_category_signal
        + 0.14 * burstiness_signal
        + 0.12 * rare_new_prevalence_signal
        + 0.10 * enrichment_malicious_signal
        + 0.08 * related_supporting_signal
        + 0.08 * external_destination_signal
        + 0.06 * correlated_flow_metadata_signal
    )
    contradictory_policy_threat_signal = _clip01(min(policy_noise_signal, threat_driver_signal) * 1.25)

    missing_network_tuple_signal = 1.0 if tuple_quality_signal < 0.40 else 0.35 if tuple_quality_signal < 0.90 else 0.0
    missing_directionality_signal = 1.0 if directionality_quality_signal < 0.25 else 0.40 if directionality_quality_signal < 0.75 else 0.0
    missing_repetition_signal = (
        0.0
        if _field_present(repetition.get("count")) or _field_present(repetition.get("window_seconds"))
        else 0.35
        if normalized.prevalence
        else 1.0
    )
    missing_correlated_flow_signal = 0.0 if correlated_flow_metadata_signal >= 0.35 else 0.45 if correlated_flow_metadata_signal >= 0.15 else 1.0
    missing_enrichment_signal = 0.0 if normalized.linked_enrichment else 1.0
    missing_analyst_history_signal = 0.0 if normalized.prior_analyst_outcomes else 1.0
    missing_prevalence_signal = 0.0 if normalized.prevalence else 1.0
    missing_allowlist_signal = 0.0 if normalized.allowlist_baseline else 1.0
    missing_asset_signal = 0.0 if normalized.asset_context else 1.0
    missing_rule_context_signal = 0.0 if msg or classification or _field_present(normalized.rule_metadata.get("sid")) else 1.0

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
        "lexical_threat_signal": lexical_threat_signal,
        "lexical_policy_noise_signal": lexical_policy_noise_signal,
        "threat_category_signal": threat_category_signal,
        "policy_category_signal": policy_category_signal,
        "tuple_quality_signal": tuple_quality_signal,
        "directionality_quality_signal": directionality_quality_signal,
        "external_destination_signal": external_destination_signal,
        "tuple_anomaly_signal": tuple_anomaly_signal,
        "burstiness_signal": burstiness_signal,
        "rare_new_prevalence_signal": rare_new_prevalence_signal,
        "stable_widespread_signal": stable_widespread_signal,
        "enrichment_malicious_signal": enrichment_malicious_signal,
        "enrichment_benign_signal": enrichment_benign_signal,
        "mixed_enrichment_signal": mixed_enrichment_signal,
        "analyst_malicious_signal": analyst_malicious_signal,
        "analyst_benign_signal": analyst_benign_signal,
        "analyst_conflict_signal": analyst_conflict_signal,
        "related_supporting_signal": related_supporting_signal,
        "related_contradictory_signal": related_contradictory_signal,
        "related_benign_signal": related_benign_signal,
        "baseline_allowlist_signal": baseline_allowlist_signal,
        "critical_asset_signal": critical_asset_signal,
        "correlated_flow_metadata_signal": correlated_flow_metadata_signal,
        "policy_noise_signal": policy_noise_signal,
        "threat_driver_signal": threat_driver_signal,
        "contradictory_policy_threat_signal": contradictory_policy_threat_signal,
        "missing_network_tuple_signal": missing_network_tuple_signal,
        "missing_directionality_signal": missing_directionality_signal,
        "missing_repetition_signal": missing_repetition_signal,
        "missing_correlated_flow_signal": missing_correlated_flow_signal,
        "missing_enrichment_signal": missing_enrichment_signal,
        "missing_analyst_history_signal": missing_analyst_history_signal,
        "missing_prevalence_signal": missing_prevalence_signal,
        "missing_allowlist_signal": missing_allowlist_signal,
        "missing_asset_signal": missing_asset_signal,
        "missing_rule_context_signal": missing_rule_context_signal,
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


def _score_buckets(features: dict[str, float]) -> SnortEvidenceBucketScores:
    positive = _clip01(
        0.24 * features["threat_driver_signal"]
        + 0.14 * features["burstiness_signal"]
        + 0.12 * features["enrichment_malicious_signal"]
        + 0.12 * features["analyst_malicious_signal"]
        + 0.08 * features["related_supporting_signal"]
        + 0.08 * features["rare_new_prevalence_signal"]
        + 0.08 * features["external_destination_signal"]
        + 0.08 * features["critical_asset_signal"]
        + 0.06 * features["correlated_flow_metadata_signal"]
        + 0.08 * features["history_support_signal"]
        + 0.04 * features["history_recommendation_accept_signal"]
        + 0.03 * (features["history_sample_size_signal"] * features["history_recency_signal"])
    )
    negative = _clip01(
        0.24 * features["policy_noise_signal"]
        + 0.22 * features["baseline_allowlist_signal"]
        + 0.14 * features["analyst_benign_signal"]
        + 0.12 * features["enrichment_benign_signal"]
        + 0.10 * features["stable_widespread_signal"]
        + 0.10 * features["related_benign_signal"]
        + 0.08 * features["tuple_quality_signal"]
        + 0.10 * features["history_benign_pressure_signal"]
        + 0.05 * features["history_allowlist_signal"]
        + 0.04 * features["history_suppression_signal"]
        + 0.04 * features["history_recommendation_reject_signal"]
    )
    contradictory = _clip01(
        0.32 * features["analyst_conflict_signal"]
        + 0.24 * max(features["related_contradictory_signal"], features["fusion_contradictory_ratio"])
        + 0.18 * features["mixed_enrichment_signal"]
        + 0.16 * features["contradictory_policy_threat_signal"]
        + 0.10 * features["tuple_anomaly_signal"]
        + 0.10 * features["history_conflict_signal"]
        + 0.06 * features["history_rollback_signal"]
        + 0.04 * features["history_post_action_regression_signal"]
    )
    missing = _clip01(
        0.22 * features["missing_network_tuple_signal"]
        + 0.14 * features["missing_directionality_signal"]
        + 0.14 * features["missing_repetition_signal"]
        + 0.14 * features["missing_correlated_flow_signal"]
        + 0.12 * features["missing_enrichment_signal"]
        + 0.10 * features["missing_analyst_history_signal"]
        + 0.08 * features["missing_prevalence_signal"]
        + 0.06 * features["missing_allowlist_signal"]
    )
    missing = _clip01(max(missing, features["fusion_missing_ratio"]))

    return SnortEvidenceBucketScores(
        positive_score=positive,
        negative_score=negative,
        contradictory_score=contradictory,
        missing_score=missing,
    )


def _classify_verdict(
    *,
    scores: SnortEvidenceBucketScores,
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
        scores.positive_score >= 0.40
        and scores.negative_score <= 0.20
        and scores.contradictory_score <= 0.20
        and scores.missing_score <= 0.35
        and features["critical_asset_signal"] >= 0.90
        and features["related_supporting_signal"] >= 0.80
        and features["lexical_threat_signal"] >= 0.65
        and (
            features["enrichment_malicious_signal"] >= 0.20
            or features["threat_driver_signal"] >= 0.52
            or features["correlated_flow_metadata_signal"] >= 0.45
        )
    ):
        return "malicious", None

    if (
        malicious_index >= 0.80
        and scores.positive_score >= 0.68
        and scores.negative_score <= 0.45
        and scores.contradictory_score <= 0.40
        and scores.missing_score <= 0.55
    ):
        return "malicious", None

    if (
        malicious_index >= 0.64
        and scores.positive_score >= 0.54
        and scores.contradictory_score <= 0.55
        and scores.missing_score <= 0.64
    ):
        return "likely_malicious", None

    if (
        features["correlated_flow_metadata_signal"] >= 0.90
        and features["tuple_quality_signal"] >= 0.80
        and features["rare_new_prevalence_signal"] >= 0.70
        and features["external_destination_signal"] >= 0.40
        and scores.negative_score <= 0.25
        and scores.contradictory_score <= 0.20
        and scores.missing_score <= 0.50
    ):
        return "suspicious", None

    if malicious_index >= 0.48 and scores.positive_score >= 0.30 and scores.missing_score <= 0.72:
        return "suspicious", None

    if (
        benign_index >= 0.76
        and scores.negative_score >= 0.66
        and scores.positive_score <= 0.42
        and scores.contradictory_score <= 0.40
    ):
        return "benign", None

    if benign_index >= 0.64 and scores.negative_score >= 0.50 and scores.contradictory_score <= 0.55:
        return "likely_benign", None

    if (
        scores.negative_score >= 0.72
        and scores.positive_score <= 0.50
        and scores.contradictory_score <= 0.45
        and features["policy_noise_signal"] >= 0.55
    ):
        return "false_positive", None

    if scores.negative_score >= 0.30 and scores.positive_score >= 0.30 and features["analyst_conflict_signal"] >= 0.5:
        return "insufficient_evidence", "high_evidence_conflict"

    return "insufficient_evidence", "insufficient_correlated_evidence"


def _confidence(*, verdict: DecisionVerdict, scores: SnortEvidenceBucketScores) -> float:
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
    scores: SnortEvidenceBucketScores,
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
    scores: SnortEvidenceBucketScores,
    lexical_only_gate_triggered: bool,
) -> list[str]:
    checks: list[str] = []
    if lexical_only_gate_triggered:
        checks.append("Collect non-lexical flow corroboration before adjudicating this Snort hit.")
    if features["missing_network_tuple_signal"] >= 0.5:
        checks.append("Validate complete 5-tuple and protocol extraction from Snort telemetry.")
    if features["missing_directionality_signal"] >= 0.5:
        checks.append("Reconstruct flow directionality (arrow/flow state) for this alert context.")
    if features["missing_repetition_signal"] >= 0.5:
        checks.append("Compute hit repetition and burst window metrics for this rule SID.")
    if features["missing_correlated_flow_signal"] >= 0.5:
        checks.append("Collect correlated flow or pcap metadata for replayable network evidence.")
    if features["missing_enrichment_signal"] >= 0.5:
        checks.append("Fetch external enrichment (DNS/reputation/intel) and source confidence.")
    if features["missing_analyst_history_signal"] >= 0.5:
        checks.append("Review prior analyst outcomes for matching SID/flow lineage.")
    if scores.contradictory_score >= 0.45 or features["analyst_conflict_signal"] >= 0.5:
        checks.append("Resolve contradictory signals across analyst history and related detections.")
    if features["policy_noise_signal"] >= 0.60 and features["threat_driver_signal"] <= 0.40:
        checks.append("Validate policy/informational signature tuning and suppression safety.")
    if not checks:
        checks.append("Collect post-decision validation telemetry for deterministic score calibration.")
    return _dedupe_texts(checks)[:5]


def _explanation_lines(
    *,
    verdict: DecisionVerdict,
    scores: SnortEvidenceBucketScores,
    confidence: float,
    false_positive_risk: float,
    abstain_reason: str | None,
    lexical_only_gate_triggered: bool,
    non_lexical_corroborated: bool,
) -> list[str]:
    lines = [
        (
            "SNORT deterministic decision produced "
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
    strong_channels = (
        "correlated_flow_metadata_signal",
        "baseline_allowlist_signal",
        "enrichment_malicious_signal",
        "enrichment_benign_signal",
        "analyst_malicious_signal",
        "analyst_benign_signal",
        "related_supporting_signal",
        "related_benign_signal",
    )
    if any(features[key] >= 0.20 for key in strong_channels):
        return True
    return features["tuple_quality_signal"] >= 0.80 and features["directionality_quality_signal"] >= 0.50


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


def _snort_raw_payload_from_alert(alert: dict[str, Any]) -> dict[str, Any]:
    rule = _coerce_dict(alert.get("rule"))
    return _remove_none_values(
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
            "message": rule.get("msg"),
            "protocol": alert.get("protocol") or rule.get("protocol"),
        }
    )


def _snort_raw_payload_from_flow(flow: dict[str, Any], pcap: dict[str, Any]) -> dict[str, Any]:
    return _remove_none_values(
        {
            "flow_id": flow.get("flow_id"),
            "src_ip": flow.get("src_ip"),
            "src_port": flow.get("src_port"),
            "dst_ip": flow.get("dst_ip"),
            "dst_port": flow.get("dst_port"),
            "protocol": flow.get("protocol"),
            "direction": flow.get("directionality"),
            "observed_at": flow.get("observed_at"),
            "pcap_metadata": pcap,
        }
    )


def _merge_snort_raw_hit_payload(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    if not base:
        return dict(overlay)
    merged = dict(base)
    for key, value in overlay.items():
        if value is None:
            continue
        if key == "pcap_metadata":
            merged[key] = {**_coerce_dict(merged.get(key)), **_coerce_dict(value)}
            continue
        merged.setdefault(key, value)
    return merged


def _infer_protocol_from_rule_text(rule_text: str) -> str | None:
    lowered = rule_text.strip().lower()
    for protocol in ("tcp", "udp", "icmp", "ip"):
        if lowered.startswith(f"alert {protocol} "):
            return protocol
    return None


def _infer_directionality_from_rule_text(rule_text: str) -> dict[str, Any]:
    lowered = rule_text.lower()
    arrow = None
    if "<>" in lowered:
        arrow = "<>"
    elif "->" in lowered:
        arrow = "->"

    flow_terms: list[str] = []
    if "flow:" in lowered:
        flow_segment = lowered.split("flow:", 1)[1].split(";", 1)[0]
        flow_terms = _coerce_flow_terms(flow_segment)

    direction = None
    if "to_server" in flow_terms:
        direction = "to_server"
    elif "to_client" in flow_terms:
        direction = "to_client"
    elif arrow == "<>":
        direction = "bidirectional"
    elif arrow == "->":
        direction = "to_server"

    return _remove_none_values({"arrow": arrow, "direction": direction, "flow": flow_terms})


def _threshold_from_rule_text(rule_text: str) -> dict[str, Any]:
    lowered = rule_text.lower()
    if "threshold:" not in lowered:
        return {}
    threshold_segment = lowered.split("threshold:", 1)[1].split(";", 1)[0]
    values: dict[str, Any] = {}
    for raw_part in threshold_segment.split(","):
        part = raw_part.strip()
        if not part:
            continue
        if " " not in part:
            continue
        key, raw_value = part.split(" ", 1)
        value = raw_value.strip()
        if key in {"count", "seconds"}:
            values[key] = _int_or_none(value)
        else:
            values[key] = value
    return values


def _collection_count(value: Any) -> int:
    if isinstance(value, list):
        return len(value)
    return 0


def _field_present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _is_private_ip(value: str) -> bool:
    text = value.strip()
    try:
        return ipaddress.ip_address(text).is_private
    except ValueError:
        return False


def _coerce_port(value: str | None) -> int | str | None:
    text = _first_non_empty(value)
    if text is None:
        return None
    if text.lower() == "any":
        return "any"
    parsed = _int_or_none(text)
    if parsed is None:
        return text
    return parsed


def _coerce_flow_terms(value: Any) -> list[str]:
    if isinstance(value, list):
        return _dedupe_texts([str(item).strip().lower() for item in value if str(item).strip()])
    text = _first_non_empty(value)
    if text is None:
        return []
    return _dedupe_texts([part.strip().lower() for part in text.split(",") if part.strip()])


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


def _int_or_none(value: Any) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError, AttributeError):
        return None


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

