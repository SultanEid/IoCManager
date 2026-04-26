---
phase: AI-2
plan: 2
title: "Registry and feedback write safety"
type: implementation
wave: 1
depends_on: []
files_modified:
  - Workspace/Project/ai/service/decision_service/registry.py
  - Workspace/Project/ai/service/decision_service/dataset_registry.py
  - Workspace/Project/ai/service/decision_service/feedback_store.py
  - Workspace/Project/ai/service/tests/test_registry.py
  - Workspace/Project/ai/service/tests/test_dataset_registry.py
  - Workspace/Project/ai/service/tests/test_historical_learning.py
  - Workspace/Project/ai/service/README.md
autonomous: true
requirements_addressed: [AI-03]
context_decisions: [D-AI2-05, D-AI2-06, D-AI2-07]
---

# Plan AI-02-02: Registry and Feedback Write Safety

<objective>
Make filesystem-backed AI artifacts safer under normal local and service operation. This plan adds atomic replace semantics for registry JSON files, clarifies feedback JSONL durability limits, and adds focused tests around write safety.
</objective>

<context>
- Phase context: `.planning/phases/ai-02-broken-path-stabilization/AI-02-CONTEXT.md`
- Research: `.planning/phases/ai-02-broken-path-stabilization/AI-02-RESEARCH.md`
- Model registry: `Workspace/Project/ai/service/decision_service/registry.py`
- Dataset registry: `Workspace/Project/ai/service/decision_service/dataset_registry.py`
- Feedback store: `Workspace/Project/ai/service/decision_service/feedback_store.py`
</context>

<must_haves>
<truths>
- Model and dataset registries are full JSON documents and should not be left partially written.
- Registry portability is important but belongs to AI-4, not this stabilization phase.
- Feedback storage is append-oriented JSONL and cannot use the same full-document atomic replace pattern without changing semantics.
</truths>
<acceptance>
- Model registry saves write to a same-directory temp file and atomically replace the target.
- Dataset registry saves write to a same-directory temp file and atomically replace the target.
- Registry parent directories are created before saving when needed.
- Tests cover registry roundtrip, promotion behavior, and atomic-write failure preservation.
- Feedback docs and tests describe in-process append safety and cross-process limitations.
</acceptance>
</must_haves>

<threat_model>
<threat id="T-AI2-02-01" severity="high">
Interrupted direct writes can corrupt `model_registry.json` or `dataset_registry.json`.
</threat>
<mitigation>
Use a same-directory temporary file, flush/sync where practical, and `Path.replace()` for atomic target replacement.
</mitigation>
<verification>
Monkeypatch or inject write/replace failure in tests and assert the previous registry content remains loadable.
</verification>

<threat id="T-AI2-02-02" severity="medium">
Feedback writes from multiple store instances or processes can interleave because locking is per instance.
</threat>
<mitigation>
Document the limitation and preserve same-process safety. Defer durable multi-process storage to deployment/readiness work unless a lightweight local pattern already exists.
</mitigation>
<verification>
Add tests for valid JSONL appends and same-process concurrent appends.
</verification>
</threat_model>

<tasks>
<task id="AI2-02-01" type="auto">
<title>Add atomic JSON write behavior for model registry</title>
<files>
- `Workspace/Project/ai/service/decision_service/registry.py`
- `Workspace/Project/ai/service/tests/test_registry.py`
</files>
<action>
Update `ModelRegistryStore.save()` to:
1. Ensure the registry parent directory exists.
2. Serialize JSON before touching the target.
3. Write serialized content to a temporary file in the same directory.
4. Replace the target atomically.
5. Clean up temporary files when a save fails where practical.
</action>
<verify>
Extend tests to cover normal save/load, promotion, and failure that preserves the previous file.
</verify>
<acceptance_criteria>
A failed save does not leave a truncated or invalid model registry file.
</acceptance_criteria>
</task>

<task id="AI2-02-02" type="auto">
<title>Add atomic JSON write behavior for dataset registry</title>
<files>
- `Workspace/Project/ai/service/decision_service/dataset_registry.py`
- `Workspace/Project/ai/service/tests/test_dataset_registry.py`
</files>
<action>
Apply the same atomic full-document save pattern to `DatasetRegistryStore.save()`, using local helpers or a tiny shared helper only if it reduces duplication without introducing unnecessary abstraction.
</action>
<verify>
Extend tests to cover normal save/load and failure that preserves the previous file.
</verify>
<acceptance_criteria>
A failed save does not leave a truncated or invalid dataset registry file.
</acceptance_criteria>
</task>

<task id="AI2-02-03" type="auto">
<title>Clarify and test feedback append safety</title>
<files>
- `Workspace/Project/ai/service/decision_service/feedback_store.py`
- `Workspace/Project/ai/service/tests/test_historical_learning.py`
- `Workspace/Project/ai/service/README.md`
</files>
<action>
Keep JSONL append semantics, but:
1. Ensure the parent directory exists before append.
2. Keep per-instance lock behavior.
3. Add tests that appended lines are valid JSON and same-process concurrent writes produce complete lines.
4. Document that cross-process durability/locking is not guaranteed by the local JSONL store.
</action>
<verify>
Run historical-learning or feedback-store tests that exercise append/query behavior.
</verify>
<acceptance_criteria>
Feedback writes are clearly safe within the supported local process model and clearly documented outside that model.
</acceptance_criteria>
</task>
</tasks>

<verification>
```powershell
Push-Location Workspace/Project/ai/service
pytest tests/test_registry.py tests/test_dataset_registry.py tests/test_historical_learning.py
Pop-Location
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
</verification>

<success_criteria>
- AI-2 success criterion 4 is satisfied for registry files and documented for feedback JSONL.
- `AI-03` auditability improves without changing registry model semantics.
- No active model, dataset, or generated artifact is rewritten unless a test fixture intentionally creates temporary files.
</success_criteria>
