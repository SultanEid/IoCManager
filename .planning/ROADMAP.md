# Roadmap: IOC Manager

**Created:** 2026-04-26
**Source:** Brownfield codebase map in `.planning/codebase/`
**Granularity:** Standard

## Overview

This roadmap stabilizes the existing IOC Manager platform before expanding product scope. Phases are ordered to reduce ambiguity first, then remove high-risk security and execution hazards, then improve operational reliability, frontend/backend contract trust, and AI sidecar production readiness.

| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 1 | Source-of-Truth and CI Baseline | Make the active stack and validation entry points explicit. | GOV-01, GOV-02, GOV-03 |
| 2 | Security Boundary Hardening | Remove known authentication, authorization, sidecar, and rate-limit weaknesses. | SEC-01, SEC-02, SEC-03, SEC-04, SEC-05 |
| 3 | Scanner Execution Safety | Make scanner and rule-upload workflows safe under cancellation, concurrency, and hostile inputs. | SCAN-01, SCAN-02, SCAN-03, SCAN-04 |
| 4 | Persistence and Operational Reliability | Consolidate schema ownership and make background/report operations safer. | OPS-01, OPS-02, OPS-03, OPS-04 |
| 5 | Frontend Contract and Authorization Parity | Align UI permissions, gateway use, mock/live behavior, and API schema drift controls. | UI-01, UI-02, UI-03, UI-04 |
| 6 | AI Sidecar Production Readiness | Bound sidecar workload, secure access, and make model artifacts reproducible. | AI-01, AI-02, AI-03, AI-04 |

## Phase Details

### Phase 1: Source-of-Truth and CI Baseline

**Goal:** Make `Workspace/Project/` the unambiguous active stack and establish repeatable repository validation.

**Requirements:** GOV-01, GOV-02, GOV-03

**Success Criteria:**
1. `AGENTS.md`, `.planning/PROJECT.md`, and relevant docs state that `Workspace/Project/` is the default product root for new work.
2. `.gitignore` and project notes clearly separate active code from archives, backups, generated results, screenshots, logs, and temporary folders without deleting user work.
3. CI or documented local validation runs backend tests, frontend lint/typecheck/tests, AI sidecar tests, and a secret scan from stable commands.
4. Developers can start from a clean clone and know which solution/package directories to build first.

**Likely Areas:**
- `AGENTS.md`
- `.gitignore`
- `.github/workflows/` if adding CI
- `Workspace/README.md`
- `Workspace/Project/backend/Backend.sln`
- `Workspace/Project/frontend/workbench/package.json`
- `Workspace/Project/ai/service/pyproject.toml`

**UI hint:** no

### Phase 2: Security Boundary Hardening

**Goal:** Remove the highest-risk auth and service-boundary weaknesses before operational expansion.

**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05

**Success Criteria:**
1. SQL-table auth no longer accepts any built-in privileged credential path.
2. SQL-table password handling rejects pre-hashed password login and documents or implements a migration path toward salted hashes.
3. SQL-table names are strict allowlisted identifiers or mapped from safe configuration values before SQL command construction.
4. AI sidecar endpoints have a documented deployment boundary plus explicit backend-to-sidecar authentication or private ingress enforcement.
5. API rate limiting uses trusted forwarded-header configuration or ASP.NET Core rate limiting with bounded state and tests for spoofed client identity.

**Likely Areas:**
- `Workspace/Project/backend/src/Backend.Infrastructure/Security/SqlUserTableAuthService.cs`
- `Workspace/Project/backend/src/Backend.Infrastructure/Security/SqlUserTableDirectoryService.cs`
- `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/SqlUserTableAuthOptions.cs`
- `Workspace/Project/backend/src/Backend.Api/Middlewares/ApiRequestThrottlingMiddleware.cs`
- `Workspace/Project/ai/service/decision_service/api.py`
- `Workspace/Project/backend/tests/Backend.Tests/Integration/AuthSecurityEndpointsTests.cs`

**UI hint:** no

### Phase 3: Scanner Execution Safety

**Goal:** Make scanner execution and rule ingestion robust when jobs are canceled, duplicated, concurrent, or malformed.

**Requirements:** SCAN-01, SCAN-02, SCAN-03, SCAN-04

**Success Criteria:**
1. Canceling scanner execution terminates child process trees and records a clear canceled state.
2. Result-file metadata references durable output files or stored content, not temp files deleted in cleanup.
3. Rule ZIP upload handling enforces decompressed-size, entry-count, path traversal, nesting, and extension limits.
4. Script execution uses known path constraints, timeout budgets, and audit logging without logging secrets.
5. Backend tests cover cancellation, durable artifact retention, upload limit rejection, and scanner cleanup behavior.

