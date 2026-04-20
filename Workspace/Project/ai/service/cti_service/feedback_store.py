from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from typing import Any
from uuid import uuid4

from .contracts import FeedbackIngestResponse, SubmitFeedbackRequest


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class HistoricalLearningStore:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = Lock()

    @property
    def path(self) -> Path:
        return self._path

    def append(self, request: SubmitFeedbackRequest) -> FeedbackIngestResponse:
        now = _utcnow()
        feedback_id = str(uuid4())
        row = self._row_from_request(request=request, feedback_id=feedback_id, submitted_at=now)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            with self._path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(row, ensure_ascii=True))
                handle.write("\n")

        return FeedbackIngestResponse(
            feedback_id=feedback_id,
            accepted=True,
            submitted_at_utc=now,
        )

    def query_events(
        self,
        *,
        ioc_type: str,
        ioc_value: str,
        lookback_days: int,
        as_of_time: datetime | None = None,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        normalized_type = _normalize_ioc_type(ioc_type)
        normalized_value = _normalize_ioc_value(ioc_value)
        if not normalized_type or not normalized_value:
            return []
        if lookback_days < 1:
            return []
        if not self._path.exists():
            return []

        as_of = as_of_time.astimezone(timezone.utc) if as_of_time else _utcnow()
        rows = [
            item
            for item in self._scan_rows_within_window(as_of=as_of, lookback_days=lookback_days)
            if _normalize_ioc_type(item.get("iocType")) == normalized_type and _normalize_ioc_value(item.get("iocValue")) == normalized_value
        ]
        resolved_limit = max(1, min(int(limit), 5000))
        return rows[:resolved_limit]

    def query_candidate_events(
        self,
        *,
        profile: dict[str, Any],
        lookback_days: int,
        as_of_time: datetime | None = None,
        limit: int = 2000,
    ) -> list[dict[str, Any]]:
        if lookback_days < 1:
            return []
        if not self._path.exists():
            return []
        as_of = as_of_time.astimezone(timezone.utc) if as_of_time else _utcnow()
        rows = self._scan_rows_within_window(as_of=as_of, lookback_days=lookback_days)
        if not profile:
            resolved_limit = max(1, min(int(limit), 5000))
            return rows[:resolved_limit]

        filtered = [
            item
            for item in rows
            if _row_matches_similarity_profile(row_profile=row_to_similarity_profile(item), query_profile=profile)
        ]
        resolved_limit = max(1, min(int(limit), 5000))
        return filtered[:resolved_limit]

    def query_recent_events(
        self,
        *,
        lookback_days: int,
        as_of_time: datetime | None = None,
        limit: int = 2000,
    ) -> list[dict[str, Any]]:
        if lookback_days < 1:
            return []
        if not self._path.exists():
            return []
        as_of = as_of_time.astimezone(timezone.utc) if as_of_time else _utcnow()
        rows = self._scan_rows_within_window(as_of=as_of, lookback_days=lookback_days)
        resolved_limit = max(1, min(int(limit), 5000))
        return rows[:resolved_limit]

    def _scan_rows_within_window(self, *, as_of: datetime, lookback_days: int) -> list[dict[str, Any]]:
        cutoff = as_of - timedelta(days=lookback_days)
        rows: list[dict[str, Any]] = []

        with self._lock:
            with self._path.open("r", encoding="utf-8") as handle:
                for raw_line in handle:
                    line = raw_line.strip()
                    if not line:
                        continue
                    try:
                        item = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if not isinstance(item, dict):
                        continue
                    occurred = _parse_datetime_utc(item.get("occurredAtUtc")) or _parse_datetime_utc(item.get("submittedAtUtc"))
                    if occurred is None:
                        continue
                    if occurred < cutoff or occurred > as_of + timedelta(minutes=5):
                        continue
                    rows.append(item)

        rows.sort(
            key=lambda item: (
                _parse_datetime_utc(item.get("occurredAtUtc")) or _parse_datetime_utc(item.get("submittedAtUtc")) or datetime.min.replace(tzinfo=timezone.utc),
                str(item.get("eventId") or item.get("feedbackId") or ""),
            ),
            reverse=True,
        )
        return rows

    @staticmethod
    def _row_from_request(
        *,
        request: SubmitFeedbackRequest,
        feedback_id: str,
        submitted_at: datetime,
    ) -> dict[str, Any]:
        event_type = request.event_type or "legacy_feedback"
        occurred = request.occurred_at_utc.astimezone(timezone.utc) if request.occurred_at_utc else submitted_at
        trust_tier = "strict" if request.event_type else "legacy_low_trust"

        row: dict[str, Any] = {
            "eventId": feedback_id,
            "feedbackId": feedback_id,
            "eventType": event_type,
            "caseId": request.case_id,
            "decisionId": request.decision_id,
            "iocType": request.ioc_type,
            "iocValue": request.ioc_value,
            "sourceSystem": request.source_system,
            "detectionFamily": request.detection_family,
            "verdict": request.verdict,
            "confidence": request.confidence,
            "falsePositiveRisk": request.false_positive_risk,
            "reviewPriority": request.review_priority,
            "shouldPromoteToIndicator": request.should_promote_to_indicator,
            "shouldSuppress": request.should_suppress,
            "shouldAllowlist": request.should_allowlist,
            "shouldEscalate": request.should_escalate,
            "isFinal": request.is_final,
            "notes": request.notes,
            "submittedByUserId": request.submitted_by_user_id,
            "occurredAtUtc": occurred.isoformat(),
            "submittedAtUtc": submitted_at.isoformat(),
            "trustTier": trust_tier,
        }

        if request.override_applied is not None or request.override_recommended_verdict or request.override_final_verdict:
            row["analystOverride"] = {
                "overrideApplied": request.override_applied,
                "recommendedVerdict": request.override_recommended_verdict,
                "finalVerdict": request.override_final_verdict,
            }

        if request.closure_label or request.closure_verdict:
            row["finalClosure"] = {
                "closureLabel": request.closure_label,
                "closureVerdict": request.closure_verdict,
            }

        if request.recommendation_code or request.recommendation_disposition:
            row["recommendationFeedback"] = {
                "recommendationCode": request.recommendation_code,
                "disposition": request.recommendation_disposition,
            }

        if request.post_action_outcome is not None:
            row["postActionOutcome"] = {
                "outcome": request.post_action_outcome,
            }

        if request.suppression_decision is not None:
            row["suppressionAllowlistDecision"] = {
                "decision": request.suppression_decision,
            }

        if request.rollback_performed is not None or request.rollback_succeeded is not None:
            row["rollbackOutcome"] = {
                "rollbackPerformed": request.rollback_performed,
                "rollbackSucceeded": request.rollback_succeeded,
            }

        similarity_context = _similarity_context_from_request(request)
        if similarity_context:
            row["similarityContext"] = similarity_context

        return _drop_none(row)


def _normalize_ioc_type(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _normalize_ioc_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


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


def _drop_none(payload: dict[str, Any]) -> dict[str, Any]:
    output: dict[str, Any] = {}
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, dict):
            nested = _drop_none(value)
            if nested:
                output[key] = nested
            continue
        output[key] = value
    return output


def _similarity_context_from_request(request: SubmitFeedbackRequest) -> dict[str, Any]:
    context: dict[str, Any] = {}
    if request.similarity_context is not None:
        context = request.similarity_context.model_dump(mode="python", by_alias=True, exclude_none=True)

    if not context.get("ruleFamily") and request.detection_family:
        context["ruleFamily"] = str(request.detection_family).strip().lower()
    if not context.get("ruleId"):
        inferred_rule_id = request.recommendation_code or request.closure_label or request.closure_verdict
        if inferred_rule_id:
            context["ruleId"] = str(inferred_rule_id).strip()
    indicators = context.get("iocIndicators")
    if not isinstance(indicators, list):
        indicators = []
    normalized_indicators = _normalize_indicator_list(indicators)
    if not normalized_indicators and request.ioc_type and request.ioc_value:
        normalized_indicators = [
            {
                "indicatorType": str(request.ioc_type).strip().lower(),
                "indicatorValue": str(request.ioc_value).strip().lower(),
            }
        ]
    if normalized_indicators:
        context["iocIndicators"] = normalized_indicators

    if not context.get("analystClosurePattern"):
        closure_pattern = _normalize_closure_pattern_from_request(request)
        if closure_pattern:
            context["analystClosurePattern"] = closure_pattern

    normalized_context = _normalize_similarity_context(context)
    return normalized_context


def _normalize_closure_pattern_from_request(request: SubmitFeedbackRequest) -> str:
    if request.event_type == "final_closure":
        raw = request.closure_label or request.closure_verdict or request.verdict
        return _normalize_token(raw)
    if request.event_type == "recommendation_feedback":
        return _normalize_token(request.recommendation_disposition or request.verdict)
    if request.event_type == "post_action_outcome":
        return _normalize_token(request.post_action_outcome or request.verdict)
    if request.event_type == "suppression_allowlist_decision":
        return _normalize_token(request.suppression_decision or request.verdict)
    if request.event_type == "rollback_outcome":
        if request.rollback_performed is True and request.rollback_succeeded is True:
            return "rollback_success"
        if request.rollback_performed is True and request.rollback_succeeded is False:
            return "rollback_regression"
    return _normalize_token(request.verdict)


def row_to_similarity_profile(row: dict[str, Any]) -> dict[str, Any]:
    context = _normalize_similarity_context(_coerce_dict(row.get("similarityContext")))
    if not context.get("rule_family"):
        detection_family = _normalize_token(row.get("detectionFamily"))
        if detection_family:
            context["rule_family"] = detection_family
    if not context.get("rule_id"):
        inferred_rule_id = _first_non_empty(
            _coerce_dict(row.get("recommendationFeedback")).get("recommendationCode"),
            _coerce_dict(row.get("finalClosure")).get("closureLabel"),
            _coerce_dict(row.get("finalClosure")).get("closureVerdict"),
            row.get("verdict"),
        )
        if inferred_rule_id:
            context["rule_id"] = inferred_rule_id
    if not context.get("ioc_indicators"):
        ioc_type = _normalize_ioc_type(row.get("iocType"))
        ioc_value = _normalize_ioc_value(row.get("iocValue"))
        if ioc_type and ioc_value:
            context["ioc_indicators"] = [{"indicator_type": ioc_type, "indicator_value": ioc_value}]
    if not context.get("analyst_closure_pattern"):
        context["analyst_closure_pattern"] = _normalize_closure_pattern_from_row(row)
    return context


def _normalize_closure_pattern_from_row(row: dict[str, Any]) -> str:
    event_type = _normalize_token(row.get("eventType"))
    if event_type == "final_closure":
        closure = _coerce_dict(row.get("finalClosure"))
        return _normalize_token(_first_non_empty(closure.get("closureLabel"), closure.get("closureVerdict"), row.get("verdict")))
    if event_type == "recommendation_feedback":
        recommendation = _coerce_dict(row.get("recommendationFeedback"))
        return _normalize_token(recommendation.get("disposition"))
    if event_type == "post_action_outcome":
        outcome = _coerce_dict(row.get("postActionOutcome"))
        return _normalize_token(outcome.get("outcome"))
    if event_type == "suppression_allowlist_decision":
        decision = _coerce_dict(row.get("suppressionAllowlistDecision"))
        return _normalize_token(decision.get("decision"))
    if event_type == "rollback_outcome":
        rollback = _coerce_dict(row.get("rollbackOutcome"))
        if rollback.get("rollbackPerformed") is True and rollback.get("rollbackSucceeded") is True:
            return "rollback_success"
        if rollback.get("rollbackPerformed") is True and rollback.get("rollbackSucceeded") is False:
            return "rollback_regression"
    return _normalize_token(row.get("verdict"))


def _row_matches_similarity_profile(*, row_profile: dict[str, Any], query_profile: dict[str, Any]) -> bool:
    query_rule_family = _normalize_token(query_profile.get("rule_family"))
    row_rule_family = _normalize_token(row_profile.get("rule_family"))
    if query_rule_family and row_rule_family and query_rule_family == row_rule_family:
        return True

    query_rule_id = _normalize_token(query_profile.get("rule_id"))
    row_rule_id = _normalize_token(row_profile.get("rule_id"))
    if query_rule_id and row_rule_id and query_rule_id == row_rule_id:
        return True

    query_indicators = {(item["indicator_type"], item["indicator_value"]) for item in _normalize_indicator_profile(query_profile)}
    row_indicators = {(item["indicator_type"], item["indicator_value"]) for item in _normalize_indicator_profile(row_profile)}
    if query_indicators and row_indicators and query_indicators.intersection(row_indicators):
        return True

    query_values = {item["indicator_value"] for item in _normalize_indicator_profile(query_profile)}
    row_values = {item["indicator_value"] for item in _normalize_indicator_profile(row_profile)}
    if query_values and row_values and query_values.intersection(row_values):
        return True

    for key in ("signer", "publisher", "asset_group", "lineage_shape", "analyst_closure_pattern"):
        left = _normalize_token(query_profile.get(key))
        right = _normalize_token(row_profile.get(key))
        if left and right and left == right:
            return True

    query_behavior = set(_normalize_token_list(query_profile.get("behavior_patterns")))
    row_behavior = set(_normalize_token_list(row_profile.get("behavior_patterns")))
    if query_behavior and row_behavior and query_behavior.intersection(row_behavior):
        return True

    query_network = set(_normalize_token_list(query_profile.get("network_destination_families")))
    row_network = set(_normalize_token_list(row_profile.get("network_destination_families")))
    if query_network and row_network and query_network.intersection(row_network):
        return True

    return False


def _normalize_similarity_context(value: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    output: dict[str, Any] = {}
    output["rule_family"] = _normalize_token(_first_non_empty(value.get("rule_family"), value.get("ruleFamily")))
    output["rule_id"] = _first_non_empty(value.get("rule_id"), value.get("ruleId"))
    output["ioc_indicators"] = _normalize_indicator_list(
        _first_non_empty(value.get("ioc_indicators"), value.get("iocIndicators")) or []
    )
    output["behavior_patterns"] = _normalize_token_list(
        _first_non_empty(value.get("behavior_patterns"), value.get("behaviorPatterns")) or []
    )
    output["signer"] = _normalize_token(value.get("signer"))
    output["publisher"] = _normalize_token(value.get("publisher"))
    output["asset_group"] = _normalize_token(_first_non_empty(value.get("asset_group"), value.get("assetGroup")))
    output["lineage_shape"] = _normalize_token(_first_non_empty(value.get("lineage_shape"), value.get("lineageShape")))
    output["network_destination_families"] = _normalize_token_list(
        _first_non_empty(value.get("network_destination_families"), value.get("networkDestinationFamilies")) or []
    )
    output["analyst_closure_pattern"] = _normalize_token(
        _first_non_empty(value.get("analyst_closure_pattern"), value.get("analystClosurePattern"))
    )
    return _drop_none(output)


def _normalize_indicator_profile(profile: dict[str, Any]) -> list[dict[str, str]]:
    return _normalize_indicator_list(profile.get("ioc_indicators"))


def _normalize_indicator_list(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    output: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for raw in value:
        if not isinstance(raw, dict):
            continue
        indicator_type = _normalize_token(_first_non_empty(raw.get("indicator_type"), raw.get("indicatorType")))
        indicator_value = _normalize_token(_first_non_empty(raw.get("indicator_value"), raw.get("indicatorValue")))
        if not indicator_type or not indicator_value:
            continue
        key = (indicator_type, indicator_value)
        if key in seen:
            continue
        seen.add(key)
        output.append({"indicator_type": indicator_type, "indicator_value": indicator_value})
    return output


def _normalize_token_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    output: list[str] = []
    seen: set[str] = set()
    for raw in value:
        token = _normalize_token(raw)
        if not token or token in seen:
            continue
        seen.add(token)
        output.append(token)
    return output


def _normalize_token(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    return text


def _coerce_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _first_non_empty(*values: Any) -> Any:
    for value in values:
        if isinstance(value, str):
            text = value.strip()
            if text:
                return text
            continue
        if value is not None:
            return value
    return None


FeedbackStore = HistoricalLearningStore
