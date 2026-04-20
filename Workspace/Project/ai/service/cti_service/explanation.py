from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone

from .contracts import (
    CtiReplayEvidenceReference,
    EvidenceCitationResponse,
    ExplainCaseRequest,
    ExplainCaseResponse,
)
from .llm_assist_phrasing import (
    ExplanationPhrasingEvidence,
    apply_explanation_phrasing,
)


def explain_case(request: ExplainCaseRequest, dataset_version: str) -> ExplainCaseResponse:
    evidence = sorted(request.evidence_references, key=lambda item: item.confidence, reverse=True)
    conflict_count = sum(1 for item in evidence if item.is_conflicting)
    source_trust = _mean([item.trust_score for item in request.source_trust_values], default=0.5)
    criticality = _mean([item.criticality_score for item in request.asset_criticality_values], default=0.5)

    rationale = [
        f"Decision state is '{request.decision.decision_state}' with recommendation '{request.decision.recommendation_code}'.",
        f"Evidence references: {len(evidence)} total, {conflict_count} conflicting.",
        f"Average source trust is {source_trust:.2f} and average asset criticality is {criticality:.2f}.",
    ]
    if request.graph_derived_features:
        graph_summary = ", ".join(
            f"{item.metric_name}={item.metric_value:.3f}" for item in request.graph_derived_features[:3]
        )
        rationale.append(f"Graph-derived features considered: {graph_summary}.")

    next_best_evidence = _next_best_evidence(evidence, source_trust, conflict_count)
    citations = [_to_citation(item) for item in evidence[:5]]
    replay_hash = _bundle_hash(request)
    summary = (
        f"{request.decision.recommendation_summary} "
        f"(state={request.decision.decision_state}, policy={request.decision.policy_version}, model={request.decision.model_version})."
    )
    phrasing_result = apply_explanation_phrasing(
        evidence=ExplanationPhrasingEvidence(
            decision_state=request.decision.decision_state,
            recommended_action=request.decision.recommendation_code,
            evidence_total=len(evidence),
            evidence_conflict_count=conflict_count,
            source_trust=source_trust,
            criticality=criticality,
            lexical_only_guard_triggered=_lexical_only_guard_triggered_from_rationale(rationale),
            deterministic_summary=summary.strip(),
            deterministic_rationale=rationale,
            policy_version=request.decision.policy_version,
            model_version=request.decision.model_version,
            dataset_version=dataset_version,
        )
    )
    summary = phrasing_result.summary
    rationale = phrasing_result.rationale

    return ExplainCaseResponse(
        case_id=request.case.id,
        decision_id=request.decision.id,
        decision_state=request.decision.decision_state.lower(),
        recommended_action=request.decision.recommendation_code,
        explanation_summary=summary.strip(),
        rationale=rationale,
        citations=citations,
        next_best_evidence=next_best_evidence,
        policy_version=request.decision.policy_version,
        model_version=request.decision.model_version,
        dataset_version=dataset_version,
        feature_snapshot_hash=request.snapshot.snapshot_hash,
        replay_bundle_hash=replay_hash,
        generated_at_utc=datetime.now(timezone.utc),
        llm_assist=phrasing_result.diagnostics,
    )


def _to_citation(reference: CtiReplayEvidenceReference) -> EvidenceCitationResponse:
    return EvidenceCitationResponse(
        source_id=reference.evidence_assertion_id,
        source_type=reference.assertion_type,
        snippet=reference.statement[:400],
        source_uri=reference.source_reference,
        confidence=reference.confidence,
    )


def _next_best_evidence(
    evidence: list[CtiReplayEvidenceReference],
    source_trust: float,
    conflict_count: int,
) -> list[str]:
    next_steps: list[str] = []
    if source_trust < 0.55:
        next_steps.append("collect_high_trust_independent_source")
    if conflict_count > 0:
        next_steps.append("resolve_conflicting_assertions_with_host_and_network_telemetry")
    if not evidence:
        next_steps.append("collect_initial_case_evidence_bundle")
    if len(next_steps) < 3:
        next_steps.append("capture_post_decision_validation_signals")
    return next_steps[:3]


def _bundle_hash(request: ExplainCaseRequest) -> str:
    payload = request.model_dump(mode="json", by_alias=True)
    blob = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def _mean(values: list[float], default: float) -> float:
    if not values:
        return default
    return float(sum(values) / len(values))


def _lexical_only_guard_triggered_from_rationale(rationale: list[str]) -> bool:
    lower = " ".join(item.lower() for item in rationale)
    return any(
        marker in lower
        for marker in (
            "string-level indicators",
            "missing_non_string_corroboration",
            "insufficient_correlated_evidence",
        )
    )
