<!-- refreshed: 2026-04-26 -->
# Architecture

**Analysis Date:** 2026-04-26

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Operator Interfaces                       │
├──────────────────────────┬──────────────────────────────────┤
│ Next.js workbench        │ Root ASP.NET MVC/API surface      │
│ `Workspace/Project/      │ `src/IocManager.Web`              │
│ frontend/workbench`      │                                  │
└─────────────┬────────────┴──────────────────────┬───────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend HTTP APIs                         │
├──────────────────────────┬──────────────────────────────────┤
│ Merged backend API       │ Minimal scanner API               │
│ `Workspace/Project/      │ `src/IocManager.Web/Controllers`  │
│ backend/src/Backend.Api` │                                  │
└─────────────┬────────────┴──────────────────────┬───────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                Application and Infrastructure                │
├──────────────────────────┬──────────────────────────────────┤
│ Clean backend layers     │ Scanner orchestration services    │
│ `Backend.Application`    │ `src/IocManager.Web/Services`     │
│ `Backend.Domain`         │                                  │
│ `Backend.Infrastructure` │                                  │
└─────────────┬────────────┴──────────────────────┬───────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│               External Execution and Persistence             │
├──────────────────────────┬──────────────────────────────────┤
│ SQL Server / EF Core     │ PowerShell scanners / AI sidecar  │
│ `CtiDbContext`           │ `Workspace/Project/scripts`       │
│ `IocDbContext`           │ `Workspace/Project/ai/service`    │
└──────────────────────────┴──────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root solution | Visual Studio solution for the checked-in `IocManager.Web` project | `IocManager.Web.sln` |
| Workspace stack | Canonical application stack containing merged backend, frontend, AI sidecar, scanner scripts, and docs | `Workspace/README.md` |
| Merged backend API | ASP.NET Core Web API host, CORS, Serilog, middleware pipeline, hosted workers, health checks, schema initialization | `Workspace/Project/backend/src/Backend.Api/Program.cs` |
| Backend API controllers | HTTP resources for auth, rules, alerts, infrastructure, scans, AI decisions, reports, and V2 endpoints | `Workspace/Project/backend/src/Backend.Api/Controllers` |
| Backend application layer | Use-case services, validation, and application-facing abstractions | `Workspace/Project/backend/src/Backend.Application` |
| Backend contracts | Request and response DTOs shared by API endpoints and callers | `Workspace/Project/backend/src/Backend.Contracts` |
| Backend domain | Entity models, enums, factory methods, and domain invariants for CTI, IoC, scanning, rules, jobs, reports, and AI decisions | `Workspace/Project/backend/src/Backend.Domain` |
| Backend infrastructure | EF Core contexts, repositories, identity, AI sidecar clients, compatibility readers, and configuration | `Workspace/Project/backend/src/Backend.Infrastructure` |
| Backend worker | Worker-service host that composes application and infrastructure services outside the API host | `Workspace/Project/backend/src/Backend.Worker/Program.cs` |
| Frontend workbench | Next.js App Router operator UI for operational modules | `Workspace/Project/frontend/workbench/src/app` |
| Frontend shell | Shared navigation, route metadata, command palette, auth-aware access, notifications, theme, and inspector drawer | `Workspace/Project/frontend/workbench/src/components/workbench/app-shell.tsx` |
| Frontend gateway | Runtime gateway selection between ASP.NET backend and demo mocks | `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts` |
| AI sidecar | FastAPI service for decision scoring, report extraction, action plans, historical learning, scan analyst recommendations, and model evaluation | `Workspace/Project/ai/service/decision_service/api.py` |
| Scanner scripts | PowerShell scanner and discovery scripts invoked by backend orchestration | `Workspace/Project/scripts/check-ioc-scope.ps1`, `Workspace/scripts` |
| Minimal scanner API | ASP.NET Core net10 API for direct scanner orchestration and Azure SQL persistence | `src/IocManager.Web/Program.cs` |

## Pattern Overview

**Overall:** Multi-surface IoC Manager with a canonical clean-architecture backend, a Next.js workbench frontend, a FastAPI AI sidecar, and a separate minimal scanner API.

