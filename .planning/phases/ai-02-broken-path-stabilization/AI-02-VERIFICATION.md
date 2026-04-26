---
phase: AI-2
status: passed
verified: 2026-04-26
---

# AI-2 Verification: Broken Path Stabilization

## Result

Status: passed

AI-2 stabilized the known fragile AI sidecar paths without changing scorer math, training outputs, or active model artifacts.

## Must-Have Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Deprecated or compatibility endpoints have support policy and production restriction plan | PASS | `Workspace/Project/ai/service/README.md` endpoint support table; `Workspace/Project/docs/ai-model-pipeline.md` active API table |
| `/score_batch` has item-count and payload-size limits | PASS | `ServiceSettings.max_score_batch_items`, `ServiceSettings.max_expensive_request_body_bytes`, API middleware and route guard, tests in `test_api.py` |
| `/evaluate_model` is disabled/authenticated/development-only in production settings | PASS | `ServiceSettings.enable_http_model_evaluation`, production-disabled API test |
| Registry and feedback writes use safe file-write behavior | PASS | Atomic model/dataset registry saves; feedback JSONL same-process append tests and docs |
| Broad exception handling is reviewed and surfaced safely | PASS | Dataset snapshot load degradation emits `dataset_snapshot_load_failed` warning code through `/health` without exception/path detail |
| Referenced jobs have smoke tests or experimental labels | PASS | Sidecar/model-pipeline job support matrices; existing job smoke tests included in focused run |

## Automated Checks

```powershell
$env:PYTHONPATH=(Get-Location).Path
pytest tests/test_api.py tests/test_api_runtime_guards.py tests/test_registry.py tests/test_dataset_registry.py tests/test_historical_learning.py
```

Result: `43 passed`

```powershell
$env:PYTHONPATH=(Get-Location).Path
$jobTests = Get-ChildItem tests -Filter '*job*.py' | ForEach-Object { $_.FullName }
pytest tests/test_api.py tests/test_api_runtime_guards.py tests/test_registry.py tests/test_dataset_registry.py tests/test_historical_learning.py $jobTests
```

Result: `57 passed`

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

Result: passed

## Validation Notes

- Initial pytest without `PYTHONPATH` failed because `decision_service` was not importable in the shell.
- The documented editable install command failed with the Python 3.10 `pip` available as `python`; pytest itself was using Python 3.13.
- `PyYAML` was installed into the Python 3.13 interpreter used by pytest so existing job smoke tests could import `stage_reliable_source_exports.py`.

## Remaining Risk

- Full sidecar authentication, timeout/process controls, artifact path portability, reproducible training, and promotion gates remain assigned to later roadmap phases.
- Existing unrelated working-tree edits remain outside this phase and were not verified as AI-2 changes.
