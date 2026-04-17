from __future__ import annotations

from uuid import uuid4

from .schemas import (
    DeploymentRecommendationItem,
    DeploymentRecommendationRequest,
    DeploymentRecommendationResponse,
)


RISK_WEIGHT = {"critical": 1.0, "high": 0.85, "medium": 0.65, "low": 0.45}


def recommend_deployment(request: DeploymentRecommendationRequest) -> DeploymentRecommendationResponse:
    risk_weight = RISK_WEIGHT.get(request.risk_tier.lower(), 0.65)
    items: list[DeploymentRecommendationItem] = []

    for target in request.targets:
        criticality = clamp(target.criticality)
        noise_tolerance = clamp(target.noise_tolerance)
        asset_fit = score_asset_fit(request.rule_family, target.asset_class, target.environment)

        score = clamp((0.45 * risk_weight) + (0.25 * criticality) + (0.20 * asset_fit) + (0.10 * (1.0 - noise_tolerance)))
        deploy = score >= 0.55
        reason = (
            f"risk_weight={risk_weight:.2f}, criticality={criticality:.2f}, "
            f"asset_fit={asset_fit:.2f}, noise_tolerance={noise_tolerance:.2f}"
        )

        items.append(
            DeploymentRecommendationItem(
                recommendation_id=f"dr-{uuid4().hex[:12]}",
                server_id=target.server_id,
                hostname=target.hostname,
                deploy=deploy,
                score=score,
                reason=reason,
                human_approval_required=True,
            )
        )

    return DeploymentRecommendationResponse(
        policy_version="v1-human-gated",
        recommendations=sorted(items, key=lambda row: row.score, reverse=True),
    )


def score_asset_fit(rule_family: str, asset_class: str, environment: str) -> float:
    family = rule_family.lower()
    asset = asset_class.lower()
    env = environment.lower()

    fit = 0.5
    if family == "snort" and any(token in asset for token in ("network", "edge", "proxy", "firewall")):
        fit += 0.25
    if family == "yara" and any(token in asset for token in ("endpoint", "server", "workstation", "file")):
        fit += 0.25
    if family == "sigma" and any(token in asset for token in ("siem", "log", "server", "endpoint")):
        fit += 0.20
    if env in {"prod", "production"}:
        fit += 0.10
    return clamp(fit)


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))

