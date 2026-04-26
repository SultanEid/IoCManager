# Technology Stack

**Analysis Date:** 2026-04-26

## Languages

**Primary:**
- C# / .NET 8 - Active backend API, worker, domain, infrastructure, contracts, and tests under `Workspace/Project/backend`.
- TypeScript - Active Next.js workbench UI under `Workspace/Project/frontend/workbench`.
- Python 3.11+ - FastAPI AI sidecar under `Workspace/Project/ai/service`.

**Secondary:**
- JavaScript / ESM - Playwright config and test helpers in `Workspace/Project/frontend/workbench/playwright.config.mjs` and `Workspace/Project/frontend/workbench/e2e`.
- PowerShell - Local validation and sidecar scripts in `Workspace/Project/scripts/check-ioc-scope.ps1`, `Workspace/Project/ai/service/start-sidecar.ps1`, and scanner execution paths in `src/IocManager.Web/Services/PowerShellScriptRunner.cs`.
- C# / .NET 10 - Separate MVC-style app at `src/IocManager.Web/IocManager.Web.csproj`; root `IocManager.Web.sln` points at this project.

## Runtime

**Environment:**
- .NET SDK/runtime: active backend targets `net8.0` in `Workspace/Project/backend/src/Backend.Api/Backend.Api.csproj`, `Workspace/Project/backend/src/Backend.Worker/Backend.Worker.csproj`, and related projects. The local shell reports .NET SDK `8.0.419`.
- Node.js: active frontend uses Next.js and npm scripts from `Workspace/Project/frontend/workbench/package.json`; no `engines` field is declared. The local shell reports Node `v24.14.1`.
- Python: AI sidecar declares `requires-python = ">=3.11"` in `Workspace/Project/ai/service/pyproject.toml`. The local shell reports Python `3.10.0`, so use a Python 3.11+ environment for the sidecar.

**Package Manager:**
- NuGet - Backend packages are restored from `Workspace/Project/backend/NuGet.Config`, which clears package sources and uses `nuget.org`.
- npm `11.11.0` - Active frontend scripts and dependencies are in `Workspace/Project/frontend/workbench/package.json`.
- Lockfile: `Workspace/Project/frontend/workbench/package-lock.json` is present.
- Python packaging - Sidecar is installable with `pip install -e .[dev]` from `Workspace/Project/ai/service/pyproject.toml`.

## Frameworks

**Core:**
- ASP.NET Core 8 - Web API entry point in `Workspace/Project/backend/src/Backend.Api/Program.cs`.
- .NET Worker Service 8 - Worker process in `Workspace/Project/backend/src/Backend.Worker/Backend.Worker.csproj`.
- Entity Framework Core 8 - SQL Server persistence in `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs` and registration in `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`.
- ASP.NET Core Identity - User and role persistence through `IdentityDbContext<ApplicationUser, ApplicationRole, Guid>` in `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.
- Next.js 16.1.6 - Workbench app configured by `Workspace/Project/frontend/workbench/next.config.ts`.
- React 19.2.3 - UI runtime declared in `Workspace/Project/frontend/workbench/package.json`.
- Tailwind CSS 4 - PostCSS plugin configured in `Workspace/Project/frontend/workbench/postcss.config.mjs`.
- shadcn/ui configuration - Component aliases and lucide icon library configured in `Workspace/Project/frontend/workbench/components.json`.
- FastAPI 0.115+ - AI sidecar app created in `Workspace/Project/ai/service/decision_service/api.py`.
- Pydantic 2.8+ - Sidecar request/response contracts in `Workspace/Project/ai/service/decision_service/contracts.py`.

**Testing:**
- xUnit 2.8.1 + FluentAssertions 6.12.1 - Backend tests in `Workspace/Project/backend/tests/Backend.Tests/Backend.Tests.csproj`.
- Microsoft.AspNetCore.Mvc.Testing 8.0.16 - Backend integration test host in `Workspace/Project/backend/tests/Backend.Tests/Integration/TestWebApplicationFactory.cs`.
- EF Core InMemory 8.0.16 - Backend test database provider in `Workspace/Project/backend/tests/Backend.Tests/Backend.Tests.csproj`.
- Vitest 4.1.0 + jsdom 28.1.0 - Frontend unit tests configured in `Workspace/Project/frontend/workbench/vitest.config.ts`.
- Playwright 1.58.2 - Frontend E2E tests configured in `Workspace/Project/frontend/workbench/playwright.config.mjs`.
- pytest 8+ - AI sidecar tests configured by `Workspace/Project/ai/service/pyproject.toml`.

**Build/Dev:**
- `dotnet restore`, `dotnet build`, `dotnet run`, and `dotnet test` are documented in `Workspace/Project/backend/README.md`.
- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run test:e2e` are declared in `Workspace/Project/frontend/workbench/package.json`.
- `uvicorn decision_service.main:app` runs the sidecar, documented in `Workspace/Project/ai/service/README.md`.
- ESLint 9 + Next config are in `Workspace/Project/frontend/workbench/eslint.config.mjs`.
- TypeScript strict mode and `@/*` alias are configured in `Workspace/Project/frontend/workbench/tsconfig.json`.

