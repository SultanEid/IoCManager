from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


class IocEvent(ApiModel):
    ioc_value: str = Field(min_length=1)
    ioc_type: str = Field(min_length=1)
    source_system: str = Field(default="manual")
    event_time: datetime
    host_context: dict[str, Any] = Field(default_factory=dict)
    rule_context: dict[str, Any] = Field(default_factory=dict)

    @field_validator("ioc_type")
    @classmethod
    def normalize_ioc_type(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("ioc_value")
    @classmethod
    def normalize_ioc_value(cls, value: str) -> str:
        return value.strip()


class DetectionObservation(ApiModel):
    ioc_type: str
    ioc_value: str
    scanner_family: str
    rule_id: str | None = None
    host_id: str | None = None
    hit_count: int = 1
    observed_time: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalystOutcome(ApiModel):
    ioc_type: str
    ioc_value: str
    verdict: str = Field(description="true_positive|false_positive|benign|escalated")
    case_id: str | None = None
    source_system: str = "analyst"
    event_time: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("verdict")
    @classmethod
    def normalize_verdict(cls, value: str) -> str:
        normalized = value.strip().lower()
        allowed = {"true_positive", "false_positive", "benign", "escalated"}
        if normalized not in allowed:
            raise ValueError(f"Unsupported verdict '{value}'.")
        return normalized


class FeatureViewSnapshot(ApiModel):
    lexical: dict[str, float]
    tabular: dict[str, float]
    graph: dict[str, float]
    temporal: dict[str, float]
    anti_database: dict[str, float]


class EvidenceItem(ApiModel):
    feature: str
    explanation: str
    contribution: float


class ModelDecisionTrace(ApiModel):
    event: IocEvent
    snapshot: FeatureViewSnapshot
    view_scores: dict[str, float]
    risk_score: float
    risk_tier: str
    confidence: float
    uncertainty_set: list[float]
    top_evidence: list[EvidenceItem]
    recommended_action: str
    ttl_hours: int
    model_version: str
    scored_at: datetime


class ScoreIocRequest(IocEvent):
    pass


class ScoreBatchRequest(ApiModel):
    items: list[ScoreIocRequest] = Field(min_length=1)


class ScoreResponse(ApiModel):
    risk_score: float
    risk_tier: str
    confidence: float
    uncertainty_set: list[float]
    top_evidence: list[EvidenceItem]
    recommended_action: str
    ttl_hours: int
    model_version: str


class ScoreBatchResponse(ApiModel):
    items: list[ScoreResponse]


class FeedbackResponse(ApiModel):
    accepted: bool
    stored_at: datetime
    forwarded_to_learning: bool


class ModelCardResponse(ApiModel):
    model_version: str
    trained_at_utc: str
    views: list[str]
    metrics: list[str]
    supported_ioc_types: list[str]
    optimization_target: str


class ScoreCaseRequest(ApiModel):
    case_id: str = Field(min_length=1)
    as_of_time: datetime | None = None
    source_system: str = "manager"
    ioc_type: str = Field(min_length=1)
    ioc_value: str = Field(min_length=1)
    host_context: dict[str, Any] = Field(default_factory=dict)
    rule_context: dict[str, Any] = Field(default_factory=dict)


class CaseScoreVectorResponse(ApiModel):
    maliciousness_score: float
    actionability_score: float
    deployability_score: float
    decay_score: float
    uncertainty_score: float
    blast_radius_score: float
    uncertainty_band: list[float]
    top_evidence: list[EvidenceItem]
    model_version: str
    dataset_version: str
    feature_snapshot_hash: str


class RecommendActionRequest(ApiModel):
    case_id: str = Field(min_length=1)
    score_vector: CaseScoreVectorResponse | None = None
    is_critical_asset: bool = False
    evidence_conflict: float = 0.0
    missing_evidence_hints_count: int = 0


class RecommendActionResponse(ApiModel):
    decision_state: str
    recommended_action: str
    approval_tier_required: str
    rollout_mode: str
    rollback_plan: str
    blast_radius: float
    uncertainty_band: list[float]
    top_evidence: list[EvidenceItem] = Field(default_factory=list)
    next_best_evidence: list[str] = Field(default_factory=list)
    snapshot_refs: dict[str, str] = Field(default_factory=dict)
    policy_version: str
    model_version: str
    reason_summary: str


class RequestMoreEvidenceRequest(ApiModel):
    case_id: str = Field(min_length=1)
    reason: str | None = None


class RequestMoreEvidenceResponse(ApiModel):
    case_id: str
    decision_state: str
    next_best_evidence: list[str] = Field(default_factory=list)
    reason: str


class SimulateRuleRequest(ApiModel):
    case_id: str = Field(min_length=1)
    rule_type: str = "sigma"
    rule_body: str = Field(min_length=1)


class SimulateRuleResponse(ApiModel):
    case_id: str
    predicted_coverage: float
    predicted_fp_risk: float
    recommended_rollout_mode: str
    summary: str


class EvidenceCitation(ApiModel):
    source_id: str
    source_type: str
    snippet: str
    source_uri: str | None = None
    start_offset: int | None = None
    end_offset: int | None = None
    confidence: float = 0.5


class ReportIngestionRequest(ApiModel):
    source_name: str = "manual"
    document_id: str
    document_url: str | None = None
    document_text: str = Field(min_length=1)
    ingestion_time: datetime


class ExtractedIoc(ApiModel):
    ioc_type: str
    ioc_value: str
    label: str
    confidence: float
    attack_techniques: list[str] = Field(default_factory=list)
    cve_refs: list[str] = Field(default_factory=list)
    citations: list[EvidenceCitation] = Field(default_factory=list)


class ReportIngestionResponse(ApiModel):
    report_id: str
    human_review_required: bool = True
    extracted_iocs: list[ExtractedIoc]
    campaign_hints: list[str] = Field(default_factory=list)
    malware_family_hints: list[str] = Field(default_factory=list)
    processed_at: datetime


class RuleProposalRequest(ApiModel):
    observable_id: int | None = None
    ioc_type: str
    ioc_value: str
    risk_tier: str = "medium"
    preferred_family: str | None = None
    context: dict[str, str] = Field(default_factory=dict)


class RuleProposalResponse(ApiModel):
    proposal_id: str
    human_review_required: bool = True
    rule_family: str
    title: str
    rule_body: str
    severity: str
    confidence: float
    attack_techniques: list[str] = Field(default_factory=list)
    citations: list[EvidenceCitation] = Field(default_factory=list)


class DeploymentTargetRequest(ApiModel):
    server_id: str
    hostname: str
    asset_class: str
    environment: str
    criticality: float = 0.5
    noise_tolerance: float = 0.5


class DeploymentRecommendationRequest(ApiModel):
    rule_family: str
    rule_name: str
    risk_tier: str = "medium"
    targets: list[DeploymentTargetRequest] = Field(min_length=1)


class DeploymentRecommendationItem(ApiModel):
    recommendation_id: str
    server_id: str
    hostname: str
    deploy: bool
    score: float
    reason: str
    human_approval_required: bool = True


class DeploymentRecommendationResponse(ApiModel):
    policy_version: str
    recommendations: list[DeploymentRecommendationItem]


class CopilotQueryRequest(ApiModel):
    question: str = Field(min_length=1)
    observable_id: int | None = None
    report_ids: list[str] = Field(default_factory=list)
    additional_context: dict[str, str] = Field(default_factory=dict)


class CopilotQueryResponse(ApiModel):
    answer: str
    confidence: float
    human_review_required: bool = True
    missing_evidence: list[str] = Field(default_factory=list)
    citations: list[EvidenceCitation] = Field(default_factory=list)


class GraphLinkCandidateRequest(ApiModel):
    seed_observable_id: int = Field(gt=0)
    top_k: int = Field(default=10, ge=1, le=100)
    seed_type: str = ""
    seed_value: str = ""
    candidate_nodes: list["GraphCandidateObservableInput"] = Field(default_factory=list)


class GraphCandidateObservableInput(ApiModel):
    observable_id: int
    type: str
    value: str
    confidence: int
    source_count: int
    last_seen_utc: datetime
    existing_links: int = 0


class GraphLinkCandidateResponse(ApiModel):
    seed_observable_id: int
    candidate_observable_id: int
    score: float
    reason: str
    citations: list[EvidenceCitation] = Field(default_factory=list)


GraphLinkCandidateRequest.model_rebuild()
