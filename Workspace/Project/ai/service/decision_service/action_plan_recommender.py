from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .action_policy_matrix import (
    ActionPolicySelection,
    get_action_policy_matrix,
    select_action_policy,
)
from .contracts import (
    ActionPlanActionScoreResponse,
    ActionPlanMachineReadableResponse,
    ActionPlanPolicyCheckResponse,
    ActionPlanRecommendedActionResponse,
    ActionPlanResponse,
    DecisionVerdict,
    EvidenceFusionExplanationResponse,
    HistoricalLearningContextResponse,
    HistoricalSimilarDetectionResponse,
    ScoreCaseRequest,
)
from .llm_assist_phrasing import (
    ActionPlanPhrasingAction,
    ActionPlanPhrasingEvidence,
    apply_action_plan_phrasing,
)

DISRUPTIVE_ACTIONS = {
    "isolate_host",
    "quarantine_file",
    "block_hash",
    "block_domain",
    "block_url",
    "block_ip",
}
OPERATIONAL_ACTIONS = DISRUPTIVE_ACTIONS | {
    "search_fleet",
    "collect_memory",
    "collect_process_tree",
    "collect_persistence_artifacts",
    "collect_network_context",
    "tighten_rule",
    "suppress_rule_candidate",
}
MALICIOUS_LIKE_VERDICTS = {"malicious", "likely_malicious", "suspicious"}
BENIGN_LIKE_VERDICTS = {"benign", "likely_benign", "false_positive", "stale_or_revoked"}
ACTION_CATALOG = (
    "isolate_host",
    "quarantine_file",
    "block_hash",
    "block_domain",
    "block_url",
    "block_ip",
    "search_fleet",
    "collect_memory",
    "collect_process_tree",
    "collect_persistence_artifacts",
    "collect_network_context",
    "tighten_rule",
    "suppress_rule_candidate",
    "open_review",
    "notify_admin",
    "notify_analyst",
    "notify_it_operator",
    "no_immediate_action",
)
VERDICT_BASE_WEIGHT = {
    "malicious": 0.95,
    "likely_malicious": 0.82,
    "suspicious": 0.68,
    "insufficient_evidence": 0.45,
    "benign": 0.22,
    "likely_benign": 0.18,
    "false_positive": 0.12,
    "stale_or_revoked": 0.10,
}
ACTION_CATEGORIES = {
    "isolate_host": "containment",
    "quarantine_file": "containment",
    "block_hash": "blocking",
    "block_domain": "blocking",
    "block_url": "blocking",
    "block_ip": "blocking",
    "search_fleet": "investigation",
    "collect_memory": "investigation",
    "collect_process_tree": "investigation",
    "collect_persistence_artifacts": "investigation",
    "collect_network_context": "investigation",
    "tighten_rule": "rule_hygiene",
    "suppress_rule_candidate": "rule_hygiene",
    "open_review": "governance",
    "notify_admin": "communication",
    "notify_analyst": "communication",
    "notify_it_operator": "communication",
    "no_immediate_action": "safety",
}
ACTION_PREREQUISITES = {
    "isolate_host": (
        "Validate host identity and active owner before containment.",
        "Confirm approved containment workflow and rollback contact.",
    ),
    "quarantine_file": (
        "Confirm file hash and storage path are stable across affected endpoints.",
        "Validate endpoint quarantine integration status.",
    ),
    "block_hash": (
        "Confirm hash type and canonical casing/encoding.",
        "Check for approved software overlap before applying block.",
    ),
    "block_domain": (
        "Validate domain normalization and wildcard scope.",
        "Confirm DNS control-plane propagation path.",
    ),
    "block_url": (
        "Validate URL normalization and protocol/path scope.",
        "Confirm proxy or gateway supports URL-specific controls.",
    ),
    "block_ip": (
        "Validate IP type and ownership/reputation context.",
        "Confirm route/firewall scope for impacted environments.",
    ),
    "search_fleet": (
        "Scope search to relevant tenants, regions, and lookback window.",
        "Confirm search pivots include IOC variants and decoded forms.",
    ),
    "collect_memory": (
        "Confirm legal/privacy approval for volatile memory collection.",
        "Ensure endpoint collection tooling is healthy on target hosts.",
    ),
    "collect_process_tree": (
        "Collect parent/child process lineage with command-line arguments.",
    ),
    "collect_persistence_artifacts": (
        "Collect autoruns, scheduled tasks, startup entries, and service modifications.",
    ),
    "collect_network_context": (
        "Collect destination history, protocol metadata, and temporal cadence.",
    ),
    "tighten_rule": (
        "Attach observed false-positive and true-positive exemplars to rule change request.",
    ),
    "suppress_rule_candidate": (
        "Confirm suppression scope (asset group, environment, or global) is explicitly bounded.",
    ),
    "open_review": (
        "Attach decision evidence summary and policy check trace.",
    ),
    "notify_admin": (
        "Include business-impact estimate and affected critical assets.",
    ),
    "notify_analyst": (
        "Include evidence summary, confidence, and false-positive risk.",
    ),
    "notify_it_operator": (
        "Include operational blast-radius estimate and rollback instructions.",
    ),
    "no_immediate_action": (
        "Continue evidence collection and monitor for corroborating signals.",
    ),
}
ACTION_CAUTIONS = {
    "isolate_host": ("Host isolation can interrupt production workloads.",),
    "quarantine_file": ("Quarantine can remove business-critical binaries if IOC quality is weak.",),
    "block_hash": ("Hash-only blocking can be bypassed by minor payload changes.",),
    "block_domain": ("Domain blocking can disrupt shared SaaS/CDN infrastructure.",),
    "block_url": ("URL blocking can break dependent application flows.",),
    "block_ip": ("IP blocking can affect unrelated multi-tenant infrastructure.",),
    "search_fleet": ("Large-scope searches can increase SIEM/EDR query load.",),
    "collect_memory": ("Memory collection may affect endpoint performance and privacy boundaries.",),
    "collect_process_tree": ("Process telemetry may be incomplete on short-lived processes.",),
    "collect_persistence_artifacts": ("Persistence artifacts require analyst interpretation to avoid false escalation.",),
    "collect_network_context": ("Network metadata can be incomplete behind NAT/proxy layers.",),
    "tighten_rule": ("Over-tightening can reduce detection recall.",),
    "suppress_rule_candidate": ("Suppression can hide early-stage malicious activity if mis-scoped.",),
    "open_review": ("Manual review queues can add response latency.",),
    "notify_admin": ("Escalation noise increases if severity gating is weak.",),
    "notify_analyst": ("Analyst notifications should include clear next actions to avoid churn.",),
    "notify_it_operator": ("Operator notifications without scope can cause unnecessary change windows.",),
    "no_immediate_action": ("Lack of immediate containment increases monitoring requirements.",),
}


