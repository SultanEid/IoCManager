from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from urllib import error, request as urllib_request

from .config import ServiceSettings
from .contracts import (
    ReportMitigationActionResponse,
    ReportMitigationPlanResponse,
    ReportMitigationRequest,
    ReportMitigationResponse,
    ReportMitigationScanRecommendationResponse,
    ReportMitigationTranslationRequest,
)
from .extraction import extract_report


def recommend_mitigation_plan(request: ReportMitigationRequest, settings: ServiceSettings) -> ReportMitigationResponse:
    extraction = extract_report(request)
    if not settings.openai_api_key:
        raise RuntimeError("OpenAI planner is required for report mitigation. Configure OPENAI_API_KEY.")

    payload = {
        "report": {
            "reportId": extraction.report_id,
            "sourceType": extraction.source_type,
            "campaignHints": extraction.campaign_hints,
            "malwareFamilyHints": extraction.malware_family_hints,
        },
        "extractedIocs": [item.model_dump(mode="json", by_alias=True) for item in extraction.extracted_iocs[:80]],
        "claims": [item.model_dump(mode="json", by_alias=True) for item in extraction.claims[:80]],
        "environmentContext": request.environment_context,
        "assetContext": request.asset_context[:40],
        "alertContext": request.alert_context[:40],
        "ruleContext": request.rule_context[:40],
        "priorOutcomeContext": request.prior_outcome_context[:30],
    }

    response_body = _post_openai_responses_request(
        settings,
        {
            "model": settings.openai_planner_model,
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": _system_prompt()}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": json.dumps(payload, separators=(",", ":"))}],
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "report_mitigation_plan",
                    "schema": _mitigation_schema(),
                    "strict": True,
                }
            },
        },
    )


def translate_mitigation_plan(
    request: ReportMitigationTranslationRequest,
    settings: ServiceSettings,
) -> ReportMitigationPlanResponse:
    if request.target_language != "ar":
        raise ValueError("Only Arabic translation is supported.")
    if not settings.openai_api_key:
        raise RuntimeError("OpenAI planner is required for report mitigation translation. Configure OPENAI_API_KEY.")

    payload = {
        "targetLanguage": "Arabic",
        "mitigationPlan": request.mitigation_plan.model_dump(mode="json", by_alias=True),
    }
    response_body = _post_openai_responses_request(
        settings,
        {
            "model": settings.openai_planner_model,
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": _translation_prompt()}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": json.dumps(payload, separators=(",", ":"), ensure_ascii=False)}],
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "translated_report_mitigation_plan",
                    "schema": _mitigation_schema(),
                    "strict": True,
                }
            },
        },
    )
    output_text = _extract_response_output_text(response_body)
    if not isinstance(output_text, str) or not output_text.strip():
        raise ValueError("OpenAI response did not include output_text.")

    return ReportMitigationPlanResponse.model_validate_json(output_text)
    output_text = _extract_response_output_text(response_body)
    if not isinstance(output_text, str) or not output_text.strip():
        raise ValueError("OpenAI response did not include output_text.")

    plan = ReportMitigationPlanResponse.model_validate_json(output_text)
    return ReportMitigationResponse(
        report_id=extraction.report_id,
        source_type=extraction.source_type,
        planner_model=settings.openai_planner_model,
        extracted_iocs=extraction.extracted_iocs,
        claims=extraction.claims,
        campaign_hints=extraction.campaign_hints,
        malware_family_hints=extraction.malware_family_hints,
        mitigation_plan=plan,
        generated_at=datetime.now(timezone.utc),
    )


def _system_prompt() -> str:
    return (
        "You are a cybersecurity report mitigation planner. "
        "Create a practical mitigation plan using only the supplied report facts, extracted IOCs, claims, and environment context. "
        "Do not invent assets, rule ids, CVEs, indicators, or completed actions. "
        "If environment context is thin, state assumptions and gaps clearly. "
        "Prefer decisive containment and eradication recommendations over passive review language when the evidence points to a specific host, artifact, account, or network IOC. "
        "Always begin the plan with exactly three direct actions the operator should take next. "
        "Each direct action must name the target or case focus, include urgency, and explain why it matters. "
        "The three direct actions must be concrete verbs such as isolate, restrict, quarantine, remove, block, disable, collect, or sweep; avoid generic titles like review, assess, consider, or prepare unless they are paired with a concrete containment or eradication task. "
        "For YARA or endpoint artifact matches, prefer: contain the host or execution path, preserve and quarantine/remove the matched artifact, then sweep nearby hosts or persistence locations for the same indicator. "
        "For Sigma or behavioral detections, prefer: contain the host or user session, collect the exact process/log evidence, then hunt peer systems for the same behavior and disable the repeated execution path if confirmed. "
        "For Suricata or Snort detections, prefer: block the network IOC and isolate the affected host, collect packet/log/process context, then hunt adjacent assets and remove the egress path or persistence if the activity is confirmed. "
        "If the indicator looks like a validation or test artifact, still give strong cleanup actions, but explicitly say to confirm whether it is approved before closing the case. "
        "Also return a suggested execution timeline that shows when each action should start and how long it should take using hours or days. "
        "All blocking, quarantine, account disablement, firewall, and production changes must be policy_gated or manual_review. "
        "Scan recommendations may suggest scanner families and target hints, but must not pretend a scan has been created or run. "
        "Return only valid JSON matching the schema."
    )


