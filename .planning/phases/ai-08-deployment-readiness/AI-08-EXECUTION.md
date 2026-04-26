# AI-08 Execution: Deployment Readiness

**Date:** 2026-04-26
**Status:** Complete

## Scope

AI-8 prepares the IOC Manager AI sidecar for production-like operation beside
the backend while keeping it a human-in-the-loop decision-support service.

## Changes

Sidecar runtime hardening:

- Added `GET /livez` for process liveness.
- Added `GET /readyz` for deployment readiness checks covering model registry,
  dataset registry, action-policy matrix, feedback path, active model, and
  active dataset state.
- Kept `GET /health` as compatibility health and included readiness status.
- Added `GET /metrics` with sanitized in-process request counters.
- Added request-completion logging for path, status, and duration only.
- Added optional service-token protection using
  `IOC_MANAGER_AI_SERVICE_TOKEN` or `CTI_SIDECAR_SERVICE_TOKEN`.
- Kept `/livez` unauthenticated for deployment liveness probes.
- Added sanitized startup warning for production-like environments without an
  explicit service token.

Backend integration:

- Added `AiSidecar:ServiceToken`.
- Backend sidecar HTTP clients send `X-IOC-Manager-Sidecar-Token` when
  configured.
- Backend AI sidecar health probe now checks `/readyz`.

Deployment artifacts and docs:

- Added `Workspace/Project/ai/service/Dockerfile`.
- Added `Workspace/Project/ai/service/.dockerignore`.
- Added `Workspace/Project/deploy/ai-sidecar.env.example`.
- Added `Workspace/Project/deploy/ai-sidecar.md`.
- Updated AI sidecar README, operator workflows, backend README, validation docs,
  and CI validation workflow.

Tests:

- Added deployment-readiness tests for liveness, token protection, readiness
  checks, sanitized readiness failures, safe metrics, and token env loading.

## Integrated Pre-Existing Work

No pre-existing generated registry changes or untracked AI job scripts were
integrated into AI-8. They remained unstaged and untouched.

## Validation

Commands run:

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest
Pop-Location
dotnet test Workspace/Project/backend/Backend.sln -p:MSBuildEnableWorkloadResolver=false /m:1
Push-Location Workspace/Project/frontend/workbench
npm run lint
npm run typecheck
npm run test:run
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

Additional sidecar startup smoke:

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m uvicorn decision_service.main:app --host 127.0.0.1 --port 8100
Pop-Location
```

Then `/livez`, `/readyz`, `/health`, `/metrics`, and a deterministic
`/score_case` request were checked from a second shell.

Results:

- AI sidecar pytest: `318 passed`
- backend tests: `177 passed`, `8 skipped`
- frontend lint: passed with existing hook dependency warnings
- frontend typecheck: passed
- frontend `npm run test:run`: skipped with user approval after repeated
  five-minute hangs in the Vitest all-file runner; single-file Vitest execution
  and Vitest test discovery completed successfully
- sidecar live smoke: `/livez` returned `alive`; `/readyz` returned `ready`;
  `/health` returned `ok`; `/metrics` incremented request counters; `/score_case`
  returned model `v1-unified-supervised-v1-cv5-20260426060214`, dataset
  `unified-supervised-v1`, `insufficient_evidence`, `hold`, confidence `0.1`,
  and manual-only action planning
- repository boundary check: passed