@dataclass(frozen=True, slots=True)
class _PolicyContext:
    family: str
    verdict: DecisionVerdict
    confidence: float
    false_positive_risk: float
    contradiction_score: float
    missing_critical_fields: tuple[str, ...]
    severity_cap_applied: bool
    max_recommendation_severity: str
    ioc_type: str
    object_type: str
    host_capable: bool
    asset_criticality: str
    criticality_signal: float
    environment: str
    is_production: bool
    related_detections: int
    evidence_summary: str
    evidence_positive_count: int
    evidence_contradictory_count: int
    evidence_missing_count: int
    evidence_quality: float
    contradiction_ratio: float
    history_support_signal: float
    history_benign_pressure_signal: float
    history_conflict_signal: float
    history_rollback_signal: float
    history_recommendation_accept_signal: float
    history_recommendation_reject_signal: float
    history_post_action_regression_signal: float
    history_sample_size_signal: float
    history_recency_signal: float
    history_weight_signal: float
    history_similarity_strength_signal: float
    history_similar_regression_signal: float
    history_similar_success_signal: float
    history_action_acceptance_signal: float
    history_action_acceptance_by_action: dict[str, float]


@dataclass(frozen=True, slots=True)
class _Candidate:
    action: str
    score: float
    rationale: str
    prerequisites: list[str]
    cautions: list[str]
    escalation_target: str
    required_reviewer_role: str


def derive_recommendation_severity_cap(
    *,
    verdict: DecisionVerdict,
    confidence: float,
    false_positive_risk: float,
    contradiction_score: float,
    missing_critical_fields: list[str] | tuple[str, ...] | None,
) -> tuple[bool, str]:
    capped = (
        verdict == "insufficient_evidence"
        or _clip01(float(confidence)) < 0.50
        or _clip01(float(false_positive_risk)) >= 0.55
        or _clip01(float(contradiction_score)) >= 0.30
        or bool(missing_critical_fields)
    )
    return capped, "review_only" if capped else "containment_allowed"


