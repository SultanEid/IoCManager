from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

LLMAssistStatus = str

ACTION_PLAN_PHRASING_SYSTEM_PROMPT = (
    "You are a constrained security-writing assistant. "
    "Deterministic evidence and deterministic policy selection are authoritative and cannot be overridden. "
    "Do not add or remove actions, do not change ranks, and do not claim autonomous execution. "
    "Do not infer maliciousness from lexical/text-only signals alone. "
    "Return JSON only. Abstention is allowed."
)

ACTION_PLAN_PHRASING_USER_TEMPLATE = (
    "Rewrite only phrasing for this deterministic action plan.\n"
    "Evidence JSON:\n"
    "{evidence_json}\n"
    "Output JSON schema:\n"
    "{{"
    '"abstain": boolean, '
    '"abstain_reason": string|null, '
    '"summary": string|null, '
    '"action_rationales": {{"<action_name>": "<rewritten rationale>"}}'
    "}}\n"
    "If abstaining, set abstain=true, provide abstain_reason, and set summary=null with empty action_rationales."
)

EXPLANATION_PHRASING_SYSTEM_PROMPT = (
    "You are a constrained security explanation assistant. "
    "Deterministic evidence is authoritative and cannot be overridden. "
    "No autonomous-action language is allowed. "
    "Do not infer maliciousness from lexical/text-only signals alone. "
    "Return JSON only. Abstention is allowed."
)

EXPLANATION_PHRASING_USER_TEMPLATE = (
    "Rewrite only phrasing for this deterministic explanation.\n"
    "Evidence JSON:\n"
    "{evidence_json}\n"
    "Output JSON schema:\n"
    "{{"
    '"abstain": boolean, '
    '"abstain_reason": string|null, '
    '"summary": string|null, '
    '"rationale": ["<line1>", "<line2>"]'
    "}}\n"
    "If abstaining, set abstain=true, provide abstain_reason, and set summary=null with empty rationale."
)


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ActionPlanPhrasingAction(_StrictModel):
    action: str = Field(min_length=1)
    rank: int = Field(ge=1)
    score: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=1)


class ActionPlanPhrasingEvidence(_StrictModel):
    verdict: str = Field(min_length=1)
    confidence: float = Field(ge=0.0, le=1.0)
    false_positive_risk: float = Field(ge=0.0, le=1.0)
    evidence_positive_count: int = Field(ge=0)
    evidence_contradictory_count: int = Field(ge=0)
    evidence_missing_count: int = Field(ge=0)
    lexical_only_guard_triggered: bool = False
    deterministic_summary: str = Field(min_length=1)
    deterministic_actions: list[ActionPlanPhrasingAction] = Field(default_factory=list, min_length=1, max_length=3)
    deterministic_guardrails: dict[str, bool] = Field(default_factory=dict)
    policy_row_id: str | None = None
    policy_matrix_version: str | None = None


class ActionPlanPhrasingResponse(_StrictModel):
    abstain: bool = False
    abstain_reason: str | None = None
    summary: str | None = None
    action_rationales: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validate_shape(self) -> "ActionPlanPhrasingResponse":
        if self.abstain:
            if not self.abstain_reason or not self.abstain_reason.strip():
                raise ValueError("abstain_reason is required when abstain is true.")
            if self.summary is not None:
                raise ValueError("summary must be null when abstain is true.")
            if self.action_rationales:
                raise ValueError("action_rationales must be empty when abstain is true.")
            return self

        if self.abstain_reason is not None:
            raise ValueError("abstain_reason must be null when abstain is false.")
        if not self.summary or not self.summary.strip():
            raise ValueError("summary is required when abstain is false.")
        return self


class ExplanationPhrasingEvidence(_StrictModel):
    decision_state: str = Field(min_length=1)
    recommended_action: str = Field(min_length=1)
    evidence_total: int = Field(ge=0)
    evidence_conflict_count: int = Field(ge=0)
    source_trust: float = Field(ge=0.0, le=1.0)
    criticality: float = Field(ge=0.0, le=1.0)
    lexical_only_guard_triggered: bool = False
    deterministic_summary: str = Field(min_length=1)
    deterministic_rationale: list[str] = Field(default_factory=list, min_length=1)
    policy_version: str | None = None
    model_version: str | None = None
    dataset_version: str | None = None


