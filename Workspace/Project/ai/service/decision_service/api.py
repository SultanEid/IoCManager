from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
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
    HistoricalFeatureProvenanceItemResponse,
    HistoricalLearningContextResponse,
    HistoricalLearningQualityResponse,
    HistoricalLearningQueryRequest,
    HistoricalLearningQueryResponse,
    HistoricalSimilarDetectionResponse,
    GraphLinkCandidateRequest,
    GraphLinkCandidateResponse,
    ReportIngestionRequest,
    ReportIngestionResponse,
    ScanAnalystRequest,
    ScanAnalystResponse,
    ScoreBatchRequest,
    ScoreBatchResponse,
    ScoreCaseRequest,
    SubmitFeedbackRequest,
)
from .dataset_registry import DatasetRegistryEntry, DatasetRegistryStore
from .decision_support import build_grounded_decision
from .evaluator import evaluate_snapshot
from .explanation import explain_case
from .extraction import extract_report
from .feedback_store import FeedbackStore
from .graph import score_graph_neighbors
from .historical_learning import HistoricalLearningEngine
from .registry import ModelRegistryEntry, ModelRegistryStore
from .scan_analyst import recommend_scan_plan
from .scorer import BaselineScorer, ScorerContext, ScoringThresholds
from .snapshots import SnapshotDataset, SnapshotLoader

logger = logging.getLogger(__name__)
EXPENSIVE_BODY_LIMIT_PATHS = {"/score_batch"}


@dataclass
class ServiceRuntime:
    settings: ServiceSettings
    snapshot_loader: SnapshotLoader
    model_registry: ModelRegistryStore
    dataset_registry: DatasetRegistryStore
    feedback_store: FeedbackStore
    historical_learning_engine: HistoricalLearningEngine
    scorer: BaselineScorer
    active_model_entry: ModelRegistryEntry | None
    active_dataset_entry: DatasetRegistryEntry | None
    startup_warnings: list[str]


