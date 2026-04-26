---
phase: AI-9
plan: 4
title: "Shadow-mode live IOC scoring and analyst review loop"
type: implementation
wave: 4
depends_on: [AI-09-01, AI-09-02, AI-09-03]
files_modified:
  - Workspace/Project/ai/jobs/shadow_score_ioc_table.py
  - Workspace/Project/ai/service/tests/test_shadow_score_ioc_table_job.py
  - Workspace/Project/docs/ai-sidecar-operator-workflows.md
  - Workspace/Project/docs/ai-decision-system-reference.md
autonomous: true
requirements_addressed: [AI-03]
context_decisions: [D-AI9-05, D-AI9-06]
---

# Plan AI-09-04: Shadow-Mode Live IOC Scoring and Analyst Review Loop

<objective>
Add a safe shadow-mode operator workflow that scores current IOC-table rows, produces review reports, and helps analysts convert reviewed output into labels without writing production decisions.
</objective>

<must_haves>
<truths>
- Shadow mode must not write to production decision tables.
- Reports must mask or hash IOC values by default.
- The workflow must support live database/API input when configured by the operator, but tests must use fixtures and temp directories.
- Analyst review output should feed the IOC evaluation dataset from AI-09-01.
</truths>
<acceptance>
- A shadow-mode job scores IOC rows and writes a machine-readable report.
- The report includes verdict distribution, confidence bands, false-positive risk bands, weak-evidence counts, abstain/downgrade reasons, and slices.
- The report highlights likely false positives and high-impact weak spots.
- The job can emit review stubs that match the IOC evaluation-row schema.
- Docs explain how to run shadow mode and review results without exposing secrets.
</acceptance>
</must_haves>

<threat_model>
<threat id="T-AI9-04-01" severity="high">
Shadow scoring could accidentally mutate production decisions or expose raw IOC data.
</threat>
<mitigation>
Make the job read-only, require explicit output path, mask values by default, and keep DB/API credentials out of logs.
</mitigation>
<verification>
Tests assert no write endpoint is called, output values are masked by default, and no secret-like fields are written.
</verification>

<threat id="T-AI9-04-02" severity="medium">
Analysts may treat shadow results as authoritative before review.
</threat>
<mitigation>
Reports must label output as shadow-mode decision support and include weak-evidence and confidence-band context.
</mitigation>
<verification>
Report tests assert required disclaimers and review-status fields exist.
</verification>
</threat_model>

<tasks>
<task id="AI9-04-01" type="auto">
<title>Create shadow scoring job</title>
<files>
- `Workspace/Project/ai/jobs/shadow_score_ioc_table.py`
- `Workspace/Project/ai/service/tests/test_shadow_score_ioc_table_job.py`
</files>
<action>
Create a job that accepts fixture JSONL or operator-provided live export input, builds sidecar `ScoreCaseRequest` payloads, scores rows with the active runtime model, and writes a JSON report plus optional CSV review table. The job must be read-only and should not submit backend decision-generation writes.
</action>
<verify>
Fixture tests assert deterministic output, masked values, verdict summaries, confidence bands, slice summaries, and no write calls.
</verify>
</task>

<task id="AI9-04-02" type="auto">
<title>Add review-stub export</title>
<files>
- `Workspace/Project/ai/jobs/shadow_score_ioc_table.py`
- `Workspace/Project/ai/service/tests/test_shadow_score_ioc_table_job.py`
</files>
<action>
Allow the shadow report to emit review stubs that include suggested expected verdict, confidence band, evidence tier, label provenance placeholder, and reviewer notes fields compatible with the AI-09-01 schema.
</action>
<verify>
Tests validate emitted review stubs against the IOC evaluation-row schema.
</verify>
</task>

<task id="AI9-04-03" type="auto">
<title>Highlight weak spots and likely false positives</title>
<files>
- `Workspace/Project/ai/jobs/shadow_score_ioc_table.py`
- `Workspace/Project/ai/service/tests/test_shadow_score_ioc_table_job.py`
</files>
<action>
Add report sections for high-confidence suspicious rows with weak evidence, low-trust likely malicious rows, stale-looking active rows, source/type slices with high false-positive pressure, and rows needing analyst labels.
</action>
<verify>
Tests cover each highlight category with fixture rows.
</verify>
</task>

<task id="AI9-04-04" type="auto">
<title>Document shadow-mode workflow</title>
<files>
- `Workspace/Project/docs/ai-sidecar-operator-workflows.md`
- `Workspace/Project/docs/ai-decision-system-reference.md`
</files>
<action>
Document how to run shadow scoring, where reports are written, how to review rows, how to turn reviewed rows into evaluation labels, and what not to do with shadow output.
</action>
<verify>
Docs include command examples that use `.venv` and do not include secrets.
</verify>
</task>
</tasks>

<verification>
```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest tests/test_shadow_score_ioc_table_job.py tests/test_ioc_evaluation_dataset_job.py
.\.venv\Scripts\python.exe -m pytest
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
</verification>
