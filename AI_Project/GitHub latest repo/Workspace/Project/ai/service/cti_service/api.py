from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from pydantic import ValidationError

from .calibration import LogisticCalibrator
from .config import ServiceSettings, load_settings
from .contracts import (
    CaseScoreVectorResponse,
    EvaluateModelRequest,
    EvaluateModelResponse,
    ExplainCaseRequest,
    ExplainCaseResponse,
    FeedbackIngestResponse,
    GroundedDecisionResponse,
    GraphLinkCandidateRequest,
    GraphLinkCandidateResponse,
    ReportIngestionRequest,
    ReportIngestionResponse,
    ScoreBatchRequest,
    ScoreBatchResponse,
    ScoreCaseRequest,
    SubmitFeedbackRequest,
)
from .dataset_registry import DatasetRegistryEntry, DatasetRegistryStore
from .decision_support import build_grounded_decision, recommend_action, request_more_evidence
from .evaluator import evaluate_snapshot
from .explanation import explain_case
from .extraction import extract_report
from .feedback_store import FeedbackStore
from .graph import score_graph_neighbors
from .registry import ModelRegistryEntry, ModelRegistryStore
from .scorer import BaselineScorer, ScorerContext, ScoringThresholds
from .snapshots import SnapshotDataset, SnapshotLoader


@dataclass
class ServiceRuntime:
    settings: ServiceSettings
    snapshot_loader: SnapshotLoader
    model_registry: ModelRegistryStore
    dataset_registry: DatasetRegistryStore
    feedback_store: FeedbackStore
    scorer: BaselineScorer
    active_model_entry: ModelRegistryEntry | None
    active_dataset_entry: DatasetRegistryEntry | None


