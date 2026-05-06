# Repository Boundaries

**Last updated:** 2026-04-26

This repository contains active product code, historical/reference material, and
local generated output. The boundary exists so code search, reviews, dependency
checks, and security scans start from the right place.

## Active Product Roots

Use these paths for new IOC Manager product work:

- `Workspace/Project/backend` - ASP.NET Core backend API, worker, application,
  domain, infrastructure, contracts, and tests.
- `Workspace/Project/frontend/workbench` - Next.js operator workbench.
- `Workspace/Project/ai/service` - Python FastAPI AI sidecar.
- `Workspace/Project/docs` - active project documentation.
- `Workspace/Project/scripts` - active project support and validation scripts.

`Workspace/Project/` is the canonical active application root.

## Supporting Workspace Material

These paths support the active product but are not separate application roots:

- `Workspace/README.md` - workspace orientation.
- `Workspace/docs` - scanner contracts and design notes.
- `Workspace/scripts` - PowerShell scanner and discovery scripts used by the
  application.

## Reference and Archive Material

These paths are reference material unless a task explicitly targets them:

- `Archive/`
- `AI_Project/`
- imported snapshots
- historical starter kits

Do not copy patterns from these paths into active code without checking the
current stack under `Workspace/Project/`.

## Local and Generated Material

These paths and file types are local output, generated output, or machine state:

- logs such as `*.log`, `*.out.log`, and `*.err.log`
- screenshots such as `*.png` probe captures
- scanner result folders such as `YARA_Results/`, `SIGMA_Results/`,
  `SNORT_Results/`, `SURICATA_Results/`, and `SWEEPNETWORKV2_Results/`
- temp folders such as `tmp/` and `tmp_script_validation/`
- backups such as `Workspace.local-backup-*`
- local tool state such as `.vs/` and `.playwright-cli/`
- local PDFs and probe JSON output

These should be ignored going forward. Existing user material must not be
deleted unless the user explicitly requests cleanup.

## Removed Roots

`src/IocManager.Web` is removed/decommissioned. Do not reintroduce it as an
active application surface. If a future task needs scanner behavior, start from
the canonical stack under `Workspace/Project/`.

## Search and Review Rule

Default code search, dependency review, and security review to active roots:

```powershell
rg "pattern" Workspace/Project README.md
```

Search archive/reference material only when the task explicitly asks for it.

## Guardrail

Run the repository-boundary guard before broad validation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

The guard reports boundary violations. It does not delete or move files.
