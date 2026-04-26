---
phase: AI-3
plan: 1
title: "Data quality report contract and retention policy"
type: implementation
wave: 1
depends_on: [AI-2]
files_modified:
  - Workspace/Project/ai/service/decision_service/decision_dataset_builder.py
  - Workspace/Project/ai/service/tests/test_decision_dataset_builder.py
  - Workspace/Project/ai/schemas/decision-dataset-quality-report.schema.json
  - Workspace/Project/ai/datasets/README.md
autonomous: true
requirements_addressed: [AI-03]
---

# AI-3 Plan: Data Quality Report Contract and Retention Policy

<objective>
Make existing decision dataset builds expose the quality/provenance fields required by the AI roadmap, without retraining the model or rewriting active artifacts.
</objective>

<tasks>
- Add explicit quality-report fields for source distribution, label distribution, partial-row rate, rejection reasons, provenance coverage, parser diagnostics, and split leakage assertions.
- Add a JSON schema for the quality report and validate it in dataset-builder tests.
- Document dataset retention boundaries for manifests, raw source snapshots, processed datasets, generated reports, and active runtime artifacts.
</tasks>

<verification>
```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest tests/test_decision_dataset_builder.py tests/test_source_adapters.py tests/test_snapshots.py tests/test_ai_schema_contracts.py
Pop-Location
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
</verification>
