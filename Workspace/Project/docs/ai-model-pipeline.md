# AI Model Pipeline

**Last updated:** 2026-04-26

This document is the Phase AI-1 baseline for the IOC Manager AI sidecar. It
describes the current model, inference flow, training flow, data pipeline,
artifacts, and known weak points so future enhancement work starts from the
actual system shape rather than assumptions.

## Current Model

The active AI sidecar is a Python FastAPI service under
`Workspace/Project/ai/service`. The current model is not a neural network. It is
a deterministic decision-support scorer with:

- hand-authored feature extraction in
  `Workspace/Project/ai/service/decision_service/scorer.py`
- calibration logic in
  `Workspace/Project/ai/service/decision_service/calibration.py`
- threshold and calibration metadata stored in
  `Workspace/Project/ai/service/artifacts/model_registry.json`
- grounded decision assembly in
  `Workspace/Project/ai/service/decision_service/decision_support.py`
- scanner-family adjudication in
  `Workspace/Project/ai/service/decision_service/yara_decision.py`,
  `Workspace/Project/ai/service/decision_service/sigma_decision.py`, and
  `Workspace/Project/ai/service/decision_service/snort_decision.py`

The active model version in the registry is
`v1-unified-supervised-v1-cv5-20260426060214`, trained against dataset
`unified-supervised-v1`.

## Runtime Entry Points

The sidecar ASGI entry point is
`Workspace/Project/ai/service/decision_service/main.py`, which exposes the app
created by `create_app()` in
`Workspace/Project/ai/service/decision_service/api.py`.

Runtime setup in `create_app()` builds a `ServiceRuntime` that holds:

- `ServiceSettings` from `Workspace/Project/ai/service/decision_service/config.py`
- `SnapshotLoader` for versioned datasets
- `ModelRegistryStore`
- `DatasetRegistryStore`
- `FeedbackStore`
- `HistoricalLearningEngine`
- active `BaselineScorer`
- active model and dataset registry entries

The sidecar defaults to port `8100` when started by:

```powershell
Push-Location Workspace/Project/ai/service
uvicorn decision_service.main:app --host 127.0.0.1 --port 8100
Pop-Location
```

## Inference Flow

### Score Case

1. A caller sends a `ScoreCaseRequest` contract from
   `Workspace/Project/ai/service/decision_service/contracts.py`.
2. `api.py` optionally enriches the request with historical learning from
   `HistoricalLearningEngine`.
3. `BaselineScorer.score_case()` builds a feature vector and computes
   maliciousness, actionability, deployability, decay, uncertainty, and blast
   radius.
4. `build_grounded_decision()` converts diagnostics into a human-governed
   decision response with verdict, safety rationale, evidence, and suggested
   next steps.
5. The response includes model version, dataset version, feature snapshot hash,
   reason codes, evidence gaps, and grounded decision metadata.

### Batch Score

`POST /score_batch` validates and scores each item independently. The endpoint
is deprecated compatibility surface and now has config-backed item-count and
request-body limits. Timeout and broader deployment memory controls remain part
of deployment readiness work.

### Report Extraction

`POST /extract_report` calls
`Workspace/Project/ai/service/decision_service/extraction.py`. Extraction is
primarily deterministic and includes text normalization, regex/JSON extraction,
prompt-injection detection, citation snippets, confidence partitioning, and
abstain reasons. Optional LLM fallback is controlled by environment variables
and must remain deterministic-fallback safe.

### Historical Learning

Feedback events are written through
`Workspace/Project/ai/service/decision_service/feedback_store.py`. Similarity
and context features are built by
`Workspace/Project/ai/service/decision_service/historical_learning.py`.

## Active API Surface

| Route | Current status | Purpose |
|-------|----------------|---------|
| `GET /health` | active | service, model, dataset, and feature-schema metadata |
| `POST /extract_report` | active | deterministic report extraction |
| `POST /ingest_report` | alias | report extraction compatibility alias |
| `POST /scan_analyst` | active | bounded scan-plan recommendation |
| `POST /historical_learning/query` | active | historical-learning lookup |
| `POST /score_case` | deprecated | score one case |
| `POST /score_batch` | deprecated, bounded | score multiple cases with item-count and request-size limits |
| `POST /recommend_action` | deprecated | grounded action recommendation |
| `POST /request_more_evidence` | deprecated | evidence request recommendation |
| `POST /feedback` | deprecated | append feedback event |
| `POST /evaluate_model` | development-only gated | evaluate a model from the sidecar process when explicitly enabled |
| `POST /graph_neighbors` | deprecated | compatibility graph candidate scoring |
| `POST /graph/link_candidates` | deprecated | compatibility graph candidate scoring |
| `POST /explain_case` | deprecated | compatibility explanation endpoint |