**Key Characteristics:**
- Use `Workspace/Project` for canonical active application work; `Workspace/README.md` identifies this stack as the current implementation.
- Use clean architecture boundaries in the merged backend: `Backend.Api` depends on `Backend.Application`, `Backend.Infrastructure`, and `Backend.Contracts`; `Backend.Application` depends on `Backend.Domain` and contracts; `Backend.Infrastructure` depends on application abstractions and domain.
- Use endpoint controllers for transport concerns and route orchestration; put reusable business behavior in `Backend.Application/Services` or API infrastructure services.
- Use EF Core repositories and query services behind application abstractions when a feature already has service boundaries; direct `CtiDbContext` access also exists in large V2 controllers.
- Use the frontend gateway abstraction instead of calling `fetch` directly from pages or components.
- Treat the AI sidecar as an optional external dependency reached through typed backend clients and health checks.

## Layers

**Frontend Workbench:**
- Purpose: Operator UI for auth, overview, investigations, cases, rules, distribution, server operations, scan plans, detections, reports, settings, and AI scan analyst workflows.
- Location: `Workspace/Project/frontend/workbench/src`
- Contains: Next.js app routes in `src/app`, shared shell components in `src/components/workbench`, UI primitives in `src/components/ui`, API schemas and gateway adapters in `src/shared`.
- Depends on: Next.js, React, TanStack Query, gateway clients, zod schemas, role access helpers.
- Used by: Browser users and tests under `Workspace/Project/frontend/workbench/src/**/*.test.tsx`.

**Merged Backend API:**
- Purpose: Public HTTP API, authentication, authorization, health checks, rate limiting, antiforgery, schema initialization, background workers, and operational endpoints.
- Location: `Workspace/Project/backend/src/Backend.Api`
- Contains: `Program.cs`, controllers, middlewares, API-specific infrastructure, feature POCs, dependency injection extensions.
- Depends on: `Backend.Application`, `Backend.Infrastructure`, `Backend.Contracts`, Serilog, Swagger, JWT bearer auth, FluentValidation auto-validation.
- Used by: Frontend gateway clients and any external API consumers.

**Application Layer:**
- Purpose: Business use cases, validation, service interfaces, persistence abstractions, integration abstractions, and common application exceptions.
- Location: `Workspace/Project/backend/src/Backend.Application`
- Contains: `Services`, `Validation`, `Abstractions`, `Common`, `DependencyInjection`.
- Depends on: `Backend.Domain`, `Backend.Contracts`, FluentValidation, logging abstractions.
- Used by: `Backend.Api`, `Backend.Worker`, and `Backend.Infrastructure` implementations.

**Domain Layer:**
- Purpose: Domain entities, value objects, enums, factory methods, and state transition methods.
- Location: `Workspace/Project/backend/src/Backend.Domain`
- Contains: CTI V1 domain, IoC manager entities, identity/infrastructure/scanning/rules/alerts entities, AI decision entities, rule lifecycle records.
- Depends on: No project layer.
- Used by: Application services, EF Core mappings, repositories, API controllers that query `CtiDbContext`.

**Infrastructure Layer:**
- Purpose: Data access, EF Core model configuration, SQL Server persistence, identity stores, external clients, operational services, and environment configuration.
- Location: `Workspace/Project/backend/src/Backend.Infrastructure`
- Contains: `Persistence`, `Persistence/Repositories`, `Persistence/QueryServices`, `Integrations`, `Security`, `Configuration`, compatibility readers.
- Depends on: `Backend.Application`, `Backend.Domain`, EF Core, Identity, SQL Server, HTTP clients.
- Used by: `Backend.Api` and `Backend.Worker` through `AddInfrastructure`.

**AI Sidecar:**
- Purpose: Python FastAPI decision service for scoring, explanation, report extraction, graph candidates, feedback, historical learning, scan analyst recommendations, and evaluation.
- Location: `Workspace/Project/ai/service`
- Contains: `decision_service/api.py`, `main.py`, scorer and evaluator modules, dataset/model registries, tests.
- Depends on: FastAPI, Pydantic, numpy, pandas, scikit-learn, PyYAML.
- Used by: `Backend.Infrastructure/Integrations/AiDecisionClient.cs`, `AiReportExtractionClient.cs`, `AiScanAnalystClient.cs`, and backend health checks.