def build_action_plan(
    *,
    request: ScoreCaseRequest,
    verdict: DecisionVerdict,
    confidence: float,
    false_positive_risk: float,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    historical_learning: HistoricalLearningContextResponse | None = None,
    family: str | None = None,
    evidence_summary: list[str] | None = None,
    contradiction_score: float = 0.0,
    missing_critical_fields: list[str] | None = None,
    max_actions: int = 3,
) -> ActionPlanResponse:
    resolved_max_actions = max(1, min(int(max_actions), 3))
    context = _build_context(
        request=request,
        verdict=verdict,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        evidence_fusion=evidence_fusion,
        historical_learning=historical_learning,
        family=family,
        evidence_summary=evidence_summary,
        contradiction_score=contradiction_score,
        missing_critical_fields=missing_critical_fields,
    )
    policy_matrix = get_action_policy_matrix()
    policy_selection = select_action_policy(
        matrix=policy_matrix,
        family=context.family,
        verdict=context.verdict,
        confidence=context.confidence,
        false_positive_risk=context.false_positive_risk,
        asset_criticality=context.asset_criticality,
        object_type=context.object_type,
    )
    policy_allowed_actions = set(policy_selection.allowed_actions)

    action_scores: list[ActionPlanActionScoreResponse] = []
    candidates: list[_Candidate] = []
    eligibility: dict[str, _Candidate] = {}
    for action in ACTION_CATALOG:
        if action == "no_immediate_action":
            continue
        eligible, blocked_reasons = _eligible(
            action=action,
            context=context,
            policy_allowed_actions=policy_allowed_actions,
        )
        score = _score(action=action, context=context, eligible=eligible)
        rationale = _rationale(action=action, context=context, eligible=eligible, blocked_reasons=blocked_reasons)
        action_scores.append(
            ActionPlanActionScoreResponse(
                action=action,
                eligible=eligible,
                score=float(round(score, 6)),
                rationale=rationale,
                blocked_reasons=blocked_reasons,
            )
        )
        if eligible:
            candidate = _Candidate(
                action=action,
                score=float(round(score, 6)),
                rationale=rationale,
                prerequisites=list(ACTION_PREREQUISITES[action]),
                cautions=list(ACTION_CAUTIONS[action]),
                escalation_target=policy_selection.escalation_target,
                required_reviewer_role=policy_selection.required_reviewer_role,
            )
            candidates.append(candidate)
            eligibility[action] = candidate

    operational = [item for item in candidates if item.action in OPERATIONAL_ACTIONS]
    fallback_to_no_immediate = len(operational) == 0
    selected_candidates: list[_Candidate]
    if fallback_to_no_immediate:
        selected_candidates = [
            _no_immediate_candidate(
                context=context,
                policy_selection=policy_selection,
            )
        ]
        if _needs_review(context) and "open_review" in eligibility:
            selected_candidates.append(eligibility["open_review"])

        notify_preferences = (
            ["notify_admin", "notify_it_operator", "notify_analyst"]
            if context.is_production or context.criticality_signal >= 0.80
            else ["notify_analyst", "notify_it_operator", "notify_admin"]
        )
        for notify_action in notify_preferences:
            if notify_action in eligibility:
                selected_candidates.append(eligibility[notify_action])
                break
        selected_candidates = _deduplicate_candidates(selected_candidates)[:resolved_max_actions]
    else:
        sorted_operational = sorted(
            [item for item in candidates if item.action in OPERATIONAL_ACTIONS],
            key=lambda item: (-item.score, item.action),
        )
        sorted_non_operational = sorted(
            [item for item in candidates if item.action not in OPERATIONAL_ACTIONS],
            key=lambda item: (-item.score, item.action),
        )
        selected_candidates = sorted_operational[:resolved_max_actions]
        if len(selected_candidates) < resolved_max_actions:
            selected_candidates.extend(sorted_non_operational[: resolved_max_actions - len(selected_candidates)])

    ranked_actions: list[ActionPlanRecommendedActionResponse] = []
    for index, candidate in enumerate(selected_candidates, start=1):
        ranked_actions.append(
            ActionPlanRecommendedActionResponse(
                action=candidate.action,
                rank=index,
                score=float(round(_clip01(candidate.score), 6)),
                rationale=candidate.rationale,
                prerequisites=candidate.prerequisites,
                cautions=candidate.cautions,
                escalation_target=candidate.escalation_target,
                required_reviewer_role=candidate.required_reviewer_role,
                requires_human_approval=True,
                execution_mode="manual_only",
            )
        )

    summary = _summary(context=context, ranked_actions=ranked_actions)
    llm_result = apply_action_plan_phrasing(
        evidence=ActionPlanPhrasingEvidence(
            verdict=context.verdict,
            confidence=context.confidence,
            false_positive_risk=context.false_positive_risk,
            evidence_positive_count=context.evidence_positive_count,
            evidence_contradictory_count=context.evidence_contradictory_count,
            evidence_missing_count=context.evidence_missing_count,
            lexical_only_guard_triggered=_lexical_only_guard_triggered(context.evidence_summary),
            deterministic_summary=summary,
            deterministic_actions=[
                ActionPlanPhrasingAction(
                    action=item.action,
                    rank=item.rank,
                    score=item.score,
                    rationale=item.rationale,
                )
                for item in ranked_actions
            ],
            deterministic_guardrails={
                "never_auto_executes": True,
                "policy_constrained": True,
                "evidence_based": True,
                "manual_only": True,
            },
            policy_row_id=policy_selection.row_id,
            policy_matrix_version=policy_selection.matrix_version,
        )
    )
    summary = llm_result.summary
    if llm_result.action_rationale_overrides:
        ranked_actions = [
            item.model_copy(update={"rationale": llm_result.action_rationale_overrides[item.action]})
            if item.action in llm_result.action_rationale_overrides
            else item
            for item in ranked_actions
        ]
    aggregated_prerequisites = _merge_text_lists([item.prerequisites for item in ranked_actions])
    aggregated_cautions = _merge_text_lists([item.cautions for item in ranked_actions])

    policy_checks = [
        ActionPlanPolicyCheckResponse(
            check="manual_execution_only",
            passed=True,
            details="All recommended actions require explicit human approval and manual execution.",
        ),
        ActionPlanPolicyCheckResponse(
            check="policy_matrix_row_match",
            passed=True,
            details=(
                f"Matched policy row '{policy_selection.row_id}' "
                f"(priority={policy_selection.row_priority}, matrix_version={policy_selection.matrix_version})."
            ),
        ),
        ActionPlanPolicyCheckResponse(
            check="allowed_actions_from_policy",
            passed=all(item.action in policy_allowed_actions for item in ranked_actions),
            details="Every recommended action was selected from the matched policy row allowed_actions.",
        ),
        ActionPlanPolicyCheckResponse(
            check="object_and_indicator_type_gate",
            passed=True,
            details="Action eligibility was constrained by IOC/object type compatibility.",
        ),
        ActionPlanPolicyCheckResponse(
            check="evidence_weighting_applied",
            passed=True,
            details="Ranking used evidence/context scoring after deterministic policy eligibility filtering.",
        ),
        ActionPlanPolicyCheckResponse(
            check="severity_cap",
            passed=True,
            details=(
                "Disruptive actions were capped to review-only surfaces."
                if context.severity_cap_applied
                else "Containment/blocking actions remained eligible because the safety cap was not triggered."
            ),
        ),
    ]

    machine_readable = ActionPlanMachineReadableResponse(
        input_snapshot={
            "family": context.family,
            "verdict": context.verdict,
            "confidence": float(round(context.confidence, 6)),
            "false_positive_risk": float(round(context.false_positive_risk, 6)),
            "contradiction_score": float(round(context.contradiction_score, 6)),
            "missing_critical_fields": list(context.missing_critical_fields),
            "severity_cap_applied": context.severity_cap_applied,
            "max_recommendation_severity": context.max_recommendation_severity,
            "confidence_bucket": policy_selection.confidence_bucket,
            "false_positive_risk_bucket": policy_selection.false_positive_risk_bucket,
            "ioc_type": context.ioc_type,
            "object_type": context.object_type,
            "asset_criticality": context.asset_criticality,
            "environment": context.environment,
            "related_detections": context.related_detections,
            "evidence_summary": context.evidence_summary,
            "evidence_positive_count": context.evidence_positive_count,
            "evidence_contradictory_count": context.evidence_contradictory_count,
            "evidence_missing_count": context.evidence_missing_count,
            "evidence_quality": float(round(context.evidence_quality, 6)),
            "history_support_signal": float(round(context.history_support_signal, 6)),
            "history_benign_pressure_signal": float(round(context.history_benign_pressure_signal, 6)),
            "history_conflict_signal": float(round(context.history_conflict_signal, 6)),
            "history_rollback_signal": float(round(context.history_rollback_signal, 6)),
            "history_recommendation_accept_signal": float(round(context.history_recommendation_accept_signal, 6)),
            "history_recommendation_reject_signal": float(round(context.history_recommendation_reject_signal, 6)),
            "history_post_action_regression_signal": float(round(context.history_post_action_regression_signal, 6)),
            "history_sample_size_signal": float(round(context.history_sample_size_signal, 6)),
            "history_recency_signal": float(round(context.history_recency_signal, 6)),
            "history_similarity_strength_signal": float(round(context.history_similarity_strength_signal, 6)),
            "history_similar_regression_signal": float(round(context.history_similar_regression_signal, 6)),
            "history_similar_success_signal": float(round(context.history_similar_success_signal, 6)),
            "history_action_acceptance_signal": float(round(context.history_action_acceptance_signal, 6)),
            "history_action_acceptance_by_action": {
                action: float(round(value, 6))
                for action, value in sorted(context.history_action_acceptance_by_action.items(), key=lambda item: item[0])
            },
            "llm_assist": llm_result.diagnostics,
        },
        policy_checks=policy_checks,
        action_scores=action_scores,
        selection={
            "max_actions": resolved_max_actions,
            "fallback_to_no_immediate_action": fallback_to_no_immediate,
            "selected_actions": [item.action for item in ranked_actions],
            "policy_matrix_version": policy_selection.matrix_version,
            "matched_policy_row_id": policy_selection.row_id,
            "matched_policy_row_priority": policy_selection.row_priority,
            "policy_allowed_actions": sorted(policy_allowed_actions),
            "derived_confidence_bucket": policy_selection.confidence_bucket,
            "derived_false_positive_risk_bucket": policy_selection.false_positive_risk_bucket,
            "severity_cap_applied": context.severity_cap_applied,
            "max_recommendation_severity": context.max_recommendation_severity,
        },
    )

    return ActionPlanResponse(
        summary=summary,
        recommended_actions=ranked_actions,
        prerequisites=aggregated_prerequisites,
        cautions=aggregated_cautions,
        never_auto_executes=True,
        policy_constrained=True,
        evidence_based=True,
        machine_readable=machine_readable,
    )


