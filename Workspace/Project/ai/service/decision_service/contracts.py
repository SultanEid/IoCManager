from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class ApiModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        extra="forbid",
    )


class EvidenceItemResponse(ApiModel):
    feature: str
    explanation: str
    contribution: float


DecisionVerdict = Literal[
    "benign",
    "likely_benign",
    "suspicious",
    "likely_malicious",
    "malicious",
    "false_positive",
    "insufficient_evidence",
    "stale_or_revoked",
]

ReviewPriority = Literal["low", "medium", "high", "critical"]

DecisionAction = Literal[
    "deploy",
    "canary",
    "monitor",
    "hold",
    "rollback",
    "quarantine_for_review",
]

ActionPlanAction = Literal[
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
]

ActionPlanExecutionMode = Literal["manual_only"]
ActionPlanEscalationTarget = Literal[
    "none",
    "analyst_queue",
    "security_admin",
    "it_operator",
    "incident_response",
]

PromotionSuppressionDecision = Literal[
    "keep_as_observable",
    "promote_to_indicator",
    "suppress_as_benign",
    "allowlist",
    "mark_stale_or_revoked",
    "needs_human_review",
]

ReviewerRole = Literal[
    "tier1_analyst",
    "tier2_detection_engineer",
    "incident_responder",
]

SafetyEnrichmentStatus = Literal["available", "degraded", "unavailable"]
SafetyMaxRecommendationSeverity = Literal["review_only", "containment_allowed"]


class DecisionProvenanceItemResponse(ApiModel):
    source: str
    key: str
    value: str
    evidence_id: str | None = None
    citation_ref: str | None = None


HistoricalLearningEventType = Literal[
    "analyst_override",
    "final_closure",
    "recommendation_feedback",
    "post_action_outcome",
    "suppression_allowlist_decision",
    "rollback_outcome",
]

HistoricalRecommendationDisposition = Literal["accepted", "rejected"]
HistoricalPostActionOutcome = Literal["success", "regression", "neutral"]
HistoricalSuppressionDecision = Literal["suppression", "allowlist", "none"]


class HistoricalFeatureProvenanceItemResponse(ApiModel):
    feature: str
    source_event_id: str
    event_type: str
    occurred_at_utc: datetime
    contribution: float = Field(ge=0.0, le=1.0)
    detail: str | None = None


class HistoricalLearningQualityResponse(ApiModel):
    eligible_count: int = Field(default=0, ge=0)
    dropped_count: int = Field(default=0, ge=0)
    drop_reasons: dict[str, int] = Field(default_factory=dict)
    lookback_days: int = Field(default=90, ge=1, le=3650)


class HistoricalSimilarDetectionResponse(ApiModel):
    detection_id: str = Field(min_length=1)
    rule_family: str = Field(min_length=1)
    rule_id: str = Field(min_length=1)
    relation_type: str = Field(min_length=1)
    observed_at: datetime
    confidence: float = Field(ge=0.0, le=1.0)
    similarity_score: float = Field(default=0.0, ge=0.0, le=1.0)
    similarity_reasons: list[str] = Field(default_factory=list)
    prior_verdicts: list[str] = Field(default_factory=list)
    prior_accepted_actions: list[str] = Field(default_factory=list)
    prior_outcomes: list[str] = Field(default_factory=list)


class HistoricalLearningContextResponse(ApiModel):
    features: dict[str, float] = Field(default_factory=dict)
    feature_provenance: list[HistoricalFeatureProvenanceItemResponse] = Field(default_factory=list)
    quality: HistoricalLearningQualityResponse
    similar_detections: list[HistoricalSimilarDetectionResponse] = Field(default_factory=list)


class HistoricalLearningContextInput(ApiModel):
    features: dict[str, float] = Field(default_factory=dict)
    feature_provenance: list[dict[str, Any]] = Field(default_factory=list)
    quality: dict[str, Any] = Field(default_factory=dict)
    similar_detections: list[dict[str, Any]] = Field(default_factory=list)


class FeedbackSimilarityIndicatorInput(ApiModel):
    indicator_type: str = Field(min_length=1)
    indicator_value: str = Field(min_length=1)

    @field_validator("indicator_type", mode="before")
    @classmethod
    def _normalize_indicator_type(cls, value: Any) -> str:
        text = str(value).strip().lower()
        if not text:
            raise ValueError("indicator_type cannot be empty.")
        return text

    @field_validator("indicator_value", mode="before")
    @classmethod
    def _normalize_indicator_value(cls, value: Any) -> str:
        text = str(value).strip()
        if not text:
            raise ValueError("indicator_value cannot be empty.")
        return text


