---
phase: AI-2
plan: 3
title: "Job support labeling and smoke coverage"
type: implementation
wave: 2
depends_on: [AI-02-01, AI-02-02]
files_modified:
  - Workspace/Project/ai/README.md
  - Workspace/Project/ai/service/README.md
  - Workspace/Project/docs/ai-model-pipeline.md
  - Workspace/Project/ai/service/tests/test_build_decision_dataset_job.py
  - Workspace/Project/ai/service/tests/test_evaluation_harness_job.py
  - Workspace/Project/ai/service/tests/test_probe_live_ioc_decisions_job.py
autonomous: true
requirements_addressed: [AI-03]
context_decisions: [D-AI2-08, D-AI2-09]
---

# Plan AI-02-03: Job Support Labeling and Smoke Coverage

<objective>
Make AI job documentation truthful by ensuring every referenced job is either smoke-tested as supported or clearly labeled experimental. This keeps AI-2 from handing unstable job paths to later data, training, and evaluation phases as if they were production-ready.
</objective>

<context>
- Phase context: `.planning/phases/ai-02-broken-path-stabilization/AI-02-CONTEXT.md`
- Research: `.planning/phases/ai-02-broken-path-stabilization/AI-02-RESEARCH.md`
- AI-1 docs: `Workspace/Project/docs/ai-model-pipeline.md`
- Job root: `Workspace/Project/ai/jobs`
- Existing job tests: `Workspace/Project/ai/service/tests/test_*job*.py`
</context>

<must_haves>
<truths>
- Documentation should not imply that experimental or untested jobs are stable operator workflows.
- Some job scripts may be user-created/uncommitted during execution and must not be deleted or overwritten.
- AI-6 owns broad job-test expansion; AI-2 only needs enough smoke coverage or labeling to prevent misleading docs.
</truths>
<acceptance>
- AI docs list referenced job scripts with support status: supported, compatibility, experimental, or deprecated.
- Supported jobs referenced in docs have at least fixture-sized smoke coverage or existing tests explicitly cited.
- Experimental jobs are labeled as such and excluded from required production workflows.
- Validation commands are updated only if they reflect real test entry points.
</acceptance>
</must_haves>

<threat_model>
<threat id="T-AI2-03-01" severity="medium">
Developers may run undocumented or experimental data/model jobs as if they are stable, producing misleading artifacts.
</threat>
<mitigation>
Add a job support matrix and smoke tests for supported jobs; clearly label experimental scripts.
</mitigation>
<verification>
Docs mention each referenced job exactly once in the support matrix, and tests cover supported job command/import behavior.
</verification>

<threat id="T-AI2-03-02" severity="medium">
Generated job outputs can accidentally become source churn during smoke tests.
</threat>
<mitigation>
Use temporary directories and fixture-sized inputs in tests. Do not write to active artifact or dataset registries.
</mitigation>
<verification>
Run git status after tests and confirm no generated dataset/model artifacts were modified.
</verification>
</threat_model>

<tasks>
<task id="AI2-03-01" type="auto">
<title>Inventory referenced AI job scripts</title>
<files>
- `Workspace/Project/ai/README.md`
- `Workspace/Project/ai/service/README.md`
- `Workspace/Project/docs/ai-model-pipeline.md`
</files>
<action>
Compare job scripts referenced by docs against files under `Workspace/Project/ai/jobs` and existing job tests. Build a support matrix that includes purpose, status, expected inputs, expected outputs, and whether smoke coverage exists.
</action>
<verify>
Run `rg "Workspace/Project/ai/jobs|python .*jobs|jobs/" Workspace/Project/ai Workspace/Project/docs/ai-model-pipeline.md`.
</verify>
<acceptance_criteria>
Every documented job reference is represented in the support matrix.
</acceptance_criteria>
</task>

<task id="AI2-03-02" type="auto">
<title>Add or align smoke coverage for supported jobs</title>
<files>
- `Workspace/Project/ai/service/tests/test_build_decision_dataset_job.py`
- `Workspace/Project/ai/service/tests/test_evaluation_harness_job.py`
- `Workspace/Project/ai/service/tests/test_probe_live_ioc_decisions_job.py`
- other existing job-test files as needed
</files>
<action>
For jobs labeled supported, add lightweight tests that import the script, exercise argument parsing or fixture-sized execution, and write only to temporary directories. Prefer extending existing job test files over creating fragmented new ones.
</action>
<verify>
Run the affected job tests plus the focused AI-2 API/registry tests.
</verify>
<acceptance_criteria>
Supported job docs are backed by tests that do not mutate active datasets, registries, or model artifacts.
</acceptance_criteria>
</task>

<task id="AI2-03-03" type="auto">
<title>Label experimental jobs clearly</title>
<files>
- `Workspace/Project/ai/README.md`
- `Workspace/Project/ai/service/README.md`
- `Workspace/Project/docs/ai-model-pipeline.md`
</files>
<action>
For jobs that are incomplete, user-draft, network-dependent, or not smoke-tested, mark them experimental and state that they are excluded from the required local validation gate. Do not remove scripts or generated data.
</action>
<verify>
Search docs for `experimental` and the relevant job filenames.
</verify>
<acceptance_criteria>
No job without smoke coverage is presented as a stable required workflow.
</acceptance_criteria>
</task>
</tasks>

<verification>
```powershell
Push-Location Workspace/Project/ai/service
pytest tests/test_api.py tests/test_registry.py tests/test_dataset_registry.py tests/test_*job*.py
Pop-Location
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
</verification>

<success_criteria>
- AI-2 success criterion 6 is satisfied.
- Later data, training, and evaluation phases inherit an honest support matrix.
- No generated job artifacts are staged as phase output.
</success_criteria>
