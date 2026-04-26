# AI Model Enhancement Roadmap

**Created:** 2026-04-26
**Updated:** 2026-04-26
**Source:** `.planning/codebase/AI_MODEL_MAP.md`
**Scope:** `Workspace/Project/ai`, especially `Workspace/Project/ai/service`

## Roadmap Goal

Enhance the existing IOC Manager AI sidecar into a well-understood, tested, reproducible, and deployment-ready model service. The current model is a deterministic decision-support scorer with calibration and registry artifacts, not a deep learning model. This roadmap keeps the current human-governed safety model intact while improving code quality, broken/incomplete paths, data preprocessing, evaluation quality, reproducible training/inference, tests, documentation, and deployment readiness.

## Priority Order

1. Understand and document the current model pipeline.
2. Fix broken, incomplete, or misleading code paths before adding model complexity.
3. Improve data preprocessing, provenance, and split quality.
4. Make training and inference reproducible from scripts and documented commands.
5. Improve evaluation metrics and enforce model promotion gates.
6. Expand tests around high-risk model, data, and API behavior.
7. Document operator/developer usage.
8. Package the sidecar for reliable deployment.

## Phase Overview

| # | Phase | Goal | Primary Focus |
|---|-------|------|---------------|
| AI-1 | Pipeline Understanding Baseline | Make the current model, data, training, inference, and artifact flow explicit. | discovery, docs |
| AI-2 | Broken Path Stabilization | Fix incomplete or fragile code paths before deeper model work. | code quality, reliability |
| AI-3 | Data Preprocessing and Provenance | Strengthen raw-to-processed dataset quality, validation, and traceability. | data pipeline |
| AI-4 | Reproducible Training and Inference | Provide deterministic scripts and artifact workflows for local and CI use. | reproducibility |
| AI-5 | Evaluation Metrics and Promotion Gates | Improve metrics, slice analysis, leakage checks, and model release gates. | evaluation |
| AI-6 | Test Expansion and Contract Safety | Add targeted tests for model, data, job, API, and registry risks. | testing |
| AI-7 | Usage Documentation | Document model usage, data refresh, training, inference, evaluation, and troubleshooting. | docs |
| AI-8 | Deployment Readiness | Package and harden the sidecar for production operation. | deployment |

## Phase Status

| Phase | Status | Evidence |
|-------|--------|----------|
| AI-1 | Complete - 2026-04-26 | `Workspace/Project/docs/ai-model-pipeline.md`, README links, `.planning/phases/ai-01-pipeline-understanding-baseline/AI-01-EXECUTION.md` |
| AI-2 | Complete - 2026-04-26 | Runtime guards, atomic registry writes, feedback safety tests, job support labels, `.planning/phases/ai-02-broken-path-stabilization/AI-02-VERIFICATION.md` |
| AI-3 | Complete - 2026-04-26 | Quality report contract, dataset retention policy, `.planning/phases/ai-03-data-preprocessing-and-provenance/AI-03-VERIFICATION.md` |
| AI-4 | Pending | Not started |
| AI-5 | Pending | Not started |
| AI-6 | Pending | Not started |
| AI-7 | Pending | Not started |
| AI-8 | Pending | Not started |

## Phase Details

### AI-1: Pipeline Understanding Baseline

**Goal:** Establish a canonical understanding of how the AI project works today.

**Likely Areas:**

- `.planning/codebase/AI_MODEL_MAP.md`
- `Workspace/Project/ai/README.md`
- `Workspace/Project/ai/service/README.md`
- `Workspace/Project/ai/datasets/README.md`
- `Workspace/Project/ai/jobs`
- `Workspace/Project/ai/service/decision_service/api.py`
- `Workspace/Project/ai/service/decision_service/scorer.py`

**Success Criteria:**

1. Current inference flow is documented from API request to scorer to grounded decision response.
2. Current training flow is documented from raw/fixture inputs to processed dataset to calibration/threshold artifacts.
3. Current data inventory lists raw feeds, manifests, processed datasets, active dataset, and active model.
4. Current model registry and dataset registry semantics are documented, including active/candidate model behavior.
5. Known weak points are listed with file paths and risk labels.