Deprecated endpoints may still be required by merged-app compatibility paths.
`/score_batch` is bounded by runtime configuration. `/evaluate_model` defaults
to enabled only in development/local/test environments and should stay disabled
in production-like settings unless a controlled operator workflow explicitly
opts in.

## Data Pipeline

Dataset work lives under `Workspace/Project/ai/datasets`.

| Area | Path | Purpose |
|------|------|---------|
| Manifests | `Workspace/Project/ai/datasets/manifests` | source metadata, parser dispatch, provenance requirements |
| Raw data | `Workspace/Project/ai/datasets/raw` | local staged external and internal source snapshots |
| Processed data | `Workspace/Project/ai/datasets/processed` | versioned datasets and evaluation outputs |
| Fixtures | `Workspace/Project/ai/fixtures` | local examples for YARA, Sigma, Snort, behavior, and labels |
| Schemas | `Workspace/Project/ai/schemas` | JSON schema contracts for packages, labels, and evaluation reports |

Current supported or staged source families include:

- `threatfox`
- `urlhaus`
- `malwarebazaar`
- `yaraify`
- `sigmahq`
- `snort-community`
- `et-open-suricata`
- `internal-clean-baselines`
- `internal-allowlists`
- `internal-reviewed-telemetry`
- `analyst-closures`
- `app-db`
- `majestic-million`

`vx-underground` is present as a deferred source until parser support is ready.

## Dataset Build Flow

1. Source manifests define source identity, local paths, parser names, and
   provenance expectations.
2. Source adapters in
   `Workspace/Project/ai/service/decision_service/source_adapters.py` normalize
   supported source records.
3. Dataset builders in
   `Workspace/Project/ai/service/decision_service/decision_dataset_builder.py`
   create canonical rows, task rows, split files, split manifests, and quality
   reports.
4. Processed snapshot builders write `manifest.json`, `observables.csv`,
   `detections.csv`, `outcomes.csv`, and `source_trust.csv`.
5. `SnapshotLoader` in `Workspace/Project/ai/service/decision_service/snapshots.py`
   loads snapshots into pandas DataFrames.
6. `build_training_examples()` turns snapshots into labeled examples based on
   observables, detections, outcomes, source trust, and a label horizon.

The active processed dataset is
`Workspace/Project/ai/datasets/processed/unified-supervised-v1`.

## Training Flow

The primary training path is job-based:

1. Build or select a processed dataset version.
2. Load the dataset through `SnapshotLoader`.
3. Build training examples with `build_training_examples()`.
4. Run `Workspace/Project/ai/jobs/train_baseline_cv.py`.
5. The job uses a held-out test split and stratified cross-validation.
6. The job fits calibration and thresholds around the deterministic scorer.
7. The job writes model artifacts under
   `Workspace/Project/ai/service/artifacts/models/<model-version>`.
8. The job upserts a model entry in
   `Workspace/Project/ai/service/artifacts/model_registry.json`.
9. `Workspace/Project/ai/jobs/publish_model.py` promotes a candidate to active.

Important current limitation: dependency versions are lower-bounded in
`Workspace/Project/ai/service/pyproject.toml` but are not locked. Later phases
should add a constraints or lock workflow before relying on reproducibility.

## Model and Dataset Artifacts

| Artifact | Path | Notes |
|----------|------|-------|
| Model registry | `Workspace/Project/ai/service/artifacts/model_registry.json` | model versions, status, metrics, thresholds, calibration, hashes |
| Dataset registry | `Workspace/Project/ai/service/artifacts/dataset_registry.json` | dataset version, manifest path/hash, source files |
| Action policy matrix | `Workspace/Project/ai/service/artifacts/action_policy_matrix.v1.json` | allowed manual actions by verdict/risk/context |
| Active model artifacts | `Workspace/Project/ai/service/artifacts/models/v1-unified-supervised-v1-cv5-20260426060214` | calibration, thresholds, metrics, CV report |

Current portability issue: registry files contain local absolute Windows paths.
Later phases should normalize these to repo-relative or artifact-root-relative
paths and validate artifact hashes before loading or promoting models.

## Evaluation Flow