def _translation_prompt() -> str:
    return (
        "You translate Aegis cybersecurity mitigation plans into Arabic for an operator UI. "
        "Return the same JSON object shape as the input mitigation plan. "
        "Translate human-readable prose into clear Modern Standard Arabic. "
        "Do not add, remove, reorder, weaken, or strengthen actions. "
        "Preserve all technical identifiers exactly, including IP addresses, hostnames, file paths, hashes, rule names, scanner names, CVEs, MITRE technique IDs, commands, URLs, usernames, and IOC values. "
        "Preserve schema enum values in English exactly as allowed by the schema: severity, confidence, priority, urgency, automationReadiness, lane, unit, and requiresHumanReview. "
        "Preserve numeric fields exactly, including rank, startsIn, duration, and linkedPrimaryActionRank. "
        "Keep stepId unchanged. "
        "Use Arabic wording around preserved technical terms when needed, but never translate the technical terms themselves. "
        "Return only valid JSON matching the schema."
    )


def _mitigation_schema() -> dict[str, Any]:
    action_schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "rationale": {"type": "string"},
            "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
            "ownerHint": {"type": "string"},
            "validation": {"type": "string"},
            "automationReadiness": {"type": "string", "enum": ["manual_review", "safe_to_draft", "policy_gated"]},
        },
        "required": ["title", "rationale", "priority", "ownerHint", "validation", "automationReadiness"],
    }
    scan_schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "scannerFamily": {"type": "string"},
            "targetHint": {"type": "string"},
            "ruleHint": {"type": "string"},
            "rationale": {"type": "string"},
            "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
        },
        "required": ["scannerFamily", "targetHint", "ruleHint", "rationale", "priority"],
    }
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "executiveSummary": {"type": "string"},
            "threatSummary": {"type": "string"},
            "severity": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
            "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
            "affectedAssetHypotheses": {"type": "array", "items": {"type": "string"}},
            "primaryActions": {
                "type": "array",
                "minItems": 3,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "rank": {"type": "integer", "enum": [1, 2, 3]},
                        "title": {"type": "string"},
                        "targetHint": {"type": "string"},
                        "urgency": {"type": "string", "enum": ["now", "hours", "same_day", "next_day", "multi_day"]},
                        "reasoning": {"type": "string"},
                    },
                    "required": ["rank", "title", "targetHint", "urgency", "reasoning"],
                },
            },
            "timeline": {
                "type": "array",
                "minItems": 3,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "stepId": {"type": "string"},
                        "title": {"type": "string"},
                        "linkedPrimaryActionRank": {"type": ["integer", "null"], "minimum": 1, "maximum": 3},
                        "targetHint": {"type": "string"},
                        "lane": {"type": "string", "enum": ["containment", "validation", "recovery", "follow_up"]},
                        "startsIn": {"type": "integer", "minimum": 0},
                        "duration": {"type": "integer", "minimum": 1},
                        "unit": {"type": "string", "enum": ["hours", "days"]},
                        "rationale": {"type": "string"},
                    },
                    "required": ["stepId", "title", "linkedPrimaryActionRank", "targetHint", "lane", "startsIn", "duration", "unit", "rationale"],
                },
            },
            "immediateActions": {"type": "array", "items": action_schema},
            "detectionActions": {"type": "array", "items": action_schema},
            "hardeningActions": {"type": "array", "items": action_schema},
            "validationSteps": {"type": "array", "items": {"type": "string"}},
            "scanRecommendations": {"type": "array", "items": scan_schema},
            "assumptions": {"type": "array", "items": {"type": "string"}},
            "gaps": {"type": "array", "items": {"type": "string"}},
            "requiresHumanReview": {"type": "boolean"},
        },
        "required": [
            "executiveSummary",
            "threatSummary",
            "severity",
            "confidence",
            "affectedAssetHypotheses",
            "primaryActions",
            "timeline",
            "immediateActions",
            "detectionActions",
            "hardeningActions",
            "validationSteps",
            "scanRecommendations",
            "assumptions",
            "gaps",
            "requiresHumanReview",
        ],
    }


def _post_openai_responses_request(settings: ServiceSettings, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request_obj = urllib_request.Request(
        url=f"{settings.openai_base_url}/responses",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib_request.urlopen(request_obj, timeout=settings.openai_timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:  # pragma: no cover - exercised only with remote API configured
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI mitigation request failed with status {exc.code}: {detail}") from exc
    except error.URLError as exc:  # pragma: no cover - exercised only with remote API configured
        raise RuntimeError(f"OpenAI mitigation transport failed: {exc.reason}") from exc


def _extract_response_output_text(response_body: dict[str, Any]) -> str | None:
    output_text = response_body.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    for output_item in response_body.get("output") or []:
        if not isinstance(output_item, dict):
            continue
        for content_item in output_item.get("content") or []:
            if not isinstance(content_item, dict):
                continue
            if content_item.get("type") == "output_text" and isinstance(content_item.get("text"), str):
                return content_item["text"]

    return None