**Likely Areas:**
- `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/ProcessExecutionHelper.cs`
- `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/LegacyScriptScanExecutor.cs`
- `Workspace/Project/backend/src/Backend.Api/Infrastructure/LegacyScanPipelineService.Execution.cs`
- `Workspace/Project/backend/src/Backend.Api/Controllers/V2/LegacyScanPipelineController.cs`
- `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/ScanExecutionDispatcherTests.cs`

**UI hint:** no

### Phase 4: Persistence and Operational Reliability

**Goal:** Reduce production drift and make long-running operational work safer to run.

**Requirements:** OPS-01, OPS-02, OPS-03, OPS-04

**Success Criteria:**
1. Durable schema changes are represented by EF migrations where practical.
2. Runtime schema initializers are limited to idempotent checks or bootstrap data and do not require broad production DDL permissions.
3. Background queues have explicit capacity/backpressure behavior, queue-depth visibility, and a documented migration path to durable queues.
4. Saved report PDF generation uses per-request unique temp paths or in-memory bytes to avoid concurrent download races.
5. Tests cover empty database startup, upgraded database startup, queue capacity behavior, and concurrent report PDF generation.

**Likely Areas:**
- `Workspace/Project/backend/src/Backend.Api/Program.cs`
- `Workspace/Project/backend/src/Backend.Api/Infrastructure/*SchemaInitializer.cs`
- `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Migrations/`
- `Workspace/Project/backend/src/Backend.Api/Infrastructure/*Queue.cs`
- `Workspace/Project/backend/src/Backend.Api/Controllers/V2/ReportsController.cs`

**UI hint:** no

### Phase 5: Frontend Contract and Authorization Parity

**Goal:** Make the operator UI match backend policy and keep frontend contracts from drifting silently.

**Requirements:** UI-01, UI-02, UI-03, UI-04

**Success Criteria:**
1. Frontend lead-level action checks align with backend `AuthorizationPolicies.LeadAccess` and related role policies.
2. Representative Analyst, Lead, Admin, IT, and DEV users have tests against expected UI visibility and backend authorization results.
3. New or changed workbench API calls go through `Workspace/Project/frontend/workbench/src/shared/gateway`.
4. Mock gateway and ASP.NET gateway parity tests cover core auth, scan, rule, report, and AI decision flows.
5. API schema organization or generation makes backend contract drift visible during CI.

**Likely Areas:**
- `Workspace/Project/frontend/workbench/src/shared/auth/session.ts`
- `Workspace/Project/frontend/workbench/src/shared/auth/role-access.ts`
- `Workspace/Project/backend/src/Backend.Api/Infrastructure/AuthorizationPolicies.cs`
- `Workspace/Project/frontend/workbench/src/shared/gateway/`
- `Workspace/Project/frontend/workbench/src/shared/api/schemas.ts`
- `Workspace/Project/frontend/workbench/e2e/`

**UI hint:** yes

### Phase 6: AI Sidecar Production Readiness

**Goal:** Make sidecar behavior bounded, reproducible, and safe to operate beside the backend.

**Requirements:** AI-01, AI-02, AI-03, AI-04

**Success Criteria:**
1. Batch scoring and evaluation endpoints enforce item-count, payload-size, timeout, and memory-safety limits.
2. Sidecar dependency versions are pinned through a constraints or lock workflow suitable for runtime and tests.
3. Model and dataset registry changes are explicit in source control and validated by pytest coverage.
4. Optional OpenAI integration uses documented environment variables and never writes secret values to logs, docs, responses, or artifacts.
5. Backend optional-dependency behavior remains graceful when the sidecar is unreachable, slow, or rejects oversized requests.

**Likely Areas:**
- `Workspace/Project/ai/service/decision_service/api.py`
- `Workspace/Project/ai/service/decision_service/config.py`
- `Workspace/Project/ai/service/artifacts/model_registry.json`
- `Workspace/Project/ai/service/artifacts/dataset_registry.json`
- `Workspace/Project/ai/service/tests/`
- `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`

**UI hint:** no

## Coverage Validation

- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

## Next Step

Run `$gsd-discuss-phase 1` to refine Phase 1 before implementation, or `$gsd-plan-phase 1` if the scope is already clear.

---
*Roadmap created: 2026-04-26*
