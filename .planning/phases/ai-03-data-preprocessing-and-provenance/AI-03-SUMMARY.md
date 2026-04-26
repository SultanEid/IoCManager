---
phase: AI-3
plan: 1
title: "Data quality report contract and retention policy"
status: complete
completed: 2026-04-26
requirements-completed: [AI-03]
key-files:
  modified:
    - Workspace/Project/ai/service/decision_service/decision_dataset_builder.py
    - Workspace/Project/ai/service/tests/test_decision_dataset_builder.py
    - Workspace/Project/ai/datasets/README.md
  created:
    - Workspace/Project/ai/schemas/decision-dataset-quality-report.schema.json
    - Workspace/Project/ai/schemas/label-review-artifact.schema.json
---

# AI-3 Summary: Data Quality Report Contract and Retention Policy

## What Changed

- Extended decision dataset quality reports with explicit `sourceDistribution`, `labelDistribution`, `provenanceCoverage`, `splitLeakageAssertions`, and `rejectionReasons` fields.
- Added `decision-dataset-quality-report.schema.json` so quality reports have a schema contract.
- Added `label-review-artifact.schema.json` and a dataset manifest `labelReviewArtifacts` link point for future reviewed-label bundles.
- Updated dataset-builder tests to validate generated quality reports against the schema and assert the roadmap-required quality/provenance fields are present.
- Documented dataset retention and provenance boundaries for manifests, raw staged sources, processed outputs, quality reports, generated outputs, and active runtime artifacts.

## Validation

- `.\.venv\Scripts\python.exe -m pytest tests/test_decision_dataset_builder.py tests/test_source_adapters.py tests/test_snapshots.py tests/test_ai_schema_contracts.py` - `61 passed`
- `powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1` - passed

## Deviations from Plan

- No separate source adapter logic was changed. Existing adapter and dataset-builder tests already covered manifest parsing, input normalization, provenance preservation, and split isolation; this phase made the generated quality contract explicit instead of rewriting the pipeline.

## Remaining Risk

- This phase did not rebuild or promote datasets.
- Label-review job hardening remains partly dependent on the user-draft job scripts currently untracked in the worktree, but dataset manifests now have a schema-backed link point for reviewed-label bundles.
- Broader leakage auditing and promotion blocking remain assigned to AI-5.
