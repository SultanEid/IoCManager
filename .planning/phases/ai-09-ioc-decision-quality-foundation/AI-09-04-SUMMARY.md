# AI-09-04 Summary: Shadow-Mode Live IOC Scoring and Analyst Review Loop

## Status

Complete - 2026-04-26

## What Changed

- Added a read-only shadow scoring job for IOC table exports.
- The job writes a machine-readable report with verdict distribution, confidence bands, false-positive risk bands, weak-evidence counts, abstain counts, slices, and highlight sections for analyst review.
- The job masks IOC values by default and can emit JSONL review stubs compatible with the IOC evaluation-row schema, plus an optional CSV review table.
- Added shadow-mode tests for deterministic output, read-only/manual-only report metadata, masking, required highlights, and schema-valid review stubs.
- Documented the shadow-mode workflow, review loop, and how reviewed rows feed back into evaluation labels.

## Files Changed

New phase work:

- `Workspace/Project/ai/jobs/shadow_score_ioc_table.py`
- `Workspace/Project/ai/service/tests/test_shadow_score_ioc_table_job.py`
- `Workspace/Project/docs/ai-sidecar-operator-workflows.md`
- `Workspace/Project/docs/ai-decision-system-reference.md`

Pre-existing user work integrated:

- None.

Pre-existing user/generated work left untouched:

- Artifact registry changes under `Workspace/Project/ai/service/artifacts/`.
- Untracked external feed and dataset job scripts not required by this plan.

## Validation

- Focused AI-9 test run included `tests/test_shadow_score_ioc_table_job.py` and `tests/test_ioc_evaluation_dataset_job.py`.
- Full AI sidecar test suite passed: `333 passed`.
- Repository boundary check passed.

## Residual Risk

- Shadow output is intentionally advisory. It should be reviewed by analysts before rows become promoted evaluation labels or training data.