class ExplanationPhrasingResponse(_StrictModel):
    abstain: bool = False
    abstain_reason: str | None = None
    summary: str | None = None
    rationale: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_shape(self) -> "ExplanationPhrasingResponse":
        if self.abstain:
            if not self.abstain_reason or not self.abstain_reason.strip():
                raise ValueError("abstain_reason is required when abstain is true.")
            if self.summary is not None:
                raise ValueError("summary must be null when abstain is true.")
            if self.rationale:
                raise ValueError("rationale must be empty when abstain is true.")
            return self

        if self.abstain_reason is not None:
            raise ValueError("abstain_reason must be null when abstain is false.")
        if not self.summary or not self.summary.strip():
            raise ValueError("summary is required when abstain is false.")
        if not self.rationale:
            raise ValueError("rationale is required when abstain is false.")
        return self


@dataclass(frozen=True, slots=True)
class ActionPlanPhrasingResult:
    summary: str
    action_rationale_overrides: dict[str, str]
    diagnostics: dict[str, object]


@dataclass(frozen=True, slots=True)
class ExplanationPhrasingResult:
    summary: str
    rationale: list[str]
    diagnostics: dict[str, object]


@dataclass(frozen=True, slots=True)
class _AssistSettings:
    enabled: bool
    provider: str
    model: str | None
    timeout_ms: int


ProviderCallable = Callable[[str, str, str | None, int], str]
_PROVIDER_GATEWAY: dict[str, ProviderCallable] = {}


def apply_action_plan_phrasing(
    *,
    evidence: ActionPlanPhrasingEvidence,
    provider_call: ProviderCallable | None = None,
) -> ActionPlanPhrasingResult:
    deterministic_summary = evidence.deterministic_summary
    deterministic_overrides: dict[str, str] = {}
    settings = _load_assist_settings()
    base_diag = {
        "enabled": settings.enabled,
        "provider": settings.provider or None,
        "model": settings.model,
    }
    if not settings.enabled:
        return ActionPlanPhrasingResult(
            summary=deterministic_summary,
            action_rationale_overrides=deterministic_overrides,
            diagnostics={**base_diag, "status": "disabled"},
        )

    call = provider_call or _resolve_provider(settings.provider)
    if call is None:
        return ActionPlanPhrasingResult(
            summary=deterministic_summary,
            action_rationale_overrides=deterministic_overrides,
            diagnostics={**base_diag, "status": "provider_unavailable"},
        )

    evidence_json = json.dumps(evidence.model_dump(mode="json"), sort_keys=True)
    user_prompt = ACTION_PLAN_PHRASING_USER_TEMPLATE.format(evidence_json=evidence_json)
    try:
        raw_output = call(
            ACTION_PLAN_PHRASING_SYSTEM_PROMPT,
            user_prompt,
            settings.model,
            settings.timeout_ms,
        )
    except Exception:
        return ActionPlanPhrasingResult(
            summary=deterministic_summary,
            action_rationale_overrides=deterministic_overrides,
            diagnostics={**base_diag, "status": "provider_unavailable"},
        )

    parsed, status = _parse_model_output(raw_output, ActionPlanPhrasingResponse)
    if status is not None:
        return ActionPlanPhrasingResult(
            summary=deterministic_summary,
            action_rationale_overrides=deterministic_overrides,
            diagnostics={**base_diag, "status": status},
        )
    assert isinstance(parsed, ActionPlanPhrasingResponse)

    if parsed.abstain:
        return ActionPlanPhrasingResult(
            summary=deterministic_summary,
            action_rationale_overrides=deterministic_overrides,
            diagnostics={**base_diag, "status": "abstained", "reason": parsed.abstain_reason},
        )

    allowed_actions = {item.action for item in evidence.deterministic_actions}
    semantic_reason = _validate_action_plan_semantics(parsed, evidence, allowed_actions)
    if semantic_reason is not None:
        return ActionPlanPhrasingResult(
            summary=deterministic_summary,
            action_rationale_overrides=deterministic_overrides,
            diagnostics={**base_diag, "status": "guardrail_rejected", "reason": semantic_reason},
        )

    overrides: dict[str, str] = {}
    for action, rationale in parsed.action_rationales.items():
        trimmed_action = str(action).strip()
        trimmed_rationale = str(rationale).strip()
        if trimmed_action in allowed_actions and trimmed_rationale:
            overrides[trimmed_action] = trimmed_rationale

    return ActionPlanPhrasingResult(
        summary=parsed.summary.strip(),
        action_rationale_overrides=overrides,
        diagnostics={**base_diag, "status": "applied"},
    )