**Minimal Scanner API:**
- Purpose: Direct PowerShell scanner execution, target discovery, scanner JSON parsing, IoC extraction, and Azure SQL persistence.
- Location: `src/IocManager.Web`
- Contains: controllers, `IocDbContext`, scanner orchestration services, PowerShell execution hosts, DTO contracts.
- Depends on: ASP.NET Core MVC controllers, EF Core SQL Server, PowerShell scripts, local or SSH execution.
- Used by: Root solution `IocManager.Web.sln`.

**Archive and Imported Material:**
- Purpose: Historical templates, starter kits, external snapshots, backups, logs, result outputs, and temporary copies.
- Location: `Archive`, `AI_Project`, `tmp`, `Workspace.local-backup-*`, `*_Results`
- Contains: ASP.NET/MVC starter kits, copied project trees, generated outputs, screenshots, logs, PDFs.
- Depends on: Not part of the canonical application flow.
- Used by: Reference only unless a task explicitly targets these paths.

## Data Flow

### Primary Workbench Request Path

1. User navigates to a Next.js route in `Workspace/Project/frontend/workbench/src/app/(workbench)`.
2. Route components render feature components from `Workspace/Project/frontend/workbench/src/components/workbench` or `src/features`.
3. Components call the selected `gateway` from `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`.
4. `AspNetGateway` uses shared request helpers and zod schemas from `Workspace/Project/frontend/workbench/src/shared/api/client.ts` and `src/shared/api/schemas.ts`.
5. Backend controllers in `Workspace/Project/backend/src/Backend.Api/Controllers` handle requests.
6. Controllers either call application services from `Workspace/Project/backend/src/Backend.Application/Services` or query `CtiDbContext` directly for V2 operational read/write endpoints.
7. Infrastructure repositories and EF Core context persist data through `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.
8. API responses return DTOs from `Workspace/Project/backend/src/Backend.Contracts`.

### AI Decision Flow

1. Frontend decision UI calls `/api/v2/ai/decisions` through the gateway in `Workspace/Project/frontend/workbench/src/shared/gateway`.
2. `AiDecisionsController` accepts and audits the request in `Workspace/Project/backend/src/Backend.Api/Controllers/V2/AiDecisionsController.cs`.
3. `AiDecisionService.SubmitAsync` creates an `AiDecisionRequest` and enqueues work through `IAiDecisionOrchestrator` in `Workspace/Project/backend/src/Backend.Application/Services/AiDecisionService.cs`.
4. `AiDecisionWorker` consumes queued requests from `Workspace/Project/backend/src/Backend.Api/Infrastructure/AiDecisionWorker.cs`.
5. `AiDecisionClient` posts to configured AI sidecar paths in `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`.
6. FastAPI routes in `Workspace/Project/ai/service/decision_service/api.py` execute scoring, explanation, action-plan, and historical-learning logic.
7. Results persist in AI decision tables exposed through `CtiDbContext` in `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.

### Scan Plan and Result Ingestion Flow

1. Frontend scan-plan pages under `Workspace/Project/frontend/workbench/src/app/(workbench)/operations/scan-plans` or `src/app/(workbench)/scan-plan` call backend scan endpoints through `Workspace/Project/frontend/workbench/src/shared/gateway`.
2. `ScanningController` creates scan plans, queues jobs, lists jobs, and ingests detection results in `Workspace/Project/backend/src/Backend.Api/Controllers/V2/ScanningController.cs`.
3. `IScanJobQueue` queues jobs in `Workspace/Project/backend/src/Backend.Api/Infrastructure/ScanJobQueue.cs`.
4. `ScanPlanExecutionWorker` and `ScanExecutionDispatcher` execute queued work through HTTP or agent execution paths in `Workspace/Project/backend/src/Backend.Api/Infrastructure`.
5. `ResultIngestionService` normalizes detection rows and persists scan results/provenance through `CtiDbContext`.

### Minimal Scanner API Flow

