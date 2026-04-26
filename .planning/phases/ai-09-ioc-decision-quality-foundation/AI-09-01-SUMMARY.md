# AI-09-01 Summary: IOC Decision Tiers and Evaluation Dataset Foundation

## Status

Complete - 2026-04-26

## What Changed

- Added a JSON schema for IOC evaluation rows with required evidence tier, label provenance, expected verdict, confidence band, and review fields.
- Added small source-controlled IOC evaluation fixtures covering benign, suspicious, likely malicious, stale, false-positive, weak-evidence, and analyst-outcome cases.
- Added a deterministic IOC evaluation dataset builder that normalizes fixture or app-export rows, masks IOC values by default, hashes IOC values, samples by IOC metadata, and writes a machine-readable report.
- Extended schema and dataset job tests to validate fixtures, required fields, masking behavior, deterministic sampling, and app-export normalization.
- Documented IOC decision tiers and confidence-band semantics for analysts and operators.

## Files Changed

New phase work:

- `Workspace/Project/ai/schemas/ioc-evaluation-row.schema.json`
- `Workspace/Project/ai/fixtures/ioc_evaluation/golden_ioc_rows.jsonl`
- `Workspace/Project/ai/jobs/build_ioc_evaluation_dataset.py`
- `Workspace/Project/ai/service/tests/test_ioc_evaluation_dataset_job.py`
- `Workspace/Project/ai/service/tests/test_ai_schema_contracts.py`
- `Workspace/Project/ai/datasets/README.md`
- `Workspace/Project/docs/ai-decision-system-reference.md`

Pre-existing user work integrated:

- None.

Pre-existing user/generated work left untouched:

- Existing artifact registry changes under `Workspace/Project/ai/service/artifacts/`.
- Untracked external feed and dataset job scripts not required by this plan.

## Validation

- Focused AI-9 test run included `tests/test_ioc_evaluation_dataset_job.py` and `tests/test_ai_schema_contracts.py`.
- Full AI sidecar test suite passed: `333 passed`.
- Repository boundary check passed.

## Residual Risk

- The fixture set is intentionally small. Real quality improvement still depends on analyst-reviewed IOC table labels being added through the documented review flow.