def _build_context(
    *,
    request: ScoreCaseRequest,
    verdict: DecisionVerdict,
    confidence: float,
    false_positive_risk: float,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
    historical_learning: HistoricalLearningContextResponse | None,
    family: str | None,
    evidence_summary: list[str] | None,
    contradiction_score: float,
    missing_critical_fields: list[str] | None,
) -> _PolicyContext:
    package = request.detection_package if isinstance(request.detection_package, dict) else {}
    object_metadata = package.get("object_metadata") if isinstance(package.get("object_metadata"), dict) else {}
    asset_context = package.get("asset_context") if isinstance(package.get("asset_context"), dict) else {}

    resolved_family = (family or str(package.get("rule_family", "")) or str(request.rule_context.get("ruleFamily", ""))).strip().lower()
    if not resolved_family:
        resolved_family = str(request.rule_context.get("rule_family", "unknown")).strip().lower() or "unknown"

    ioc_type = str(request.ioc_type).strip().lower()
    object_type = _normalize_object_type(str(object_metadata.get("object_type", "")).strip().lower(), ioc_type=ioc_type)
    host_capable = object_type in {"host", "process", "network"} or any(
        key in request.host_context for key in ("hostId", "host_id", "hostname", "assetId", "asset_id")
    )

    criticality_value = _first_non_empty(
        request.host_context.get("criticality"),
        request.host_context.get("hostCriticality"),
        asset_context.get("criticality"),
    )
    asset_criticality, criticality_signal = _normalize_criticality(criticality_value)

    environment_raw = _first_non_empty(
        request.host_context.get("environment"),
        request.host_context.get("env"),
        asset_context.get("environment"),
        "unknown",
    )
    environment = str(environment_raw).strip().lower() or "unknown"
    is_production = environment in {"prod", "production", "live"}

    related_detections = _related_detection_count(package)
    evidence_positive_count, evidence_contradictory_count, evidence_missing_count = _evidence_counts(evidence_fusion)
    contradiction_ratio = (
        evidence_contradictory_count
        / max(1, evidence_positive_count + evidence_contradictory_count)
    )
    evidence_quality = _evidence_quality(
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        contradiction_ratio=contradiction_ratio,
        missing_count=evidence_missing_count,
        evidence_fusion=evidence_fusion,
    )

    historical_features = (
        historical_learning.features
        if historical_learning is not None
        else _coerce_history_feature_map(_coerce_dict(package.get("historical_learning_context")).get("features"))
    )
    similar_detections = (
        historical_learning.similar_detections
        if historical_learning is not None
        else _coerce_historical_similar_detections(_coerce_dict(package.get("historical_learning_context")).get("similar_detections"))
    )
    history_support_signal = _history_feature(historical_features, "history_support_signal")
    history_benign_pressure_signal = _history_feature(historical_features, "history_benign_pressure_signal")
    history_conflict_signal = _history_feature(historical_features, "history_conflict_rate")
    history_rollback_signal = _history_feature(historical_features, "history_rollback_rate")
    history_recommendation_accept_signal = _history_feature(historical_features, "history_recommendation_accept_rate")
    history_recommendation_reject_signal = _history_feature(historical_features, "history_recommendation_reject_rate")
    history_post_action_regression_signal = _history_feature(historical_features, "history_post_action_regression_rate")
    history_sample_size_signal = _history_feature(historical_features, "history_sample_size_signal")
    history_recency_signal = _history_feature(historical_features, "history_recency_signal")
    history_weight_signal = _clip01(history_sample_size_signal * history_recency_signal)
    history_similarity_strength_signal, history_similar_regression_signal, history_similar_success_signal, history_action_acceptance_by_action = (
        _similarity_retrieval_signals(similar_detections)
    )
    history_action_acceptance_signal = _clip01(
        max(history_action_acceptance_by_action.values()) if history_action_acceptance_by_action else 0.0
    )
    summary_parts = list(evidence_summary or [])
    if evidence_fusion is not None:
        summary_parts.append(
            "fusion("
            f"positive={evidence_positive_count}, "
            f"contradictory={evidence_contradictory_count}, "
            f"missing={evidence_missing_count})"
        )
    if history_similarity_strength_signal >= 0.20:
        summary_parts.append(
            "historical_similar("
            f"strength={history_similarity_strength_signal:.2f}, "
            f"acceptance={history_action_acceptance_signal:.2f}, "
            f"regression={history_similar_regression_signal:.2f})"
        )
    evidence_summary_text = "; ".join(item for item in summary_parts if item) or "No explicit evidence summary supplied."
    severity_cap_applied, max_recommendation_severity = derive_recommendation_severity_cap(
        verdict=verdict,
        confidence=confidence,
        false_positive_risk=false_positive_risk,
        contradiction_score=contradiction_score,
        missing_critical_fields=missing_critical_fields,
    )

    return _PolicyContext(
        family=resolved_family,
        verdict=verdict,
        confidence=_clip01(float(confidence)),
        false_positive_risk=_clip01(float(false_positive_risk)),
        contradiction_score=_clip01(float(contradiction_score)),
        missing_critical_fields=tuple(str(item).strip() for item in (missing_critical_fields or []) if str(item).strip()),
        severity_cap_applied=severity_cap_applied,
        max_recommendation_severity=max_recommendation_severity,
        ioc_type=ioc_type,
        object_type=object_type,
        host_capable=host_capable,
        asset_criticality=asset_criticality,
        criticality_signal=criticality_signal,
        environment=environment,
        is_production=is_production,
        related_detections=max(0, related_detections),
        evidence_summary=evidence_summary_text,
        evidence_positive_count=evidence_positive_count,
        evidence_contradictory_count=evidence_contradictory_count,
        evidence_missing_count=evidence_missing_count,
        evidence_quality=evidence_quality,
        contradiction_ratio=_clip01(contradiction_ratio),
        history_support_signal=history_support_signal,
        history_benign_pressure_signal=history_benign_pressure_signal,
        history_conflict_signal=history_conflict_signal,
        history_rollback_signal=history_rollback_signal,
        history_recommendation_accept_signal=history_recommendation_accept_signal,
        history_recommendation_reject_signal=history_recommendation_reject_signal,
        history_post_action_regression_signal=history_post_action_regression_signal,
        history_sample_size_signal=history_sample_size_signal,
        history_recency_signal=history_recency_signal,
        history_weight_signal=history_weight_signal,
        history_similarity_strength_signal=history_similarity_strength_signal,
        history_similar_regression_signal=history_similar_regression_signal,
        history_similar_success_signal=history_similar_success_signal,
        history_action_acceptance_signal=history_action_acceptance_signal,
        history_action_acceptance_by_action=history_action_acceptance_by_action,
    )


