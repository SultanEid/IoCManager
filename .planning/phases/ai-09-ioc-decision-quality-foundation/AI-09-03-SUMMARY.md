# AI-09-03 Summary: IOC-Specific Metrics and Promotion Gates

## Status

Complete - 2026-04-26

## What Changed

- Extended decision evaluation rows with predicted verdict, source metadata, severity, table confidence, age bucket, evidence tier, label provenance, scan-evidence availability, and weak-evidence flags.
- Added IOC-specific metrics for likely-malicious precision, weak-evidence rate, confidence distribution, Brier/calibration output, abstain behavior, and required slice reporting.
- Added required slices for source name/type, severity, table-confidence bucket, age bucket, evidence tier, label provenance, and scan-evidence availability.
- Hardened promotion gates so publishing requires IOC evaluation metadata, required IOC slices, likely-malicious precision, protected false-positive/stale coverage, calibration/Brier thresholds, and bounded abstain behavior for high-quality attribute-only rows.
- Updated evaluation and publish tests to cover required slices and unsafe promotion failures.

## Files Changed

New phase work:

- `Workspace/Project/ai/service/decision_service/evaluation_metrics.py`
- `Workspace/Project/ai/service/decision_service/evaluator.py`
- `Workspace/Project/ai/service/decision_service/contracts.py`
- `Workspace/Project/ai/service/decision_service/promotion_gates.py`
- `Workspace/Project/ai/jobs/evaluate_model.py`
- `Workspace/Project/ai/service/tests/test_evaluator.py`
- `Workspace/Project/ai/service/tests/test_evaluate_model_job.py`
- `Workspace/Project/ai/service/tests/test_train_and_publish_jobs.py`
- `Workspace/Project/docs/ai-sidecar-operator-workflows.md`
- `Workspace/Project/docs/ai-decision-system-reference.md`

Pre-existing user work integrated:

- None.

Pre-existing user/generated work left untouched:

- Artifact registry changes under `Workspace/Project/ai/service/artifacts/`.
- Untracked external feed and dataset job scripts not required by this plan.

## Validation

- Focused AI-9 test run included `tests/test_evaluator.py`, `tests/test_evaluate_model_job.py`, and `tests/test_train_and_publish_jobs.py`.
- Full AI sidecar test suite passed: `333 passed`.
- Repository boundary check passed.

## Residual Risk

- Gate thresholds are conservative defaults. They should be tuned only after the reviewed IOC evaluation set grows beyond fixtures.
