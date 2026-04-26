# AI-6 Execution: Test Expansion and Contract Safety

**Date:** 2026-04-26
**Status:** Complete

## Changed

- Added runtime guard regression coverage for invalid active-model artifact hashes and malformed score requests.
- Added golden decision contract tests for false-positive, stale/revoked, and insufficient-evidence outcomes.
- Added API response contract coverage for backend-required `score_case` and grounded decision fields.
- Integrated existing scanner evidence work for nested YARA payloads and model-supported family fallback behavior.
- Integrated existing backend AI decision payload enrichment so sidecar requests include richer asset, prevalence, enrichment, behavior, and scoring context.
- Documented the sidecar test scope, including fast fixture-based PR-gate tests versus live/offline operator checks.

## Integrated Pre-existing Work

- Included existing changes in `decision_support.py`, `yara_decision.py`, `test_api.py`, and `AiDecisionsController.cs` because they directly support AI-6 contract safety around scanner evidence and backend-to-sidecar payload shape.
- Left generated registry edits unstaged.
- Left untracked network/data job scripts unstaged because they are data pipeline work, not AI-6 contract safety work.

## Validation

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest tests/test_api_runtime_guards.py tests/test_decision_contract_safety.py tests/test_api.py
.\.venv\Scripts\python.exe -m pytest
Pop-Location
dotnet test Workspace/Project/backend/Backend.sln -p:MSBuildEnableWorkloadResolver=false /m:1
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

Results:

- Focused AI-6 pytest: 38 passed.
- Full AI sidecar pytest: 313 passed.
- Backend tests: 177 passed, 8 skipped, 0 failed. Existing nullable warnings remained.
- Repository boundary guard: passed.
