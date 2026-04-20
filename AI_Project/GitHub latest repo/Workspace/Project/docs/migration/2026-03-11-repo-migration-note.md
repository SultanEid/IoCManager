# Repository Migration Note (2026-03-11)

This change performed a repository audit and structural migration only. No product features or API behaviors were implemented/changed.

## Kept And Migrated

- `PUT EVERYTHING YOU WANT HERE/detective-frontend` -> `frontend/web`
- `PUT EVERYTHING YOU WANT HERE/IoCManager-main/ioc-intelligence-service` -> `ai/sidecar`
- `PUT EVERYTHING YOU WANT HERE/IoCManager-main/IoCManager.Mvc` -> `backend/prototype/IoCManager.Mvc` (prototype/reference ASP.NET MVC app)
- `Part 3/(WIP)_IoC_Classification_(UPDATED).ipynb` -> `ai/research/notebooks/(WIP)_IoC_Classification_(UPDATED).ipynb`
- `Part 3/(WIP)_IoC_Manager.ipynb` -> `ai/research/notebooks/(WIP)_IoC_Manager.ipynb`
- `Part 3/IoC.pdf` -> `docs/reference/research/IoC.pdf`
- `backend/prototype/IoCManager.Mvc/Docs/cti-v1` -> `docs/reference/research/cti-v1`

## Archived / Reference-Only

- `PUT EVERYTHING YOU WANT HERE/IoCManager-main/Asp-Net` -> `archive/reference/vendor/Asp-Net`
- `PUT EVERYTHING YOU WANT HERE/IoCManager-main/Mvc` -> `archive/reference/vendor/Mvc`
- `PUT EVERYTHING YOU WANT HERE/IoCManager-main/AdminLTE-4.0.0-rc4.zip` -> `archive/reference/vendor/AdminLTE-4.0.0-rc4.zip`
- `PUT EVERYTHING YOU WANT HERE/ui-main` -> `archive/reference/shadcn/ui-main`
- `PUT EVERYTHING YOU WANT HERE/shadcn-snapshot` -> `archive/reference/shadcn/shadcn-snapshot`
- `Part 1/IoCManager-main.zip` -> `archive/reference/source-zips/part-1/IoCManager-main.zip`
- `Part 2/ui-main.zip` -> `archive/reference/source-zips/part-2/ui-main.zip`

## Excluded From Active Workspace (Soft-Delete / Quarantine)

- `ONLY AI HERE` -> `archive/original-layout/ONLY AI HERE`
- `Part 1` -> `archive/original-layout/Part 1`
- `Part 2` -> `archive/original-layout/Part 2`
- `Part 3` -> `archive/original-layout/Part 3`
- `PUT EVERYTHING YOU WANT HERE` -> `archive/original-layout/PUT EVERYTHING YOU WANT HERE`
- `PUT EVERYTHING YOU WANT HERE/.npm-cache` -> `archive/excluded/caches-build-runtime/.npm-cache`
- `PUT EVERYTHING YOU WANT HERE/.dotnet-home` -> `archive/excluded/caches-build-runtime/.dotnet-home`
- `frontend/web/node_modules` -> `archive/excluded/caches-build-runtime/frontend-web/node_modules`
- `frontend/web/.next` -> `archive/excluded/caches-build-runtime/frontend-web/.next`
- `frontend/web/tsconfig.tsbuildinfo` -> `archive/excluded/caches-build-runtime/frontend-web/tsconfig.tsbuildinfo`
- `backend/prototype/IoCManager.Mvc/bin` -> `archive/excluded/caches-build-runtime/backend-prototype/bin`
- `backend/prototype/IoCManager.Mvc/obj` -> `archive/excluded/caches-build-runtime/backend-prototype/obj`
- `backend/prototype/IoCManager.Mvc/detective.dev.db*` -> `archive/excluded/caches-build-runtime/backend-prototype/`
- `PUT EVERYTHING YOU WANT HERE/detective-frontend-dev.err.log` -> `archive/excluded/caches-build-runtime/logs/detective-frontend-dev.err.log`
- `PUT EVERYTHING YOU WANT HERE/detective-frontend-dev.out.log` -> `archive/excluded/caches-build-runtime/logs/detective-frontend-dev.out.log`

## Active Canonical Layout

- `backend/` (with `src/`, `tests/`, `prototype/`)
- `frontend/` (with `web/`)
- `ai/` (with `sidecar/`, `research/notebooks/`, `research/archive/`)
- `docs/` (with `reference/`, `architecture/`, `migration/`)
- `infra/` (with `scripts/`, `docker/`, `env/`)
- `archive/` (with `reference/`, `excluded/`, `original-layout/`)