def create_app(settings: ServiceSettings | None = None) -> FastAPI:
    resolved_settings = settings or load_settings()
    runtime = _build_runtime(resolved_settings)

    app = FastAPI(
        title="IoC Manager Decision Sidecar",
        version="0.1.0",
        description=(
            "IoC Manager sidecar for report extraction, decision support, and action-plan recommendation. "
            "Deprecated compatibility endpoints remain available while the merged backend completes its migration."
        ),
    )

    @app.middleware("http")
    async def enforce_expensive_request_body_limit(request: Request, call_next):
        if request.method in {"POST", "PUT", "PATCH"} and request.url.path in EXPENSIVE_BODY_LIMIT_PATHS:
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    body_size = int(content_length)
                except ValueError:
                    body_size = None
                if body_size is not None and body_size > runtime.settings.max_expensive_request_body_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": "Request body exceeds configured size limit.",
                            "limitBytes": runtime.settings.max_expensive_request_body_bytes,
                        },
                    )
        return await call_next(request)

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
            "runtimeWarnings": runtime.startup_warnings,
        }

    @app.post("/score_case", response_model=CaseScoreVectorResponse, deprecated=True)
    def score_case(request: ScoreCaseRequest) -> CaseScoreVectorResponse:
        effective_request, historical_learning = _build_effective_request_with_historical_learning(
            runtime=runtime,
            request=request,
        )
        diagnostics = runtime.scorer.score_case(effective_request)
        grounded = build_grounded_decision(
            diagnostics,
            effective_request,
            historical_learning=historical_learning,
        )
        return diagnostics.model_copy(update={"grounded_decision": grounded})

    @app.post("/recommend_action", response_model=GroundedDecisionResponse, deprecated=True)
    def recommend_action_endpoint(request: ScoreCaseRequest) -> GroundedDecisionResponse:
        effective_request, historical_learning = _build_effective_request_with_historical_learning(
            runtime=runtime,
            request=request,
        )
        diagnostics = runtime.scorer.score_case(effective_request)
        return build_grounded_decision(
            diagnostics,
            effective_request,
            historical_learning=historical_learning,
        )

    @app.post("/request_more_evidence", response_model=GroundedDecisionResponse, deprecated=True)
    def request_more_evidence_endpoint(request: ScoreCaseRequest) -> GroundedDecisionResponse:
        effective_request, historical_learning = _build_effective_request_with_historical_learning(
            runtime=runtime,
            request=request,
        )
        diagnostics = runtime.scorer.score_case(effective_request)
        return build_grounded_decision(
            diagnostics,
            effective_request,
            historical_learning=historical_learning,
        )

    @app.post("/score_batch", response_model=ScoreBatchResponse, deprecated=True)
    def score_batch(request: ScoreBatchRequest) -> ScoreBatchResponse:
        if len(request.items) > runtime.settings.max_score_batch_items:
            raise HTTPException(
                status_code=413,
                detail={
                    "message": "Batch item count exceeds configured limit.",
                    "limit": runtime.settings.max_score_batch_items,
                },
            )
        item_results = []
        succeeded = 0
        failed = 0
        for index, raw_item in enumerate(request.items):
            case_id = _extract_case_id(raw_item)
            try:
                parsed = ScoreCaseRequest.model_validate(raw_item)
                effective_request, historical_learning = _build_effective_request_with_historical_learning(
                    runtime=runtime,
                    request=parsed,
                )
                diagnostics = runtime.scorer.score_case(effective_request)
                grounded = build_grounded_decision(
                    diagnostics,
                    effective_request,
                    historical_learning=historical_learning,
                )
                result = diagnostics.model_copy(update={"grounded_decision": grounded})
                item_results.append(
                    {
                        "index": index,
                        "caseId": case_id or effective_request.case_id,
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

    @app.post("/historical_learning/query", response_model=HistoricalLearningQueryResponse)
    def historical_learning_query_endpoint(request: HistoricalLearningQueryRequest) -> HistoricalLearningQueryResponse:
        return runtime.historical_learning_engine.query(request)

    @app.post("/scan_analyst", response_model=ScanAnalystResponse)
    def scan_analyst_endpoint(request: ScanAnalystRequest) -> ScanAnalystResponse:
        return recommend_scan_plan(request, runtime.settings)

    @app.post("/evaluate_model", response_model=EvaluateModelResponse, deprecated=True)
    def evaluate_model_endpoint(request: EvaluateModelRequest) -> EvaluateModelResponse:
        if not runtime.settings.enable_http_model_evaluation:
            raise HTTPException(status_code=403, detail="Model evaluation endpoint is disabled for this environment.")
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
    startup_warnings: list[str] = []
    snapshot_loader = SnapshotLoader(settings.snapshot_root)
    model_registry = ModelRegistryStore(settings.registry_path)
    dataset_registry = DatasetRegistryStore(settings.dataset_registry_path)
    feedback_store = FeedbackStore(settings.feedback_store_path)
    historical_learning_engine = HistoricalLearningEngine(
        feedback_store,
        default_lookback_days=settings.historical_learning_default_lookback_days,
        default_top_k=settings.historical_learning_default_top_k,
        decay_half_life_days=settings.historical_learning_decay_half_life_days,
    )
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
            warning_code = "dataset_snapshot_load_failed"
            startup_warnings.append(warning_code)
            logger.warning("%s; continuing with empty source trust map", warning_code)
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
        historical_learning_engine=historical_learning_engine,
        scorer=scorer,
        active_model_entry=active_model_entry,
        active_dataset_entry=active_dataset_entry,
        startup_warnings=startup_warnings,
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
        notes="Versioned dataset snapshot consumed by the IoC Manager decision sidecar.",
    )
    store.upsert(entry)
    loaded = store.get_by_version(snapshot.dataset_version)
    return loaded or entry


def _build_effective_request_with_historical_learning(
    *,
    runtime: ServiceRuntime,
    request: ScoreCaseRequest,
) -> tuple[ScoreCaseRequest, HistoricalLearningContextResponse | None]:
    detection_package = request.detection_package if isinstance(request.detection_package, dict) else {}
    caller_context = _extract_historical_learning_context(detection_package.get("historical_learning_context"))

    retrieved_context = runtime.historical_learning_engine.build_context_from_score_request(
        ioc_type=request.ioc_type,
        ioc_value=request.ioc_value,
        as_of_time=request.as_of_time,
        host_context=request.host_context,
        rule_context=request.rule_context,
        detection_package=detection_package,
    )
    merged_context = _merge_historical_learning_context(caller_context=caller_context, retrieved_context=retrieved_context)
    if merged_context is None:
        return request, None

    effective_detection_package = dict(detection_package)
    existing_related = _coerce_related_detection_list(
        _coerce_dict(effective_detection_package.get("related_detections")).get("detections")
    )
    merged_related = _merge_related_detections(
        existing_related=existing_related,
        historical_similar=merged_context.similar_detections,
    )
    if merged_related:
        effective_detection_package["related_detections"] = {"detections": merged_related}
    effective_detection_package["historical_learning_context"] = merged_context.model_dump(mode="python")

    effective_request = request.model_copy(update={"detection_package": effective_detection_package})
    return effective_request, merged_context


def _extract_historical_learning_context(value: Any) -> HistoricalLearningContextResponse | None:
    if not isinstance(value, dict):
        return None
    features = _coerce_float_map(value.get("features"))
    provenance = _coerce_feature_provenance(value.get("feature_provenance"))
    quality_raw = value.get("quality")
    quality = (
        HistoricalLearningQualityResponse.model_validate(quality_raw)
        if isinstance(quality_raw, dict)
        else HistoricalLearningQualityResponse()
    )
    similar = _coerce_similar_detections(value.get("similar_detections"))
    context = HistoricalLearningContextResponse(
        features=features,
        feature_provenance=provenance,
        quality=quality,
        similar_detections=similar,
    )
    if _context_has_signal(context):
        return context
    return None


def _merge_historical_learning_context(
    *,
    caller_context: HistoricalLearningContextResponse | None,
    retrieved_context: HistoricalLearningContextResponse | None,
) -> HistoricalLearningContextResponse | None:
    if caller_context is None and retrieved_context is None:
        return None
    if caller_context is None and retrieved_context is not None and _context_has_signal(retrieved_context):
        return retrieved_context
    if retrieved_context is None and caller_context is not None and _context_has_signal(caller_context):
        return caller_context
    if caller_context is None or retrieved_context is None:
        return None

    merged_features = dict(caller_context.features)
    for key, value in retrieved_context.features.items():
        if key not in merged_features:
            merged_features[key] = float(value)

    merged_drop_reasons = dict(caller_context.quality.drop_reasons)
    for reason, count in retrieved_context.quality.drop_reasons.items():
        merged_drop_reasons[reason] = merged_drop_reasons.get(reason, 0) + int(count)
    merged_quality = HistoricalLearningQualityResponse(
        eligible_count=caller_context.quality.eligible_count + retrieved_context.quality.eligible_count,
        dropped_count=caller_context.quality.dropped_count + retrieved_context.quality.dropped_count,
        drop_reasons=dict(sorted(merged_drop_reasons.items(), key=lambda item: item[0])),
        lookback_days=max(caller_context.quality.lookback_days, retrieved_context.quality.lookback_days),
    )

    seen_provenance: set[tuple[str, str, str, datetime]] = set()
    merged_provenance: list[HistoricalFeatureProvenanceItemResponse] = []
    for item in [*caller_context.feature_provenance, *retrieved_context.feature_provenance]:
        key = (item.feature, item.source_event_id, item.event_type, item.occurred_at_utc)
        if key in seen_provenance:
            continue
        seen_provenance.add(key)
        merged_provenance.append(item)

    similar_by_key: dict[tuple[str, str, str], HistoricalSimilarDetectionResponse] = {}
    for item in [*caller_context.similar_detections, *retrieved_context.similar_detections]:
        key = (item.detection_id, item.rule_family, item.rule_id)
        existing = similar_by_key.get(key)
        if existing is None:
            similar_by_key[key] = item
            continue
        similar_by_key[key] = _merge_similar_detection_items(existing=existing, candidate=item)
    merged_similar = sorted(
        similar_by_key.values(),
        key=lambda item: (item.similarity_score, item.observed_at, item.confidence, item.detection_id),
        reverse=True,
    )

    merged = HistoricalLearningContextResponse(
        features=dict(sorted(merged_features.items(), key=lambda item: item[0])),
        feature_provenance=merged_provenance,
        quality=merged_quality,
        similar_detections=merged_similar,
    )
    if _context_has_signal(merged):
        return merged
    return None


def _merge_similar_detection_items(
    *,
    existing: HistoricalSimilarDetectionResponse,
    candidate: HistoricalSimilarDetectionResponse,
) -> HistoricalSimilarDetectionResponse:
    relation_type = existing.relation_type
    if candidate.relation_type == "contradictory_signal":
        relation_type = "contradictory_signal"
    observed_at = max(existing.observed_at, candidate.observed_at)
    confidence = max(existing.confidence, candidate.confidence)
    similarity_score = max(existing.similarity_score, candidate.similarity_score)
    similarity_reasons = _merge_unique_strings(existing.similarity_reasons, candidate.similarity_reasons)
    prior_verdicts = _merge_unique_strings(existing.prior_verdicts, candidate.prior_verdicts)
    prior_accepted_actions = _merge_unique_strings(existing.prior_accepted_actions, candidate.prior_accepted_actions)
    prior_outcomes = _merge_unique_strings(existing.prior_outcomes, candidate.prior_outcomes)
    return HistoricalSimilarDetectionResponse(
        detection_id=existing.detection_id,
        rule_family=existing.rule_family,
        rule_id=existing.rule_id,
        relation_type=relation_type,
        observed_at=observed_at,
        confidence=confidence,
        similarity_score=similarity_score,
        similarity_reasons=similarity_reasons,
        prior_verdicts=prior_verdicts,
        prior_accepted_actions=prior_accepted_actions,
        prior_outcomes=prior_outcomes,
    )


def _merge_unique_strings(left: list[str], right: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in [*left, *right]:
        text = str(value).strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(text)
    return output


def _context_has_signal(context: HistoricalLearningContextResponse) -> bool:
    if context.features:
        return True
    if context.feature_provenance:
        return True
    if context.similar_detections:
        return True
    return context.quality.eligible_count > 0


def _merge_related_detections(
    *,
    existing_related: list[dict[str, Any]],
    historical_similar: list[HistoricalSimilarDetectionResponse],
) -> list[dict[str, Any]]:
    if not existing_related and not historical_similar:
        return []

    merged: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for item in existing_related:
        key = _related_detection_key(item)
        if key not in merged:
            merged[key] = dict(item)
            continue
        merged[key] = _prefer_related_detection(merged[key], item)

    for item in historical_similar:
        candidate = {
            "detection_id": item.detection_id,
            "rule_family": item.rule_family,
            "rule_id": item.rule_id,
            "relation_type": item.relation_type,
            "observed_at": item.observed_at.isoformat(),
            "confidence": item.confidence,
        }
        key = _related_detection_key(candidate)
        if key not in merged:
            merged[key] = candidate
            continue
        merged[key] = _prefer_related_detection(merged[key], candidate)

    output = list(merged.values())
    output.sort(
        key=lambda item: (
            _parse_datetime(item.get("observed_at")) or datetime.min.replace(tzinfo=timezone.utc),
            _float_or_default(item.get("confidence"), 0.0),
            str(item.get("detection_id", "")),
        ),
        reverse=True,
    )
    return output


def _coerce_float_map(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}
    output: dict[str, float] = {}
    for key, raw in value.items():
        text_key = str(key).strip()
        if not text_key:
            continue
        try:
            output[text_key] = float(raw)
        except (TypeError, ValueError):
            continue
    return output


def _coerce_feature_provenance(value: Any) -> list[HistoricalFeatureProvenanceItemResponse]:
    if not isinstance(value, list):
        return []
    output: list[HistoricalFeatureProvenanceItemResponse] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        try:
            output.append(HistoricalFeatureProvenanceItemResponse.model_validate(item))
        except Exception:
            continue
    return output


def _coerce_similar_detections(value: Any) -> list[HistoricalSimilarDetectionResponse]:
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


def _coerce_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _coerce_related_detection_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [dict(item) for item in value if isinstance(item, dict)]


def _related_detection_key(item: dict[str, Any]) -> tuple[str, str, str, str]:
    detection_id = str(item.get("detection_id", "")).strip()
    rule_family = str(item.get("rule_family", "")).strip().lower()
    rule_id = str(item.get("rule_id", "")).strip()
    observed_at = str(item.get("observed_at", "")).strip()
    return detection_id, rule_family, rule_id, observed_at


def _prefer_related_detection(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
    left_confidence = _float_or_default(left.get("confidence"), 0.0)
    right_confidence = _float_or_default(right.get("confidence"), 0.0)
    left_observed = _parse_datetime(left.get("observed_at")) or datetime.min.replace(tzinfo=timezone.utc)
    right_observed = _parse_datetime(right.get("observed_at")) or datetime.min.replace(tzinfo=timezone.utc)
    if (right_confidence, right_observed) > (left_confidence, left_observed):
        return dict(right)
    return dict(left)


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _float_or_default(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


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