def apply_explanation_phrasing(
    *,
    evidence: ExplanationPhrasingEvidence,
    provider_call: ProviderCallable | None = None,
) -> ExplanationPhrasingResult:
    deterministic_summary = evidence.deterministic_summary
    deterministic_rationale = list(evidence.deterministic_rationale)
    settings = _load_assist_settings()
    base_diag = {
        "enabled": settings.enabled,
        "provider": settings.provider or None,
        "model": settings.model,
    }
    if not settings.enabled:
        return ExplanationPhrasingResult(
            summary=deterministic_summary,
            rationale=deterministic_rationale,
            diagnostics={**base_diag, "status": "disabled"},
        )

    call = provider_call or _resolve_provider(settings.provider)
    if call is None:
        return ExplanationPhrasingResult(
            summary=deterministic_summary,
            rationale=deterministic_rationale,
            diagnostics={**base_diag, "status": "provider_unavailable"},
        )

    evidence_json = json.dumps(evidence.model_dump(mode="json"), sort_keys=True)
    user_prompt = EXPLANATION_PHRASING_USER_TEMPLATE.format(evidence_json=evidence_json)
    try:
        raw_output = call(
            EXPLANATION_PHRASING_SYSTEM_PROMPT,
            user_prompt,
            settings.model,
            settings.timeout_ms,
        )
    except Exception:
        return ExplanationPhrasingResult(
            summary=deterministic_summary,
            rationale=deterministic_rationale,
            diagnostics={**base_diag, "status": "provider_unavailable"},
        )

    parsed, status = _parse_model_output(raw_output, ExplanationPhrasingResponse)
    if status is not None:
        return ExplanationPhrasingResult(
            summary=deterministic_summary,
            rationale=deterministic_rationale,
            diagnostics={**base_diag, "status": status},
        )
    assert isinstance(parsed, ExplanationPhrasingResponse)

    if parsed.abstain:
        return ExplanationPhrasingResult(
            summary=deterministic_summary,
            rationale=deterministic_rationale,
            diagnostics={**base_diag, "status": "abstained", "reason": parsed.abstain_reason},
        )

    semantic_reason = _validate_explanation_semantics(parsed, evidence)
    if semantic_reason is not None:
        return ExplanationPhrasingResult(
            summary=deterministic_summary,
            rationale=deterministic_rationale,
            diagnostics={**base_diag, "status": "guardrail_rejected", "reason": semantic_reason},
        )

    cleaned_rationale = [line.strip() for line in parsed.rationale if str(line).strip()][:4]
    if not cleaned_rationale:
        return ExplanationPhrasingResult(
            summary=deterministic_summary,
            rationale=deterministic_rationale,
            diagnostics={**base_diag, "status": "schema_validation_failed"},
        )
    return ExplanationPhrasingResult(
        summary=parsed.summary.strip(),
        rationale=cleaned_rationale,
        diagnostics={**base_diag, "status": "applied"},
    )


def _parse_model_output(
    raw_output: str,
    model_type: type[ActionPlanPhrasingResponse] | type[ExplanationPhrasingResponse],
) -> tuple[ActionPlanPhrasingResponse | ExplanationPhrasingResponse | None, LLMAssistStatus | None]:
    try:
        payload = json.loads(raw_output)
    except Exception:
        return None, "malformed_output"
    try:
        return model_type.model_validate(payload), None
    except ValidationError:
        return None, "schema_validation_failed"