def create_app(settings: ServiceSettings | None = None) -> FastAPI:
    resolved_settings = settings or load_settings()
    runtime = _build_runtime(resolved_settings)

    app = FastAPI(
        title="IoC Ingestion Sidecar (Deferred)",
        version="0.1.0",
        description="IoC Manager sidecar focused on report extraction. Decision/graph endpoints are compatibility surfaces.",
    )

    @app.get("/health")
    def health() -> dict[str, object]:
        return {
            "status": "ok",
            "service": runtime.settings.service_name,
            "environment": runtime.settings.environment,
            "modelVersion": runtime.scorer.model_version,
            "datasetVersion": runtime.scorer.dataset_version,
            "scoringProfileVersion": runtime.scorer.scoring_profile_version,
            "featureSchemaVersion": runtime.scorer.feature_schema_version,
            "datasetManifestHash": runtime.active_dataset_entry.manifest_hash if runtime.active_dataset_entry else None,
        }

    @app.post("/score_case", response_model=CaseScoreVectorResponse, deprecated=True)
    def score_case(request: ScoreCaseRequest) -> CaseScoreVectorResponse:
        diagnostics = runtime.scorer.score_case(request)
        grounded = build_grounded_decision(diagnostics, request)
        return diagnostics.model_copy(update={"grounded_decision": grounded})

    @app.post("/recommend_action", response_model=GroundedDecisionResponse, deprecated=True)
    def recommend_action_endpoint(request: ScoreCaseRequest) -> GroundedDecisionResponse:
        return recommend_action(runtime.scorer, request)

    @app.post("/request_more_evidence", response_model=GroundedDecisionResponse, deprecated=True)
    def request_more_evidence_endpoint(request: ScoreCaseRequest) -> GroundedDecisionResponse:
        return request_more_evidence(runtime.scorer, request)

    @app.post("/score_batch", response_model=ScoreBatchResponse, deprecated=True)
    def score_batch(request: ScoreBatchRequest) -> ScoreBatchResponse:
        item_results = []
        succeeded = 0
        failed = 0
        for index, raw_item in enumerate(request.items):
            case_id = _extract_case_id(raw_item)
            try:
                parsed = ScoreCaseRequest.model_validate(raw_item)
                diagnostics = runtime.scorer.score_case(parsed)
                grounded = build_grounded_decision(diagnostics, parsed)
                result = diagnostics.model_copy(update={"grounded_decision": grounded})
                item_results.append(
                    {
                        "index": index,
                        "caseId": case_id or parsed.case_id,
                        "result": result.model_dump(mode="json", by_alias=True),
                        "error": None,
                    }
                )
                succeeded += 1
            except ValidationError as exc:
                item_results.append(
                    {
                        "index": index,
                        "caseId": case_id,
                        "result": None,
                        "error": exc.errors()[0]["msg"] if exc.errors() else "validation_error",
                    }
                )
                failed += 1
            except Exception as exc:  # pragma: no cover
                item_results.append({"index": index, "caseId": case_id, "result": None, "error": str(exc)})
                failed += 1

        return ScoreBatchResponse(
            items=item_results,
            succeeded=succeeded,
            failed=failed,
            model_version=runtime.scorer.model_version,
            dataset_version=runtime.scorer.dataset_version,
        )

    @app.post("/explain_case", response_model=ExplainCaseResponse, deprecated=True)
    def explain_case_endpoint(request: ExplainCaseRequest) -> ExplainCaseResponse:
        return explain_case(request, dataset_version=runtime.scorer.dataset_version)

    @app.post("/extract_report", response_model=ReportIngestionResponse)
    def extract_report_endpoint(request: ReportIngestionRequest) -> ReportIngestionResponse:
        return extract_report(request)

    @app.post("/ingest_report", response_model=ReportIngestionResponse)
    def ingest_report_alias(request: ReportIngestionRequest) -> ReportIngestionResponse:
        return extract_report(request)

    @app.post("/graph_neighbors", response_model=list[GraphLinkCandidateResponse], deprecated=True)
    def graph_neighbors_endpoint(request: GraphLinkCandidateRequest) -> list[GraphLinkCandidateResponse]:
        return score_graph_neighbors(request)

    @app.post("/graph/link_candidates", response_model=list[GraphLinkCandidateResponse], deprecated=True)
    def graph_neighbors_alias(request: GraphLinkCandidateRequest) -> list[GraphLinkCandidateResponse]:
        return score_graph_neighbors(request)

    @app.post("/feedback", response_model=FeedbackIngestResponse, deprecated=True)
    def feedback_endpoint(request: SubmitFeedbackRequest) -> FeedbackIngestResponse:
        return runtime.feedback_store.append(request)

    @app.post("/evaluate_model", response_model=EvaluateModelResponse, deprecated=True)
    def evaluate_model_endpoint(request: EvaluateModelRequest) -> EvaluateModelResponse:
        entry = _resolve_model_registry_entry(runtime, request.model_version)
        dataset_version = request.dataset_version or (entry.dataset_version if entry else runtime.scorer.dataset_version)
        if not dataset_version:
            raise HTTPException(status_code=400, detail="No dataset version specified and no active dataset configured.")
        window_start_utc = _ensure_utc(request.window_start_utc)
        window_end_utc = _ensure_utc(request.window_end_utc)

        try:
            snapshot = runtime.snapshot_loader.load(dataset_version)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to load dataset snapshot '{dataset_version}': {exc}") from exc

        runtime.active_dataset_entry = _persist_dataset_entry(runtime.dataset_registry, snapshot)
        scorer = _build_scorer(entry, snapshot.source_trust_map, fallback=runtime.scorer, dataset_version=dataset_version)
        overall, slices, sample_size = evaluate_snapshot(
            scorer=scorer,
            snapshot=snapshot,
            horizon_hours=request.horizon_hours,
            window_start_utc=window_start_utc,
            window_end_utc=window_end_utc,
            slice_fields=request.slice_fields,
        )
        return EvaluateModelResponse(
            model_version=scorer.model_version,
            dataset_version=dataset_version,
            window_start_utc=window_start_utc,
            window_end_utc=window_end_utc,
            sample_size=sample_size,
            overall=overall,
            slices=slices,
        )

    return app


