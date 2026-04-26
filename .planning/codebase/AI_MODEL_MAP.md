# AI Model Project Map

**Analysis Date:** 2026-04-26
**Scope:** `Workspace/Project/ai`, with runtime focus on `Workspace/Project/ai/service`

## Executive Summary

The AI project is a Python 3.11+ FastAPI sidecar for IOC Manager. It is not a deep learning service in its current form. The active model is a deterministic IOC decision scorer (`BaselineScorer`) with hand-authored feature extraction, threshold-based decision states, and persisted calibration/threshold metadata. Training jobs build versioned datasets, tune calibration and thresholds with scikit-learn, write model artifacts, and publish entries to a filesystem-backed model registry.

The system has useful operational scaffolding: Pydantic API contracts, offline dataset builders, model and dataset registries, evaluation bundles, 33 pytest files, and 257 detected tests. The main production-readiness gaps are request bounding, service authentication, dependency locking, artifact portability, dataset/evaluation governance, filesystem concurrency, and several large modules that are hard to maintain safely.

## Active Roots

| Area | Path | Role |
|------|------|------|
| Sidecar package | `Workspace/Project/ai/service` | FastAPI app, runtime scorer, contracts, tests, and deploy script |
| Runtime modules | `Workspace/Project/ai/service/decision_service` | API endpoints, scoring, extraction, evaluation, registries, historical learning, scanner-family decision logic |
| Offline jobs | `Workspace/Project/ai/jobs` | Dataset build, feed staging, model training, model evaluation, registry publishing, live probes |
| Dataset workspace | `Workspace/Project/ai/datasets` | Raw feeds, manifests, processed snapshots, evaluation outputs |
| Fixtures and schemas | `Workspace/Project/ai/fixtures`, `Workspace/Project/ai/schemas` | Example packages, JSON schemas, labels, validation fixtures |
| Runtime artifacts | `Workspace/Project/ai/service/artifacts` | Model registry, dataset registry, action policy matrix, model artifact bundles |
| Tests | `Workspace/Project/ai/service/tests` | pytest coverage for API, scorer, calibration, dataset builder, jobs, contracts, historical learning, adapters |

## Technology Stack

Runtime dependencies are declared in `Workspace/Project/ai/service/pyproject.toml`:

- `fastapi>=0.115.0`
- `uvicorn>=0.30.0`
- `pydantic>=2.8.0`
- `numpy>=1.26.0`
- `pandas>=2.2.0`
- `scikit-learn>=1.5.0`
- `PyYAML>=6.0.2`

Dev dependencies:

- `pytest>=8.0.0`
- `httpx>=0.27.0`
- `jsonschema>=4.23.0`

Important constraint: dependency versions are lower-bounded but not locked. This means repeatable installs are not guaranteed across machines or CI runs.

## Runtime Architecture

### Entry Points

- `Workspace/Project/ai/service/decision_service/main.py` exposes `app = create_app()`.
- `Workspace/Project/ai/service/decision_service/api.py` creates the FastAPI application and captures a `ServiceRuntime` object in route closures.
- `Workspace/Project/ai/service/start-sidecar.ps1` starts the local sidecar on Windows.

### Runtime Composition

`create_app()` calls `_build_runtime()` in `Workspace/Project/ai/service/decision_service/api.py`. Runtime construction:

1. Loads settings from `Workspace/Project/ai/service/decision_service/config.py`.
2. Ensures `artifacts_root` exists.
3. Builds a `SnapshotLoader` for versioned datasets.
4. Opens filesystem-backed `ModelRegistryStore` and `DatasetRegistryStore`.
5. Opens `FeedbackStore` for historical-learning events.
6. Builds `HistoricalLearningEngine` with bounded `top_k`, lookback, and decay settings.
7. Resolves an active model registry entry.
8. Loads the configured or registry-linked dataset snapshot when available.
9. Builds a `BaselineScorer` using active thresholds and calibration metadata.

### API Surface

Active and compatibility routes live in `Workspace/Project/ai/service/decision_service/api.py`:

| Route | Status | Purpose |
|-------|--------|---------|
| `GET /health` | active | Service, model, dataset, and feature-schema health metadata |
| `POST /extract_report` | active | Deterministic report extraction |
| `POST /ingest_report` | alias | Alias for report extraction |
| `POST /scan_analyst` | active | Bounded scan-plan recommendation, optional OpenAI refinement |
| `POST /historical_learning/query` | active | Similarity and historical-learning lookup |
| `POST /score_case` | deprecated | Score one IOC/case request |
| `POST /score_batch` | deprecated | Score multiple IOC/case requests |
| `POST /recommend_action` | deprecated | Build grounded action decision |
| `POST /request_more_evidence` | deprecated | Build evidence-request decision |
| `POST /feedback` | deprecated | Append feedback event |
| `POST /evaluate_model` | deprecated | Evaluate a model against a dataset snapshot |
| `POST /graph_neighbors` | deprecated | Compatibility graph candidate scoring |
| `POST /graph/link_candidates` | deprecated | Compatibility graph candidate scoring |
| `POST /explain_case` | deprecated | Compatibility explanation endpoint |

### Model Shape

The active scorer is `BaselineScorer` in `Workspace/Project/ai/service/decision_service/scorer.py`.

It builds a `FeatureVector` with these high-level signals:

- IOC lexical suspicion
- rule severity
- scanner agreement
- host criticality and asset exposure
- source trust
- temporal freshness
- sightings
- graph signal
- evidence conflict
- external source signal
- provider confidence
- indicator strength
- enrichment strength
- activity
- benign context
- heuristic noise

The raw score is a fixed weighted sum. The score is calibrated through `LogisticCalibrator` from `Workspace/Project/ai/service/decision_service/calibration.py`, then converted into decision state using thresholds from `ScoringThresholds` or model registry metadata.

Decision enrichment happens mostly in:

- `Workspace/Project/ai/service/decision_service/decision_support.py`
- `Workspace/Project/ai/service/decision_service/action_plan_recommender.py`
- `Workspace/Project/ai/service/decision_service/action_policy_matrix.py`
- `Workspace/Project/ai/service/decision_service/promotion_suppression_engine.py`
- `Workspace/Project/ai/service/decision_service/evidence_fusion.py`
- `Workspace/Project/ai/service/decision_service/historical_learning.py`

Scanner-family adjudication uses separate deterministic modules:

- `Workspace/Project/ai/service/decision_service/yara_decision.py`
- `Workspace/Project/ai/service/decision_service/sigma_decision.py`
- `Workspace/Project/ai/service/decision_service/snort_decision.py`

## Inference Flow

### Score Case Flow

1. Caller sends a `ScoreCaseRequest` contract from `Workspace/Project/ai/service/decision_service/contracts.py`.
2. API route optionally enriches the request with historical learning via `_build_effective_request_with_historical_learning()`.
3. `BaselineScorer.score_case()` builds features and scores maliciousness, actionability, deployability, decay, uncertainty, and blast radius.
4. `build_grounded_decision()` converts diagnostics into an operator-safe decision with verdict, evidence, safety rails, and action guidance.
5. Response includes model version, dataset version, feature snapshot hash, reason codes, evidence gaps, and grounded decision metadata.

### Batch Flow

`POST /score_batch` loops over `request.items`, validates each item independently, and returns per-item success or failure. Current weak point: there is no explicit item-count, payload-size, runtime, or memory limit inside the route.

### Report Extraction Flow

`POST /extract_report` calls `extract_report()` in `Workspace/Project/ai/service/decision_service/extraction.py`. Extraction is primarily deterministic with regex, JSON, PDF-text, HTML/text normalization, prompt-injection detection, citation snippets, abstain reasons, and optional LLM fallback controlled by environment variables.

### Historical Learning Flow

Feedback events are stored through `FeedbackStore` in `Workspace/Project/ai/service/decision_service/feedback_store.py`. `HistoricalLearningEngine` in `Workspace/Project/ai/service/decision_service/historical_learning.py` builds context from prior accepted actions, outcomes, similarity profiles, rule family, indicators, behavior patterns, network destinations, and closure patterns.

## Training Flow

The primary model training path is job-based, not part of the HTTP runtime.

1. Raw and fixture inputs are staged under `Workspace/Project/ai/datasets/raw` and `Workspace/Project/ai/fixtures`.
2. Source manifests under `Workspace/Project/ai/datasets/manifests` describe import sources.
3. Dataset builders normalize records into versioned processed datasets under `Workspace/Project/ai/datasets/processed/<dataset-version>`.
4. Snapshot files contain at least `manifest.json`, `observables.csv`, `detections.csv`, `outcomes.csv`, and `source_trust.csv`.
5. `SnapshotLoader` loads a dataset into pandas DataFrames.
6. `build_training_examples()` creates label examples from observables, detections, outcomes, source trust, and a label horizon.
7. `Workspace/Project/ai/jobs/train_baseline_cv.py` runs a stratified holdout split plus StratifiedKFold CV.
8. `_train_scorer()` fits calibration and thresholds around the deterministic scorer.
9. Training writes model artifacts and upserts a `ModelRegistryEntry`.
10. `Workspace/Project/ai/jobs/publish_model.py` promotes a model version to active.