def _validate_action_plan_semantics(
    parsed: ActionPlanPhrasingResponse,
    evidence: ActionPlanPhrasingEvidence,
    allowed_actions: set[str],
) -> str | None:
    summary = parsed.summary or ""
    if _contains_autonomy_claim(summary):
        return "autonomy_language_detected"
    if _contradicts_verdict(evidence.verdict, summary):
        return "contradictory_verdict_framing"
    if evidence.lexical_only_guard_triggered and _contains_strong_malicious_claim(summary):
        return "lexical_only_malicious_inference"

    for action, rationale in parsed.action_rationales.items():
        if action not in allowed_actions:
            return "unknown_action_rationale_key"
        if _contains_autonomy_claim(rationale):
            return "autonomy_language_detected"
        if _contradicts_verdict(evidence.verdict, rationale):
            return "contradictory_verdict_framing"
        if evidence.lexical_only_guard_triggered and _contains_strong_malicious_claim(rationale):
            return "lexical_only_malicious_inference"
    return None


def _validate_explanation_semantics(
    parsed: ExplanationPhrasingResponse,
    evidence: ExplanationPhrasingEvidence,
) -> str | None:
    summary = parsed.summary or ""
    if _contains_autonomy_claim(summary):
        return "autonomy_language_detected"
    if evidence.lexical_only_guard_triggered and _contains_strong_malicious_claim(summary):
        return "lexical_only_malicious_inference"

    for line in parsed.rationale:
        if _contains_autonomy_claim(line):
            return "autonomy_language_detected"
        if evidence.lexical_only_guard_triggered and _contains_strong_malicious_claim(line):
            return "lexical_only_malicious_inference"
    return None


def _contains_autonomy_claim(text: str) -> bool:
    lower = text.lower()
    blocked_fragments = (
        "automatically execute",
        "auto execute",
        "autonomous action",
        "without human approval",
        "self execute",
        "execute immediately",
        "take action now",
        "auto-deploy",
        "auto deploy",
    )
    return any(fragment in lower for fragment in blocked_fragments)


def _contains_strong_malicious_claim(text: str) -> bool:
    lower = text.lower()
    blocked_fragments = (
        "confirmed malicious",
        "definitively malicious",
        "certainly malicious",
        "known malware",
        "proven malware",
        "is malicious",
    )
    return any(fragment in lower for fragment in blocked_fragments)


def _contradicts_verdict(verdict: str, text: str) -> bool:
    normalized = verdict.strip().lower()
    lower = text.lower()
    if normalized in {"insufficient_evidence", "benign", "likely_benign", "false_positive", "stale_or_revoked"}:
        if _contains_strong_malicious_claim(lower):
            return True
    if normalized in {"malicious", "likely_malicious"}:
        contradiction_fragments = (
            "benign",
            "false positive",
            "safe indicator",
            "non-malicious",
        )
        if any(fragment in lower for fragment in contradiction_fragments):
            return True
    return False


def _load_assist_settings() -> _AssistSettings:
    enabled = os.getenv("CTI_ENABLE_LLM_ASSIST", "").strip().lower() == "true"
    provider = os.getenv("CTI_LLM_ASSIST_PROVIDER", "").strip().lower()
    model = os.getenv("CTI_LLM_ASSIST_MODEL", "").strip() or None
    timeout_raw = os.getenv("CTI_LLM_ASSIST_TIMEOUT_MS", "").strip()
    try:
        timeout_ms = int(timeout_raw) if timeout_raw else 8000
    except ValueError:
        timeout_ms = 8000
    timeout_ms = max(500, min(timeout_ms, 120_000))
    return _AssistSettings(
        enabled=enabled,
        provider=provider,
        model=model,
        timeout_ms=timeout_ms,
    )


def _resolve_provider(provider_name: str) -> ProviderCallable | None:
    if not provider_name:
        return None
    return _PROVIDER_GATEWAY.get(provider_name)
