# Codebase Structure

**Analysis Date:** 2026-04-26

## Directory Layout

```text
IOC_Manager/
├── IocManager.Web.sln                 # Root solution for `src/IocManager.Web`
├── src/
│   ├── IocManager.Web/                # Minimal ASP.NET Core scanner API and MVC shell placeholders
│   └── Front-end/Project/             # Frontend/imported project material and snapshots
├── Workspace/
│   ├── README.md                      # Declares `Workspace/Project` as the current application stack
│   ├── Project/
│   │   ├── backend/                   # Canonical merged .NET backend solution
│   │   ├── frontend/workbench/        # Canonical Next.js workbench UI
│   │   ├── ai/                        # AI sidecar, datasets, fixtures, jobs, prompts
│   │   ├── docs/                      # Project design and policy documentation
│   │   └── scripts/                   # Workspace-scoped support scripts
│   ├── docs/                          # Scanner contracts and backend design notes
│   └── scripts/                       # PowerShell scanner/discovery scripts
├── docs/                              # Repository-level documentation
├── scripts/                           # Root scanner/discovery scripts
├── Archive/                           # Archived ASP.NET/MVC starter kits and static assets
├── AI_Project/                        # Imported/reference project copies and source snapshots
├── *_Results/                         # Scanner result output folders
├── tmp*/                              # Temporary project copies and validation output
├── *.log                              # Runtime logs and captured process output
└── .planning/codebase/                # Generated codebase maps for GSD workflows
```

## Directory Purposes

**`Workspace/Project`:**
- Purpose: Current canonical IoC Manager implementation stack.
- Contains: Backend, frontend, AI sidecar, docs, and scripts.
- Key files: `Workspace/README.md`, `Workspace/Project/backend/Backend.sln`, `Workspace/Project/frontend/workbench/package.json`, `Workspace/Project/ai/service/pyproject.toml`.