The active registry entry points to model version `v1-unified-supervised-v1-cv5-20260426060214` trained on dataset `unified-supervised-v1`.

## Data Pipeline

### Source Categories

Dataset sources are represented by manifests and raw files:

- Abuse.ch feeds: `threatfox`, `urlhaus`, `malwarebazaar`
- Rule sources: `sigmahq`, `snort-community`, `et-open-suricata`
- YARA-related source: `yaraify`
- Internal negative sources: `internal-clean-baselines`, `internal-allowlists`
- Internal reviewed data: `internal-reviewed-telemetry`, `analyst-closures`, `app-db`
- Benign domain source: `majestic-million`
- Deferred or partially supported: `vx-underground`

### Important Pipeline Code

- `Workspace/Project/ai/service/decision_service/source_adapters.py` adapts external source records. It is the largest service module at about 4,097 lines.
- `Workspace/Project/ai/service/decision_service/decision_dataset_builder.py` builds canonical rows, task rows, train/validation/test splits, split manifests, and quality reports.
- `Workspace/Project/ai/service/decision_service/snapshots.py` loads processed snapshots and creates training examples.
- `Workspace/Project/ai/jobs/build_unified_supervised_dataset.py` combines strict labels, external feeds, benign domains, and app DB exports.
- `Workspace/Project/ai/jobs/stage_reliable_source_exports.py` stages official/reliable source exports.
- `Workspace/Project/ai/jobs/review_strict_labels.py` supports label review.

### Processed Dataset Inventory

Detected processed datasets with manifests:

| Dataset | Rows | Notes |
|---------|------|-------|
| `external-seed-v1` | 25 | early external seed |
| `external-seed-v2` | 47 | early external seed |
| `reliable-mix-v1` | 267 | reliable mixed sources |
| `reliable-mix-v2` | 279 | reliable mixed sources |
| `reliable-mix-v3` | 297 | reliable mixed sources |
| `reliable-mix-v4` | 7321 | larger reliable mixed source |
| `strict-labeled-v1` | 4063 | strict labeled snapshot |
| `strict-labeled-v2` | 4087 | strict labeled snapshot |
| `strict-labeled-v3` | 3000 | strict labeled snapshot |
| `strict-labeled-v4` | 1800 | strict labeled snapshot |
| `strict-labeled-v5` | 1800 | strict labeled snapshot with label review artifacts |
| `strict-labeled-v6` | 2746 | strict labeled snapshot |
| `unified-supervised-v1` | 5178 | active supervised dataset |

## Model Files and Artifacts

Runtime artifacts live under `Workspace/Project/ai/service/artifacts`:

| Artifact | Path | Purpose |
|----------|------|---------|
| Model registry | `Workspace/Project/ai/service/artifacts/model_registry.json` | Active/candidate model versions, metrics, thresholds, calibration, artifact hashes |
| Dataset registry | `Workspace/Project/ai/service/artifacts/dataset_registry.json` | Dataset version, manifest path/hash, source files |
| Action policy matrix | `Workspace/Project/ai/service/artifacts/action_policy_matrix.v1.json` | Allowed actions by verdict, confidence bucket, false-positive risk, criticality, object type |
| Active model directory | `Workspace/Project/ai/service/artifacts/models/v1-unified-supervised-v1-cv5-20260426060214` | Calibration, thresholds, metrics, CV report |
| Calibration artifact | `.../calibration.json` | Logistic/isotonic-style calibration payload consumed by runtime |
| Threshold artifact | `.../thresholds.json` | `recommend`, `escalate`, and `abstain` thresholds |
| Metrics artifact | `.../metrics.json` | CV summary and held-out test metrics |
| CV report | `.../cv_report.json` | Per-fold metrics and thresholds |

Weak point: the registries currently contain absolute Windows paths to artifact and dataset files. These are auditable locally but not portable across machines, containers, CI, or production hosts.

## Evaluation Scripts

