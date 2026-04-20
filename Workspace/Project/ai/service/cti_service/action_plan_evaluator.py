from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

from .action_plan_recommender import build_action_plan
from .contracts import (
    EvidenceFusionDeduplicationResponse,
    EvidenceFusionEvidenceItemResponse,
    EvidenceFusionExplanationResponse,
    EvidenceFusionMissingItemResponse,
    ScoreCaseRequest,
)
from .evaluation_metrics import (
    ActionPlanEvaluationRow,
    ActionPlanMetricSummary,
    ActionPlanSliceSummary,
    compute_action_plan_metrics,
    is_unsafe_action_plan,
    slice_action_plan_metrics,
)


def build_action_plan_evaluation_rows(rows: Iterable[dict[str, Any]]) -> list[ActionPlanEvaluationRow]:
    output: list[ActionPlanEvaluationRow] = []
    for row in rows:
        if "action_plan_recommendation" not in _coerce_string_list(row.get("eligible_tasks")):
            continue
        record = build_action_plan_evaluation_row(row)
        if record is not None:
            output.append(record)
    return output


def build_action_plan_evaluation_row(row: dict[str, Any]) -> ActionPlanEvaluationRow | None:
    if not isinstance(row, dict):
        return None

    target_payload = row.get("target_payload")
    if not isinstance(target_payload, dict):
        return None
    approved_plan = target_payload.get("action_plan")
    if not isinstance(approved_plan, dict):
        return None

    adjudication = target_payload.get("adjudication") if isinstance(target_payload.get("adjudication"), dict) else {}
    package = row.get("package_payload") if isinstance(row.get("package_payload"), dict) else {}
    event_time = _parse_utc(row.get("event_time_utc")) or datetime.now(timezone.utc)
    rule_family = str(row.get("rule_family", package.get("rule_family", "unknown"))).strip().lower() or "unknown"

    request = ScoreCaseRequest(
        case_id=str(row.get("row_id", "evaluation-row")),
        as_of_time=event_time,
        source_system=_infer_source_system(package),
        ioc_type=_infer_ioc_type(package),
        ioc_value=_infer_ioc_value(package),
        host_context=_coerce_dict(package.get("asset_context")),
        rule_context={"ruleFamily": rule_family},
        detection_package=package,
    )
    verdict = str(adjudication.get("verdict", "insufficient_evidence")).strip().lower() or "insufficient_evidence"
    confidence = _clip01(float(adjudication.get("confidence", _default_confidence(verdict))))
    false_positive_risk = _clip01(float(adjudication.get("false_positive_risk", _default_false_positive_risk(verdict))))
    evidence_fusion = _build_evidence_fusion(adjudication)
    evidence_summary = _coerce_string_list(
        [
            adjudication.get("explanation"),
            *(item.get("summary") for item in _coerce_dict_list(adjudication.get("evidence_used"))),
        ]
    )
    predicted_plan = build_action_plan(
        request=request,
        verdict=verdict,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        evidence_fusion=evidence_fusion,
        historical_learning=None,
        family=rule_family,
        evidence_summary=evidence_summary,
    )

    predicted_actions = tuple(item.action for item in predicted_plan.recommended_actions)
    approved_actions = tuple(
        str(item.get("action", "")).strip()
        for item in _coerce_dict_list(approved_plan.get("recommended_actions"))
        if str(item.get("action", "")).strip()
    )
    useful_actions = approved_actions
    allowed_actions = _coerce_string_list(
        predicted_plan.machine_readable.selection.get("policy_allowed_actions")
        if isinstance(predicted_plan.machine_readable.selection, dict)
        else []
    )
    analyst_disposition = _extract_analyst_disposition(row, target_payload)

    return ActionPlanEvaluationRow(
        rule_family=rule_family,
        event_time=event_time,
        predicted_actions=predicted_actions,
        approved_actions=approved_actions,
        useful_actions=tuple(useful_actions),
        unsafe_recommendation=is_unsafe_action_plan(
            predicted_actions=predicted_actions,
            allowed_actions=allowed_actions,
            ground_truth_verdict=verdict,
        ),
        analyst_disposition=analyst_disposition,
        evidence_used_count=len(_coerce_dict_list(adjudication.get("evidence_used"))),
        evidence_missing_count=len(_coerce_dict_list(adjudication.get("evidence_missing"))),
    )


def evaluate_canonical_action_plan_rows(
    rows: Iterable[dict[str, Any]],
    *,
    top_k: int = 3,
    slice_fields: list[str] | None = None,
) -> tuple[ActionPlanMetricSummary, list[ActionPlanSliceSummary], int]:
    evaluation_rows = build_action_plan_evaluation_rows(rows)
    overall = compute_action_plan_metrics(evaluation_rows, top_k=top_k)
    slices = slice_action_plan_metrics(
        evaluation_rows,
        slice_fields=slice_fields or ["rule_family", "evidence_availability_bucket"],
        top_k=top_k,
    )
    return overall, slices, len(evaluation_rows)