## Key Dependencies

**Critical:**
- `Microsoft.EntityFrameworkCore.SqlServer` 8.0.12 - SQL Server provider for the active backend in `Workspace/Project/backend/src/Backend.Infrastructure/Backend.Infrastructure.csproj`.
- `Microsoft.AspNetCore.Authentication.JwtBearer` 8.0.12 - JWT API authentication in `Workspace/Project/backend/src/Backend.Api/Backend.Api.csproj`.
- `Microsoft.AspNetCore.Identity.EntityFrameworkCore` 8.0.12 - Identity storage in `Workspace/Project/backend/src/Backend.Infrastructure/Backend.Infrastructure.csproj`.
- `System.IdentityModel.Tokens.Jwt` 7.5.1 - Token creation and validation in `Workspace/Project/backend/src/Backend.Infrastructure/Backend.Infrastructure.csproj`.
- `FluentValidation` 11.11.0 and `FluentValidation.AspNetCore` 11.3.0 - Application validation in `Workspace/Project/backend/src/Backend.Application/Backend.Application.csproj` and `Workspace/Project/backend/src/Backend.Api/Backend.Api.csproj`.
- `next` 16.1.6, `react` 19.2.3, and `react-dom` 19.2.3 - Workbench UI runtime in `Workspace/Project/frontend/workbench/package.json`.
- `zod` 4.3.6 - Frontend runtime API schemas in `Workspace/Project/frontend/workbench/src/shared/api/schemas.ts`.
- `jose` 6.2.1 - Frontend JWT decoding in `Workspace/Project/frontend/workbench/src/shared/auth/session.ts`.
- `fastapi`, `uvicorn`, `pydantic`, `numpy`, `pandas`, `scikit-learn`, and `PyYAML` - AI sidecar runtime in `Workspace/Project/ai/service/pyproject.toml`.

