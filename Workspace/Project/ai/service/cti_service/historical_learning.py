from __future__ import annotations

import ipaddress
import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

from .contracts import (
    HistoricalFeatureProvenanceItemResponse,
    HistoricalLearningContextResponse,
    HistoricalLearningQualityResponse,
    HistoricalLearningQueryRequest,
    HistoricalLearningQueryResponse,
    HistoricalSimilarDetectionResponse,
)
from .feedback_store import HistoricalLearningStore, row_to_similarity_profile

BENIGN_CLOSURE_LABELS = {
    "false_positive",
    "benign",
    "likely_benign",
    "allowlisted",
}
MALICIOUS_CLOSURE_LABELS = {
    "true_positive",
    "confirmed_malicious",
    "malicious",
    "likely_malicious",
    "suspicious",
    "escalated",
}
ALLOWED_EVENT_TYPES = {
    "analyst_override",
    "final_closure",
    "recommendation_feedback",
    "post_action_outcome",
    "suppression_allowlist_decision",
    "rollback_outcome",
}
SIMILARITY_DIMENSION_WEIGHTS: tuple[tuple[str, float], ...] = (
    ("same_rule_or_family", 0.20),
    ("same_indicator", 0.20),
    ("behavior_patterns", 0.12),
    ("same_signer_or_publisher", 0.10),
    ("same_asset_group", 0.10),
    ("same_lineage_shape", 0.10),
    ("network_destination_family", 0.10),
    ("analyst_closure_pattern", 0.08),
)
SUPPORTED_INDICATOR_TYPES = {"hash", "sha256", "sha1", "md5", "domain", "ip", "url"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clip01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _smoothed_rate(positive: float, total: float, alpha: float = 0.35) -> float:
    if total <= 0:
        return 0.0
    return _clip01((positive + alpha) / (total + 2.0 * alpha))


def _parse_datetime_utc(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _normalize_label(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower().replace(" ", "_")


def _coerce_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _coerce_list_of_dicts(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _coerce_list_of_strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    output: list[str] = []
    for item in value:
        token = _normalize_token(item)
        if token:
            output.append(token)
    return output


def _first_non_empty(*values: Any) -> str:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def _normalize_token(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _dedupe_tokens(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for raw in values:
        token = _normalize_token(raw)
        if not token or token in seen:
            continue
        seen.add(token)
        output.append(token)
    return output


def _normalize_indicator_type(value: Any) -> str:
    token = _normalize_token(value)
    if token in {"sha256", "sha1", "md5", "hash", "file_hash"}:
        return "hash"
    if token in {"domain", "fqdn", "host"}:
        return "domain"
    if token in {"ip", "ipv4", "ipv6"}:
        return "ip"
    if token in {"url", "uri"}:
        return "url"
    return token


def _normalize_indicator_value(value: Any) -> str:
    return _normalize_token(value)


def _normalize_indicator(item_type: Any, item_value: Any) -> dict[str, str] | None:
    indicator_type = _normalize_indicator_type(item_type)
    indicator_value = _normalize_indicator_value(item_value)
    if not indicator_type or not indicator_value:
        return None
    if indicator_type not in SUPPORTED_INDICATOR_TYPES:
        return None
    return {"indicator_type": indicator_type, "indicator_value": indicator_value}


def _dedupe_indicator_list(indicators: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[tuple[str, str]] = set()
    output: list[dict[str, str]] = []
    for item in indicators:
        key = (item["indicator_type"], item["indicator_value"])
        if key in seen:
            continue
        seen.add(key)
        output.append(item)
    return output


@dataclass(frozen=True, slots=True)
class _EligibleEvent:
    row: dict[str, Any]
    event_id: str
    event_type: str
    occurred_at_utc: datetime
    weight: float


@dataclass(slots=True)
class _SimilarDetectionAggregate:
    detection_id: str
    rule_family: str
    rule_id: str
    observed_at: datetime
    confidence: float
    relation_type: str
    similarity_score: float
    similarity_reasons: list[str] = field(default_factory=list)
    prior_verdicts: set[str] = field(default_factory=set)
    prior_accepted_actions: set[str] = field(default_factory=set)
    prior_outcomes: set[str] = field(default_factory=set)


class HistoricalLearningEngine:
    def __init__(
        self,
        store: HistoricalLearningStore,
        *,
        default_lookback_days: int = 90,
        default_top_k: int = 10,
        decay_half_life_days: float = 45.0,
    ) -> None:
        self._store = store
        self._default_lookback_days = max(1, default_lookback_days)
        self._default_top_k = max(1, min(default_top_k, 100))
        self._decay_half_life_days = max(1.0, decay_half_life_days)

    def build_context_from_score_request(
        self,
        *,
        ioc_type: str,
        ioc_value: str,
        as_of_time: datetime | None,
        lookback_days: int | None = None,
        top_k: int | None = None,
        host_context: dict[str, Any] | None = None,
        rule_context: dict[str, Any] | None = None,
        detection_package: dict[str, Any] | None = None,
    ) -> HistoricalLearningContextResponse:
        resolved_lookback_days = max(1, int(lookback_days or self._default_lookback_days))
        resolved_top_k = max(1, min(int(top_k or self._default_top_k), 100))
        as_of = as_of_time.astimezone(timezone.utc) if as_of_time else _utcnow()
        query_profile = _build_query_profile(
            ioc_type=ioc_type,
            ioc_value=ioc_value,
            host_context=host_context or {},
            rule_context=rule_context or {},
            detection_package=detection_package or {},
        )

        rows = self._store.query_candidate_events(
            profile=query_profile,
            as_of_time=as_of,
            lookback_days=resolved_lookback_days,
            limit=2000,
        )
        if not rows:
            rows = self._store.query_events(
                ioc_type=ioc_type,
                ioc_value=ioc_value,
                as_of_time=as_of,
                lookback_days=resolved_lookback_days,
                limit=2000,
            )
        return self._build_context(
            rows=rows,
            as_of=as_of,
            lookback_days=resolved_lookback_days,
            top_k=resolved_top_k,
            query_profile=query_profile,
        )

    def query(self, request: HistoricalLearningQueryRequest) -> HistoricalLearningQueryResponse:
        context = self.build_context_from_score_request(
            ioc_type=request.ioc_type,
            ioc_value=request.ioc_value,
            as_of_time=request.as_of_time,
            lookback_days=request.lookback_days,
            top_k=request.top_k,
            host_context=request.host_context,
            rule_context=request.rule_context,
            detection_package=request.detection_package if isinstance(request.detection_package, dict) else {},
        )
        return HistoricalLearningQueryResponse(
            historical_features=context.features,
            similar_detections=context.similar_detections,
            feature_provenance=context.feature_provenance,
            quality=context.quality,
        )

    def _build_context(
        self,
        *,
        rows: list[dict[str, Any]],
        as_of: datetime,
        lookback_days: int,
        top_k: int,
        query_profile: dict[str, Any],
    ) -> HistoricalLearningContextResponse:
        dropped_reasons: dict[str, int] = defaultdict(int)
        eligible: list[_EligibleEvent] = []
        for row in rows:
            eligible_event, drop_reason = self._strictly_eligible_event(row=row, as_of=as_of)
            if eligible_event is not None:
                eligible.append(eligible_event)
            elif drop_reason:
                dropped_reasons[drop_reason] += 1

        quality = HistoricalLearningQualityResponse(
            eligible_count=len(eligible),
            dropped_count=sum(dropped_reasons.values()),
            drop_reasons=dict(sorted(dropped_reasons.items(), key=lambda item: item[0])),
            lookback_days=lookback_days,
        )
        if not eligible:
            return HistoricalLearningContextResponse(
                features={},
                feature_provenance=[],
                quality=quality,
                similar_detections=[],
            )

        counters: dict[str, float] = defaultdict(float)
        recency_accumulator = 0.0
        feature_sources: dict[str, list[tuple[_EligibleEvent, float, str]]] = defaultdict(list)

        for event in eligible:
            recency_accumulator += event.weight
            self._accumulate_event_signals(
                event=event,
                counters=counters,
                feature_sources=feature_sources,
            )

        features = self._finalize_features(
            counters=counters,
            eligible_count=len(eligible),
            recency_signal=_clip01(recency_accumulator / max(1.0, float(len(eligible)))),
        )
        provenance = self._build_feature_provenance(
            features=features,
            feature_sources=feature_sources,
            fallback_events=eligible,
        )
        similar_detections = self._build_similar_detections(
            eligible=eligible,
            query_profile=query_profile,
            top_k=top_k,
        )

        return HistoricalLearningContextResponse(
            features={key: float(round(value, 6)) for key, value in sorted(features.items(), key=lambda item: item[0])},
            feature_provenance=provenance,
            quality=quality,
            similar_detections=similar_detections,
        )

    def _strictly_eligible_event(
        self,
        *,
        row: dict[str, Any],
        as_of: datetime,
    ) -> tuple[_EligibleEvent | None, str | None]:
        event_type = _normalize_label(row.get("eventType"))
        if event_type not in ALLOWED_EVENT_TYPES:
            return None, "unsupported_event_type"
        if row.get("isFinal") is not True:
            return None, "not_finalized"

        event_id = _first_non_empty(row.get("eventId"), row.get("feedbackId"))
        if not event_id:
            return None, "missing_event_id"
        occurred = _parse_datetime_utc(row.get("occurredAtUtc")) or _parse_datetime_utc(row.get("submittedAtUtc"))
        if occurred is None:
            return None, "missing_occurred_at"
        if occurred > as_of + timedelta(minutes=5):
            return None, "future_timestamp"

        if event_type == "analyst_override":
            override = _coerce_dict(row.get("analystOverride"))
            if not isinstance(override.get("overrideApplied"), bool):
                return None, "analyst_override_missing_flag"
            if not _first_non_empty(override.get("recommendedVerdict")) or not _first_non_empty(override.get("finalVerdict")):
                return None, "analyst_override_missing_verdict"
        elif event_type == "final_closure":
            closure = _coerce_dict(row.get("finalClosure"))
            closure_label = _first_non_empty(closure.get("closureLabel"), closure.get("closureVerdict"), row.get("verdict"))
            if not closure_label:
                return None, "closure_missing_label"
        elif event_type == "recommendation_feedback":
            recommendation = _coerce_dict(row.get("recommendationFeedback"))
            disposition = _normalize_label(recommendation.get("disposition"))
            if not _first_non_empty(recommendation.get("recommendationCode")):
                return None, "recommendation_missing_code"
            if disposition not in {"accepted", "rejected"}:
                return None, "recommendation_missing_disposition"
        elif event_type == "post_action_outcome":
            outcome_block = _coerce_dict(row.get("postActionOutcome"))
            outcome = _normalize_label(outcome_block.get("outcome"))
            if outcome not in {"success", "regression", "neutral"}:
                return None, "post_action_missing_outcome"
        elif event_type == "suppression_allowlist_decision":
            decision_block = _coerce_dict(row.get("suppressionAllowlistDecision"))
            decision = _normalize_label(decision_block.get("decision"))
            if decision not in {"suppression", "allowlist"}:
                return None, "suppression_allowlist_missing_decision"
        elif event_type == "rollback_outcome":
            rollback = _coerce_dict(row.get("rollbackOutcome"))
            rollback_performed = rollback.get("rollbackPerformed")
            if not isinstance(rollback_performed, bool):
                return None, "rollback_missing_flag"
            if rollback_performed and not isinstance(rollback.get("rollbackSucceeded"), bool):
                return None, "rollback_missing_success"

        age_days = max(0.0, (as_of - occurred).total_seconds() / 86400.0)
        decay = math.pow(0.5, age_days / self._decay_half_life_days)
        weight = _clip01(max(0.05, decay))
        return (
            _EligibleEvent(
                row=row,
                event_id=event_id,
                event_type=event_type,
                occurred_at_utc=occurred,
                weight=weight,
            ),
            None,
        )

    @staticmethod
    def _accumulate_event_signals(
        *,
        event: _EligibleEvent,
        counters: dict[str, float],
        feature_sources: dict[str, list[tuple[_EligibleEvent, float, str]]],
    ) -> None:
        def add(metric: str, value: float, detail: str) -> None:
            if value <= 0:
                return
            counters[metric] += value
            feature_sources[metric].append((event, value, detail))

        add("event_weight_total", event.weight, "eligible_event")

        if event.event_type == "analyst_override":
            override = _coerce_dict(event.row.get("analystOverride"))
            add("override_total", event.weight, "override_observed")
            if override.get("overrideApplied") is True:
                add("override_positive", event.weight, "override_applied")
            recommended = _normalize_label(override.get("recommendedVerdict"))
            final = _normalize_label(override.get("finalVerdict"))
            if recommended and final and recommended != final:
                add("conflict_positive", event.weight, "override_conflict")

        elif event.event_type == "final_closure":
            closure = _coerce_dict(event.row.get("finalClosure"))
            label = _normalize_label(_first_non_empty(closure.get("closureLabel"), closure.get("closureVerdict"), event.row.get("verdict")))
            add("closure_total", event.weight, "final_closure")
            if label in BENIGN_CLOSURE_LABELS:
                add("closure_benign_positive", event.weight, f"closure={label}")
            elif label in MALICIOUS_CLOSURE_LABELS:
                add("closure_malicious_positive", event.weight, f"closure={label}")
            else:
                add("conflict_positive", event.weight * 0.5, f"closure_ambiguous={label or 'unknown'}")

        elif event.event_type == "recommendation_feedback":
            recommendation = _coerce_dict(event.row.get("recommendationFeedback"))
            disposition = _normalize_label(recommendation.get("disposition"))
            add("recommendation_total", event.weight, "recommendation_feedback")
            if disposition == "accepted":
                add("recommendation_accept_positive", event.weight, "recommendation_accepted")
            elif disposition == "rejected":
                add("recommendation_reject_positive", event.weight, "recommendation_rejected")
                add("conflict_positive", event.weight, "recommendation_rejected")

        elif event.event_type == "post_action_outcome":
            outcome = _normalize_label(_coerce_dict(event.row.get("postActionOutcome")).get("outcome"))
            add("post_action_total", event.weight, "post_action_outcome")
            if outcome == "success":
                add("post_action_success_positive", event.weight, "post_action_success")
            elif outcome == "regression":
                add("post_action_regression_positive", event.weight, "post_action_regression")
                add("conflict_positive", event.weight, "post_action_regression")

        elif event.event_type == "suppression_allowlist_decision":
            decision = _normalize_label(_coerce_dict(event.row.get("suppressionAllowlistDecision")).get("decision"))
            add("suppression_allowlist_total", event.weight, "suppression_allowlist_decision")
            if decision == "suppression":
                add("suppression_positive", event.weight, "suppression_decision")
            elif decision == "allowlist":
                add("allowlist_positive", event.weight, "allowlist_decision")

        elif event.event_type == "rollback_outcome":
            rollback = _coerce_dict(event.row.get("rollbackOutcome"))
            rollback_performed = rollback.get("rollbackPerformed") is True
            rollback_succeeded = rollback.get("rollbackSucceeded") is True
            add("rollback_total", event.weight, "rollback_outcome")
            if rollback_performed:
                add("rollback_positive", event.weight, "rollback_performed")
                add("conflict_positive", event.weight, "rollback_performed")
                if rollback_succeeded:
                    add("rollback_success_positive", event.weight, "rollback_succeeded")

    @staticmethod
    def _finalize_features(
        *,
        counters: dict[str, float],
        eligible_count: int,
        recency_signal: float,
    ) -> dict[str, float]:
        history_override_rate = _smoothed_rate(counters["override_positive"], counters["override_total"])
        history_closure_benign_rate = _smoothed_rate(counters["closure_benign_positive"], counters["closure_total"])
        history_closure_malicious_rate = _smoothed_rate(counters["closure_malicious_positive"], counters["closure_total"])
        history_recommendation_accept_rate = _smoothed_rate(
            counters["recommendation_accept_positive"],
            counters["recommendation_total"],
        )
        history_recommendation_reject_rate = _smoothed_rate(
            counters["recommendation_reject_positive"],
            counters["recommendation_total"],
        )
        history_post_action_success_rate = _smoothed_rate(
            counters["post_action_success_positive"],
            counters["post_action_total"],
        )
        history_post_action_regression_rate = _smoothed_rate(
            counters["post_action_regression_positive"],
            counters["post_action_total"],
        )
        history_suppression_rate = _smoothed_rate(
            counters["suppression_positive"],
            counters["suppression_allowlist_total"],
        )
        history_allowlist_rate = _smoothed_rate(
            counters["allowlist_positive"],
            counters["suppression_allowlist_total"],
        )
        history_rollback_rate = _smoothed_rate(counters["rollback_positive"], counters["rollback_total"])
        history_rollback_success_rate = _smoothed_rate(counters["rollback_success_positive"], counters["rollback_total"])
        history_conflict_rate = _smoothed_rate(counters["conflict_positive"], counters["event_weight_total"])
        history_sample_size_signal = _clip01(float(eligible_count) / 20.0)

        history_benign_pressure_signal = _clip01(
            max(
                history_closure_benign_rate,
                history_recommendation_reject_rate,
                history_post_action_regression_rate,
                history_suppression_rate,
                history_allowlist_rate,
                history_rollback_rate,
            )
        )
        history_support_signal = _clip01(
            max(
                history_closure_malicious_rate,
                history_recommendation_accept_rate,
                history_post_action_success_rate,
            )
            * (1.0 - history_benign_pressure_signal * 0.55)
        )

        return {
            "history_override_rate": history_override_rate,
            "history_closure_benign_rate": history_closure_benign_rate,
            "history_closure_malicious_rate": history_closure_malicious_rate,
            "history_recommendation_accept_rate": history_recommendation_accept_rate,
            "history_recommendation_reject_rate": history_recommendation_reject_rate,
            "history_post_action_success_rate": history_post_action_success_rate,
            "history_post_action_regression_rate": history_post_action_regression_rate,
            "history_suppression_rate": history_suppression_rate,
            "history_allowlist_rate": history_allowlist_rate,
            "history_rollback_rate": history_rollback_rate,
            "history_rollback_success_rate": history_rollback_success_rate,
            "history_conflict_rate": history_conflict_rate,
            "history_sample_size_signal": history_sample_size_signal,
            "history_recency_signal": recency_signal,
            "history_benign_pressure_signal": history_benign_pressure_signal,
            "history_support_signal": history_support_signal,
        }

    @staticmethod
    def _build_feature_provenance(
        *,
        features: dict[str, float],
        feature_sources: dict[str, list[tuple[_EligibleEvent, float, str]]],
        fallback_events: list[_EligibleEvent],
    ) -> list[HistoricalFeatureProvenanceItemResponse]:
        output: list[HistoricalFeatureProvenanceItemResponse] = []
        fallback = fallback_events[0] if fallback_events else None

        for feature_name in sorted(features.keys()):
            sources = sorted(feature_sources.get(feature_name, []), key=lambda item: item[1], reverse=True)[:3]
            if not sources and fallback is not None:
                sources = [(fallback, fallback.weight, "eligible_event")]
            for source_event, contribution, detail in sources:
                output.append(
                    HistoricalFeatureProvenanceItemResponse(
                        feature=feature_name,
                        source_event_id=source_event.event_id,
                        event_type=source_event.event_type,
                        occurred_at_utc=source_event.occurred_at_utc,
                        contribution=_clip01(contribution),
                        detail=detail,
                    )
                )

        return output

    @staticmethod
    def _build_similar_detections(
        *,
        eligible: list[_EligibleEvent],
        query_profile: dict[str, Any],
        top_k: int,
    ) -> list[HistoricalSimilarDetectionResponse]:
        aggregates: dict[str, _SimilarDetectionAggregate] = {}

        for event in eligible:
            row = event.row
            detection_id = _first_non_empty(row.get("decisionId"), row.get("caseId"), row.get("eventId"), row.get("feedbackId"))
            if not detection_id:
                continue

            row_profile = row_to_similarity_profile(row)
            similarity_score, similarity_reasons = _score_similarity(query_profile=query_profile, row_profile=row_profile)
            if similarity_score <= 0.0:
                continue

            rule_family = _normalize_label(_first_non_empty(row_profile.get("rule_family"), row.get("detectionFamily"), "other")) or "other"
            rule_id = _first_non_empty(
                row_profile.get("rule_id"),
                _coerce_dict(row.get("recommendationFeedback")).get("recommendationCode"),
                _coerce_dict(row.get("finalClosure")).get("closureLabel"),
                _coerce_dict(row.get("finalClosure")).get("closureVerdict"),
                row.get("verdict"),
                row.get("eventType"),
                "historical_event",
            )
            relation_type = "supporting_signal"
            if HistoricalLearningEngine._event_indicates_benign_pressure(event):
                relation_type = "contradictory_signal"

            confidence = _clip01(0.30 + 0.35 * event.weight + 0.35 * similarity_score)
            aggregate = aggregates.get(detection_id)
            if aggregate is None:
                aggregate = _SimilarDetectionAggregate(
                    detection_id=detection_id,
                    rule_family=rule_family,
                    rule_id=rule_id,
                    observed_at=event.occurred_at_utc,
                    confidence=confidence,
                    relation_type=relation_type,
                    similarity_score=similarity_score,
                    similarity_reasons=list(similarity_reasons),
                )
                aggregates[detection_id] = aggregate
            else:
                if event.occurred_at_utc > aggregate.observed_at:
                    aggregate.observed_at = event.occurred_at_utc
                aggregate.confidence = max(aggregate.confidence, confidence)
                aggregate.similarity_score = max(aggregate.similarity_score, similarity_score)
                if relation_type == "contradictory_signal":
                    aggregate.relation_type = "contradictory_signal"
                aggregate.rule_family = aggregate.rule_family or rule_family
                aggregate.rule_id = aggregate.rule_id or rule_id
                aggregate.similarity_reasons = _merge_reason_lists(aggregate.similarity_reasons, similarity_reasons)

            aggregate.prior_verdicts.update(_extract_prior_verdicts(row))
            aggregate.prior_accepted_actions.update(_extract_prior_accepted_actions(row))
            aggregate.prior_outcomes.update(_extract_prior_outcomes(row))

        ranked = sorted(
            aggregates.values(),
            key=lambda item: (-item.similarity_score, -item.observed_at.timestamp(), -item.confidence, item.detection_id),
        )
        output: list[HistoricalSimilarDetectionResponse] = []
        for item in ranked[: max(1, top_k)]:
            output.append(
                HistoricalSimilarDetectionResponse(
                    detection_id=item.detection_id,
                    rule_family=item.rule_family,
                    rule_id=item.rule_id,
                    relation_type=item.relation_type,
                    observed_at=item.observed_at,
                    confidence=float(round(_clip01(item.confidence), 6)),
                    similarity_score=float(round(_clip01(item.similarity_score), 6)),
                    similarity_reasons=list(item.similarity_reasons),
                    prior_verdicts=sorted(item.prior_verdicts),
                    prior_accepted_actions=sorted(item.prior_accepted_actions),
                    prior_outcomes=sorted(item.prior_outcomes),
                )
            )
        return output

    @staticmethod
    def _event_indicates_benign_pressure(event: _EligibleEvent) -> bool:
        if event.event_type == "final_closure":
            closure = _coerce_dict(event.row.get("finalClosure"))
            label = _normalize_label(_first_non_empty(closure.get("closureLabel"), closure.get("closureVerdict"), event.row.get("verdict")))
            return label in BENIGN_CLOSURE_LABELS
        if event.event_type == "recommendation_feedback":
            recommendation = _coerce_dict(event.row.get("recommendationFeedback"))
            return _normalize_label(recommendation.get("disposition")) == "rejected"
        if event.event_type == "post_action_outcome":
            outcome = _normalize_label(_coerce_dict(event.row.get("postActionOutcome")).get("outcome"))
            return outcome == "regression"
        if event.event_type == "suppression_allowlist_decision":
            decision = _normalize_label(_coerce_dict(event.row.get("suppressionAllowlistDecision")).get("decision"))
            return decision in {"suppression", "allowlist"}
        if event.event_type == "rollback_outcome":
            rollback = _coerce_dict(event.row.get("rollbackOutcome"))
            return rollback.get("rollbackPerformed") is True
        return False


def _build_query_profile(
    *,
    ioc_type: str,
    ioc_value: str,
    host_context: dict[str, Any],
    rule_context: dict[str, Any],
    detection_package: dict[str, Any],
) -> dict[str, Any]:
    package = detection_package if isinstance(detection_package, dict) else {}
    rule_metadata = _coerce_dict(package.get("rule_metadata"))
    asset_context = _coerce_dict(package.get("asset_context"))
    object_metadata = _coerce_dict(package.get("object_metadata"))
    custom_attributes = _coerce_dict(object_metadata.get("custom_attributes"))
    raw_hit_payload = _coerce_dict(package.get("raw_hit_payload"))
    behavior_reports = _coerce_list_of_dicts(_coerce_dict(package.get("behavior_report_references")).get("reports"))
    prior_outcomes = _coerce_list_of_dicts(_coerce_dict(package.get("prior_analyst_outcomes")).get("outcomes"))

    rule_family = _normalize_token(
        _first_non_empty(
            package.get("rule_family"),
            rule_context.get("rule_family"),
            rule_context.get("ruleFamily"),
        )
    )
    rule_id = _normalize_token(
        _first_non_empty(
            rule_metadata.get("rule_id"),
            rule_metadata.get("id"),
            rule_context.get("rule_id"),
            rule_context.get("ruleId"),
        )
    )

    indicators: list[dict[str, str]] = []
    base_indicator = _normalize_indicator(ioc_type, ioc_value)
    if base_indicator is not None:
        indicators.append(base_indicator)
    indicators.extend(_extract_indicators_from_detection_payload(package))
    indicators = _dedupe_indicator_list(indicators)

    behavior_patterns = _extract_behavior_patterns(behavior_reports)
    signer = _normalize_token(
        _first_non_empty(
            _coerce_dict(raw_hit_payload.get("sample")).get("signer"),
            _coerce_dict(custom_attributes.get("sample")).get("signer"),
            package.get("signer"),
        )
    )
    publisher = _normalize_token(
        _first_non_empty(
            _coerce_dict(raw_hit_payload.get("sample")).get("publisher"),
            _coerce_dict(custom_attributes.get("sample")).get("publisher"),
            package.get("publisher"),
        )
    )
    asset_group = _normalize_token(
        _first_non_empty(
            host_context.get("asset_group"),
            host_context.get("assetGroup"),
            asset_context.get("business_unit"),
            asset_context.get("asset_type"),
            (_coerce_list_of_strings(asset_context.get("tags")) or [""])[0],
        )
    )
    lineage_shape = _normalize_token(_derive_lineage_shape(raw_hit_payload=raw_hit_payload, custom_attributes=custom_attributes, reports=behavior_reports))
    network_destination_families = _extract_network_destination_families(
        ioc_indicators=indicators,
        reports=behavior_reports,
    )
    analyst_closure_pattern = _derive_analyst_closure_pattern(prior_outcomes)

    return {
        "rule_family": rule_family,
        "rule_id": rule_id,
        "ioc_indicators": indicators,
        "behavior_patterns": behavior_patterns,
        "signer": signer,
        "publisher": publisher,
        "asset_group": asset_group,
        "lineage_shape": lineage_shape,
        "network_destination_families": network_destination_families,
        "analyst_closure_pattern": analyst_closure_pattern,
    }


def _extract_indicators_from_detection_payload(package: dict[str, Any]) -> list[dict[str, str]]:
    raw_hit_payload = _coerce_dict(package.get("raw_hit_payload"))
    indicators: list[dict[str, str]] = []

    for key, indicator_type in (
        ("sha256", "hash"),
        ("sha1", "hash"),
        ("md5", "hash"),
        ("hash", "hash"),
        ("domain", "domain"),
        ("fqdn", "domain"),
        ("ip", "ip"),
        ("url", "url"),
    ):
        value = _first_non_empty(raw_hit_payload.get(key), package.get(key))
        indicator = _normalize_indicator(indicator_type, value)
        if indicator is not None:
            indicators.append(indicator)

    network = _coerce_dict(raw_hit_payload.get("network"))
    for domain in _coerce_list_of_strings(network.get("domains")):
        indicator = _normalize_indicator("domain", domain)
        if indicator is not None:
            indicators.append(indicator)
    for ip_value in _coerce_list_of_strings(network.get("ip_contacts")):
        indicator = _normalize_indicator("ip", ip_value)
        if indicator is not None:
            indicators.append(indicator)
    for request in _coerce_list_of_dicts(network.get("http_requests")):
        indicator = _normalize_indicator("url", request.get("url"))
        if indicator is not None:
            indicators.append(indicator)

    return indicators


def _extract_behavior_patterns(reports: list[dict[str, Any]]) -> list[str]:
    patterns: list[str] = []
    for report in reports:
        extracted = _coerce_dict(report.get("extracted_behavior_features"))
        for key in (
            "suspicious_api_system_call_families",
            "persistence_indicators",
            "suspicious_script_interpreter_usage",
            "injected_processes",
            "anti_analysis_markers",
        ):
            patterns.extend(_coerce_list_of_strings(extracted.get(key)))
        summary = _normalize_token(report.get("summary"))
        if summary:
            tokens = [token for token in summary.replace(",", " ").split(" ") if len(token.strip()) >= 4]
            patterns.extend([token.strip().lower() for token in tokens[:12]])
    return _dedupe_tokens(patterns)


def _derive_lineage_shape(
    *,
    raw_hit_payload: dict[str, Any],
    custom_attributes: dict[str, Any],
    reports: list[dict[str, Any]],
) -> str:
    lineage = _coerce_dict(raw_hit_payload.get("lineage"))
    if not lineage:
        lineage = _coerce_dict(custom_attributes.get("lineage"))
    process_nodes = _coerce_list_of_dicts(lineage.get("process"))
    has_user = bool(_coerce_dict(lineage.get("user")))
    has_host = bool(_coerce_dict(lineage.get("host")))
    if process_nodes:
        return f"p{len(process_nodes)}_u{1 if has_user else 0}_h{1 if has_host else 0}"

    for report in reports:
        extracted = _coerce_dict(report.get("extracted_behavior_features"))
        tree = _coerce_dict(extracted.get("process_tree_shape"))
        count = int(_float_or_default(tree.get("process_count"), 0))
        depth = int(_float_or_default(tree.get("max_depth"), 0))
        if count > 0 or depth > 0:
            return f"tree_d{depth}_c{count}"
    return ""


def _extract_network_destination_families(
    *,
    ioc_indicators: list[dict[str, str]],
    reports: list[dict[str, Any]],
) -> list[str]:
    output: list[str] = []
    for indicator in ioc_indicators:
        family = _destination_family(indicator_type=indicator["indicator_type"], indicator_value=indicator["indicator_value"])
        if family:
            output.append(family)

    for report in reports:
        extracted = _coerce_dict(report.get("extracted_behavior_features"))
        for destination in _coerce_list_of_dicts(extracted.get("network_destinations")):
            family = _destination_family(
                indicator_type=_normalize_indicator_type(destination.get("type")),
                indicator_value=destination.get("value"),
            )
            if family:
                output.append(family)
    return _dedupe_tokens(output)


def _destination_family(*, indicator_type: str, indicator_value: Any) -> str:
    normalized_type = _normalize_indicator_type(indicator_type)
    normalized_value = _normalize_indicator_value(indicator_value)
    if not normalized_type or not normalized_value:
        return ""
    if normalized_type == "domain":
        labels = [segment for segment in normalized_value.split(".") if segment]
        if len(labels) >= 2:
            return ".".join(labels[-2:])
        return normalized_value
    if normalized_type == "ip":
        try:
            address = ipaddress.ip_address(normalized_value)
        except ValueError:
            return "ip_unknown"
        if address.version == 6:
            return "ipv6"
        return "ipv4_private" if address.is_private else "ipv4_public"
    if normalized_type == "url":
        parsed = urlparse(normalized_value)
        host = _normalize_token(parsed.hostname or "")
        if host:
            return _destination_family(indicator_type="domain", indicator_value=host)
        return "url_path"
    return normalized_type


def _derive_analyst_closure_pattern(outcomes: list[dict[str, Any]]) -> str:
    labels = [_normalize_label(item.get("verdict")) for item in outcomes if _normalize_label(item.get("verdict"))]
    labels = [label for label in labels if label]
    if not labels:
        return ""
    unique = sorted(set(labels))
    if len(unique) == 1:
        return unique[0]
    if any(item in MALICIOUS_CLOSURE_LABELS for item in unique) and any(item in BENIGN_CLOSURE_LABELS for item in unique):
        return "mixed_conflict"
    return "mixed"


def _score_similarity(query_profile: dict[str, Any], row_profile: dict[str, Any]) -> tuple[float, list[str]]:
    reasons: list[str] = []
    weighted_score = 0.0

    for dimension, weight in SIMILARITY_DIMENSION_WEIGHTS:
        score, reason = _score_dimension(dimension=dimension, query_profile=query_profile, row_profile=row_profile)
        if score <= 0.0:
            continue
        weighted_score += weight * score
        if reason:
            reasons.append(reason)
    return _clip01(weighted_score), reasons


def _score_dimension(
    *,
    dimension: str,
    query_profile: dict[str, Any],
    row_profile: dict[str, Any],
) -> tuple[float, str]:
    if dimension == "same_rule_or_family":
        query_rule_id = _normalize_token(query_profile.get("rule_id"))
        row_rule_id = _normalize_token(row_profile.get("rule_id"))
        if query_rule_id and row_rule_id and query_rule_id == row_rule_id:
            return 1.0, "same rule id"
        query_family = _normalize_token(query_profile.get("rule_family"))
        row_family = _normalize_token(row_profile.get("rule_family"))
        if query_family and row_family and query_family == row_family:
            return 0.70, "same rule family"
        return 0.0, ""

    if dimension == "same_indicator":
        query_indicators = _coerce_indicator_list(query_profile.get("ioc_indicators"))
        row_indicators = _coerce_indicator_list(row_profile.get("ioc_indicators"))
        query_pairs = {(item["indicator_type"], item["indicator_value"]) for item in query_indicators}
        row_pairs = {(item["indicator_type"], item["indicator_value"]) for item in row_indicators}
        if query_pairs and row_pairs and query_pairs.intersection(row_pairs):
            return 1.0, "same hash/domain/ip/url indicator"
        query_values = {item["indicator_value"] for item in query_indicators}
        row_values = {item["indicator_value"] for item in row_indicators}
        if query_values and row_values and query_values.intersection(row_values):
            return 0.75, "matching indicator value"
        return 0.0, ""

    if dimension == "behavior_patterns":
        query_patterns = set(_coerce_string_list(query_profile.get("behavior_patterns")))
        row_patterns = set(_coerce_string_list(row_profile.get("behavior_patterns")))
        if not query_patterns or not row_patterns:
            return 0.0, ""
        overlap = sorted(query_patterns.intersection(row_patterns))
        if not overlap:
            return 0.0, ""
        union_size = max(1, len(query_patterns.union(row_patterns)))
        jaccard = len(overlap) / float(union_size)
        summary = ", ".join(overlap[:3])
        return _clip01(jaccard * 1.8), f"similar behavior patterns ({summary})"

    if dimension == "same_signer_or_publisher":
        query_signer = _normalize_token(query_profile.get("signer"))
        row_signer = _normalize_token(row_profile.get("signer"))
        if query_signer and row_signer and query_signer == row_signer:
            return 1.0, "same signer"
        query_publisher = _normalize_token(query_profile.get("publisher"))
        row_publisher = _normalize_token(row_profile.get("publisher"))
        if query_publisher and row_publisher and query_publisher == row_publisher:
            return 0.85, "same publisher"
        return 0.0, ""

    if dimension == "same_asset_group":
        query_group = _normalize_token(query_profile.get("asset_group"))
        row_group = _normalize_token(row_profile.get("asset_group"))
        if query_group and row_group and query_group == row_group:
            return 1.0, "same asset group"
        return 0.0, ""

    if dimension == "same_lineage_shape":
        query_lineage = _normalize_token(query_profile.get("lineage_shape"))
        row_lineage = _normalize_token(row_profile.get("lineage_shape"))
        if query_lineage and row_lineage and query_lineage == row_lineage:
            return 1.0, "same lineage shape"
        return 0.0, ""

    if dimension == "network_destination_family":
        query_network = set(_coerce_string_list(query_profile.get("network_destination_families")))
        row_network = set(_coerce_string_list(row_profile.get("network_destination_families")))
        if not query_network or not row_network:
            return 0.0, ""
        overlap = sorted(query_network.intersection(row_network))
        if not overlap:
            return 0.0, ""
        ratio = len(overlap) / float(max(1, len(query_network)))
        return _clip01(ratio), f"same network destination family ({', '.join(overlap[:3])})"

    if dimension == "analyst_closure_pattern":
        query_pattern = _normalize_token(query_profile.get("analyst_closure_pattern"))
        row_pattern = _normalize_token(row_profile.get("analyst_closure_pattern"))
        if query_pattern and row_pattern and query_pattern == row_pattern:
            return 1.0, "similar analyst closure pattern"
        return 0.0, ""

    return 0.0, ""


def _coerce_indicator_list(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    output: list[dict[str, str]] = []
    for raw in value:
        if not isinstance(raw, dict):
            continue
        indicator = _normalize_indicator(raw.get("indicator_type"), raw.get("indicator_value"))
        if indicator is None:
            continue
        output.append(indicator)
    return _dedupe_indicator_list(output)


def _coerce_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return _dedupe_tokens([str(item) for item in value])


def _extract_prior_verdicts(row: dict[str, Any]) -> list[str]:
    values: list[str] = []
    direct_verdict = _normalize_label(row.get("verdict"))
    if direct_verdict:
        values.append(direct_verdict)
    closure = _coerce_dict(row.get("finalClosure"))
    values.append(_normalize_label(closure.get("closureLabel")))
    values.append(_normalize_label(closure.get("closureVerdict")))
    return _dedupe_tokens(values)


def _extract_prior_accepted_actions(row: dict[str, Any]) -> list[str]:
    recommendation = _coerce_dict(row.get("recommendationFeedback"))
    disposition = _normalize_label(recommendation.get("disposition"))
    if disposition != "accepted":
        return []
    action = _normalize_token(recommendation.get("recommendationCode"))
    return [action] if action else []


def _extract_prior_outcomes(row: dict[str, Any]) -> list[str]:
    outcomes: list[str] = []
    post_action = _coerce_dict(row.get("postActionOutcome"))
    post_value = _normalize_label(post_action.get("outcome"))
    if post_value:
        outcomes.append(post_value)
    suppression = _coerce_dict(row.get("suppressionAllowlistDecision"))
    suppression_value = _normalize_label(suppression.get("decision"))
    if suppression_value:
        outcomes.append(suppression_value)
    rollback = _coerce_dict(row.get("rollbackOutcome"))
    if rollback.get("rollbackPerformed") is True:
        outcomes.append("rollback_performed")
        if rollback.get("rollbackSucceeded") is True:
            outcomes.append("rollback_success")
        elif rollback.get("rollbackSucceeded") is False:
            outcomes.append("rollback_regression")
    return _dedupe_tokens(outcomes)


def _merge_reason_lists(existing: list[str], new: list[str]) -> list[str]:
    seen: set[str] = set(_normalize_token(item) for item in existing)
    output = list(existing)
    for raw in new:
        token = _normalize_token(raw)
        if not token or token in seen:
            continue
        seen.add(token)
        output.append(raw)
    return output


def _float_or_default(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