**`Workspace/Project/backend`:**
- Purpose: Merged backend solution with clean-architecture projects.
- Contains: `src` projects, `tests`, and tooling.
- Key files: `Workspace/Project/backend/Backend.sln`, `Workspace/Project/backend/src/Backend.Api/Program.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.

**`Workspace/Project/backend/src/Backend.Api`:**
- Purpose: ASP.NET Core HTTP host and API boundary.
- Contains: `Controllers`, `Controllers/V2`, `DependencyInjection`, `Features`, `Infrastructure`, `Middlewares`, `Properties`.
- Key files: `Workspace/Project/backend/src/Backend.Api/Program.cs`, `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`, `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ApplicationBuilderExtensions.cs`.

**`Workspace/Project/backend/src/Backend.Application`:**
- Purpose: Application use cases and boundaries.
- Contains: `Abstractions`, `Common`, `DependencyInjection`, `Services`, `Validation`.
- Key files: `Workspace/Project/backend/src/Backend.Application/DependencyInjection/ServiceCollectionExtensions.cs`, `Workspace/Project/backend/src/Backend.Application/Services/AiDecisionService.cs`.

**`Workspace/Project/backend/src/Backend.Contracts`:**
- Purpose: DTO contracts grouped by domain area.
- Contains: `Admin`, `Alerts`, `Auth`, `Cases`, `CoveragePain`, `CtiPolicy`, `Decisions`, `Deployments`, `Evidence`, `Feedback`, `Reports`, `RuleLifecycle`, `Rules`, `Security`, `V2`.
- Key files: `Workspace/Project/backend/src/Backend.Contracts/V2/AiDecisionContracts.cs`, `Workspace/Project/backend/src/Backend.Contracts/V2/ScanningContracts.cs`.

**`Workspace/Project/backend/src/Backend.Domain`:**
- Purpose: Domain entities, enums, value objects, and domain methods.
- Contains: `AiDecision`, `Cases`, `Common`, `Cti`, `Decisions`, `Deployments`, `Evidence`, `Feedback`, `IocManager`, `Jobs`, `Reports`, `RuleLifecycle`, `Rules`.
- Key files: `Workspace/Project/backend/src/Backend.Domain/IocManager/ScanningEntities.cs`, `Workspace/Project/backend/src/Backend.Domain/AiDecision/AiDecisionEntities.cs`, `Workspace/Project/backend/src/Backend.Domain/Cti/V1/Policy/DeterministicDecisionPolicyEngine.cs`.

**`Workspace/Project/backend/src/Backend.Infrastructure`:**
- Purpose: Persistence, configuration, external integrations, identity/security, and service implementations.
- Contains: `Compatibility`, `Configuration`, `DependencyInjection`, `Integrations`, `Persistence`, `Security`, `Services`.
- Key files: `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`.

**`Workspace/Project/backend/src/Backend.Worker`:**
- Purpose: Worker-service entry point for backend background tasks outside the API host.
- Contains: Worker project files and `Program.cs`.
- Key files: `Workspace/Project/backend/src/Backend.Worker/Program.cs`, `Workspace/Project/backend/src/Backend.Worker/Backend.Worker.csproj`.

**`Workspace/Project/backend/tests/Backend.Tests`:**
- Purpose: Backend test project.
- Contains: Test project and test program.
- Key files: `Workspace/Project/backend/tests/Backend.Tests/Backend.Tests.csproj`, `Workspace/Project/backend/tests/Backend.Tests/Program.cs`.

**`Workspace/Project/frontend/workbench`:**
- Purpose: Next.js App Router workbench UI.
- Contains: `src/app`, `src/components`, `src/features`, `src/lib`, `src/shared`, `test`, config files.
- Key files: `Workspace/Project/frontend/workbench/package.json`, `Workspace/Project/frontend/workbench/src/app/layout.tsx`, `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`.

**`Workspace/Project/frontend/workbench/src/app`:**
- Purpose: Next.js route tree.
- Contains: Route groups `(auth)` and `(workbench)`, root layout, providers, global styles, loading and error boundaries.
- Key files: `Workspace/Project/frontend/workbench/src/app/layout.tsx`, `Workspace/Project/frontend/workbench/src/app/providers.tsx`, `Workspace/Project/frontend/workbench/src/app/(workbench)/layout.tsx`.

**`Workspace/Project/frontend/workbench/src/components`:**
- Purpose: React UI components.
- Contains: `ui` primitives and `workbench` feature/shell components.
- Key files: `Workspace/Project/frontend/workbench/src/components/workbench/app-shell.tsx`, `Workspace/Project/frontend/workbench/src/components/workbench/nav.ts`, `Workspace/Project/frontend/workbench/src/components/ui/button.tsx`.

**`Workspace/Project/frontend/workbench/src/shared`:**
- Purpose: Shared frontend infrastructure and domain helpers.
- Contains: `api`, `auth`, `domain`, `gateway`, `mock`, `modules`, `query`, `theme`, `ui`.
- Key files: `Workspace/Project/frontend/workbench/src/shared/api/client.ts`, `Workspace/Project/frontend/workbench/src/shared/api/schemas.ts`, `Workspace/Project/frontend/workbench/src/shared/auth/auth-provider.tsx`, `Workspace/Project/frontend/workbench/src/shared/gateway/types.ts`.

**`Workspace/Project/ai`:**
- Purpose: AI governance assets, datasets, fixtures, jobs, and sidecar service.
- Contains: `datasets`, `fixtures`, `jobs`, `notebooks`, `prompts`, `schemas`, `scripts`, `service`, `tests`.
- Key files: `Workspace/Project/ai/README.md`, `Workspace/Project/ai/prompts/labeling-guidelines.md`, `Workspace/Project/ai/service/pyproject.toml`.

**`Workspace/Project/ai/service`:**
- Purpose: Python FastAPI decision sidecar package and tests.
- Contains: `decision_service` package and `tests`.
- Key files: `Workspace/Project/ai/service/decision_service/main.py`, `Workspace/Project/ai/service/decision_service/api.py`, `Workspace/Project/ai/service/decision_service/contracts.py`.

**`Workspace/scripts`:**
- Purpose: PowerShell scanner and discovery scripts used by application workflows.
- Contains: `Invoke-YaraScan.ps1`, `Invoke-SigmaScan.ps1`, `Invoke-SnortScan.ps1`, `Invoke-SuricataScan.ps1`, `SweepNetworkv2.ps1`, `check-ioc-scope.ps1`.
- Key files: `Workspace/scripts/Invoke-YaraScan.ps1`, `Workspace/scripts/SweepNetworkv2.ps1`.

**`src/IocManager.Web`:**
- Purpose: Minimal ASP.NET Core scanner API and root solution project.
- Contains: `Contracts`, `Controllers`, `Data`, `Entities`, `Options`, `Services`, `Views`, `wwwroot`.
- Key files: `src/IocManager.Web/Program.cs`, `src/IocManager.Web/IocManager.Web.csproj`, `src/IocManager.Web/Data/IocDbContext.cs`, `src/IocManager.Web/Services/ScanOrchestrator.cs`.

**`src/IocManager.Web/Controllers`:**
- Purpose: Scanner, target, and network HTTP endpoints.
- Contains: `ScansController.cs`, `TargetsController.cs`, `NetworksController.cs`.
- Key files: `src/IocManager.Web/Controllers/ScansController.cs`, `src/IocManager.Web/Controllers/TargetsController.cs`.

**`src/IocManager.Web/Services`:**
- Purpose: Scanner orchestration, PowerShell execution, parsing, extraction, repositories, and target discovery.
- Contains: Interfaces and implementations for scan runs, target inventory, script runners, and execution hosts.
- Key files: `src/IocManager.Web/Services/ScanOrchestrator.cs`, `src/IocManager.Web/Services/PowerShellScriptRunner.cs`, `src/IocManager.Web/Services/EfScanRunRepository.cs`, `src/IocManager.Web/Services/TargetDiscoveryService.cs`.

**`Archive`:**
- Purpose: Archived starter kit/reference material.
- Contains: ASP.NET and MVC starter kits, documentation, static assets, packages.
- Key files: `Archive/Asp-Net/Starterkit/Tocly/Program.cs`, `Archive/Mvc/Starterkit/Tocly/Tocly.csproj`.

**`AI_Project`:**
- Purpose: Imported/reference copies and historical source snapshots.
- Contains: GitHub latest repo copies and project duplicates.
- Key files: `AI_Project/GitHub latest repo/Workspace/Project/backend/src/Backend.Api/Program.cs`.

**`*_Results`:**
- Purpose: Generated scanner outputs.
- Contains: JSON or scanner-specific result artifacts for YARA, SIGMA, SNORT, SURICATA, SWEEPNETWORKV2.
- Key files: `YARA_Results`, `SIGMA_Results`, `SNORT_Results`, `SURICATA_Results`, `SWEEPNETWORKV2_Results`.

**`.planning/codebase`:**
- Purpose: Generated codebase maps consumed by GSD planning and execution commands.
- Contains: Architecture, structure, stack, integration, convention, testing, and concern documents when generated.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.

## Key File Locations

**Entry Points:**
- `Workspace/Project/backend/src/Backend.Api/Program.cs`: Canonical backend API entry point.
- `Workspace/Project/backend/src/Backend.Worker/Program.cs`: Backend worker entry point.
- `Workspace/Project/frontend/workbench/src/app/layout.tsx`: Frontend root layout.
- `Workspace/Project/frontend/workbench/src/app/page.tsx`: Frontend root route.
- `Workspace/Project/ai/service/decision_service/main.py`: AI sidecar ASGI entry point.
- `src/IocManager.Web/Program.cs`: Root-solution minimal scanner API entry point.

**Configuration:**
- `Workspace/Project/backend/src/Backend.Api/appsettings.json`: Canonical backend base configuration.
- `Workspace/Project/backend/src/Backend.Api/appsettings.Development.json`: Canonical backend development overrides.
- `Workspace/Project/backend/src/Backend.Infrastructure/Configuration`: Backend option models and `.env` loading helpers.
- `Workspace/Project/frontend/workbench/next.config.ts`: Next.js configuration.
- `Workspace/Project/frontend/workbench/tsconfig.json`: Frontend TypeScript configuration.
- `Workspace/Project/frontend/workbench/vitest.config.ts`: Frontend unit test configuration.
- `Workspace/Project/frontend/workbench/playwright.config.mjs`: Frontend E2E configuration.
- `Workspace/Project/ai/service/pyproject.toml`: AI sidecar package and test configuration.
- `src/IocManager.Web/appsettings.json`: Minimal scanner API configuration.
- `src/IocManager.Web/Properties/launchSettings.json`: Minimal scanner API launch profiles.

**Core Logic:**
- `Workspace/Project/backend/src/Backend.Api/Controllers/V2`: Canonical V2 API endpoints.
- `Workspace/Project/backend/src/Backend.Application/Services`: Canonical backend use-case services.
- `Workspace/Project/backend/src/Backend.Application/Validation`: FluentValidation validators.
- `Workspace/Project/backend/src/Backend.Domain`: Domain model source.
- `Workspace/Project/backend/src/Backend.Infrastructure/Persistence`: EF Core context, mappings, repositories, and query services.
- `Workspace/Project/backend/src/Backend.Infrastructure/Integrations`: External HTTP integrations.
- `Workspace/Project/backend/src/Backend.Api/Infrastructure`: Hosted workers, queues, scan execution, legacy pipeline, schema initializers, and API-specific operational services.
- `Workspace/Project/frontend/workbench/src/shared/gateway`: Frontend backend/demo data source adapters.
- `Workspace/Project/frontend/workbench/src/shared/api`: Frontend request helpers and zod schemas.
- `Workspace/Project/ai/service/decision_service`: AI sidecar scoring, explanation, extraction, evaluation, and registry logic.
- `src/IocManager.Web/Services`: Minimal scanner API orchestration and execution logic.

**Testing:**
- `Workspace/Project/backend/tests/Backend.Tests`: Backend test project.
- `Workspace/Project/frontend/workbench/src/**/*.test.ts`: Frontend unit tests.
- `Workspace/Project/frontend/workbench/src/**/*.test.tsx`: Frontend component tests.
- `Workspace/Project/frontend/workbench/test`: Frontend test support.
- `Workspace/Project/ai/service/tests`: AI sidecar pytest suite.

**Documentation:**
- `Workspace/README.md`: Workspace stack notes and canonical app pointer.
- `Workspace/docs/script-contracts.md`: Scanner script contract notes.
- `Workspace/docs/backend-minimal-design.md`: Minimal backend design notes.
- `Workspace/Project/docs`: Project policy and design docs.
- `Workspace/Project/ai/README.md`: AI governance and sidecar layout notes.

## Naming Conventions

**Files:**
- C# classes use PascalCase file names matching primary type names: `AiDecisionService.cs`, `CtiDbContext.cs`, `ScanningController.cs`.
- C# interfaces use `I` prefix and PascalCase: `IAiDecisionService.cs`, `IUnitOfWork.cs`, `IScanJobQueue.cs`.
- C# partial service files add domain suffixes when a class is split: `LegacyScanPipelineService.Alerts.cs`, `LegacyScanPipelineService.Reporting.cs`.
- Frontend routes use Next.js reserved names: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
- Frontend shared/component files use kebab-case: `app-shell.tsx`, `workbench-route-meta.ts`, `api/client.ts`.
- Frontend tests use `.test.ts` or `.test.tsx` beside implementation files.
- Python sidecar modules use snake_case: `decision_support.py`, `historical_learning.py`, `action_plan_recommender.py`.
- PowerShell scripts use verb-noun names: `Invoke-YaraScan.ps1`, `SweepNetworkv2.ps1`.

**Directories:**
- Backend project directories use PascalCase project names: `Backend.Api`, `Backend.Application`, `Backend.Domain`, `Backend.Infrastructure`, `Backend.Contracts`, `Backend.Worker`.
- Backend feature/domain directories use PascalCase: `Controllers/V2`, `RuleLifecycle`, `AiDecision`, `Persistence/Repositories`.
- Frontend route directories use kebab-case and Next.js route groups: `(auth)`, `(workbench)`, `results-ingestion`, `scan-analyst`.
- Frontend shared infrastructure directories use lowercase names: `api`, `auth`, `gateway`, `query`, `theme`.
- AI sidecar package directories use snake_case or lowercase: `decision_service`, `datasets`, `fixtures`, `jobs`.

## Where to Add New Code

**New Backend API Endpoint:**
- Controller: `Workspace/Project/backend/src/Backend.Api/Controllers` or `Workspace/Project/backend/src/Backend.Api/Controllers/V2`.
- DTO contracts: `Workspace/Project/backend/src/Backend.Contracts` under the matching domain folder.
- Use-case service: `Workspace/Project/backend/src/Backend.Application/Services`.
- Service interface: `Workspace/Project/backend/src/Backend.Application/Abstractions/Services`.
- Persistence interface: `Workspace/Project/backend/src/Backend.Application/Abstractions/Persistence`.
- Repository implementation: `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Repositories`.
- Registration: `Workspace/Project/backend/src/Backend.Application/DependencyInjection/ServiceCollectionExtensions.cs` or `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`.
- Tests: `Workspace/Project/backend/tests/Backend.Tests`.

**New Backend Domain Entity:**
- Entity: `Workspace/Project/backend/src/Backend.Domain/<DomainArea>`.
- DbSet: `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.
- EF mapping: `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Configurations` if present for the domain area; otherwise follow existing persistence structure under `Persistence`.
- Contracts: `Workspace/Project/backend/src/Backend.Contracts/<DomainArea>`.

