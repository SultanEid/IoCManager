# AI-07 Execution: Usage Documentation

**Date:** 2026-04-26
**Status:** Complete

## Scope

AI-7 documents the AI sidecar workflows needed by developers and operators:

- Python 3.11 local setup using `Workspace/Project/ai/service/.venv`
- dependency installation and fast test command
- sidecar start and health check
- deterministic inference smoke request
- confidence-score interpretation for analysts
- dataset build and inventory workflows
- model training, evaluation, publishing, and rollback
- troubleshooting for missing artifacts, dataset mismatch, dependency install
  failure, sidecar startup failure, optional OpenAI fallback, malformed input,
  and request-limit failures
- environment variable names and behavior without printing or requesting secret
  values

## Files Changed

New phase documentation:

- `Workspace/Project/docs/ai-sidecar-operator-workflows.md`
- `.planning/phases/ai-07-usage-documentation/AI-07-EXECUTION.md`

Updated references:

- `.planning/AI_MODEL_ENHANCEMENT_ROADMAP.md`
- `Workspace/Project/ai/README.md`
- `Workspace/Project/ai/service/README.md`
- `Workspace/Project/ai/datasets/README.md`
- `Workspace/Project/docs/validation.md`
- `Workspace/Project/docs/ai-decision-overview.md`
- `Workspace/Project/docs/ai-decision-system-reference.md`

## Integrated Pre-Existing Work

No pre-existing dirty code or generated artifacts were integrated into AI-7.
Pre-existing generated registry changes and untracked AI job scripts remained
unstaged and untouched by this phase.

## Validation

Commands run:

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

Additional documentation-smoke validation:

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pip install -e ".[dev]" -c requirements.lock.txt
.\.venv\Scripts\python.exe -m uvicorn decision_service.main:app --host 127.0.0.1 --port 8100
Pop-Location
```

Then, from a second shell, `/health` and `/score_case` were checked with the
documented smoke request.

Results:

- dependency install: passed
- AI sidecar pytest: `313 passed`
- live sidecar smoke: `/health` returned `ok`; `/score_case` returned model
  `v1-unified-supervised-v1-cv5-20260426060214`, dataset
  `unified-supervised-v1`, `insufficient_evidence`, `hold`, confidence `0.1`,
  and manual-only action planning
- repository boundary check: passed