def _eligible(
    *,
    action: str,
    context: _PolicyContext,
    policy_allowed_actions: set[str],
) -> tuple[bool, list[str]]:
    blocked: list[str] = []
    if action not in policy_allowed_actions:
        blocked.append("action not allowed by matched policy row")
    if context.severity_cap_applied and action in DISRUPTIVE_ACTIONS:
        blocked.append("disruptive action blocked by safety severity cap")

    if action == "block_hash" and context.ioc_type not in {"hash", "sha256", "sha1", "md5", "file_hash"}:
        blocked.append("block_hash requires hash IOC type")
    if action == "block_domain" and context.ioc_type != "domain":
        blocked.append("block_domain requires domain IOC type")
    if action == "block_url" and context.ioc_type != "url":
        blocked.append("block_url requires url IOC type")
    if action == "block_ip" and context.ioc_type not in {"ip", "ipv4", "ipv6"}:
        blocked.append("block_ip requires ip IOC type")
    if action == "quarantine_file" and context.ioc_type not in {"hash", "sha256", "sha1", "md5", "file_hash"} and context.object_type != "file":
        blocked.append("quarantine_file requires file-like object/hash IOC")
    if action in {"isolate_host", "collect_memory", "collect_process_tree", "collect_persistence_artifacts"} and not context.host_capable:
        blocked.append(f"{action} requires host/process context")
    if action == "collect_network_context" and context.object_type not in {"network", "host", "process"} and context.ioc_type not in {"ip", "domain", "url"}:
        blocked.append("collect_network_context requires network-relevant context")
    if action == "tighten_rule" and context.family == "unknown":
        blocked.append("tighten_rule requires known family")

    return len(blocked) == 0, blocked