**New Background Worker or Queue:**
- Queue and worker implementation: `Workspace/Project/backend/src/Backend.Api/Infrastructure`.
- Options: `Workspace/Project/backend/src/Backend.Api/Infrastructure` or `Workspace/Project/backend/src/Backend.Infrastructure/Configuration` depending on ownership.
- Registration: `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`.

**New Frontend Page:**
- Route file: `Workspace/Project/frontend/workbench/src/app/(workbench)/<route>/page.tsx`.
- Shared page component: `Workspace/Project/frontend/workbench/src/components/workbench/<feature-name>.tsx` when the page grows beyond routing/composition.
- Navigation metadata: `Workspace/Project/frontend/workbench/src/components/workbench/workbench-route-meta.ts`.
- API access: `Workspace/Project/frontend/workbench/src/shared/gateway`.
- Schemas: `Workspace/Project/frontend/workbench/src/shared/api/schemas.ts`.
- Tests: colocate as `.test.tsx` beside the page/component.

**New Frontend UI Primitive:**
- Implementation: `Workspace/Project/frontend/workbench/src/components/ui`.
- Shared styling helpers: `Workspace/Project/frontend/workbench/src/lib/utils.ts`.

**New Frontend Gateway Method:**
- Interface: `Workspace/Project/frontend/workbench/src/shared/gateway/types.ts`.
- ASP.NET implementation: `Workspace/Project/frontend/workbench/src/shared/gateway/aspnet-gateway.ts`.
- Mock implementation: `Workspace/Project/frontend/workbench/src/shared/gateway/mock-gateway.ts`.
- Runtime exports: `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`.
- Request/schema helpers: `Workspace/Project/frontend/workbench/src/shared/api/client.ts` and `schemas.ts`.