| Script | Purpose |
|--------|---------|
| `Workspace/Project/ai/jobs/evaluate_model.py` | Evaluates a registry model version against a dataset snapshot and writes report bundles |
| `Workspace/Project/ai/jobs/run_evaluation_harness.py` | Offline decision/action-plan evaluation over JSONL or canonical rows |
| `Workspace/Project/ai/jobs/benchmark_fixture_decisions.py` | Fixture-level benchmark for expected decisions |
| `Workspace/Project/ai/jobs/export_scored_decision_rows.py` | Exports scored rows for evaluation harness input |
| `Workspace/Project/ai/jobs/probe_live_ioc_decisions.py` | Probes live/current decision requests against the model |
| `Workspace/Project/ai/service/decision_service/evaluation_metrics.py` | Precision/recall/F1/PR-AUC, calibration, confusion, unsafe rate, override/rollback metrics |
| `Workspace/Project/ai/service/decision_service/evaluator.py` | Snapshot-to-metric orchestration |
| `Workspace/Project/ai/service/decision_service/eval_framework.py` | Generic offline evaluation framework and baseline comparison |
| `Workspace/Project/ai/service/decision_service/action_plan_evaluator.py` | Action-plan exact/usefulness/acceptance/safety metrics |
| `Workspace/Project/ai/service/decision_service/evaluation_artifacts.py` | Report bundle, calibration CSV/JSON, run manifest, hashing helpers |

The active model registry reports very high held-out metrics for `unified-supervised-v1`: precision `1.0`, recall about `0.9963`, PR-AUC about `0.9999`, calibration error about `0.0009`, abstain rate about `0.4826`, and coverage about `0.5174`.

Interpretation risk: such high scores are possible on synthetic, narrow, or highly separable data, but they should be treated as a governance signal to audit leakage, source overlap, label policy, time splits, and real-world generalization before production reliance.

## Test Coverage

Detected sidecar tests:

- 33 `test_*.py` files under `Workspace/Project/ai/service/tests`
- 257 detected `test_` functions/classes

Major covered areas:

- API behavior: `tests/test_api.py`
- Pydantic contracts and schema compatibility: `tests/test_contracts.py`, `tests/test_ai_schema_contracts.py`
- Scoring and calibration: `tests/test_scorer.py`, `tests/test_calibration.py`
- YARA/Sigma/Snort decision logic: `tests/test_yara_decision.py`, `tests/test_sigma_decision.py`, `tests/test_snort_decision.py`
- Dataset building and registries: `tests/test_decision_dataset_builder.py`, `tests/test_dataset_registry.py`, `tests/test_registry.py`
- Evaluation framework: `tests/test_evaluator.py`, `tests/test_eval_framework.py`, `tests/test_validation_framework.py`
- Offline jobs: `tests/test_build_decision_dataset_job.py`, `tests/test_evaluation_harness_job.py`, `tests/test_export_scored_decision_rows_job.py`, `tests/test_inventory_datasets_job.py`, `tests/test_probe_live_ioc_decisions_job.py`, `tests/test_stage_reliable_source_exports_job.py`
- Historical learning: `tests/test_historical_learning.py`, `tests/test_historical_learning_api.py`
- LLM-assisted phrasing: `tests/test_llm_assist_phrasing.py`, `tests/test_explanation.py`

Validation entry point from `Workspace/Project/docs/validation.md`:

```powershell
Push-Location Workspace/Project/ai/service
python -m pip install -e ".[dev]"
pytest
Pop-Location
```

## Dependencies and Integrations

### Backend Integration

The ASP.NET backend reaches the sidecar through typed integration clients:

- `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`
- `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiReportExtractionClient.cs`
- `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiScanAnalystClient.cs`

Default sidecar URL is documented as `http://localhost:8100`.

### Optional OpenAI Integration

Optional OpenAI use appears in:

- `Workspace/Project/ai/service/decision_service/scan_analyst.py`
- `Workspace/Project/ai/service/decision_service/llm_assist_phrasing.py`
- `Workspace/Project/ai/service/decision_service/extraction.py`
- `Workspace/Project/ai/service/decision_service/config.py`

Relevant environment variable names are documented without values:

