---
phase: AI-9
plan: 1
title: "IOC decision tiers and evaluation dataset foundation"
type: implementation
wave: 1
depends_on: [AI-8]
files_modified:
  - Workspace/Project/ai/schemas/ioc-evaluation-row.schema.json
  - Workspace/Project/ai/fixtures/ioc_evaluation/
  - Workspace/Project/ai/jobs/build_ioc_evaluation_dataset.py
  - Workspace/Project/ai/service/tests/test_ioc_evaluation_dataset_job.py
  - Workspace/Project/docs/ai-decision-system-reference.md
autonomous: true
requirements_addressed: [AI-03]
context_decisions: [D-AI9-01, D-AI9-02, D-AI9-06]
---

# Plan AI-09-01: IOC Decision Tiers and Evaluation Dataset Foundation

<objective>
Create the durable label policy, schema, fixtures, and dataset-builder job needed to evaluate IOC-table decisions instead of tuning scorer behavior by feel.
</objective>

<context>
- Phase context: `.planning/phases/ai-09-ioc-decision-quality-foundation/AI-09-CONTEXT.md`
- Research: `.planning/phases/ai-09-ioc-decision-quality-foundation/AI-09-RESEARCH.md`
- AI map: `.planning/codebase/AI_MODEL_MAP.md`
- Active sidecar: `Workspace/Project/ai/service`
</context>

<must_haves>
<truths>
- The model remains analyst decision support, not autonomous response.
- Attribute-only IOC rows may produce useful verdicts, but confidence must be capped and weak evidence must remain visible.
- Labels must preserve provenance so analyst outcomes, trusted feeds, weak labels, and synthetic fixtures are not treated as equal.
- Large generated datasets must remain untracked unless explicitly approved as small fixtures.
- Do not read or print `.env` files or secrets.
</truths>
<acceptance>
- An IOC evaluation-row JSON schema exists and validates all source-controlled IOC eval fixtures.
- Small fixture rows cover benign, malicious, suspicious, stale, false-positive, and weak-evidence examples.
- A dataset-builder job can sample or transform IOC rows into machine-readable evaluation rows using temp/output paths.
- The job masks or hashes raw IOC values by default when writing review reports.
- Documentation explains the IOC decision tiers and expected confidence semantics.
</acceptance>
</must_haves>

<threat_model>
<threat id="T-AI9-01-01" severity="high">
Live IOC export can leak sensitive indicators or operational details into logs, git, or reports.
</threat>
<mitigation>
Default generated reports to masked values and stable hashes. Never print connection strings, secrets, or `.env` contents. Keep large exports under generated dataset paths excluded from source.
</mitigation>
<verification>
Tests assert report rows mask IOC values by default and repository boundary checks do not flag generated artifacts as active source.
</verification>

<threat id="T-AI9-01-02" severity="high">
Weak labels can make evaluation metrics appear stronger than production behavior.
</threat>
<mitigation>
Require `label_provenance`, `evidence_tier`, review status, and confidence band in every row.
</mitigation>
<verification>
Schema validation rejects rows missing provenance, evidence tier, expected verdict, or confidence band.
</verification>
</threat_model>

<tasks>
<task id="AI9-01-01" type="auto">
<title>Define IOC decision tier schema</title>
<files>
- `Workspace/Project/ai/schemas/ioc-evaluation-row.schema.json`
- `Workspace/Project/docs/ai-decision-system-reference.md`
</files>
<action>
Create a schema for IOC evaluation rows with required fields for example id, IOC type, masked value or value hash, source metadata, severity/confidence, age bucket, evidence tier, label provenance, expected verdict, expected confidence band, and review metadata.
</action>
<verify>
Add schema tests that validate all fixtures and reject missing tier/provenance/confidence-band fields.
</verify>
</task>

<task id="AI9-01-02" type="auto">
<title>Add representative IOC evaluation fixtures</title>
<files>
- `Workspace/Project/ai/fixtures/ioc_evaluation/*.jsonl`
- `Workspace/Project/ai/service/tests/test_ioc_evaluation_dataset_job.py`
</files>
<action>
Add small fixture-backed examples for benign, likely benign, suspicious, likely malicious, stale/revoked, false-positive, and insufficient-evidence IOC cases across domain, URL, IP, hash, process, and artifact types.
</action>
<verify>
Fixtures validate against the schema and are small enough for source control.
</verify>
</task>

<task id="AI9-01-03" type="auto">
<title>Create IOC evaluation dataset builder</title>
<files>
- `Workspace/Project/ai/jobs/build_ioc_evaluation_dataset.py`
- `Workspace/Project/ai/service/tests/test_ioc_evaluation_dataset_job.py`
</files>
<action>
Create a job that accepts fixture input or app-export input and writes JSONL evaluation rows. The job must support sampling by IOC type, severity, source, confidence bucket, age bucket, evidence availability, and label provenance. Use temp-directory tests and do not require live database access in pytest.
</action>
<verify>
Tests run the job against fixture data and assert deterministic ordering, schema-valid output, masking behavior, and sampling buckets.
</verify>
</task>

<task id="AI9-01-04" type="auto">
<title>Document tier and label policy</title>
<files>
- `Workspace/Project/docs/ai-decision-system-reference.md`
- `Workspace/Project/ai/datasets/README.md`
</files>
<action>
Document attribute-only, scan-correlated, analyst-outcome, and downgrade-guarded tiers. Explain allowed verdicts, confidence caps, weak-evidence meaning, and how labels move from shadow review to training/evaluation.
</action>
<verify>
Search docs for `attribute_only`, `scan_correlated`, `analyst_outcome`, `label_provenance`, and confidence-band semantics.
</verify>
</task>
</tasks>

<verification>
```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest tests/test_ioc_evaluation_dataset_job.py tests/test_ai_schema_contracts.py
.\.venv\Scripts\python.exe -m pytest
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
</verification>
