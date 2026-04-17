from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException

from .config import load_settings
from .copilot import answer_query
from .deployment_recommender import recommend_deployment
from .drift_monitor import DriftMonitor
from .feedback_store import FeedbackStore
from .graph_reasoning import score_link_candidates
from .policy_engine import load_policy, recommend_action
from .report_ingestion import ingest_report
from .rule_intelligence import propose_rule
from .scoring_engine import HybridRiskEngine
from .schemas import (
    AnalystOutcome,
    CaseScoreVectorResponse,
    CopilotQueryRequest,
    CopilotQueryResponse,
    DeploymentRecommendationRequest,
    DeploymentRecommendationResponse,
    FeedbackResponse,
    GraphLinkCandidateRequest,
    GraphLinkCandidateResponse,
    ModelCardResponse,
    RecommendActionRequest,
    RecommendActionResponse,
    RequestMoreEvidenceRequest,
    RequestMoreEvidenceResponse,
    ReportIngestionRequest,
    ReportIngestionResponse,
    RuleProposalRequest,
    RuleProposalResponse,
    ScoreCaseRequest,
    ScoreBatchRequest,
    ScoreBatchResponse,
    ScoreIocRequest,
    SimulateRuleRequest,
    SimulateRuleResponse,
    ScoreResponse,
)

settings = load_settings()
feedback_store = FeedbackStore(settings.feedback_db_path)
engine = HybridRiskEngine(settings=settings, feedback_store=feedback_store)
drift_monitor = DriftMonitor()
policy = load_policy(settings.policy_config_path)

app = FastAPI(
    title="IoC Intelligence Service",
    version="0.1.0",
    description="Recall-first actionable IoC risk scoring service.",
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": settings.service_name,
        "environment": settings.environment,
        "model_version": engine.model_card.model_version,
        "drift": drift_monitor.snapshot(),
    }


@app.post("/score_ioc", response_model=ScoreResponse)
def score_ioc(request: ScoreIocRequest) -> ScoreResponse:
    try:
        response = engine.score_response(request)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}") from exc

    drift_monitor.register_score(request.ioc_type, response.risk_score, response.confidence)
    return response


@app.post("/score_batch", response_model=ScoreBatchResponse)
def score_batch(request: ScoreBatchRequest) -> ScoreBatchResponse:
    responses = [engine.score_response(item) for item in request.items]
    for item, response in zip(request.items, responses, strict=True):
        drift_monitor.register_score(item.ioc_type, response.risk_score, response.confidence)
    return ScoreBatchResponse(items=responses)


@app.post("/score_case", response_model=CaseScoreVectorResponse)
def score_case(request: ScoreCaseRequest) -> CaseScoreVectorResponse:
    event = ScoreIocRequest(
        ioc_value=request.ioc_value,
        ioc_type=request.ioc_type,
        source_system=request.source_system,
        event_time=request.as_of_time or datetime.now(timezone.utc),
        host_context=request.host_context,
        rule_context=request.rule_context,
    )
    response = engine.score_case_vector(event)
    drift_monitor.register_score(event.ioc_type, response.maliciousness_score, 1.0 - response.uncertainty_score)
    return response


@app.post("/recommend_action", response_model=RecommendActionResponse)
def recommend_action_endpoint(request: RecommendActionRequest) -> RecommendActionResponse:
    return recommend_action(request, policy)


@app.post("/request_more_evidence", response_model=RequestMoreEvidenceResponse)
def request_more_evidence_endpoint(request: RequestMoreEvidenceRequest) -> RequestMoreEvidenceResponse:
    reason = request.reason or "Need additional evidence before safe action."
    return RequestMoreEvidenceResponse(
        case_id=request.case_id,
        decision_state="defer",
        next_best_evidence=[
            "collect_internal_sightings",
            "expand_graph_neighborhood",
            "run_shadow_simulation",
        ],
        reason=reason,
    )


@app.post("/simulate_rule", response_model=SimulateRuleResponse)
def simulate_rule_endpoint(request: SimulateRuleRequest) -> SimulateRuleResponse:
    body = request.rule_body.lower()
    keyword_count = sum(1 for token in ("contains", "selection", "$", "content:", "msg:") if token in body)
    coverage = min(0.95, 0.35 + (keyword_count * 0.09))
    fp_risk = max(0.05, 0.80 - (keyword_count * 0.08))
    rollout = "canary" if fp_risk <= 0.30 else "shadow"
    return SimulateRuleResponse(
        case_id=request.case_id,
        predicted_coverage=float(round(coverage, 4)),
        predicted_fp_risk=float(round(fp_risk, 4)),
        recommended_rollout_mode=rollout,
        summary=f"Simulation suggests {rollout} rollout with coverage={coverage:.2f} and fp_risk={fp_risk:.2f}.",
    )


@app.post("/feedback", response_model=FeedbackResponse)
def feedback(request: AnalystOutcome) -> FeedbackResponse:
    stored_at = engine.register_feedback(request)
    return FeedbackResponse(
        accepted=True,
        stored_at=stored_at,
        forwarded_to_learning=settings.enable_feedback_learning,
    )


@app.get("/model_card", response_model=ModelCardResponse)
def model_card() -> ModelCardResponse:
    return engine.model_card


@app.post("/ingest_report", response_model=ReportIngestionResponse)
def ingest_report_endpoint(request: ReportIngestionRequest) -> ReportIngestionResponse:
    try:
        return ingest_report(request)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Report ingestion failed: {exc}") from exc


@app.post("/propose_rules", response_model=RuleProposalResponse)
def propose_rules_endpoint(request: RuleProposalRequest) -> RuleProposalResponse:
    try:
        return propose_rule(request)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Rule proposal failed: {exc}") from exc


@app.post("/recommend_deployment", response_model=DeploymentRecommendationResponse)
def recommend_deployment_endpoint(request: DeploymentRecommendationRequest) -> DeploymentRecommendationResponse:
    try:
        return recommend_deployment(request)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Deployment recommendation failed: {exc}") from exc


@app.post("/copilot/query", response_model=CopilotQueryResponse)
def copilot_query_endpoint(request: CopilotQueryRequest) -> CopilotQueryResponse:
    try:
        return answer_query(request)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Copilot query failed: {exc}") from exc


@app.post("/graph/link_candidates", response_model=list[GraphLinkCandidateResponse])
def graph_link_candidates_endpoint(request: GraphLinkCandidateRequest) -> list[GraphLinkCandidateResponse]:
    try:
        return score_link_candidates(request)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Graph candidate scoring failed: {exc}") from exc
