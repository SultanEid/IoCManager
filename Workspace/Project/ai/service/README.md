# IoC Manager AI Sidecar

FastAPI sidecar used by IoC Manager as a human-governed security decision assistant.

It is responsible for:

- report extraction
- decision support
- manual-only action-plan recommendation
- offline evaluation utilities

This sidecar is part of the IoC Manager decision workflow. It is not an autonomous response engine and it is not the product's core backend.

In practice, it helps the app:

- score detections and IOC context
- explain why a decision was produced
- surface uncertainty and false-positive pressure directly
- recommend safe, policy-constrained next actions
- add similar historical context where available

## Documentation
Subsystem documentation lives under `docs`:

- [AI Decision Overview](../../docs/ai-decision-overview.md)
- [AI Decision System Reference](../../docs/ai-decision-system-reference.md)
- [Verdict Taxonomy](../../docs/verdict-taxonomy.md)
- [Action Plan Policy](../../docs/action-plan-policy.md)
- [Dataset Sources](../../docs/dataset-sources.md)
- [AI Model Pipeline](../../docs/ai-model-pipeline.md)

## Current Model Pipeline
The sidecar currently uses a deterministic `BaselineScorer`, not a neural network model. Feature extraction lives in `decision_service/scorer.py`; calibration and thresholds are loaded from `artifacts/model_registry.json`; dataset metadata is loaded from `artifacts/dataset_registry.json`; processed snapshots live under `../datasets/processed`.

The active model registry entry points to model version `v1-unified-supervised-v1-cv5-20260426060214` and dataset version `unified-supervised-v1`.

High-level inference flow:
1. FastAPI receives a request in `decision_service/api.py`.
2. Pydantic contracts in `decision_service/contracts.py` validate payloads.
3. Historical-learning context is merged when available.
4. `BaselineScorer.score_case()` computes feature scores and calibrated decision signals.
5. `decision_service/decision_support.py` builds a grounded, manual-only operator decision.

High-level training flow:
1. Raw and fixture inputs are staged under `../datasets/raw` and `../fixtures`.
2. Dataset jobs normalize records into processed snapshots under `../datasets/processed/<dataset-version>`.
3. `decision_service/snapshots.py` loads snapshots and builds training examples.
4. `../jobs/train_baseline_cv.py` fits calibration and thresholds.
5. Model artifacts are written under `artifacts/models/<model-version>` and registered in `artifacts/model_registry.json`.

## Endpoint Support Status

| Route | Status | Production notes |
|-------|--------|------------------|
| `GET /health` | active | Exposes model/dataset metadata and sanitized runtime warning codes. |
| `POST /extract_report` | active | Preferred report extraction route. |
| `POST /ingest_report` | compatibility alias | Alias for `POST /extract_report`. |
| `POST /scan_analyst` | active | Bounded scan-plan recommendation route. |
| `POST /historical_learning/query` | active | Historical-learning lookup route. |
| `POST /score_case` | deprecated compatibility | Kept for merged-app compatibility while preferred backend contracts settle. |
| `POST /score_batch` | deprecated compatibility | Request body and item count are bounded by configuration. |
| `POST /recommend_action` | deprecated compatibility | Kept for existing clients; decisions remain manual-only. |
| `POST /request_more_evidence` | deprecated compatibility | Kept for existing clients. |
| `POST /feedback` | deprecated compatibility | Appends local JSONL feedback; see persistence notes below. |
| `POST /evaluate_model` | development-only gated | Enabled by default only for development/local/test settings; production-like settings require explicit opt-in. |
| `POST /graph_neighbors` | deprecated compatibility | Legacy graph candidate scoring. |
| `POST /graph/link_candidates` | deprecated compatibility | Alias for legacy graph candidate scoring. |
| `POST /explain_case` | deprecated compatibility | Legacy explanation route. |

## Safety Model
- runtime decisions may abstain
- action plans are always manual-only
- disruptive actions are capped when confidence is low or evidence is weak
- enrichment degradation should not crash the service
- analyst override remains authoritative