**Validation:**

- Documentation review against `.planning/codebase/AI_MODEL_MAP.md`.
- No code behavior change required.

### AI-2: Broken Path Stabilization

**Goal:** Remove known broken, incomplete, or misleading behavior before adding new model features.

**Likely Areas:**

- `Workspace/Project/ai/service/decision_service/api.py`
- `Workspace/Project/ai/service/decision_service/config.py`
- `Workspace/Project/ai/service/decision_service/registry.py`
- `Workspace/Project/ai/service/decision_service/dataset_registry.py`
- `Workspace/Project/ai/service/decision_service/feedback_store.py`
- `Workspace/Project/ai/jobs/*.py`
- `Workspace/Project/ai/service/tests/test_api.py`
- `Workspace/Project/ai/service/tests/test_registry.py`
- `Workspace/Project/ai/service/tests/test_dataset_registry.py`

**Success Criteria:**

1. Deprecated or compatibility endpoints have an explicit support policy and production restriction plan.
2. `/score_batch` has item-count and payload-size limits.
3. `/evaluate_model` is disabled, authenticated, or explicitly development-only in production settings.
4. Registry and feedback writes use safe file-write behavior, preferably atomic replace for registry documents.
5. Broad exception handling is reviewed; intentionally degraded paths are logged or surfaced without leaking secrets.
6. Any job scripts referenced by docs have smoke tests or a clear "experimental" label.

**Validation:**

```powershell
Push-Location Workspace/Project/ai/service
pytest tests/test_api.py tests/test_registry.py tests/test_dataset_registry.py
Pop-Location
```

### AI-3: Data Preprocessing and Provenance

**Goal:** Make dataset construction reliable enough for production model evaluation.

**Likely Areas:**

- `Workspace/Project/ai/service/decision_service/source_adapters.py`
- `Workspace/Project/ai/service/decision_service/decision_dataset_builder.py`
- `Workspace/Project/ai/service/decision_service/snapshots.py`
- `Workspace/Project/ai/jobs/build_unified_supervised_dataset.py`
- `Workspace/Project/ai/jobs/stage_reliable_source_exports.py`
- `Workspace/Project/ai/jobs/review_strict_labels.py`
- `Workspace/Project/ai/datasets/manifests`
- `Workspace/Project/ai/schemas`

**Success Criteria:**

1. Every dataset build writes a quality report with label distribution, source distribution, partial-row rate, rejection reasons, provenance coverage, and split leakage assertions.
2. Preprocessing validates manifests and input records before writing processed outputs.
3. Train/validation/test splits prevent group leakage by IOC, rule family, and task-specific grouping keys.
4. Label review artifacts are schema-validated and linked to the dataset manifest.
5. Dataset retention policy distinguishes raw source, staged source, processed snapshots, generated reports, and active runtime artifacts.

**Validation:**

```powershell
Push-Location Workspace/Project/ai/service
pytest tests/test_decision_dataset_builder.py tests/test_source_adapters.py tests/test_snapshots.py tests/test_ai_schema_contracts.py
Pop-Location
```

### AI-4: Reproducible Training and Inference

**Goal:** Make a developer or CI runner able to reproduce training, artifact creation, and inference with stable commands.

**Likely Areas:**

- `Workspace/Project/ai/service/pyproject.toml`
- new dependency constraints or lock workflow under `Workspace/Project/ai/service`
- `Workspace/Project/ai/jobs/train_baseline.py`
- `Workspace/Project/ai/jobs/train_baseline_cv.py`
- `Workspace/Project/ai/jobs/publish_model.py`
- `Workspace/Project/ai/jobs/evaluate_model.py`
- `Workspace/Project/ai/jobs/probe_live_ioc_decisions.py`
- `Workspace/Project/ai/service/artifacts/model_registry.json`
- `Workspace/Project/ai/service/artifacts/dataset_registry.json`

