from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .schemas import RecommendActionRequest, RecommendActionResponse


DEFAULT_POLICY = {
    "policy_version": "cti-policy-v1",
    "thresholds": {
        "uncertainty_high": 0.35,
        "blast_radius_high": 0.70,
        "evidence_conflict_high": 0.50,
        "maliciousness_block_min": 0.85,
        "deployability_canary_min": 0.60,
        "actionability_min": 0.55,
        "decay_stale": 0.75,
    },
}


@dataclass(frozen=True)
class PolicyConfig:
    policy_version: str
    thresholds: dict[str, float]


def load_policy(path: Path) -> PolicyConfig:
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        return PolicyConfig(
            policy_version=str(payload.get("policy_version", "cti-policy-v1")),
            thresholds={k: float(v) for k, v in payload.get("thresholds", {}).items()},
        )
    return PolicyConfig(
        policy_version=DEFAULT_POLICY["policy_version"],
        thresholds={k: float(v) for k, v in DEFAULT_POLICY["thresholds"].items()},
    )


def recommend_action(request: RecommendActionRequest, policy: PolicyConfig) -> RecommendActionResponse:
    vector = request.score_vector
    if vector is None:
        return RecommendActionResponse(
            decision_state="defer",
            recommended_action="request_more_evidence",
            approval_tier_required="analyst",
            rollout_mode="none",
            rollback_plan=json.dumps({"restore_previous_version": True}),
            blast_radius=0.0,
            uncertainty_band=[0.25, 0.75],
            top_evidence=[],
            next_best_evidence=["collect_internal_sightings"],
            snapshot_refs={"policy_version": policy.policy_version},
            policy_version=policy.policy_version,
            model_version="unknown",
            reason_summary="No score vector supplied.",
        )

    t = policy.thresholds
    uncertainty = float(vector.uncertainty_score)
    blast = float(vector.blast_radius_score)
    conflict = float(request.evidence_conflict)
    actionability = float(vector.actionability_score)
    deployability = float(vector.deployability_score)
    maliciousness = float(vector.maliciousness_score)
    decay = float(vector.decay_score)

    decision_state = "recommend"
    recommended_action = "monitor"
    approval = "analyst"
    rollout = "none"
    next_best: list[str] = []
    reason = []

    if uncertainty >= t["uncertainty_high"] or conflict >= t["evidence_conflict_high"]:
        decision_state = "abstain"
        recommended_action = "request_more_evidence"
        rollout = "none"
        next_best = ["collect_internal_sightings", "run_shadow_simulation", "expand_graph_neighborhood"]
        reason.append("high_uncertainty_or_conflict")
    elif decay >= t["decay_stale"] and maliciousness < t["maliciousness_block_min"]:
        decision_state = "defer"
        recommended_action = "monitor"
        rollout = "none"
        next_best = ["wait_for_temporal_confirmation"]
        reason.append("stale_signal")
    elif actionability >= t["actionability_min"] and deployability < t["deployability_canary_min"]:
        recommended_action = "deploy_shadow"
        rollout = "shadow"
        reason.append("shadow_before_canary")
    elif actionability >= t["actionability_min"] and deployability >= t["deployability_canary_min"] and blast < t["blast_radius_high"]:
        recommended_action = "deploy_canary"
        rollout = "canary"
        reason.append("canary_recommended")

    if maliciousness >= t["maliciousness_block_min"] and uncertainty < t["uncertainty_high"] and blast < t["blast_radius_high"]:
        recommended_action = "block_candidate"
        rollout = "canary"
        approval = "lead"
        reason.append("block_candidate_threshold_passed")

    if blast >= t["blast_radius_high"] or request.is_critical_asset:
        approval = "lead"
        if recommended_action in {"block_candidate", "suppress_permanently"} and uncertainty >= t["uncertainty_high"]:
            decision_state = "escalate"
            recommended_action = "escalate"
            rollout = "none"
            reason.append("high_blast_radius_escalation")

    if request.missing_evidence_hints_count > 0 and decision_state in {"abstain", "defer"}:
        next_best = ["retrieve_report_spans", "compare_similar_cases", "fetch_additional_feed_context"]

    if not reason:
        reason.append("default_monitor")

    return RecommendActionResponse(
        decision_state=decision_state,
        recommended_action=recommended_action,
        approval_tier_required=approval,
        rollout_mode=rollout,
        rollback_plan=json.dumps({"rollback_scope": "canary", "restore_previous_version": True}),
        blast_radius=blast,
        uncertainty_band=list(vector.uncertainty_band),
        top_evidence=list(vector.top_evidence),
        next_best_evidence=next_best,
        snapshot_refs={
            "dataset_version": vector.dataset_version,
            "feature_snapshot_hash": vector.feature_snapshot_hash,
            "policy_version": policy.policy_version,
        },
        policy_version=policy.policy_version,
        model_version=vector.model_version,
        reason_summary=";".join(reason),
    )