class FeedbackSimilarityContextInput(ApiModel):
    rule_family: str | None = None
    rule_id: str | None = None
    ioc_indicators: list[FeedbackSimilarityIndicatorInput] = Field(default_factory=list)
    behavior_patterns: list[str] = Field(default_factory=list)
    signer: str | None = None
    publisher: str | None = None
    asset_group: str | None = None
    lineage_shape: str | None = None
    network_destination_families: list[str] = Field(default_factory=list)
    analyst_closure_pattern: str | None = None

    @field_validator(
        "rule_family",
        "rule_id",
        "signer",
        "publisher",
        "asset_group",
        "lineage_shape",
        "analyst_closure_pattern",
        mode="before",
    )
    @classmethod
    def _normalize_optional_text(cls, value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @field_validator("behavior_patterns", "network_destination_families", mode="before")
    @classmethod
    def _normalize_text_list(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("must be a list.")
        output: list[str] = []
        seen: set[str] = set()
        for item in value:
            text = str(item).strip()
            if not text:
                continue
            key = text.lower()
            if key in seen:
                continue
            seen.add(key)
            output.append(text)
        return output


class EvidenceFusionEvidenceItemResponse(ApiModel):
    channel: str
    source: str
    evidence_id: str | None = None
    reference: str | None = None
    category: str
    polarity: Literal["positive", "negative", "neutral"]
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    summary: str
    anchor: str


class EvidenceFusionMissingItemResponse(ApiModel):
    gap_id: str
    channel: str
    description: str
    importance: Literal["low", "medium", "high"] = "medium"


class EvidenceFusionDeduplicationResponse(ApiModel):
    input_count: int = Field(ge=0)
    unique_count: int = Field(ge=0)
    duplicate_count: int = Field(ge=0)


class EvidenceFusionExplanationResponse(ApiModel):
    positive_evidence: list[EvidenceFusionEvidenceItemResponse] = Field(default_factory=list)
    negative_evidence: list[EvidenceFusionEvidenceItemResponse] = Field(default_factory=list)
    contradictory_evidence: list[EvidenceFusionEvidenceItemResponse] = Field(default_factory=list)
    missing_evidence: list[EvidenceFusionMissingItemResponse] = Field(default_factory=list)
    coverage: dict[str, bool] = Field(default_factory=dict)
    deduplication: EvidenceFusionDeduplicationResponse
    explanation_lines: list[str] = Field(default_factory=list)


class PromotionSuppressionDecisionResponse(ApiModel):
    decision: PromotionSuppressionDecision
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=1)
    required_reviewer_role: ReviewerRole | None = None

    @model_validator(mode="after")
    def _validate_required_reviewer_role(self) -> "PromotionSuppressionDecisionResponse":
        if self.decision == "needs_human_review":
            if self.required_reviewer_role is None:
                raise ValueError("required_reviewer_role is required when decision is needs_human_review.")
            return self
        if self.required_reviewer_role is not None:
            raise ValueError("required_reviewer_role must be null unless decision is needs_human_review.")
        return self


class ActionPlanPolicyCheckResponse(ApiModel):
    check: str = Field(min_length=1)
    passed: bool
    details: str = Field(min_length=1)


class ActionPlanActionScoreResponse(ApiModel):
    action: ActionPlanAction
    eligible: bool
    score: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=1)
    blocked_reasons: list[str] = Field(default_factory=list)


class ActionPlanRecommendedActionResponse(ApiModel):
    action: ActionPlanAction
    rank: int = Field(ge=1)
    score: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=1)
    prerequisites: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)
    escalation_target: ActionPlanEscalationTarget
    required_reviewer_role: ReviewerRole
    requires_human_approval: bool = True
    execution_mode: ActionPlanExecutionMode = "manual_only"

    @model_validator(mode="after")
    def _validate_manual_only(self) -> "ActionPlanRecommendedActionResponse":
        if not self.requires_human_approval:
            raise ValueError("requires_human_approval must be true for all action plan actions.")
        if self.execution_mode != "manual_only":
            raise ValueError("execution_mode must be manual_only.")
        return self


class ActionPlanMachineReadableResponse(ApiModel):
    input_snapshot: dict[str, Any] = Field(default_factory=dict)
    policy_checks: list[ActionPlanPolicyCheckResponse] = Field(default_factory=list)
    action_scores: list[ActionPlanActionScoreResponse] = Field(default_factory=list)
    selection: dict[str, Any] = Field(default_factory=dict)


class ActionPlanResponse(ApiModel):
    summary: str = Field(min_length=1)
    recommended_actions: list[ActionPlanRecommendedActionResponse] = Field(default_factory=list, min_length=1, max_length=3)
    prerequisites: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)
    never_auto_executes: bool = True
    policy_constrained: bool = True
    evidence_based: bool = True
    machine_readable: ActionPlanMachineReadableResponse

    @model_validator(mode="after")
    def _validate_guards(self) -> "ActionPlanResponse":
        if not self.never_auto_executes:
            raise ValueError("never_auto_executes must be true.")
        if not self.policy_constrained:
            raise ValueError("policy_constrained must be true.")
        if not self.evidence_based:
            raise ValueError("evidence_based must be true.")
        unique_actions = {item.action for item in self.recommended_actions}
        if len(unique_actions) != len(self.recommended_actions):
            raise ValueError("recommended_actions must not contain duplicate actions.")
        return self


class SafetyDiagnosticsResponse(ApiModel):
    auto_remediation_allowed: bool = False
    weak_evidence: bool
    contradictory_evidence: bool
    contradiction_score: float = Field(ge=0.0, le=1.0)
    missing_critical_fields: list[str] = Field(default_factory=list)
    partial_evidence: bool
    enrichment_status: SafetyEnrichmentStatus
    false_positive_risk: float = Field(ge=0.0, le=1.0)
    severity_cap_applied: bool
    max_recommendation_severity: SafetyMaxRecommendationSeverity
    degradation_reasons: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_auto_remediation_disabled(self) -> "SafetyDiagnosticsResponse":
        if self.auto_remediation_allowed:
            raise ValueError("auto_remediation_allowed must always be false.")
        if self.severity_cap_applied and self.max_recommendation_severity != "review_only":
            raise ValueError("max_recommendation_severity must be review_only when severity_cap_applied is true.")
        return self