**Success Criteria:**

1. Runtime and dev dependencies are pinned through a constraints or lock workflow.
2. A documented training command can rebuild a candidate model from a named dataset version.
3. A documented publish command can promote a candidate model only after required validation.
4. A documented inference smoke command can score a sample request using the active model.
5. Registry artifact paths are repo-relative or artifact-root-relative, not local absolute paths.
6. Artifact hashes are validated before loading or promoting a model.

**Validation:**

```powershell
Push-Location Workspace/Project/ai/service
python -m pip install -e ".[dev]"
pytest tests/test_build_decision_dataset_job.py tests/test_evaluation_harness_job.py tests/test_probe_live_ioc_decisions_job.py
Pop-Location
```

### AI-5: Evaluation Metrics and Promotion Gates

**Goal:** Improve model-quality evidence and prevent weak or suspicious models from becoming active.

**Likely Areas:**

- `Workspace/Project/ai/service/decision_service/evaluation_metrics.py`
- `Workspace/Project/ai/service/decision_service/evaluator.py`
- `Workspace/Project/ai/service/decision_service/eval_framework.py`
- `Workspace/Project/ai/service/decision_service/action_plan_evaluator.py`
- `Workspace/Project/ai/jobs/evaluate_model.py`
- `Workspace/Project/ai/jobs/run_evaluation_harness.py`
- `Workspace/Project/ai/jobs/publish_model.py`

**Success Criteria:**

1. Evaluation includes precision, recall, F1, PR-AUC, calibration error, Brier score, abstain rate, coverage, false-positive rate, false-negative rate, unsafe recommendation rate, analyst override rate, and rollback rate where labels support them.
2. Evaluation includes slice metrics for source system, IOC type, scanner family, recency bucket, trust bucket, and evidence availability.
3. Promotion gates define minimum acceptable metrics and maximum acceptable safety regressions.
4. High-score sanity checks flag possible leakage, source overlap, time-window leakage, or overly separable synthetic data.
5. Evaluation bundles include input hashes, dataset manifest hash, registry entry hash, thresholds, command metadata, and calibration bins.
6. `publish_model.py` refuses promotion when evaluation artifacts are missing or fail gates.

**Validation:**

```powershell
Push-Location Workspace/Project/ai/service
pytest tests/test_evaluator.py tests/test_eval_framework.py tests/test_validation_framework.py tests/test_action_plan_evaluator.py
Pop-Location
```

### AI-6: Test Expansion and Contract Safety

**Goal:** Convert the current test suite into a stronger safety net for model, data, job, and API changes.

**Likely Areas:**

- `Workspace/Project/ai/service/tests`
- `Workspace/Project/ai/schemas`
- `Workspace/Project/ai/fixtures`
- `Workspace/Project/ai/service/decision_service/contracts.py`
- `Workspace/Project/ai/service/decision_service/scorer.py`
- `Workspace/Project/ai/service/decision_service/decision_support.py`
- `Workspace/Project/ai/service/decision_service/yara_decision.py`
- `Workspace/Project/ai/service/decision_service/sigma_decision.py`
- `Workspace/Project/ai/service/decision_service/snort_decision.py`

**Success Criteria:**

1. Golden tests cover representative scorer outputs for benign, suspicious, malicious, insufficient-evidence, false-positive, and stale/revoked cases.
2. API contract tests protect response aliases and required frontend/backend fields.
3. Job smoke tests cover dataset build, evaluation harness, model training dry-run or fixture-sized run, publish refusal, and probe scripts.
4. Regression tests cover oversized requests, malformed payloads, missing registry files, bad artifact hashes, and unavailable optional OpenAI integration.
5. Test documentation states which tests are fast PR-gate tests and which are heavier offline/model tests.

**Validation:**

```powershell
Push-Location Workspace/Project/ai/service
pytest
Pop-Location
```

### AI-7: Usage Documentation

**Goal:** Make the AI project usable by a new developer or operator without reverse-engineering scripts.