1. A caller posts to `api/scans/run` or `api/scans/run-all` in `src/IocManager.Web/Controllers/ScansController.cs`.
2. `ScanOrchestrator` resolves target configuration, scanner type, script path, and PowerShell arguments in `src/IocManager.Web/Services/ScanOrchestrator.cs`.
3. `PowerShellScriptRunner` dispatches locally or remotely through `IScriptExecutionHost` implementations in `src/IocManager.Web/Services`.
4. Scanner stdout is parsed by `ScannerOutputParser` and normalized by `IocExtractionService` in `src/IocManager.Web/Services`.
5. `EfScanRunRepository` writes scan result, IOC, and scanner detail rows via `IocDbContext` in `src/IocManager.Web/Data/IocDbContext.cs`.

### Frontend Runtime Mode Flow

1. `NEXT_PUBLIC_USE_ASPNET_GATEWAY` is read in `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`.
2. `aspnet` mode uses `AspNetGateway`; `demo` mode uses `MockGateway`; invalid flags produce `misconfigured`.
3. All feature components should import `gateway` or feature-specific gateway helpers from `Workspace/Project/frontend/workbench/src/shared/gateway`.

**State Management:**
- Frontend server state uses TanStack Query through `Workspace/Project/frontend/workbench/src/shared/query/provider.tsx` and `use-workbench-query` helpers.
- Frontend session state is held by `AuthProvider` and session helpers under `Workspace/Project/frontend/workbench/src/shared/auth`.
- Frontend shell preferences use local storage helpers such as `Workspace/Project/frontend/workbench/src/components/workbench/workbench-shell-storage.ts`.
- Backend request state is scoped through ASP.NET Core DI and EF Core `DbContext` lifetimes.
- Backend background work uses in-process queues and hosted workers in `Workspace/Project/backend/src/Backend.Api/Infrastructure`.
- AI sidecar runtime state is built once during `create_app` in `Workspace/Project/ai/service/decision_service/api.py`.

## Key Abstractions

**Gateway:**
- Purpose: Hide backend vs demo runtime data sources from React components.
- Examples: `Workspace/Project/frontend/workbench/src/shared/gateway/types.ts`, `aspnet-gateway.ts`, `mock-gateway.ts`, `index.ts`.
- Pattern: Interface plus concrete adapter selection at module load.

**Application Services:**
- Purpose: Encapsulate backend use cases behind interfaces.
- Examples: `Workspace/Project/backend/src/Backend.Application/Abstractions/Services/IAiDecisionService.cs`, `Services/AiDecisionService.cs`, `Services/RuleService.cs`.
- Pattern: Interface in `Abstractions`, implementation in `Services`, registration in `DependencyInjection/ServiceCollectionExtensions.cs`.