class GroundedDecisionResponse(ApiModel):
    verdict: DecisionVerdict
    action: DecisionAction
    confidence: float = Field(ge=0.0, le=1.0)
    false_positive_risk: float = Field(ge=0.0, le=1.0)
    review_priority: ReviewPriority
    should_promote_to_indicator: bool
    should_suppress: bool
    should_allowlist: bool
    should_escalate: bool
    provenance: list[DecisionProvenanceItemResponse] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    abstain_reason: str | None = None
    next_best_evidence: list[str] = Field(default_factory=list)
    evidence_fusion: EvidenceFusionExplanationResponse | None = None
    historical_learning: HistoricalLearningContextResponse | None = None
    safety_diagnostics: SafetyDiagnosticsResponse
    promotion_suppression_decision: PromotionSuppressionDecisionResponse
    action_plan: ActionPlanResponse

    @model_validator(mode="after")
    def _validate_abstain_reason(self) -> "GroundedDecisionResponse":
        if self.verdict == "insufficient_evidence":
            if not self.abstain_reason or not self.abstain_reason.strip():
                raise ValueError("abstain_reason is required when verdict is insufficient_evidence.")
            return self

        if self.abstain_reason is not None:
            raise ValueError("abstain_reason must be null unless verdict is insufficient_evidence.")
        return self


class ReasonCodeResponse(ApiModel):
    code: str
    message: str


class AxisExplanationResponse(ApiModel):
    axis: Literal[
        "maliciousness",
        "actionability",
        "deployability",
        "decay",
        "uncertainty",
        "blast_radius",
    ]
    summary: str
    drivers: list[str] = Field(default_factory=list)


class EvidenceGapItemResponse(ApiModel):
    gap_id: str
    title: str
    reason_code: str
    confidence_impact: float = Field(ge=0.0, le=1.0)
    recommended_collection: str
    priority: Literal["low", "medium", "high"] = "medium"