def _build_runtime(settings: ServiceSettings) -> ServiceRuntime:
    settings.artifacts_root.mkdir(parents=True, exist_ok=True)
    snapshot_loader = SnapshotLoader(settings.snapshot_root)
    model_registry = ModelRegistryStore(settings.registry_path)
    dataset_registry = DatasetRegistryStore(settings.dataset_registry_path)
    feedback_store = FeedbackStore(settings.feedback_store_path)
    active_model_entry = model_registry.get_active()

    source_trust_map: dict[str, float] = {}
    active_dataset_entry = dataset_registry.get_latest()
    dataset_version = settings.default_dataset_version
    if not dataset_version and active_model_entry:
        dataset_version = active_model_entry.dataset_version
    if not dataset_version and active_dataset_entry:
        dataset_version = active_dataset_entry.dataset_version

    if dataset_version:
        try:
            snapshot = snapshot_loader.load(dataset_version)
            source_trust_map = snapshot.source_trust_map
            active_dataset_entry = _persist_dataset_entry(dataset_registry, snapshot)
        except Exception:
            source_trust_map = {}

    scorer = _build_scorer(
        active_model_entry,
        source_trust_map,
        fallback=None,
        dataset_version=dataset_version or "unknown",
    )
    return ServiceRuntime(
        settings=settings,
        snapshot_loader=snapshot_loader,
        model_registry=model_registry,
        dataset_registry=dataset_registry,
        feedback_store=feedback_store,
        scorer=scorer,
        active_model_entry=active_model_entry,
        active_dataset_entry=active_dataset_entry,
    )


def _resolve_model_registry_entry(runtime: ServiceRuntime, model_version: str | None) -> ModelRegistryEntry | None:
    if model_version:
        entry = runtime.model_registry.get_by_version(model_version)
        if entry is None:
            raise HTTPException(status_code=404, detail=f"Model version '{model_version}' was not found in registry.")
        return entry
    return runtime.active_model_entry


def _build_scorer(
    entry: ModelRegistryEntry | None,
    source_trust_map: dict[str, float],
    fallback: BaselineScorer | None,
    dataset_version: str,
) -> BaselineScorer:
    if entry is None:
        if fallback is not None and fallback.dataset_version == dataset_version:
            return fallback
        context = ScorerContext(
            model_version="v1-baseline",
            dataset_version=dataset_version,
            source_trust_map=source_trust_map,
            scoring_profile_version="heuristic-v1",
            feature_schema_version="cti-feature-schema-v1",
        )
        return BaselineScorer(context=context)

    thresholds = ScoringThresholds(
        recommend=float(entry.thresholds.get("recommend", 0.55)),
        escalate=float(entry.thresholds.get("escalate", 0.80)),
        abstain=float(entry.thresholds.get("abstain", 0.35)),
    )
    calibrator = LogisticCalibrator.from_dict(entry.calibration)
    context = ScorerContext(
        model_version=entry.model_version,
        dataset_version=dataset_version or entry.dataset_version,
        source_trust_map=source_trust_map,
        scoring_profile_version=entry.scoring_profile_version,
        feature_schema_version=entry.feature_schema_version,
    )
    return BaselineScorer(context=context, calibrator=calibrator, thresholds=thresholds)


def _persist_dataset_entry(store: DatasetRegistryStore, snapshot: SnapshotDataset) -> DatasetRegistryEntry:
    existing = store.get_by_version(snapshot.dataset_version)
    if existing:
        return existing
    entry = DatasetRegistryEntry(
        dataset_version=snapshot.dataset_version,
        created_at_utc=snapshot.created_at_utc,
        manifest_path=str(snapshot.manifest_path.resolve()),
        manifest_hash=snapshot.manifest_hash,
        source_files=snapshot.manifest_files,
        notes="Versioned dataset snapshot consumed by CTI sidecar.",
    )
    store.upsert(entry)
    loaded = store.get_by_version(snapshot.dataset_version)
    return loaded or entry


def _extract_case_id(raw_item: dict[str, object]) -> str | None:
    if "caseId" in raw_item:
        return str(raw_item["caseId"])
    if "case_id" in raw_item:
        return str(raw_item["case_id"])
    return None


def _ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