Evaluation code is already present but should become stricter before promotion
is trusted.

| File | Purpose |
|------|---------|
| `Workspace/Project/ai/jobs/evaluate_model.py` | evaluates a registry model against a dataset snapshot |
| `Workspace/Project/ai/jobs/run_evaluation_harness.py` | offline decision/action-plan evaluation over JSONL or canonical rows |
| `Workspace/Project/ai/jobs/export_scored_decision_rows.py` | exports scored rows for harness input |
| `Workspace/Project/ai/jobs/benchmark_fixture_decisions.py` | fixture-level benchmark checks |
| `Workspace/Project/ai/service/decision_service/evaluation_metrics.py` | precision, recall, F1, PR-AUC, calibration, confusion, safety metrics |
| `Workspace/Project/ai/service/decision_service/evaluator.py` | snapshot evaluation orchestration |
| `Workspace/Project/ai/service/decision_service/eval_framework.py` | generic offline evaluation framework |
| `Workspace/Project/ai/service/decision_service/action_plan_evaluator.py` | action-plan quality and safety metrics |

## Job Support Status

| Job | Status | Smoke coverage | Notes |
|-----|--------|----------------|-------|
| `Workspace/Project/ai/jobs/build_decision_dataset.py` | supported | `tests/test_build_decision_dataset_job.py` | Fixture-sized dataset build into temp directories. |
| `Workspace/Project/ai/jobs/run_evaluation_harness.py` | supported | `tests/test_evaluation_harness_job.py` | JSONL and action-plan report smoke coverage. |
| `Workspace/Project/ai/jobs/export_scored_decision_rows.py` | supported | `tests/test_export_scored_decision_rows_job.py` | Evaluation row export. |
| `Workspace/Project/ai/jobs/inventory_datasets.py` | supported | `tests/test_inventory_datasets_job.py` | Dataset inventory reporting. |
| `Workspace/Project/ai/jobs/probe_live_ioc_decisions.py` | supported utility | `tests/test_probe_live_ioc_decisions_job.py` | Requires a live backend when run outside tests. |
| `Workspace/Project/ai/jobs/stage_reliable_source_exports.py` | supported staging utility | `tests/test_stage_reliable_source_exports_job.py` | Real runs stage source exports; tests use temp outputs. |
| `Workspace/Project/ai/jobs/evaluate_model.py` | experimental | none | Prefer controlled developer use until job smoke coverage exists. |
| `Workspace/Project/ai/jobs/train_baseline.py` | experimental | none | AI-4 owns reproducible training workflow. |
| `Workspace/Project/ai/jobs/train_baseline_cv.py` | experimental | none | AI-4 owns reproducible training workflow. |
| `Workspace/Project/ai/jobs/publish_model.py` | experimental | none | AI-5 owns promotion gates before production use. |

Any other feed, review, or build script under `Workspace/Project/ai/jobs` should
be treated as experimental unless this table marks it supported. Network fetch
jobs and newly drafted job scripts are excluded from required validation gates
until they have fixture-sized smoke coverage.

The active model reports very high precision, recall, and PR-AUC on the current
held-out data. Treat this as a signal to audit leakage, source overlap, label
policy, and time-window separation before production reliance.

## Known Weak Points

| Risk | Current evidence | Later roadmap phase |
|------|------------------|---------------------|
| Deployment-grade route controls | `/score_batch` has config limits and `/evaluate_model` is gated, but timeout/auth/process controls remain | AI-8 |
| No sidecar service authentication in app routes | `api.py` exposes routes without an app-level service auth dependency | AI-2, AI-8 |
| Unlocked dependencies | `pyproject.toml` uses lower bounds instead of a lock/constraints workflow | AI-4 |
| Non-portable registry paths | model and dataset registries contain local absolute paths | AI-4 |
| Large parser/data modules | `source_adapters.py` and `decision_dataset_builder.py` are high-change-risk modules | AI-3, AI-6 |
| Evaluation promotion not enforced | evaluation exists, but model promotion gates need stronger checks | AI-5 |
| Filesystem concurrency | registry saves use atomic replace; JSONL feedback is only locked within one process | AI-8 |
| Deployment packaging missing | no dedicated sidecar deployment package was identified | AI-8 |

## Fast Validation

Run the sidecar test suite from the service root:

```powershell
Push-Location Workspace/Project/ai/service
python -m pip install -e ".[dev]"
pytest
Pop-Location
```

Run the repository boundary check from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