def _score(*, action: str, context: _PolicyContext, eligible: bool) -> float:
    if not eligible:
        return 0.0

    base = VERDICT_BASE_WEIGHT[context.verdict]
    safety = 1.0 - context.false_positive_risk
    related_signal = _clip01(context.related_detections / 5.0)
    production_signal = 1.0 if context.is_production else 0.0
    benignness = 1.0 - base
    category = ACTION_CATEGORIES[action]
    action_accept_boost = _clip01(context.history_action_acceptance_by_action.get(action, 0.0))
    disruptive_penalty = _clip01(
        0.45 * context.history_rollback_signal
        + 0.30 * context.history_recommendation_reject_signal
        + 0.25 * context.history_post_action_regression_signal
    ) * (0.60 + 0.40 * context.history_weight_signal)
    disruptive_penalty = _clip01(
        disruptive_penalty
        + 0.25 * context.history_similar_regression_signal * (0.60 + 0.40 * context.history_similarity_strength_signal)
    )
    support_boost = _clip01(context.history_support_signal * (0.45 + 0.55 * context.history_weight_signal))
    support_boost = _clip01(
        support_boost
        + 0.18 * context.history_similar_success_signal * (0.55 + 0.45 * context.history_similarity_strength_signal)
    )
    benign_boost = _clip01(context.history_benign_pressure_signal * (0.45 + 0.55 * context.history_weight_signal))
    conflict_boost = _clip01(
        max(context.history_conflict_signal, context.history_post_action_regression_signal) * (0.45 + 0.55 * context.history_weight_signal)
    )

    if category in {"containment", "blocking"}:
        score = (
            0.30 * base
            + 0.24 * context.confidence
            + 0.20 * safety
            + 0.14 * context.evidence_quality
            + 0.08 * context.criticality_signal
            + 0.04 * production_signal
        )
        score = score + 0.12 * support_boost - 0.20 * disruptive_penalty
        score += 0.10 * action_accept_boost + 0.05 * context.history_similarity_strength_signal
    elif category == "investigation":
        score = (
            0.22 * base
            + 0.20 * context.confidence
            + 0.18 * context.evidence_quality
            + 0.16 * safety
            + 0.14 * related_signal
            + 0.10 * context.criticality_signal
        )
        if action == "search_fleet":
            score += 0.16 * support_boost + 0.08 * context.history_recommendation_accept_signal
        else:
            score += 0.08 * support_boost
        score += 0.08 * action_accept_boost + 0.06 * context.history_similarity_strength_signal
    elif category == "rule_hygiene":
        if action == "suppress_rule_candidate":
            score = (
                0.32 * benignness
                + 0.20 * context.false_positive_risk
                + 0.16 * (1.0 - context.evidence_quality)
                + 0.14 * related_signal
                + 0.10 * production_signal
                + 0.08 * context.criticality_signal
            )
            score += 0.18 * benign_boost + 0.08 * context.history_recommendation_reject_signal
            score += 0.08 * action_accept_boost + 0.06 * context.history_similarity_strength_signal
        else:
            score = (
                0.30 * base
                + 0.20 * context.evidence_quality
                + 0.18 * related_signal
                + 0.16 * context.confidence
                + 0.10 * production_signal
                + 0.06 * context.criticality_signal
            )
            score += 0.10 * benign_boost + 0.06 * support_boost
            score += 0.06 * action_accept_boost
    elif category == "governance":
        score = (
            0.26 * (1.0 - context.confidence)
            + 0.24 * context.false_positive_risk
            + 0.20 * context.contradiction_ratio
            + 0.15 * _clip01(context.evidence_missing_count / 5.0)
            + 0.15 * context.criticality_signal
        )
        score += 0.12 * conflict_boost + 0.10 * disruptive_penalty
        score += 0.06 * context.history_similar_regression_signal + 0.04 * context.history_similarity_strength_signal
    elif action == "notify_admin":
        score = (
            0.18 * context.criticality_signal
            + 0.18 * production_signal
            + 0.16 * base
            + 0.12 * context.confidence
            + 0.10 * related_signal
            + 0.12
        )
        score += 0.06 * support_boost
        score += 0.04 * context.history_similarity_strength_signal
    elif action == "notify_it_operator":
        score = (
            0.18 * production_signal
            + 0.16 * context.criticality_signal
            + 0.14 * base
            + 0.12 * context.confidence
            + 0.10 * related_signal
            + 0.10
        )
        score += 0.08 * disruptive_penalty
        score += 0.05 * context.history_similar_regression_signal
    else:
        score = (
            0.20 * base
            + 0.18 * context.confidence
            + 0.17 * context.evidence_quality
            + 0.17 * safety
            + 0.14 * related_signal
            + 0.14 * context.criticality_signal
        )
        score += 0.08 * conflict_boost
        score += 0.06 * action_accept_boost + 0.04 * context.history_similarity_strength_signal

    return _clip01(score)


