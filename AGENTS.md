# Agent Guidance

## Project

This repository contains IOC Manager, a brownfield cyber operations platform. The canonical active product stack is under `Workspace/Project/`:

- Backend: `Workspace/Project/backend`
- Frontend workbench: `Workspace/Project/frontend/workbench`
- AI sidecar: `Workspace/Project/ai/service`
- Project docs: `Workspace/Project/docs`
- Project scripts: `Workspace/Project/scripts`

Treat `Archive/`, `AI_Project/`, `tmp/`, `Workspace.local-backup-*`, scanner result folders, screenshots, and log files as reference/generated material unless the user explicitly targets them.

## Planning

GSD artifacts live in `.planning/`:

- Project context: `.planning/PROJECT.md`
- Requirements: `.planning/REQUIREMENTS.md`
- Roadmap: `.planning/ROADMAP.md`
- State: `.planning/STATE.md`
- Codebase map: `.planning/codebase/`

Before planning or executing a phase, read the relevant planning file and the matching codebase map sections.

## Build and Test Entry Points

Backend:

```powershell
dotnet test Workspace/Project/backend/Backend.sln
```

Frontend:

```powershell
Push-Location Workspace/Project/frontend/workbench
npm run lint
npm run typecheck
npm run test:run
Pop-Location
```

AI sidecar:

```powershell
Push-Location Workspace/Project/ai/service
pytest
Pop-Location
```

Use narrower tests when making scoped changes, then broaden validation when touching shared contracts, auth, scanner execution, persistence, or deployment behavior.

## Engineering Rules

- Prefer existing layer boundaries and helpers over new abstractions.
- Keep frontend API calls behind `Workspace/Project/frontend/workbench/src/shared/gateway`.
- Treat backend authorization policies as authoritative.
- Keep durable schema changes in migrations where practical.
- Treat scanner execution, sidecar access, SQL auth compatibility, JWT configuration, and secrets as high-risk areas.
- Do not read or print `.env` files or local secrets.