**Infrastructure:**
- `Serilog.AspNetCore`, `Serilog.Settings.Configuration`, and `Serilog.Sinks.Console` - Backend structured console logging in `Workspace/Project/backend/src/Backend.Api/Backend.Api.csproj` and `Workspace/Project/backend/src/Backend.Worker/Backend.Worker.csproj`.
- `Swashbuckle.AspNetCore` 6.6.2 - Swagger/OpenAPI in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`.
- `@tanstack/react-query` 5.90.21 and `@tanstack/react-table` 8.21.3 - Frontend server-state and table UI dependencies in `Workspace/Project/frontend/workbench/package.json`.
- `@monaco-editor/react` 4.7.0 and `monaco-editor` 0.55.1 - Editor surfaces in `Workspace/Project/frontend/workbench/package.json`.
- `cytoscape` 3.33.1 - Graph visualization support in `Workspace/Project/frontend/workbench/package.json`.
- `framer-motion` 12.6.3, `lucide-react` 0.577.0, `cmdk` 1.1.1, and `@base-ui/react` 1.3.0 - UI interaction and component dependencies in `Workspace/Project/frontend/workbench/package.json`.

## Configuration

**Environment:**
- Active backend configuration comes from `Workspace/Project/backend/src/Backend.Api/appsettings.json`, `Workspace/Project/backend/src/Backend.Api/appsettings.Development.json`, environment variables, and development `.env` loading via `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/DotEnvLoader.cs`.
- Active backend database configuration uses `ConnectionStrings:Main`, `CONNECTIONSTRINGS__MAIN`, or `SQLSERVER_*` variables through `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/DatabaseConnectionStringResolver.cs`.
- Active backend auth configuration uses `Auth:Jwt`, `Auth:Identity`, `Auth:BootstrapAdmin`, and optional `Auth:SqlUserTable` sections configured in `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`.
- AI sidecar backend integration uses `AiSidecar:*` options from `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/AiSidecarOptions.cs`.
- Frontend backend URL and runtime mode use `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_USE_ASPNET_GATEWAY` in `Workspace/Project/frontend/workbench/next.config.ts`, `Workspace/Project/frontend/workbench/src/shared/api/client.ts`, and `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`.
- AI sidecar reads `IOC_MANAGER_AI_*`, `CTI_SIDECAR_*`, `OPENAI_API_KEY`, `IOC_MANAGER_OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `IOC_MANAGER_OPENAI_BASE_URL` in `Workspace/Project/ai/service/decision_service/config.py`.
- Secret-bearing files are present but were not read: `Workspace/Project/backend/.env.example`, `Workspace/Project/frontend/workbench/.env.example`, `Workspace/Project/ai/service/.env.example`, `src/Front-end/Project/detective-frontend/.env.local`, and `src/Front-end/Project/detective-frontend/.env.example`.

**Build:**
- Backend solution: `Workspace/Project/backend/Backend.sln`.
- Root secondary solution: `IocManager.Web.sln`.
- Frontend config: `Workspace/Project/frontend/workbench/next.config.ts`, `Workspace/Project/frontend/workbench/tsconfig.json`, `Workspace/Project/frontend/workbench/eslint.config.mjs`, `Workspace/Project/frontend/workbench/postcss.config.mjs`, `Workspace/Project/frontend/workbench/vitest.config.ts`, and `Workspace/Project/frontend/workbench/playwright.config.mjs`.
- Sidecar package config: `Workspace/Project/ai/service/pyproject.toml`.
- NuGet source config: `Workspace/Project/backend/NuGet.Config`.

## Platform Requirements

**Development:**
- Use .NET SDK 8 for active backend projects in `Workspace/Project/backend`.
- Use npm with the committed `Workspace/Project/frontend/workbench/package-lock.json` for the active workbench.
- Use Python 3.11+ for `Workspace/Project/ai/service`, even if another Python is first on `PATH`.
- SQL Server or LocalDB is required for backend readiness; development defaults and overrides are documented in `Workspace/Project/docs/environment-reference.md`.
- Run the AI sidecar on `http://localhost:8100` when using sidecar-dependent backend endpoints.

**Production:**
- Deployment target is not detected in repository config. No Dockerfile, docker-compose file, or CI workflow was detected at the repo root or under `Workspace/Project`.
- Non-development backend environments require HTTPS metadata for JWT validation and a configured `Auth:Jwt:SigningKey`, enforced in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`.
- Production database configuration should use a full SQL Server connection string or explicit `SQLSERVER_*` variables resolved by `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/DatabaseConnectionStringResolver.cs`.

---

*Stack analysis: 2026-04-26*