**Repositories and Unit of Work:**
- Purpose: Hide EF Core persistence and commit behavior from application services.
- Examples: `Workspace/Project/backend/src/Backend.Application/Abstractions/Persistence`, `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Repositories`, `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.
- Pattern: Application interfaces implemented by infrastructure repositories; `CtiDbContext` implements `IUnitOfWork`.

**EF Core Contexts:**
- Purpose: Model SQL Server persistence.
- Examples: `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Compatibility/LegacyAzure/LegacyScanPipelineDbContext.cs`, `src/IocManager.Web/Data/IocDbContext.cs`.
- Pattern: `DbSet` properties plus `ApplyConfigurationsFromAssembly` in canonical backend; inline model configuration in minimal scanner API.

**Background Queues and Workers:**
- Purpose: Move long-running discovery, distribution, scan execution, legacy pipeline, and AI decision work off request threads.
- Examples: `DiscoveryRunQueue.cs`, `RuleDistributionJobQueue.cs`, `ScanJobQueue.cs`, `AiDecisionQueue.cs`, `DiscoveryRunWorker.cs`, `ScanPlanExecutionWorker.cs`, `AiDecisionWorker.cs` under `Workspace/Project/backend/src/Backend.Api/Infrastructure`.
- Pattern: Singleton queue plus hosted service registered by `AddApiServices`.

**AI Integration Clients:**
- Purpose: Convert backend requests into sidecar HTTP payloads and parse sidecar JSON responses safely.
- Examples: `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`, `AiReportExtractionClient.cs`, `AiScanAnalystClient.cs`.
- Pattern: Typed `HttpClient` registered in infrastructure DI using `AiSidecarOptions`.

**Scanner Execution Hosts:**
- Purpose: Abstract local and SSH PowerShell execution for scan scripts.
- Examples: `src/IocManager.Web/Services/IScriptExecutionHost.cs`, `LocalScriptExecutionHost.cs`, `SshScriptExecutionHost.cs`, `PowerShellScriptRunner.cs`.
- Pattern: Strategy selected by `CanExecuteRemotely` against `PowerShellSettings.RemoteExecution.Enabled`.

## Entry Points

**Canonical Backend API:**
- Location: `Workspace/Project/backend/src/Backend.Api/Program.cs`
- Triggers: `dotnet run` or hosted API process.
- Responsibilities: load `.env`, configure Serilog, CORS, API services, middleware, infrastructure initialization, schema initialization, and `RunAsync`.

**Backend Worker Host:**
- Location: `Workspace/Project/backend/src/Backend.Worker/Program.cs`
- Triggers: `dotnet run` or worker deployment.
- Responsibilities: compose application/infrastructure services for background processing.

**Frontend Workbench:**
- Location: `Workspace/Project/frontend/workbench/src/app/layout.tsx`
- Triggers: Next.js app startup.
- Responsibilities: global fonts, metadata, providers, and route tree.

**Frontend Providers:**
- Location: `Workspace/Project/frontend/workbench/src/app/providers.tsx`
- Triggers: Root layout render.
- Responsibilities: theme, tooltips, query client, auth, and inspector contexts.

**AI Sidecar:**
- Location: `Workspace/Project/ai/service/decision_service/main.py`
- Triggers: ASGI server importing `app`.
- Responsibilities: create FastAPI app from `create_app`.

**Minimal Scanner API:**
- Location: `src/IocManager.Web/Program.cs`
- Triggers: root solution project run.
- Responsibilities: configure Azure SQL, MVC controllers, scanner services, PowerShell runners, and database readiness check.

**PowerShell Scope Guard:**
- Location: `Workspace/Project/scripts/check-ioc-scope.ps1`
- Triggers: frontend `npm run scope:check`.
- Responsibilities: project-specific scope validation for the frontend workbench.

## Architectural Constraints

- **Threading:** ASP.NET request handlers are async; backend long-running operational work uses in-process hosted services and queues in `Workspace/Project/backend/src/Backend.Api/Infrastructure`. The AI sidecar is a FastAPI process with runtime objects created during app construction. The minimal scanner API dispatches external PowerShell processes asynchronously.
- **Global state:** Frontend gateway mode is module-level state in `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`. AI sidecar runtime is captured in route closures in `Workspace/Project/ai/service/decision_service/api.py`. `CtiDbContext` contains a static immutable CTI entity type set in `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.
- **Circular imports:** Not detected from file inspection. Backend project references are layered one-way by `.csproj` files in `Workspace/Project/backend/src`.
- **Configuration:** Backend config is option-bound and validates on startup in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs` and `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`. Frontend config uses `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_USE_ASPNET_GATEWAY`. Minimal scanner API expects `AzureSql`, `PowerShell`, and `VmwareTargets` config sections.
- **Persistence:** Canonical backend uses SQL Server via EF Core `CtiDbContext`. Minimal scanner API uses SQL Server via EF Core `IocDbContext`. AI sidecar uses filesystem-backed artifacts, registry files, feedback store, and datasets under `Workspace/Project/ai`.
- **External execution:** Scanner and discovery operations depend on PowerShell scripts and optional SSH/SCP execution hosts. Keep command construction in existing execution helpers.

## Anti-Patterns

### Bypassing Gateway in Frontend

**What happens:** React components call `fetch` or hard-code backend URLs directly.
**Why it's wrong:** It bypasses runtime mode selection, schema validation, auth/session handling, and API error normalization.
**Do this instead:** Add methods to `Workspace/Project/frontend/workbench/src/shared/gateway/types.ts` and implement them in `aspnet-gateway.ts` and `mock-gateway.ts`; call through `gateway` from `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`.

### Putting Business Logic in Controllers

**What happens:** Controllers grow data-access, mapping, validation, and orchestration logic directly, as seen in larger V2 controllers such as `Workspace/Project/backend/src/Backend.Api/Controllers/V2/ScanningController.cs`.
**Why it's wrong:** It makes endpoints hard to test and duplicates behavior that belongs to use-case services.
**Do this instead:** Put reusable use-case behavior in `Workspace/Project/backend/src/Backend.Application/Services` behind interfaces in `Workspace/Project/backend/src/Backend.Application/Abstractions/Services`, then keep controllers focused on HTTP concerns.

### Crossing Clean Architecture Boundaries

**What happens:** Domain code depends on infrastructure, or application services depend directly on EF Core implementations.
**Why it's wrong:** It breaks the project reference direction expressed by `Workspace/Project/backend/src/*.csproj` and reduces testability.
**Do this instead:** Define contracts in `Backend.Application/Abstractions`; implement them in `Backend.Infrastructure`; register them in `Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`.

### Editing Archive or Generated Trees for Runtime Behavior

**What happens:** Changes are made in `Archive`, `AI_Project`, `tmp`, `Workspace.local-backup-*`, `.next`, `bin`, `obj`, or result folders.
**Why it's wrong:** Those paths are reference/generated/imported material and are not the canonical application flow.
**Do this instead:** Put backend changes under `Workspace/Project/backend`, frontend changes under `Workspace/Project/frontend/workbench`, AI changes under `Workspace/Project/ai/service`, and root minimal API changes under `src/IocManager.Web` only when explicitly targeting that surface.

## Error Handling

**Strategy:** Use structured HTTP errors and safe dependency degradation in the canonical backend; use explicit `BadRequest`/`NotFound` responses for controller validation; use optional dependency exceptions for AI sidecar failures; use startup validation for configuration.

**Patterns:**
- Global exception handling and ProblemDetails are registered in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs` and applied in `ApplicationBuilderExtensions.cs`.
- AI sidecar HTTP failures are mapped to `OptionalDependencyUnavailableException` in `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`.
- Not-found domain cases use `NotFoundException` from `Workspace/Project/backend/src/Backend.Application/Common/NotFoundException.cs`.
- Frontend API errors are normalized in `Workspace/Project/frontend/workbench/src/shared/api/client.ts` as `ApiError` and clear session on `401`.
- Minimal scanner API catches scanner JSON parse failures and script failures in `src/IocManager.Web/Controllers/ScansController.cs` and `src/IocManager.Web/Services/ScanOrchestrator.cs`.

## Cross-Cutting Concerns

**Logging:** Canonical backend uses Serilog configured in `Workspace/Project/backend/src/Backend.Api/Program.cs` and request logging in `ApplicationBuilderExtensions.cs`. Minimal scanner API uses ASP.NET `ILogger` during startup readiness in `src/IocManager.Web/Program.cs`. AI sidecar uses FastAPI route behavior and module code; explicit logging is not a primary cross-cutting abstraction in inspected files.

**Validation:** Canonical backend uses FluentValidation registered in `Workspace/Project/backend/src/Backend.Application/DependencyInjection/ServiceCollectionExtensions.cs` and auto-validation in `Backend.Api`. Controllers also parse enums and validate route/query/body combinations directly. Frontend validates API responses with zod schemas in `Workspace/Project/frontend/workbench/src/shared/api/schemas.ts`. AI sidecar validates request and response models with Pydantic contracts in `Workspace/Project/ai/service/decision_service/contracts.py`.

**Authentication:** Canonical backend uses JWT bearer auth and authorization policies registered in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs` and `Workspace/Project/backend/src/Backend.Api/Infrastructure/AuthorizationPolicies.cs`. Infrastructure can use Identity EF stores or SQL user table auth via `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`. Frontend auth is centralized under `Workspace/Project/frontend/workbench/src/shared/auth`.

**Authorization:** API endpoints use `[Authorize(Policy = ...)]` and rate-limiting attributes in `Workspace/Project/backend/src/Backend.Api/Controllers`. Frontend routes use role helpers in `Workspace/Project/frontend/workbench/src/shared/auth/role-access.ts` and route guard components under `src/components/workbench`.

**Rate Limiting and Antiforgery:** Canonical backend registers API throttling and cookie antiforgery middleware in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs` and applies them in `ApplicationBuilderExtensions.cs`.

**Health and Readiness:** Canonical backend exposes `/health/live` and `/health/ready` in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ApplicationBuilderExtensions.cs`. AI sidecar exposes `/health` in `Workspace/Project/ai/service/decision_service/api.py`.

---

*Architecture analysis: 2026-04-26*