**New AI Sidecar Endpoint:**
- Contract model: `Workspace/Project/ai/service/decision_service/contracts.py`.
- Route: `Workspace/Project/ai/service/decision_service/api.py`.
- Logic module: `Workspace/Project/ai/service/decision_service/<feature>.py`.
- Tests: `Workspace/Project/ai/service/tests/test_<feature>.py`.
- Backend integration client: `Workspace/Project/backend/src/Backend.Infrastructure/Integrations`.
- Backend abstraction: `Workspace/Project/backend/src/Backend.Application/Abstractions/Integrations`.
- Options: `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/AiSidecarOptions.cs`.

**New Scanner Script:**
- Script: `Workspace/scripts` for shared scanner/discovery scripts or `Workspace/Project/scripts` for project-scoped support scripts.
- Backend execution integration: `Workspace/Project/backend/src/Backend.Api/Infrastructure` for canonical stack, or `src/IocManager.Web/Services/ScanOrchestrator.cs` for minimal scanner API work.
- Script contracts/docs: `Workspace/docs/script-contracts.md`.

**New Minimal Scanner API Feature:**
- Controller: `src/IocManager.Web/Controllers`.
- Request/response contracts: `src/IocManager.Web/Contracts`.
- Service: `src/IocManager.Web/Services`.
- Data model: `src/IocManager.Web/Data/IocDbContext.cs` or `src/IocManager.Web/Entities`.
- Options: `src/IocManager.Web/Options`.

