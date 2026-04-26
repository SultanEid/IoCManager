# AI-5 Execution: Evaluation Metrics and Promotion Gates

**Date:** 2026-04-26
**Status:** Complete

## Changed

- Added `decision_service.promotion_gates` with default model promotion thresholds.
- Updated `evaluate_model.py` to write promotion-gate metadata, input hashes, snapshot manifest hash, command metadata, and required slice coverage into evaluation reports and bundles.
- Updated `publish_model.py` to require an evaluation report by default and refuse promotion when gates fail.
- Kept explicit recovery flags for controlled local use: `--skip-artifact-validation` and `--skip-promotion-gates`.
- Added evaluation job coverage for gate metadata and required slices.
- Expanded publish job tests to cover successful gate pass and failed-gate refusal.
- Updated AI model pipeline and sidecar usage docs.

## Integrated Pre-existing Work

- Existing dirty scanner-evidence/backend files were preserved and left unstaged. They are API/scoring behavior work and will be handled in later phases.
- Existing generated local model/dataset registry edits were preserved and left unstaged. AI-5 changed promotion policy and evaluation artifacts, not local generated registry content.

## Validation

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest tests/test_evaluator.py tests/test_eval_framework.py tests/test_validation_framework.py tests/test_action_plan_evaluator.py tests/test_evaluate_model_job.py tests/test_train_and_publish_jobs.py
.\.venv\Scripts\python.exe -m pytest
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

Results:

- Focused AI-5 pytest: 28 passed.
- Full AI sidecar pytest: 306 passed.
- Repository boundary guard: passed.