- `OPENAI_API_KEY`
- `IOC_MANAGER_OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `IOC_MANAGER_OPENAI_BASE_URL`
- `IOC_MANAGER_AI_SCAN_ANALYST_MODEL`
- `IOC_MANAGER_OPENAI_MODEL`
- `IOC_MANAGER_OPENAI_TIMEOUT_SECONDS`
- `OPENAI_TIMEOUT_SECONDS`
- `CTI_ENABLE_LLM_ASSIST`
- `CTI_LLM_ASSIST_PROVIDER`
- `CTI_LLM_ASSIST_MODEL`
- `CTI_LLM_ASSIST_TIMEOUT_MS`
- `CTI_ENABLE_LLM_FALLBACK`
- `CTI_LLM_FALLBACK_PROVIDER`

No `.env` files were read for this map.

## Largest Maintenance Hotspots

| File | Approx. lines | Concern |
|------|---------------|---------|
| `Workspace/Project/ai/service/decision_service/source_adapters.py` | 4097 | Very large adapter module, high risk for parser drift and hidden coupling |
| `Workspace/Project/ai/service/decision_service/decision_dataset_builder.py` | 1906 | Dataset normalization, splitting, quality checks, and file output concentrated in one module |
| `Workspace/Project/ai/service/decision_service/decision_support.py` | 1831 | Core decision orchestration and safety logic concentrated in one file |
| `Workspace/Project/ai/service/decision_service/snort_decision.py` | 1153 | Large family-specific feature and verdict logic |
| `Workspace/Project/ai/service/decision_service/action_plan_recommender.py` | 1123 | Large action recommendation and policy orchestration |
| `Workspace/Project/ai/service/decision_service/contracts.py` | 1007 | Broad API contract file with many response/request models |
| `Workspace/Project/ai/service/decision_service/historical_learning.py` | 987 | Non-trivial similarity and provenance logic |
| `Workspace/Project/ai/service/decision_service/scorer.py` | 980 | Core score math and feature extraction in one module |

## Weak Points

### Security and Boundary Weaknesses

- Sidecar routes do not show explicit service authentication in `Workspace/Project/ai/service/decision_service/api.py`.
- Deprecated write/evaluation routes remain callable: `/feedback`, `/score_batch`, `/evaluate_model`.
- Optional local `.env` loading exists in `Workspace/Project/ai/service/decision_service/config.py`; this is useful for development but needs a clear production policy and secret-handling boundary.
- Optional OpenAI paths must preserve deterministic fallback and avoid logging request secrets or sensitive IOC payloads.

### Reliability Weaknesses

- Filesystem-backed registries and feedback stores do not appear to have cross-process locking or atomic replace semantics.
- Runtime loads active registries and datasets at app startup, so artifact changes are not clearly hot-reloadable or transactionally swapped.
- Batch scoring and evaluation can be CPU/memory-heavy and lack route-level limits.
- Broad `except Exception` patterns exist in several modules; some are intentional degradation paths, but they can hide data-quality or provider failures.

### Evaluation Weaknesses

- Reported metrics are extremely high and should be audited for leakage, source overlap, fixture memorization, target leakage, and time-split validity.
- Current training flow calibrates a deterministic weighted scorer rather than training a fully learned feature model; roadmap language should reflect that.
- Evaluation exists, but production gates are not yet enforced as release criteria.
- Slice-level thresholds for source system, IOC type, family, recency, trust, and evidence availability should become promotion blockers.

### Data Pipeline Weaknesses

- Processed datasets and raw data are filesystem-heavy and partially generated; governance around what is source, derived, and disposable needs to remain explicit.
- Registries contain absolute paths, reducing portability.
- Source adapters are centralized in a very large module, making it harder to reason about parser-specific invariants.
- Dataset row quality, provenance completeness, partial row rate, and split leakage need durable CI checks.

### Performance Weaknesses

- FastAPI routes are synchronous functions doing CPU-bound scoring/evaluation and filesystem reads/writes.
- `/score_batch` loops serially.
- Evaluation and dataset loading use pandas in-process.
- Historical learning similarity can grow with feedback volume unless bounded/indexed.

### Deployment Weaknesses

- No sidecar Dockerfile, service manifest, health/readiness split, or production process model was detected in the AI root.
- Dependency locking is missing.
- Artifact registry paths are local-machine absolute paths.
- Service authentication, ingress policy, and backend-to-sidecar identity are not implemented in the sidecar itself.

## Recommended Validation Commands

Focused AI validation:

```powershell
Push-Location Workspace/Project/ai/service
python -m pip install -e ".[dev]"
pytest
Pop-Location
```

Repository boundary validation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

Full fast gate is documented in `Workspace/Project/docs/validation.md`.