def _build_evidence_fusion(adjudication: dict[str, Any]) -> EvidenceFusionExplanationResponse:
    positive = [
        EvidenceFusionEvidenceItemResponse(
            channel="dataset_label",
            source=str(item.get("source", "dataset")),
            evidence_id=_optional_string(item.get("evidence_id")),
            reference=_optional_string(item.get("reference")),
            category="supporting",
            polarity="positive",
            confidence=_optional_float(item.get("confidence")),
            summary=str(item.get("summary", "Supporting evidence")).strip() or "Supporting evidence",
            anchor=str(item.get("reference", item.get("evidence_id", "dataset"))).strip() or "dataset",
        )
        for item in _coerce_dict_list(adjudication.get("evidence_used"))
    ]
    contradictory = [
        EvidenceFusionEvidenceItemResponse(
            channel="dataset_label",
            source=str(item.get("source", "dataset")),
            evidence_id=_optional_string(item.get("evidence_id")),
            reference=_optional_string(item.get("reference")),
            category="contradictory",
            polarity="negative",
            confidence=_optional_float(item.get("confidence")),
            summary=str(item.get("summary", "Contradictory evidence")).strip() or "Contradictory evidence",
            anchor=str(item.get("reference", item.get("evidence_id", "dataset"))).strip() or "dataset",
        )
        for item in _coerce_dict_list(adjudication.get("contradictory_evidence"))
    ]
    missing = [
        EvidenceFusionMissingItemResponse(
            gap_id=str(item.get("gap_id", f"gap-{index}")).strip() or f"gap-{index}",
            channel="dataset_label",
            description=str(item.get("description", "Missing evidence")).strip() or "Missing evidence",
            importance=str(item.get("importance", "medium")).strip().lower() or "medium",
        )
        for index, item in enumerate(_coerce_dict_list(adjudication.get("evidence_missing")), start=1)
    ]
    coverage = {
        "supporting_evidence_present": len(positive) > 0,
        "missing_evidence_present": len(missing) > 0,
        "contradictory_evidence_present": len(contradictory) > 0,
    }
    return EvidenceFusionExplanationResponse(
        positive_evidence=positive,
        negative_evidence=[],
        contradictory_evidence=contradictory,
        missing_evidence=missing,
        coverage=coverage,
        deduplication=EvidenceFusionDeduplicationResponse(
            input_count=len(positive) + len(contradictory),
            unique_count=len(positive) + len(contradictory),
            duplicate_count=0,
        ),
        explanation_lines=[],
    )


def _extract_analyst_disposition(row: dict[str, Any], target_payload: dict[str, Any]) -> str | None:
    candidates: list[Any] = [
        row.get("recommendation_disposition"),
        row.get("analyst_disposition"),
        target_payload.get("recommendation_disposition"),
    ]
    raw_payload = row.get("raw_payload") if isinstance(row.get("raw_payload"), dict) else {}
    candidates.extend(
        [
            raw_payload.get("recommendation_disposition"),
            _coerce_dict(raw_payload.get("recommendation_feedback")).get("disposition"),
        ]
    )
    for candidate in candidates:
        text = _optional_string(candidate)
        if text:
            return text.lower()
    return None


def _infer_source_system(package: dict[str, Any]) -> str:
    object_metadata = _coerce_dict(package.get("object_metadata"))
    return _optional_string(object_metadata.get("source_system")) or "manager"


def _infer_ioc_type(package: dict[str, Any]) -> str:
    for value in (
        package.get("ioc_type"),
        _coerce_dict(package.get("indicator")).get("type"),
        _coerce_dict(package.get("observable")).get("type"),
        _coerce_dict(package.get("object_metadata")).get("ioc_type"),
    ):
        normalized = _optional_string(value)
        if normalized:
            return normalized.lower()

    object_type = _optional_string(_coerce_dict(package.get("object_metadata")).get("object_type")) or ""
    if "file" in object_type:
        return "hash"
    if "process" in object_type:
        return "process"
    if "network" in object_type:
        return "ip"
    return "unknown"


def _infer_ioc_value(package: dict[str, Any]) -> str:
    for value in (
        package.get("ioc_value"),
        _coerce_dict(package.get("indicator")).get("value"),
        _coerce_dict(package.get("observable")).get("value"),
        _coerce_dict(package.get("object_metadata")).get("object_id"),
    ):
        normalized = _optional_string(value)
        if normalized:
            return normalized
    return "unknown"


def _default_confidence(verdict: str) -> float:
    if verdict in {"malicious", "likely_malicious"}:
        return 0.82
    if verdict == "suspicious":
        return 0.68
    if verdict in {"benign", "likely_benign", "false_positive", "stale_or_revoked"}:
        return 0.24
    return 0.35


def _default_false_positive_risk(verdict: str) -> float:
    if verdict in {"benign", "likely_benign", "false_positive"}:
        return 0.72
    if verdict == "insufficient_evidence":
        return 0.55
    return 0.18


def _parse_utc(value: Any) -> datetime | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _coerce_dict(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def _coerce_dict_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [dict(item) for item in value if isinstance(item, dict)]


def _coerce_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [text for text in (_optional_string(item) for item in value) if text]
    if value is None:
        return []
    text = _optional_string(value)
    return [text] if text else []


def _optional_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return _clip01(float(value))
    except (TypeError, ValueError):
        return None


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)