class ScoreCaseRequest(ApiModel):
    case_id: str = Field(min_length=1)
    as_of_time: datetime | None = None
    source_system: str = "manager"
    ioc_type: str = Field(min_length=1)
    ioc_value: str = Field(min_length=1)
    host_context: dict[str, Any] = Field(default_factory=dict)
    rule_context: dict[str, Any] = Field(default_factory=dict)
    detection_package: dict[str, Any] | None = None

    @field_validator("ioc_type")
    @classmethod
    def _normalize_ioc_type(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("ioc_value")
    @classmethod
    def _normalize_ioc_value(cls, value: str) -> str:
        return value.strip()


class HistoricalLearningQueryRequest(ScoreCaseRequest):
    top_k: int = Field(default=10, ge=1, le=100)
    lookback_days: int = Field(default=90, ge=1, le=3650)


class HistoricalLearningQueryResponse(ApiModel):
    historical_features: dict[str, float] = Field(default_factory=dict)
    similar_detections: list[HistoricalSimilarDetectionResponse] = Field(default_factory=list)
    feature_provenance: list[HistoricalFeatureProvenanceItemResponse] = Field(default_factory=list)
    quality: HistoricalLearningQualityResponse


class CaseScoreVectorResponse(ApiModel):
    case_id: str
    maliciousness_score: float
    actionability_score: float
    deployability_score: float
    decay_score: float
    uncertainty_score: float
    blast_radius_score: float
    uncertainty_band: list[float] = Field(default_factory=list)
    top_evidence: list[EvidenceItemResponse] = Field(default_factory=list)
    feature_groups: dict[str, float] = Field(default_factory=dict)
    axis_explanations: list[AxisExplanationResponse] = Field(default_factory=list)
    reason_codes: list[ReasonCodeResponse] = Field(default_factory=list)
    evidence_gaps: list[EvidenceGapItemResponse] = Field(default_factory=list)
    model_version: str
    dataset_version: str
    feature_snapshot_hash: str
    decision_state: Literal["recommend", "abstain", "escalate", "defer"]
    abstain_reason_codes: list[str] = Field(default_factory=list)
    next_best_evidence: list[str] = Field(default_factory=list)
    scored_at_utc: datetime
    grounded_decision: GroundedDecisionResponse | None = None


class ScoreBatchRequest(ApiModel):
    items: list[dict[str, Any]] = Field(min_length=1)


class ScoreBatchItemResult(ApiModel):
    index: int
    case_id: str | None = None
    result: CaseScoreVectorResponse | None = None
    error: str | None = None


class ScoreBatchResponse(ApiModel):
    items: list[ScoreBatchItemResult]
    succeeded: int
    failed: int
    model_version: str
    dataset_version: str


class CtiReplayCase(ApiModel):
    id: str
    title: str
    summary: str
    owner_user_id: str
    state: str
    opened_at_utc: datetime
    closed_at_utc: datetime | None = None


class CtiReplayDecision(ApiModel):
    id: str
    decision_state: str
    recommendation_code: str
    recommendation_summary: str
    snapshot_hash: str
    model_version: str
    policy_version: str
    transformation_lineage_hash: str
    decided_at_utc: datetime


class CtiReplayFeatureSnapshot(ApiModel):
    id: str
    snapshot_hash: str
    captured_at_utc: datetime
    feature_window_start_utc: datetime
    feature_window_end_utc: datetime
    captured_by_pipeline: str


class CtiReplayEvidenceReference(ApiModel):
    evidence_assertion_id: str
    evidence_reference: str
    assertion_type: str
    statement: str
    confidence: float = Field(ge=0.0, le=1.0)
    is_conflicting: bool
    source_reference: str
    observed_at_utc: datetime
    referenced_at_utc: datetime


class CtiReplayLineageReference(ApiModel):
    lineage_record_id: str
    source_case_id: str
    target_case_id: str
    relationship: str
    rationale: str
    recorded_at_utc: datetime
    referenced_at_utc: datetime


class CtiReplayGraphArtifactReference(ApiModel):
    id: str
    artifact_type: str
    storage_uri: str
    artifact_hash: str
    produced_by: str
    generated_at_utc: datetime


class CtiReplayFeatureVector(ApiModel):
    feature_name: str
    numeric_value: float
    unit: str | None = None
    source: str


class CtiReplayGraphDerivedFeature(ApiModel):
    metric_name: str
    metric_value: float
    metric_unit: str | None = None
    graph_artifact_reference_id: str | None = None


class CtiReplayAssetCriticalityValue(ApiModel):
    asset_key: str
    criticality: str
    criticality_score: float


class CtiReplaySourceTrustValue(ApiModel):
    source_system: str
    trust_score: float
    historical_precision: float
    historical_recall: float


class CtiReplayPolicyVersionRef(ApiModel):
    policy_version: str
    policy_hash: str
    published_at_utc: datetime


class CtiReplayModelVersionRef(ApiModel):
    model_name: str
    model_version: str
    model_hash: str
    trained_at_utc: datetime


class ExplainCaseRequest(ApiModel):
    case: CtiReplayCase
    decision: CtiReplayDecision
    snapshot: CtiReplayFeatureSnapshot
    evidence_references: list[CtiReplayEvidenceReference] = Field(default_factory=list)
    transformation_lineage: list[CtiReplayLineageReference] = Field(default_factory=list)
    graph_artifacts: list[CtiReplayGraphArtifactReference] = Field(default_factory=list)
    feature_vectors: list[CtiReplayFeatureVector] = Field(default_factory=list)
    graph_derived_features: list[CtiReplayGraphDerivedFeature] = Field(default_factory=list)
    asset_criticality_values: list[CtiReplayAssetCriticalityValue] = Field(default_factory=list)
    source_trust_values: list[CtiReplaySourceTrustValue] = Field(default_factory=list)
    policy_version_refs: list[CtiReplayPolicyVersionRef] = Field(default_factory=list)
    model_version_refs: list[CtiReplayModelVersionRef] = Field(default_factory=list)


class EvidenceCitationResponse(ApiModel):
    source_id: str
    source_type: str
    snippet: str
    source_uri: str | None = None
    start_offset: int | None = None
    end_offset: int | None = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class ExplainCaseResponse(ApiModel):
    case_id: str
    decision_id: str
    decision_state: str
    recommended_action: str
    explanation_summary: str
    rationale: list[str] = Field(default_factory=list)
    citations: list[EvidenceCitationResponse] = Field(default_factory=list)
    next_best_evidence: list[str] = Field(default_factory=list)
    policy_version: str
    model_version: str
    dataset_version: str
    feature_snapshot_hash: str
    replay_bundle_hash: str
    generated_at_utc: datetime
    llm_assist: dict[str, Any] | None = None


class ReportIngestionRequest(ApiModel):
    source_name: str = "manual"
    source_type: Literal["pdf", "blog", "bulletin"] = "blog"
    document_id: str
    document_url: str | None = None
    document_text: str | None = None
    document_bytes_base64: str | None = None
    bulletin_json: dict[str, Any] | None = None
    enable_llm_fallback: bool = False
    ingestion_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("document_id")
    @classmethod
    def _validate_document_id(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("document_id is required.")
        return trimmed

    @field_validator("source_name")
    @classmethod
    def _normalize_source_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("source_name is required.")
        return trimmed

    @field_validator("document_text")
    @classmethod
    def _normalize_document_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("document_bytes_base64")
    @classmethod
    def _normalize_document_bytes_base64(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def _validate_source_payload(self) -> "ReportIngestionRequest":
        if self.source_type == "pdf":
            if not self.document_bytes_base64 and not self.document_text:
                raise ValueError("PDF ingestion requires document_bytes_base64 or document_text.")
            return self

        if self.source_type == "blog":
            if not self.document_text:
                raise ValueError("Blog/advisory ingestion requires document_text.")
            return self

        if self.source_type == "bulletin":
            if not self.bulletin_json and not self.document_text:
                raise ValueError("Bulletin ingestion requires bulletin_json or document_text.")
            return self

        raise ValueError("Unsupported source_type.")


class ReportExtractionStageResponse(ApiModel):
    stage: Literal["deterministic", "regex_entity", "llm_fallback"]
    executed: bool
    extracted_count: int = 0
    notes: list[str] = Field(default_factory=list)


class ExtractedClaimResponse(ApiModel):
    claim_id: str
    claim_type: str
    statement: str
    source_start_offset: int | None = None
    source_end_offset: int | None = None
    snippet: str
    page_index: int | None = None
    extraction_method: Literal["deterministic", "regex", "llm", "abstained"]
    confidence: float = Field(ge=0.0, le=1.0)
    abstain_reason_codes: list[str] = Field(default_factory=list)
    is_prompt_injection_suspected: bool = False
    citations: list[EvidenceCitationResponse] = Field(default_factory=list)


class ExtractedIocResponse(ApiModel):
    ioc_type: str
    ioc_value: str
    label: str = "candidate"
    confidence: float
    attack_techniques: list[str] = Field(default_factory=list)
    cve_refs: list[str] = Field(default_factory=list)
    citations: list[EvidenceCitationResponse] = Field(default_factory=list)


class ReportIngestionResponse(ApiModel):
    report_id: str
    source_type: Literal["pdf", "blog", "bulletin"] = "blog"
    human_review_required: bool = True
    extracted_iocs: list[ExtractedIocResponse] = Field(default_factory=list)
    claims: list[ExtractedClaimResponse] = Field(default_factory=list)
    weak_evidence_detected: bool = False
    pipeline_stages: list[ReportExtractionStageResponse] = Field(default_factory=list)
    campaign_hints: list[str] = Field(default_factory=list)
    malware_family_hints: list[str] = Field(default_factory=list)
    processed_at: datetime


class ReportMitigationRequest(ReportIngestionRequest):
    environment_context: dict[str, Any] = Field(default_factory=dict)
    asset_context: list[dict[str, Any]] = Field(default_factory=list)
    alert_context: list[dict[str, Any]] = Field(default_factory=list)
    rule_context: list[dict[str, Any]] = Field(default_factory=list)
    prior_outcome_context: list[dict[str, Any]] = Field(default_factory=list)


class ReportMitigationActionResponse(ApiModel):
    title: str
    rationale: str
    priority: Literal["critical", "high", "medium", "low"]
    owner_hint: str = "security"
    validation: str
    automation_readiness: Literal["manual_review", "safe_to_draft", "policy_gated"]


class ReportMitigationPrimaryActionResponse(ApiModel):
    rank: int = Field(ge=1, le=3)
    title: str
    target_hint: str
    urgency: Literal["now", "hours", "same_day", "next_day", "multi_day"]
    reasoning: str


class ReportMitigationTimelineStepResponse(ApiModel):
    step_id: str
    title: str
    linked_primary_action_rank: int | None = Field(default=None, ge=1, le=3)
    target_hint: str = ""
    lane: Literal["containment", "validation", "recovery", "follow_up"]
    starts_in: int = Field(ge=0)
    duration: int = Field(ge=1)
    unit: Literal["hours", "days"]
    rationale: str


class ReportMitigationScanRecommendationResponse(ApiModel):
    scanner_family: str
    target_hint: str
    rule_hint: str
    rationale: str
    priority: Literal["critical", "high", "medium", "low"]


class ReportMitigationPlanResponse(ApiModel):
    executive_summary: str
    threat_summary: str
    severity: Literal["critical", "high", "medium", "low"]
    confidence: Literal["high", "medium", "low"]
    affected_asset_hypotheses: list[str] = Field(default_factory=list)
    primary_actions: list[ReportMitigationPrimaryActionResponse] = Field(default_factory=list, min_length=3, max_length=3)
    timeline: list[ReportMitigationTimelineStepResponse] = Field(default_factory=list, min_length=3)
    immediate_actions: list[ReportMitigationActionResponse] = Field(default_factory=list)
    detection_actions: list[ReportMitigationActionResponse] = Field(default_factory=list)
    hardening_actions: list[ReportMitigationActionResponse] = Field(default_factory=list)
    validation_steps: list[str] = Field(default_factory=list)
    scan_recommendations: list[ReportMitigationScanRecommendationResponse] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    requires_human_review: bool = True

    @model_validator(mode="after")
    def _validate_primary_actions(self) -> "ReportMitigationPlanResponse":
        ranks = [item.rank for item in self.primary_actions]
        if ranks != [1, 2, 3]:
            raise ValueError("primary_actions must contain exactly ranks 1, 2, and 3 in order.")
        return self


class ReportMitigationResponse(ApiModel):
    report_id: str
    source_type: Literal["pdf", "blog", "bulletin"] = "blog"
    planner_model: str
    extracted_iocs: list[ExtractedIocResponse] = Field(default_factory=list)
    claims: list[ExtractedClaimResponse] = Field(default_factory=list)
    campaign_hints: list[str] = Field(default_factory=list)
    malware_family_hints: list[str] = Field(default_factory=list)
    mitigation_plan: ReportMitigationPlanResponse
    generated_at: datetime


class GraphCandidateObservableInput(ApiModel):
    observable_id: int = Field(gt=0)
    type: str
    value: str
    confidence: int = Field(ge=0, le=100)
    source_count: int = Field(ge=0)
    last_seen_utc: datetime
    existing_links: int = Field(default=0, ge=0)


class GraphLinkCandidateRequest(ApiModel):
    seed_observable_id: int = Field(gt=0)
    top_k: int = Field(default=10, ge=1, le=100)
    seed_type: str = ""
    seed_value: str = ""
    candidate_nodes: list[GraphCandidateObservableInput] = Field(default_factory=list)


class GraphLinkCandidateResponse(ApiModel):
    seed_observable_id: int
    candidate_observable_id: int
    score: float
    reason: str
    citations: list[EvidenceCitationResponse] = Field(default_factory=list)


class SubmitFeedbackRequest(ApiModel):
    case_id: str = Field(min_length=1)
    decision_id: str | None = None
    ioc_type: str | None = None
    ioc_value: str | None = None
    source_system: str | None = None
    event_type: HistoricalLearningEventType | None = None
    occurred_at_utc: datetime | None = None
    is_final: bool | None = None
    detection_family: str | None = None
    verdict: str = Field(min_length=1)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    false_positive_risk: float | None = Field(default=None, ge=0.0, le=1.0)
    review_priority: ReviewPriority | None = None
    should_promote_to_indicator: bool | None = None
    should_suppress: bool | None = None
    should_allowlist: bool | None = None
    should_escalate: bool | None = None
    recommendation_code: str | None = None
    recommendation_disposition: HistoricalRecommendationDisposition | None = None
    closure_label: str | None = None
    closure_verdict: str | None = None
    override_recommended_verdict: str | None = None
    override_final_verdict: str | None = None
    override_applied: bool | None = None
    post_action_outcome: HistoricalPostActionOutcome | None = None
    suppression_decision: HistoricalSuppressionDecision | None = None
    rollback_performed: bool | None = None
    rollback_succeeded: bool | None = None
    similarity_context: FeedbackSimilarityContextInput | None = None
    notes: str = ""
    submitted_by_user_id: str = Field(min_length=1)

    @field_validator("ioc_type")
    @classmethod
    def _normalize_optional_ioc_type(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized or None

    @field_validator("ioc_value")
    @classmethod
    def _normalize_optional_ioc_value(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator(
        "source_system",
        "detection_family",
        "recommendation_code",
        "closure_label",
        "closure_verdict",
        "override_recommended_verdict",
        "override_final_verdict",
        mode="before",
    )
    @classmethod
    def _normalize_optional_strings(cls, value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @model_validator(mode="after")
    def _validate_event_type_fields(self) -> "SubmitFeedbackRequest":
        if self.event_type is None:
            return self

        if self.event_type == "analyst_override":
            if self.override_applied is None:
                raise ValueError("override_applied is required when event_type is analyst_override.")
            if not self.override_recommended_verdict or not self.override_final_verdict:
                raise ValueError(
                    "override_recommended_verdict and override_final_verdict are required when event_type is analyst_override."
                )
            return self

        if self.event_type == "final_closure":
            if not self.is_final:
                raise ValueError("is_final must be true when event_type is final_closure.")
            if not self.closure_label and not self.closure_verdict:
                raise ValueError("closure_label or closure_verdict is required when event_type is final_closure.")
            return self

        if self.event_type == "recommendation_feedback":
            if not self.recommendation_code or self.recommendation_disposition is None:
                raise ValueError(
                    "recommendation_code and recommendation_disposition are required when event_type is recommendation_feedback."
                )
            return self

        if self.event_type == "post_action_outcome":
            if self.post_action_outcome is None:
                raise ValueError("post_action_outcome is required when event_type is post_action_outcome.")
            return self

        if self.event_type == "suppression_allowlist_decision":
            if self.suppression_decision not in {"suppression", "allowlist"}:
                raise ValueError(
                    "suppression_decision must be suppression or allowlist when event_type is suppression_allowlist_decision."
                )
            return self

        if self.event_type == "rollback_outcome":
            if self.rollback_performed is None:
                raise ValueError("rollback_performed is required when event_type is rollback_outcome.")
            if self.rollback_performed and self.rollback_succeeded is None:
                raise ValueError("rollback_succeeded is required when rollback_performed is true.")
            return self

        return self


class FeedbackIngestResponse(ApiModel):
    feedback_id: str
    accepted: bool
    submitted_at_utc: datetime


class EvaluateModelRequest(ApiModel):
    model_version: str | None = None
    dataset_version: str | None = None
    window_start_utc: datetime | None = None
    window_end_utc: datetime | None = None
    horizon_hours: int = Field(default=72, ge=1, le=720)
    slice_fields: list[str] = Field(
        default_factory=lambda: [
            "rule_family",
            "ioc_type",
            "source_system",
            "time_bucket",
            "recency_bucket",
            "trust_bucket",
            "evidence_availability_bucket",
        ]
    )


class EvaluationConfusionMatrix(ApiModel):
    tp: int = Field(default=0, ge=0)
    fp: int = Field(default=0, ge=0)
    tn: int = Field(default=0, ge=0)
    fn: int = Field(default=0, ge=0)
    abstained_positive: int = Field(default=0, ge=0)
    abstained_negative: int = Field(default=0, ge=0)


class EvaluationCalibrationBin(ApiModel):
    index: int = Field(ge=0)
    lower_bound: float = Field(ge=0.0, le=1.0)
    upper_bound: float = Field(ge=0.0, le=1.0)
    sample_size: int = Field(ge=0)
    average_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    empirical_positive_rate: float | None = Field(default=None, ge=0.0, le=1.0)


class EvaluationOverallMetrics(ApiModel):
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    precision_at_k: float | None = None
    recall_at_k: float | None = None
    pr_auc: float | None = None
    calibration_error: float | None = None
    brier_score: float | None = None
    false_positive_rate: float | None = None
    false_negative_rate: float | None = None
    likely_malicious_precision: float | None = None
    unsafe_recommendation_rate: float | None = None
    analyst_override_rate: float | None = None
    rollback_rate: float | None = None
    abstain_rate: float | None = None
    weak_evidence_rate: float | None = None
    coverage: float | None = None
    confidence_distribution: dict[str, int] = Field(default_factory=dict)
    confusion_matrix: EvaluationConfusionMatrix = Field(default_factory=EvaluationConfusionMatrix)
    calibration_bins: list[EvaluationCalibrationBin] = Field(default_factory=list)
    outcomes: dict[str, int] = Field(default_factory=dict)
    unavailable_metrics: list[str] = Field(default_factory=list)


class EvaluationSliceMetrics(ApiModel):
    slice_field: str
    slice_value: str
    sample_size: int
    positive_rate: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    pr_auc: float | None = None
    calibration_error: float | None = None
    brier_score: float | None = None
    false_positive_rate: float | None = None
    false_negative_rate: float | None = None
    likely_malicious_precision: float | None = None
    analyst_override_rate: float | None = None
    rollback_rate: float | None = None
    abstain_rate: float | None = None
    weak_evidence_rate: float | None = None
    coverage: float | None = None
    confidence_distribution: dict[str, int] = Field(default_factory=dict)
    confusion_matrix: EvaluationConfusionMatrix = Field(default_factory=EvaluationConfusionMatrix)
    calibration_bins: list[EvaluationCalibrationBin] = Field(default_factory=list)
    outcomes: dict[str, int] = Field(default_factory=dict)
    unavailable_metrics: list[str] = Field(default_factory=list)


class EvaluateModelResponse(ApiModel):
    model_version: str
    dataset_version: str
    window_start_utc: datetime | None = None
    window_end_utc: datetime | None = None
    sample_size: int
    overall: EvaluationOverallMetrics
    slices: list[EvaluationSliceMetrics] = Field(default_factory=list)


class ModelStatisticsResponse(ApiModel):
    model_id: str
    model_version: str
    status: str
    dataset_version: str
    scoring_profile_version: str
    feature_schema_version: str
    created_at_utc: datetime | None = None
    published_at_utc: datetime | None = None
    training_window_start_utc: datetime | None = None
    training_window_end_utc: datetime | None = None
    evaluation_window_start_utc: datetime | None = None
    evaluation_window_end_utc: datetime | None = None
    dataset_manifest_hash: str | None = None
    metrics: dict[str, float] = Field(default_factory=dict)
    thresholds: dict[str, float] = Field(default_factory=dict)
    dataset_counts: dict[str, int] = Field(default_factory=dict)
    runtime_warnings: list[str] = Field(default_factory=list)
    readiness_status: str
    notes: str | None = None


ScanAnalystAction = Literal["RecommendOnly", "CreatePlan", "CreateAndRun"]
ScanAnalystScannerCapability = Literal["Yara", "Sigma", "Snort", "Suricata"]
ScanAnalystRuleSelectionMode = Literal["RuleSet", "RuleScope"]
ScanAnalystCadenceType = Literal["Manual", "Interval", "Daily", "Weekly"]
ScanAnalystPlannerMode = Literal["local", "openai_refined", "openai_fallback"]


class ScanAnalystFocusSubnetInput(ApiModel):
    subnet_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    cidr_block: str = Field(min_length=1)


class ScanAnalystDiscoveryRunInput(ApiModel):
    discovery_run_id: str = Field(min_length=1)
    subnet_id: str = Field(min_length=1)
    requested_cidr: str = Field(min_length=1)
    status: str = Field(min_length=1)
    total_hosts: int = Field(ge=0)
    reachable_hosts: int = Field(ge=0)
    unreachable_hosts: int = Field(ge=0)
    summary: str = ""
    queued_at_utc: datetime
    completed_at_utc: datetime | None = None


class ScanAnalystDiscoveredHostInput(ApiModel):
    discovered_host_id: str = Field(min_length=1)
    subnet_id: str = Field(min_length=1)
    ip_address: str = Field(min_length=1)
    hostname: str = ""
    reachability: str = Field(min_length=1)
    already_promoted: bool = False
    last_checked_at_utc: datetime


class ScanAnalystManagedServerInput(ApiModel):
    target_server_id: str = Field(min_length=1)
    subnet_id: str = Field(min_length=1)
    hostname: str = Field(min_length=1)
    ip_address: str = Field(min_length=1)
    operating_system: str = ""
    environment: str = ""
    status: str = Field(min_length=1)
    connectivity_status: str = Field(min_length=1)
    scanner_capabilities: list[str] = Field(default_factory=list)
    last_contact_utc: datetime | None = None


class ScanAnalystAlertInput(ApiModel):
    alert_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    summary: str = ""
    severity: str = Field(min_length=1)
    status: str = Field(min_length=1)
    scanner_family: str = Field(min_length=1)
    target_id: int | None = None
    target_display: str = Field(min_length=1)
    rule_name: str = Field(min_length=1)
    first_detected_at_utc: datetime
    last_detected_at_utc: datetime
    linked_detection_count: int = Field(ge=0)
    matched_target_server_id: str | None = None
    matched_target_hostname: str | None = None
    matched_target_ip_address: str | None = None
    suggested_scanner_capability: ScanAnalystScannerCapability | None = None


class ScanAnalystServerFactInput(ApiModel):
    target_server_id: str = Field(min_length=1)
    hostname: str = Field(min_length=1)
    ip_address: str = Field(min_length=1)
    connection_protocol: str | None = None
    connection_host: str | None = None
    connection_port: int | None = Field(default=None, ge=1, le=65535)
    last_heartbeat_utc: datetime | None = None
    last_scanner_heartbeat_utc: datetime | None = None
    preferred_scanner_connectivity: str | None = None
    has_remote_connection_metadata: bool = False
    healthy_scanner_capabilities: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class ScanAnalystRuleInput(ApiModel):
    rule_revision_id: str = Field(min_length=1)
    rule_artifact_id: str = Field(min_length=1)
    rule_name: str = Field(min_length=1)
    rule_family: str = Field(min_length=1)
    revision_number: int = Field(ge=1)
    version_label: str = Field(min_length=1)
    lifecycle_status: str = Field(min_length=1)
    scope_type: str = Field(min_length=1)
    scope_value: str | None = None
    description: str = ""


class ScanAnalystPlanInput(ApiModel):
    scan_plan_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    scanner_capability: str = Field(min_length=1)
    status: str = Field(min_length=1)
    rule_selection_mode: str = Field(min_length=1)
    target_count: int = Field(ge=0)
    rule_count: int = Field(ge=0)
    last_result_status: str | None = None
    updated_at_utc: datetime


class ScanAnalystJobInput(ApiModel):
    scan_job_id: str = Field(min_length=1)
    scan_plan_id: str | None = None
    trigger_source: str = Field(min_length=1)
    status: str = Field(min_length=1)
    total_targets: int = Field(ge=0)
    completed_targets: int = Field(ge=0)
    failed_targets: int = Field(ge=0)
    detection_count: int = Field(ge=0)
    summary: str = ""
    queued_at_utc: datetime
    completed_at_utc: datetime | None = None


class ScanAnalystTriggerInput(ApiModel):
    trigger_type: str = Field(min_length=1)
    trigger_label: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    severity: str = Field(min_length=1)
    target_server_id: str | None = None
    target_hostname: str | None = None
    target_ip_address: str | None = None
    scanner_capability: ScanAnalystScannerCapability | None = None
    observed_at_utc: datetime


class ScanAnalystRequest(ApiModel):
    objective: str = Field(min_length=1)
    action: ScanAnalystAction = "RecommendOnly"
    preferred_scanner_capability: ScanAnalystScannerCapability | None = None
    max_target_count: int = Field(default=5, ge=1, le=20)
    focus_subnet: ScanAnalystFocusSubnetInput | None = None
    discovery_runs: list[ScanAnalystDiscoveryRunInput] = Field(default_factory=list)
    discovered_hosts: list[ScanAnalystDiscoveredHostInput] = Field(default_factory=list)
    managed_servers: list[ScanAnalystManagedServerInput] = Field(default_factory=list)
    candidate_rules: list[ScanAnalystRuleInput] = Field(default_factory=list)
    existing_plans: list[ScanAnalystPlanInput] = Field(default_factory=list)
    recent_jobs: list[ScanAnalystJobInput] = Field(default_factory=list)
    recent_alerts: list[ScanAnalystAlertInput] = Field(default_factory=list)
    external_server_facts: list[ScanAnalystServerFactInput] = Field(default_factory=list)
    active_triggers: list[ScanAnalystTriggerInput] = Field(default_factory=list)
    allow_local_planner: bool = False


class ScanAnalystTargetResponse(ApiModel):
    target_server_id: str = Field(min_length=1)
    hostname: str = Field(min_length=1)
    ip_address: str = Field(min_length=1)
    operating_system: str = ""
    environment: str = ""
    status: str = Field(min_length=1)
    connectivity_status: str = Field(min_length=1)
    scanner_capabilities: list[str] = Field(default_factory=list)
    reason: str = Field(min_length=1)


class ScanAnalystRuleResponse(ApiModel):
    rule_revision_id: str = Field(min_length=1)
    rule_artifact_id: str = Field(min_length=1)
    rule_name: str = Field(min_length=1)
    rule_family: str = Field(min_length=1)
    revision_number: int = Field(ge=1)
    version_label: str = Field(min_length=1)
    lifecycle_status: str = Field(min_length=1)
    scope_type: str = Field(min_length=1)
    scope_value: str | None = None
    reason: str = Field(min_length=1)


class ScanAnalystPlanProposalResponse(ApiModel):
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    scanner_capability: ScanAnalystScannerCapability
    rule_selection_mode: ScanAnalystRuleSelectionMode
    rule_scope_type: str | None = None
    rule_scope_value: str | None = None
    cadence_type: ScanAnalystCadenceType = "Manual"
    interval_minutes: int | None = Field(default=None, ge=1)
    run_at_hour_utc: int | None = Field(default=None, ge=0, le=23)
    run_at_minute_utc: int | None = Field(default=None, ge=0, le=59)
    weekly_day_of_week: int | None = Field(default=None, ge=0, le=6)
    operator_notes: str = Field(min_length=1)
    status: str = "Draft"
    target_server_ids: list[str] = Field(default_factory=list)
    rule_revision_ids: list[str] = Field(default_factory=list)
    targets: list[ScanAnalystTargetResponse] = Field(default_factory=list)
    rules: list[ScanAnalystRuleResponse] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_rule_selection(self) -> "ScanAnalystPlanProposalResponse":
        if self.rule_selection_mode == "RuleSet" and not self.rule_revision_ids:
            raise ValueError("rule_revision_ids are required for RuleSet proposals.")
        return self


class ScanAnalystResponse(ApiModel):
    summary: str = Field(min_length=1)
    planner_mode: ScanAnalystPlannerMode = "local"
    observations: list[str] = Field(default_factory=list)
    reasoning: list[str] = Field(default_factory=list)
    validation_warnings: list[str] = Field(default_factory=list)
    recommended_scanner_capability: ScanAnalystScannerCapability
    proposal: ScanAnalystPlanProposalResponse
