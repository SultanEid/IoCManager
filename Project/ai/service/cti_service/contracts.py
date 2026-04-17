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
    "confirmed_malicious",
    "likely_malicious",
    "likely_benign",
    "insufficient_evidence",
]

DecisionAction = Literal[
    "deploy",
    "canary",
    "monitor",
    "hold",
    "rollback",
    "quarantine_for_review",
]


class DecisionProvenanceItemResponse(ApiModel):
    source: str
    key: str
    value: str
    evidence_id: str | None = None
    citation_ref: str | None = None


class GroundedDecisionResponse(ApiModel):
    verdict: DecisionVerdict
    action: DecisionAction
    confidence: float = Field(ge=0.0, le=1.0)
    provenance: list[DecisionProvenanceItemResponse] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)
    abstain_reason: str | None = None
    next_best_evidence: list[str] = Field(default_factory=list)

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

    @field_validator("ioc_type")
    @classmethod
    def _normalize_ioc_type(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("ioc_value")
    @classmethod
    def _normalize_ioc_value(cls, value: str) -> str:
        return value.strip()


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
    verdict: str = Field(min_length=1)
    notes: str = ""
    submitted_by_user_id: str = Field(min_length=1)


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
        default_factory=lambda: ["ioc_type", "source_system", "recency_bucket", "trust_bucket"]
    )


class EvaluationOverallMetrics(ApiModel):
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    precision_at_k: float | None = None
    recall_at_k: float | None = None
    pr_auc: float | None = None
    calibration_error: float | None = None
    unsafe_recommendation_rate: float | None = None
    analyst_override_rate: float | None = None
    rollback_rate: float | None = None
    abstain_rate: float | None = None
    coverage: float | None = None
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
    analyst_override_rate: float | None = None
    rollback_rate: float | None = None
    abstain_rate: float | None = None
    coverage: float | None = None
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
