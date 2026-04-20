# Active Surface Reset (2026-03-13)

This change performed repository cleanup and active-surface reset only. No product features or API contracts were changed.

## Kept Active

- `backend/src` and `backend/tests` (ASP.NET Core API, worker, contracts, tests)
- `frontend/workbench` (Next.js + TypeScript + Tailwind + shadcn/ui)
- `ai/service` and `ai/jobs` (FastAPI sidecar + offline job scripts)
- `docs` (product docs/migration history)
- `infra` (docker/env/scripts)
- `AGENTS.md`

## Archived (Legacy / Non-Active)

- `frontend/web` -> `archive/reference/legacy/frontend-web-detective`
- `backend/prototype/IoCManager.Mvc` -> `archive/reference/legacy/backend-prototype-iocmanager-mvc`
- `ai/sidecar` -> `archive/reference/legacy/ai-sidecar-ioc-intelligence`

## Research Consolidation

- Created top-level research surface:
  - `research/notebooks`
  - `research/docs/cti-v1`
  - `research/reference`
- Moved notebooks:
  - `ai/research/notebooks/(WIP)_IoC_Classification_(UPDATED).ipynb` -> `research/notebooks/(WIP)_IoC_Classification_(UPDATED).ipynb`
  - `ai/research/notebooks/(WIP)_IoC_Manager.ipynb` -> `research/notebooks/(WIP)_IoC_Manager.ipynb`
- Moved research/design reference docs:
  - `docs/reference/research/cti-v1/*` -> `research/docs/cti-v1/*`
  - `docs/reference/research/IoC.pdf` -> `research/reference/IoC.pdf`
- Removed now-empty source folders where applicable (`ai/research`, `docs/reference/research`).

## Removed From Active Surface (Generated / Runtime)

- Root cache: `.npm-cache-local`
- Backend local caches/artifacts:
  - `backend/.dotnet-home`
  - `backend/.nuget`
  - `backend/.tmp`
  - `backend/src/**/bin`, `backend/src/**/obj`
  - `backend/tests/**/bin`, `backend/tests/**/obj`
  - `backend/src/Backend.Api/cti-workbench-dev.db`
  - backend transient logs (`*build*.log`, `dotnet-test-output.log`, `test-results.log`, `verify-backend.log`, `api-build.log`)
- Frontend generated artifacts:
  - `frontend/workbench/node_modules`
  - `frontend/workbench/.next`
  - `frontend/workbench/test-results`
  - `frontend/workbench/tsconfig.tsbuildinfo`
  - `frontend/workbench/auth-page.html`
- Python caches under active roots where present:
  - `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`

## Guardrails Added

- Added root `.gitignore` with repo-wide rules for generated/runtime artifacts across Node, .NET, and Python, plus local DB/log files.

## Canonical Top-Level Layout

- `/backend`
- `/frontend`
- `/ai`
- `/docs`
- `/research`
- `/infra`
- `/archive`
