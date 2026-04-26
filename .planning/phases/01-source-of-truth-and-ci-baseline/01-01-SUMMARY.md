---
phase: 1
plan: 1
subsystem: onboarding
tags: [docs, governance, canonical-root]
key-files:
  - README.md
  - AGENTS.md
  - Workspace/README.md
metrics:
  tasks_completed: 3
  commits: 1
---

# Plan 01-01 Summary: Onboarding and canonical source docs

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1-01-01, 1-01-02, 1-01-03 | `3b8c7cc3` | Clarified root README, agent guidance, and workspace orientation around `Workspace/Project/`. |

## Changes

- Replaced the placeholder root `README.md` with a concise human entry point.
- Updated `AGENTS.md` to lock `Workspace/Project/` as the only active app root and mark `src/IocManager.Web` as decommissioned.
- Updated `Workspace/README.md` with active backend, frontend, sidecar, docs, scripts, boundary, and validation entry points.

## Deviations

None.

## Verification

- `Select-String -Path README.md,AGENTS.md,Workspace/README.md -Pattern 'Workspace/Project','src/IocManager.Web','validation.md','repository-boundaries.md'`
- Confirmed every `src/IocManager.Web` mention describes it as removed/decommissioned.

## Self-Check: PASSED

GOV-01 and context decisions D-01, D-02, D-12, D-13, D-14, and D-15 are covered.