def _rationale(*, action: str, context: _PolicyContext, eligible: bool, blocked_reasons: list[str]) -> str:
    if not eligible:
        return (
            f"{action} blocked by policy gates: " + "; ".join(blocked_reasons)
            if blocked_reasons
            else f"{action} blocked by policy constraints."
        )
    if action in DISRUPTIVE_ACTIONS:
        rationale = (
            f"{action} prioritized for malicious-like verdict with confidence={context.confidence:.2f}, "
            f"false_positive_risk={context.false_positive_risk:.2f}, "
            f"evidence_quality={context.evidence_quality:.2f}."
        )
        if context.history_rollback_signal >= 0.35 or context.history_post_action_regression_signal >= 0.35 or context.history_similar_regression_signal >= 0.35:
            rationale += " Historical rollback/regression pressure reduced disruptive ranking."
        if context.history_action_acceptance_by_action.get(action, 0.0) >= 0.30:
            rationale += " Similar detections frequently accepted this action."
        return rationale
    if action == "search_fleet":
        rationale = f"{action} prioritized to validate spread across {context.related_detections} related detections."
        if context.history_recommendation_accept_signal >= 0.35 and context.history_support_signal >= 0.35:
            rationale += " Historical accepted-malicious outcomes increased spread-validation priority."
        if context.history_similarity_strength_signal >= 0.35:
            rationale += " High-confidence similar detections increased retrieval-driven spread checks."
        return rationale
    if action.startswith("collect_"):
        return f"{action} prioritized to close evidence gaps before irreversible controls."
    if action == "tighten_rule":
        return f"{action} prioritized to increase precision for {context.family} detections."
    if action == "suppress_rule_candidate":
        rationale = f"{action} prioritized due to benign/high-FP signals and suppression guardrails."
        if context.history_benign_pressure_signal >= 0.35:
            rationale += " Historical suppression/allowlist outcomes reinforced hygiene preference."
        return rationale
    if action == "open_review":
        rationale = f"{action} prioritized due to uncertainty/conflict that requires analyst validation."
        if context.history_conflict_signal >= 0.35:
            rationale += " Historical conflict and rollback pressure increased review urgency."
        return rationale
    return f"{action} prioritized based on context criticality and communication policy."


def _summary(
    *,
    context: _PolicyContext,
    ranked_actions: list[ActionPlanRecommendedActionResponse],
) -> str:
    top_action = ranked_actions[0].action
    return (
        f"Generated {len(ranked_actions)} policy-constrained manual-only actions for "
        f"verdict='{context.verdict}' (confidence={context.confidence:.2f}, "
        f"false_positive_risk={context.false_positive_risk:.2f}); "
        f"top_action='{top_action}'."
    )


def _no_immediate_candidate(
    *,
    context: _PolicyContext,
    policy_selection: ActionPolicySelection,
) -> _Candidate:
    score = _clip01(0.50 + 0.25 * context.false_positive_risk + 0.15 * (1.0 - context.confidence))
    rationale = (
        "No operational action met deterministic policy gates; continue evidence-driven monitoring and review."
    )
    return _Candidate(
        action="no_immediate_action",
        score=float(round(score, 6)),
        rationale=rationale,
        prerequisites=list(ACTION_PREREQUISITES["no_immediate_action"]),
        cautions=list(ACTION_CAUTIONS["no_immediate_action"]),
        escalation_target=policy_selection.escalation_target,
        required_reviewer_role=policy_selection.required_reviewer_role,
    )


def _needs_review(context: _PolicyContext) -> bool:
    if context.verdict == "insufficient_evidence":
        return True
    if context.false_positive_risk >= 0.55:
        return True
    if context.contradiction_ratio >= 0.30:
        return True
    return False


def _deduplicate_candidates(candidates: list[_Candidate]) -> list[_Candidate]:
    output: list[_Candidate] = []
    seen: set[str] = set()
    for item in candidates:
        if item.action in seen:
            continue
        seen.add(item.action)
        output.append(item)
    return output


def _merge_text_lists(values: list[list[str]]) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for group in values:
        for item in group:
            trimmed = str(item).strip()
            if not trimmed or trimmed in seen:
                continue
            seen.add(trimmed)
            output.append(trimmed)
    return output


def _lexical_only_guard_triggered(evidence_summary: str) -> bool:
    lower = evidence_summary.lower()
    return any(
        marker in lower
        for marker in (
            "string-level indicators",
            "missing_non_string_corroboration",
            "insufficient_correlated_evidence",
        )
    )


def _normalize_object_type(raw: str, *, ioc_type: str) -> str:
    if raw in {"file", "binary", "pe_file"}:
        return "file"
    if raw in {"host", "endpoint", "asset"}:
        return "host"
    if raw in {"process_event", "process", "proc"}:
        return "process"
    if raw in {"network_flow", "network_event", "network"}:
        return "network"
    if ioc_type in {"domain", "url", "ip", "ipv4", "ipv6"}:
        return "network"
    if ioc_type in {"hash", "sha256", "sha1", "md5", "file_hash"}:
        return "file"
    return "unknown"


def _normalize_criticality(value: object) -> tuple[str, float]:
    if isinstance(value, str):
        text = value.strip().lower()
        mapping = {
            "critical": 1.0,
            "high": 0.80,
            "medium": 0.55,
            "low": 0.30,
            "unknown": 0.45,
        }
        return text or "unknown", mapping.get(text, 0.45)
    if isinstance(value, (int, float)):
        numeric = _clip01(float(value))
        if numeric >= 0.85:
            return "critical", numeric
        if numeric >= 0.65:
            return "high", numeric
        if numeric >= 0.40:
            return "medium", numeric
        return "low", numeric
    return "unknown", 0.45


def _related_detection_count(package: dict[str, Any]) -> int:
    related = package.get("related_detections")
    if not isinstance(related, dict):
        return 0
    detections = related.get("detections")
    if isinstance(detections, list):
        return sum(1 for item in detections if isinstance(item, dict))
    return 0


