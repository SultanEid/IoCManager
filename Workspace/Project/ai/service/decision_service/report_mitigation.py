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
        "Prefer safe draft actions over destructive changes. "
        "All blocking, quarantine, account disablement, firewall, and production changes must be policy_gated or manual_review. "
        "Scan recommendations may suggest scanner families and target hints, but must not pretend a scan has been created or run. "
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