**Utilities:**
- Backend application utilities: `Workspace/Project/backend/src/Backend.Application/Common`.
- Backend infrastructure utilities: `Workspace/Project/backend/src/Backend.Infrastructure/Configuration`, `Security`, or `Services`.
- Frontend utilities: `Workspace/Project/frontend/workbench/src/lib` or `Workspace/Project/frontend/workbench/src/shared`.
- AI utilities: `Workspace/Project/ai/service/decision_service`.

## Special Directories

**`Archive`:**
- Purpose: Archived starter kits and reference templates.
- Generated: No.
- Committed: Yes.

**`AI_Project`:**
- Purpose: Imported project/source snapshots.
- Generated: No.
- Committed: Yes.

**`tmp`, `tmp_script_validation`, `tmp_workspace_*`:**
- Purpose: Temporary validation output and copied project trees.
- Generated: Yes.
- Committed: Present in working tree.

**`Workspace.local-backup-*`:**
- Purpose: Local backup copies of workspace content.
- Generated: Yes.
- Committed: Present in working tree.

**`*_Results`:**
- Purpose: Scanner output directories consumed or produced by scanner workflows.
- Generated: Yes.
- Committed: Present in working tree.

**`src/IocManager.Web/bin`, `src/IocManager.Web/obj`, `Workspace/Project/backend/src/*/bin`, `Workspace/Project/backend/src/*/obj`:**
- Purpose: .NET build outputs.
- Generated: Yes.
- Committed: Should be ignored for source edits.

**`Workspace/Project/frontend/workbench/.next`, `src/Front-end/Project/detective-frontend/.next`:**
- Purpose: Next.js build/dev output.
- Generated: Yes.
- Committed: Should be ignored for source edits.

**`Workspace/Project/ai/service/.venv`, `.pytest_cache`, `__pycache__`:**
- Purpose: Python virtual environment, pytest cache, and bytecode cache.
- Generated: Yes.
- Committed: Should be ignored for source edits.

**`.planning`:**
- Purpose: GSD planning, execution, and codebase intelligence artifacts.
- Generated: Yes.
- Committed: Managed by GSD workflows.

---

*Structure analysis: 2026-04-26*