def _evidence_counts(evidence_fusion: EvidenceFusionExplanationResponse | None) -> tuple[int, int, int]:
    if evidence_fusion is None:
        return 0, 0, 0
    return (
        len(evidence_fusion.positive_evidence),
        len(evidence_fusion.contradictory_evidence),
        len(evidence_fusion.missing_evidence),
    )


def _evidence_quality(
    *,
    confidence: float,
    false_positive_risk: float,
    contradiction_ratio: float,
    missing_count: int,
    evidence_fusion: EvidenceFusionExplanationResponse | None,
) -> float:
    coverage_signal = 0.50
    if evidence_fusion is not None and evidence_fusion.coverage:
        true_count = sum(1 for value in evidence_fusion.coverage.values() if value)
        coverage_signal = _clip01(true_count / max(1, len(evidence_fusion.coverage)))
    missing_penalty = _clip01(missing_count / 5.0)
    score = (
        0.40 * _clip01(confidence)
        + 0.25 * (1.0 - _clip01(false_positive_risk))
        + 0.20 * coverage_signal
        - 0.10 * _clip01(contradiction_ratio)
        - 0.05 * missing_penalty
    )
    return _clip01(score)


def _first_non_empty(*values: object) -> object | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value
        if value is not None and not isinstance(value, str):
            return value
    return None


def _coerce_dict(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    return {}


def _coerce_history_feature_map(value: object) -> dict[str, float]:
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


def _history_feature(features: dict[str, float], key: str) -> float:
    try:
        return _clip01(float(features.get(key, 0.0)))
    except (TypeError, ValueError):
        return 0.0


def _coerce_historical_similar_detections(value: object) -> list[HistoricalSimilarDetectionResponse]:
    if not isinstance(value, list):
        return []
    output: list[HistoricalSimilarDetectionResponse] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        try:
            output.append(HistoricalSimilarDetectionResponse.model_validate(item))
        except Exception:
            continue
    return output


def _similarity_retrieval_signals(
    similar_detections: list[HistoricalSimilarDetectionResponse],
) -> tuple[float, float, float, dict[str, float]]:
    if not similar_detections:
        return 0.0, 0.0, 0.0, {}

    ranked = sorted(
        similar_detections,
        key=lambda item: (item.similarity_score, item.confidence, item.observed_at),
        reverse=True,
    )
    similarity_strength = _clip01(sum(item.similarity_score for item in ranked[:3]) / max(1.0, float(min(3, len(ranked)))))

    total_weight = 0.0
    regression_weight = 0.0
    success_weight = 0.0
    action_weight: dict[str, float] = {}
    for item in ranked:
        weight = max(0.05, _clip01(max(item.similarity_score, item.confidence)))
        total_weight += weight

        outcomes = {_normalize_token(value) for value in item.prior_outcomes}
        if any(token in outcomes for token in {"regression", "rollback_regression", "rollback_performed"}):
            regression_weight += weight
        if any(token in outcomes for token in {"success", "rollback_success"}):
            success_weight += weight

        for raw_action in item.prior_accepted_actions:
            normalized_action = _normalize_prior_action(raw_action)
            if normalized_action not in ACTION_CATALOG:
                continue
            action_weight[normalized_action] = action_weight.get(normalized_action, 0.0) + weight

    if total_weight <= 0:
        return similarity_strength, 0.0, 0.0, {}

    action_acceptance_by_action = {
        action: _clip01(weight / total_weight)
        for action, weight in sorted(action_weight.items(), key=lambda item: item[0])
    }
    return (
        similarity_strength,
        _clip01(regression_weight / total_weight),
        _clip01(success_weight / total_weight),
        action_acceptance_by_action,
    )


def _normalize_prior_action(value: object) -> str:
    token = _normalize_token(value)
    if not token:
        return ""
    direct = {
        "isolate_host": "isolate_host",
        "quarantine_file": "quarantine_file",
        "block_hash": "block_hash",
        "block_domain": "block_domain",
        "block_url": "block_url",
        "block_ip": "block_ip",
        "search_fleet": "search_fleet",
        "collect_memory": "collect_memory",
        "collect_process_tree": "collect_process_tree",
        "collect_persistence_artifacts": "collect_persistence_artifacts",
        "collect_network_context": "collect_network_context",
        "tighten_rule": "tighten_rule",
        "suppress_rule_candidate": "suppress_rule_candidate",
        "open_review": "open_review",
        "notify_admin": "notify_admin",
        "notify_analyst": "notify_analyst",
        "notify_it_operator": "notify_it_operator",
        "no_immediate_action": "no_immediate_action",
    }
    if token in direct:
        return direct[token]
    if "contain" in token and "host" in token:
        return "isolate_host"
    if "quarantine" in token:
        return "quarantine_file"
    if "block" in token and "domain" in token:
        return "block_domain"
    if "block" in token and "url" in token:
        return "block_url"
    if "block" in token and ("ip" in token or "cidr" in token):
        return "block_ip"
    if "block" in token and ("hash" in token or "sha" in token or "md5" in token):
        return "block_hash"
    if "search" in token and ("fleet" in token or "hunt" in token):
        return "search_fleet"
    if "memory" in token:
        return "collect_memory"
    if "process" in token and "tree" in token:
        return "collect_process_tree"
    if "persistence" in token:
        return "collect_persistence_artifacts"
    if "network" in token:
        return "collect_network_context"
    if "tighten" in token or "rule_tuning" in token:
        return "tighten_rule"
    if "suppress" in token:
        return "suppress_rule_candidate"
    if "review" in token:
        return "open_review"
    return ""


def _normalize_token(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)