## Configuration
Environment variables are read directly via `os.getenv`. Copy `.env.example` and set only values you need.

Backend integration defaults:

- Backend `AiSidecar:BaseUrl` -> `http://localhost:8100`
- Backend `AiSidecar:ReportExtractionPath` -> `/extract_report`

If the sidecar runs on a different URL/path, set backend env overrides:

- `AISIDECAR__BASEURL`
- `AISIDECAR__REPORTEXTRACTIONPATH`
- `AISIDECAR__TIMEOUTSECONDS`

Action-policy matrix configuration:

- `CTI_SIDECAR_ACTION_POLICY_MATRIX_PATH` with default `ai/service/artifacts/action_policy_matrix.v1.json`

Runtime guard configuration:

- `IOC_MANAGER_AI_MAX_SCORE_BATCH_ITEMS` or `CTI_SIDECAR_MAX_SCORE_BATCH_ITEMS` bounds `/score_batch` item count.
- `IOC_MANAGER_AI_MAX_EXPENSIVE_REQUEST_BODY_BYTES` or `CTI_SIDECAR_MAX_EXPENSIVE_REQUEST_BODY_BYTES` bounds expensive JSON request bodies.
- `IOC_MANAGER_AI_ENABLE_HTTP_MODEL_EVALUATION` or `CTI_SIDECAR_ENABLE_HTTP_MODEL_EVALUATION` controls `/evaluate_model`. Development, local, and test environments default to enabled; production-like environments default to disabled.

Optional phrasing assist remains bounded by deterministic outputs:

- `CTI_ENABLE_LLM_ASSIST`
- `CTI_LLM_ASSIST_PROVIDER`
- `CTI_LLM_ASSIST_MODEL`
- `CTI_LLM_ASSIST_TIMEOUT_MS`

## Local Persistence Notes

- Model and dataset registries are full JSON documents and are saved through same-directory temporary files plus atomic replace.
- Feedback events are append-only JSONL records. The local store serializes writes within one process and keeps every line as standalone JSON.
- The JSONL feedback store does not provide cross-process locking; use a durable external store before running multiple sidecar processes against the same feedback file.

## Run
```bash
pip install -e .
uvicorn decision_service.main:app --host 0.0.0.0 --port 8100
```

## Offline Jobs
Offline jobs live under `ai/jobs`:

| Job | Status | Smoke coverage | Notes |
|-----|--------|----------------|-------|
| `build_decision_dataset.py` | supported | `tests/test_build_decision_dataset_job.py` | Fixture-sized dataset build into temp directories. |
| `run_evaluation_harness.py` | supported | `tests/test_evaluation_harness_job.py` | JSONL and action-plan report smoke coverage. |
| `export_scored_decision_rows.py` | supported | `tests/test_export_scored_decision_rows_job.py` | Exports scored rows for evaluation harness input. |
| `inventory_datasets.py` | supported | `tests/test_inventory_datasets_job.py` | Dataset inventory reporting. |
| `probe_live_ioc_decisions.py` | supported utility | `tests/test_probe_live_ioc_decisions_job.py` | Requires a live backend when run outside tests. |
| `stage_reliable_source_exports.py` | supported staging utility | `tests/test_stage_reliable_source_exports_job.py` | Uses temp outputs in tests; real runs stage source exports. |
| `evaluate_model.py` | experimental | none | Use from a controlled developer shell until job-level smoke coverage is added. |
| `train_baseline.py` | experimental | none | Reproducible training workflow is planned for AI-4. |
| `train_baseline_cv.py` | experimental | none | Reproducible training workflow is planned for AI-4. |
| `publish_model.py` | experimental | none | Promotion gates are planned for AI-5. |
| Other feed/review/build scripts under `ai/jobs` | experimental | varies | Treat as draft or network/data-dependent unless this table marks them supported. |

See [AI Model Pipeline](../../docs/ai-model-pipeline.md) before changing model, dataset, training, or evaluation behavior.

