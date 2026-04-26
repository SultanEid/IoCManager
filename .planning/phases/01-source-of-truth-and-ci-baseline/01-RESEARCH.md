# Phase 1: Source-of-Truth and CI Baseline - Research

**Researched:** 2026-04-26
**Status:** Complete

## Phase Summary

Phase 1 is a repository governance and validation baseline. It does not build runtime product behavior. It should make `Workspace/Project/` the active product root, preserve the user's decision that `src/IocManager.Web` is removed, document and guard noisy/generated paths, and introduce fast plus full validation entry points.

## Existing Assets

### Documentation

- `AGENTS.md` already identifies `Workspace/Project/` as canonical and warns agents away from `Archive/`, `AI_Project/`, `tmp/`, backups, result folders, screenshots, and logs.
- `Workspace/README.md` already identifies `Workspace/Project` as the current canonical stack and says the legacy `src/IocManager.Web` application has been removed.
- `README.md` is currently minimal and can become the human-facing root router.
- `Workspace/Project/backend/README.md` documents backend restore/build/test commands and the MSBuild workload resolver workaround.

### Validation Commands

- Backend:
  - `dotnet restore Backend.sln -p:MSBuildEnableWorkloadResolver=false /m:1`
  - `dotnet build Backend.sln -c Debug --no-restore -p:MSBuildEnableWorkloadResolver=false /m:1`
  - `dotnet test tests/Backend.Tests/Backend.Tests.csproj -c Debug --no-build -p:MSBuildEnableWorkloadResolver=false`
- Frontend:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:run`
  - `npm run test:e2e`
  - `npm run scope:check`
- AI sidecar:
  - `pytest` from `Workspace/Project/ai/service`, with test discovery configured in `pyproject.toml`.

### Existing Scope Guard

- `Workspace/Project/scripts/check-ioc-scope.ps1` checks active product paths for disallowed framing language.
- This is useful but not sufficient for Phase 1's canonical-root decision. Phase 1 needs a repository-boundary guard for removed roots and noisy/generated tracked material.

### Current Noise Signals

- No `.github/` workflow directory exists.
- Root files include many local logs, screenshots, and probe outputs.
- Root directories include `Archive/`, `AI_Project/`, `tmp/`, `Workspace.local-backup-*`, scanner result folders, `.playwright-cli`, and `.vs`.
- `.gitignore` already contains a "Local workspace/runtime clutter" section that ignores many noisy paths, including `/src/`, `/AI_Project/`, `/tmp/`, result folders, logs, screenshots, and local AI staging files.

## Recommended Plan Shape

Use three plans:

1. **Onboarding and canonical source docs** - update `README.md`, `AGENTS.md`, and `Workspace/README.md` so humans and agents get the same source-of-truth story.
2. **Noisy-path boundary and guardrails** - add a repository-boundary doc plus a guard script that checks for removed roots and noisy/generated tracked material without deleting anything.
3. **Validation gates and CI baseline** - add fast and full validation documentation plus CI workflow wiring that runs backend, frontend, AI sidecar, boundary, and secret checks.

## Validation Architecture

Phase 1 validation should be mostly static:

- Markdown/content checks: confirm canonical references exist in `README.md`, `AGENTS.md`, `Workspace/README.md`, and the new boundary/validation docs.
- Boundary guard: run the new repository-boundary script and the existing `npm run scope:check`.
- CI syntax: validate that `.github/workflows/validation.yml` exists and references fast and full validation jobs.
- Command smoke: use documented commands as acceptance criteria; execution can be deferred to Phase 1 execution because plan-phase should not modify runtime code.

## Risks and Constraints

- Do not delete existing user files in logs, screenshots, backups, result folders, temp folders, archives, or imported copies.
- Do not reintroduce `src/IocManager.Web`; treat it as decommissioned.
- Keep root-level scripts out of `/scripts/` because `.gitignore` ignores the root `/scripts/` directory.
- Prefer `Workspace/Project/scripts/` for validation helpers.
- CI should not depend on local `.env` files or read secrets.

## Source Audit

| Source | ID | Feature/Requirement | Plan | Status | Notes |
|--------|----|---------------------|------|--------|-------|
| GOAL | - | Make `Workspace/Project/` unambiguous active stack and establish repeatable validation | 01-01, 01-02, 01-03 | COVERED | Split by docs, boundary guard, validation |
| REQ | GOV-01 | Developer can identify canonical root | 01-01 | COVERED | Human and agent onboarding docs |
| REQ | GOV-02 | Developer can distinguish active source from noisy/generated paths | 01-02 | COVERED | Boundary doc, ignore rules, guard script |
| REQ | GOV-03 | Repository validation runs backend/frontend/AI/secret checks | 01-03 | COVERED | Validation doc and CI workflow |
| CONTEXT | D-01..D-04 | Canonical-root enforcement and removed `src/IocManager.Web` | 01-01, 01-02 | COVERED | Docs plus guard script |
| CONTEXT | D-05..D-08 | Fast and full validation gates with backend workaround | 01-03 | COVERED | CI/doc commands include workaround |
| CONTEXT | D-09..D-11 | Noisy file cleanup boundary | 01-02 | COVERED | Ignore policy and boundary doc |
| CONTEXT | D-12..D-15 | Small onboarding surface split | 01-01 | COVERED | Root README, Workspace README, AGENTS |

## Research Result

## RESEARCH COMPLETE

Phase 1 can be planned as three executable plans across two waves: two independent Wave 1 plans for docs/boundaries, then one Wave 2 plan for validation/CI that consumes those decisions.