**Likely Areas:**

- `Workspace/Project/ai/README.md`
- `Workspace/Project/ai/service/README.md`
- `Workspace/Project/ai/datasets/README.md`
- `Workspace/Project/docs/ai-decision-overview.md`
- `Workspace/Project/docs/ai-decision-system-reference.md`
- `Workspace/Project/docs/validation.md`

**Success Criteria:**

1. README documents local setup, Python version, dependency install, test command, and sidecar start command.
2. Usage docs explain scoring, report extraction, scan analyst recommendations, historical learning, feedback, and model evaluation.
3. Training docs include dataset build, training, evaluation, and publish commands with expected inputs/outputs.
4. Troubleshooting docs cover missing artifacts, dataset registry mismatch, sidecar startup failure, dependency install failure, and optional OpenAI fallback.
5. Environment variable docs list names and behavior without exposing or requesting secret values.

**Validation:**

- Follow docs from a clean shell through install, test, sidecar start, and one inference smoke command.
- Run repository boundary check from `Workspace/Project/scripts/check-repository-boundaries.ps1`.

### AI-8: Deployment Readiness

**Goal:** Prepare the sidecar to run safely beside the backend in a production-like environment.

**Likely Areas:**

- `Workspace/Project/ai/service/decision_service/api.py`
- `Workspace/Project/ai/service/decision_service/config.py`
- `Workspace/Project/ai/service/decision_service/feedback_store.py`
- `Workspace/Project/ai/service/decision_service/historical_learning.py`
- `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`
- deployment files to add under `Workspace/Project/ai` or `Workspace/Project/deploy`
- `.github/workflows/validation.yml`

**Success Criteria:**

1. Deployment packaging defines Python version, install command, runtime command, port, health check, environment variables, and artifact mount paths.
2. Health endpoints distinguish liveness from readiness, including artifact/registry readability.
3. Sidecar access is protected by private ingress or explicit backend-to-sidecar authentication.
4. Request limits, timeout expectations, and memory boundaries are documented and tested.
5. Safe metrics/logging expose timing, result counts, errors, and readiness without logging secrets or sensitive IOC payloads.
6. CI runs sidecar install, pytest, secret scan, and selected model/data validation checks.

**Validation:**

```powershell
Push-Location Workspace/Project/ai/service
python -m pip install -e ".[dev]"
pytest
uvicorn decision_service.main:app --host 127.0.0.1 --port 8100
Pop-Location
```

Run the sidecar smoke check in a separate shell or automated script once the server is started.

## Cross-Phase Constraints

- Keep recommendations manual-only and human-governed.
- Preserve deterministic fallback when optional OpenAI features are disabled or unavailable.
- Do not read or print `.env` files or secret values.
- Do not turn generated dataset churn into accidental source churn.
- Keep backend behavior graceful when the sidecar is unavailable, slow, or rejects oversized requests.
- Treat model and dataset registry changes as deliberate, reviewed artifacts.

## Requirements Traceability

| Existing Requirement | Roadmap Coverage |
|----------------------|------------------|
| `AI-01` sidecar workload limits | AI-2, AI-8 |
| `AI-02` dependency locking | AI-4, AI-8 |
| `AI-03` auditable model/dataset registry | AI-3, AI-4, AI-5 |
| `AI-04` optional OpenAI secret-safe config | AI-2, AI-7, AI-8 |
| Code quality and broken path repair | AI-2, AI-6 |
| Evaluation improvement | AI-5 |
| Data preprocessing improvement | AI-3 |
| Reproducible training/inference | AI-4 |
| Usage documentation | AI-7 |
| Deployment readiness | AI-8 |

## Recommended Next Step

Start with **AI-1: Pipeline Understanding Baseline** if the team needs shared orientation, then immediately execute **AI-2: Broken Path Stabilization** before changing scoring logic or data generation. This order avoids optimizing evaluation or training around endpoints, scripts, or registries that may still be unsafe or misleading.
