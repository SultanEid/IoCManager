# IOC Manager

## What This Is

IOC Manager is a cyber operations workbench for managing indicators of compromise, scanner workflows, rule distribution, alerts, reports, and AI-assisted security decisions. The canonical product stack lives under `Workspace/Project/` and combines an ASP.NET Core backend, a Next.js operator workbench, a Python FastAPI AI sidecar, SQL Server persistence, and PowerShell-based scanner execution.

This is a brownfield project. The initial roadmap focuses on making the existing system safer, more reliable, easier to operate, and easier to evolve before expanding product scope.

## Core Value

Security operators can reliably run, review, and act on IOC and scanner intelligence without unsafe execution paths, misleading authorization behavior, or fragile deployment assumptions.

## Requirements

### Validated

- Existing ASP.NET Core backend API provides authentication, authorization policies, V2 operational controllers, health checks, background workers, and SQL Server persistence - existing.
- Existing Next.js workbench provides operator UI routes, auth/session handling, gateway-based backend access, role-aware navigation, mock/live runtime modes, and Playwright/Vitest coverage - existing.
- Existing Python AI sidecar provides case scoring, report extraction, scan analyst recommendations, historical-learning queries, graph candidates, model evaluation, and feedback endpoints - existing.
- Existing scanner orchestration paths execute PowerShell, managed connector, SSH/SCP, and result-ingestion workflows - existing.
- Existing tests cover backend domain/application/integration paths, frontend unit/component/E2E paths, and AI sidecar pytest paths - existing.

### Active

- [ ] Establish a clean source-of-truth boundary around `Workspace/Project/` and reduce archive/generated-output noise in day-to-day engineering.
- [ ] Harden authentication, authorization, rate limiting, and sidecar access boundaries.
- [ ] Make scanner execution and rule-upload workflows safe under cancellation, concurrency, and adversarial inputs.
- [ ] Consolidate durable database schema ownership and background-work reliability.
- [ ] Align frontend permissions, gateway contracts, and mock/live behavior with backend policy.
- [ ] Add repository-level CI and validation gates for backend, frontend, AI sidecar, secrets, and generated-artifact drift.
- [ ] Prepare the AI sidecar for production operation with bounded requests, authenticated access, dependency locking, and auditable model artifacts.

### Out of Scope

- New product modules unrelated to IOC, scanning, rule distribution, reports, cases, or AI decision support - stabilize the existing platform first.
- Replacing the active stack with a different web framework or database - current active code is .NET 8, Next.js, FastAPI, and SQL Server.
- Large UI redesign - current roadmap is operational hardening and reliability, not visual reinvention.
- Reworking archived starter kits in `Archive/` - those paths are reference material unless explicitly targeted.

## Context

- The codebase map was created on 2026-04-26 in `.planning/codebase/`.
- `Workspace/README.md` and the map identify `Workspace/Project/` as the current application stack.
- The repository also contains root `src/IocManager.Web`, archive folders, temporary copies, logs, screenshots, scanner result folders, and imported reference material. These are useful for context but create source-of-truth ambiguity.
- Main active backend paths are `Workspace/Project/backend/src/Backend.Api`, `Backend.Application`, `Backend.Domain`, `Backend.Infrastructure`, `Backend.Contracts`, and `Backend.Worker`.
- Main active frontend path is `Workspace/Project/frontend/workbench`.
- Main active AI sidecar path is `Workspace/Project/ai/service`.
- Main active scripts and scanner contracts are under `Workspace/Project/scripts`, `Workspace/scripts`, and related documentation.

## Constraints

- **Canonical root**: New product work should default to `Workspace/Project/` - the map marks it as the active stack.
- **Backend stack**: Active backend targets .NET 8 and uses ASP.NET Core, EF Core, Identity, FluentValidation, Serilog, SQL Server, and hosted workers.
- **Frontend stack**: Active frontend uses Next.js, React, TypeScript, Tailwind CSS, shadcn/ui conventions, TanStack Query, zod, and the existing gateway abstraction.
- **AI sidecar stack**: Active sidecar requires Python 3.11+ and uses FastAPI, Pydantic, numpy, pandas, scikit-learn, and filesystem-backed artifacts.
- **Security**: Scanner execution, SQL authentication compatibility paths, sidecar access, JWT configuration, secret handling, and rate limiting must be treated as high-risk areas.
- **Database**: SQL Server is the primary persistence target; durable schema changes should move toward EF migrations instead of ad hoc runtime DDL.
- **Testing**: Backend, frontend, and sidecar tests already exist and should be expanded around high-risk changes rather than bypassed.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat `Workspace/Project/` as canonical for roadmap work | Codebase map identifies it as the active product stack; other roots include archive, imported, or secondary scanner material | Pending |
| Prioritize hardening before feature expansion | Current concerns include auth shortcuts, sidecar exposure, scanner process lifecycle, upload limits, schema drift, missing CI, and role mismatch | Pending |
| Keep planning documents committed | Planning docs are already tracked and the workflow should remain reproducible across sessions | Pending |
| Use inline roadmap creation for this run | `$gsd-create-roadmap` is not an installed skill and `gsd-sdk` is not available locally | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone**:
1. Full review of all sections.
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-04-26 after initialization*
