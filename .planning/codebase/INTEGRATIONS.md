# External Integrations

**Analysis Date:** 2026-04-26

## APIs & External Services

**Frontend to Backend:**
- ASP.NET backend API - Workbench calls `/api/*` and `/health/*` through the API client and Next rewrites.
  - SDK/Client: native `fetch` wrapped by `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.
  - Auth: Bearer token from `Workspace/Project/frontend/workbench/src/shared/auth/session.ts`.
  - Configuration: `NEXT_PUBLIC_API_BASE_URL` in `Workspace/Project/frontend/workbench/src/shared/api/client.ts` and `Workspace/Project/frontend/workbench/next.config.ts`.
- Workbench gateway mode - Switches between live ASP.NET gateway and deterministic mock mode.
  - SDK/Client: `AspNetGateway`, `MockGateway`, and `AugmentedGateway` selected in `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`.
  - Auth: JWT token response from `POST /api/auth/token`.
  - Configuration: `NEXT_PUBLIC_USE_ASPNET_GATEWAY`.

**Backend to AI Sidecar:**
- IoC Manager AI sidecar - Optional HTTP dependency for report extraction, case scoring, explanations, action recommendations, historical learning, and scan planning.
  - SDK/Client: typed `HttpClient` registrations in `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`.
  - Client implementations: `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiReportExtractionClient.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`, and `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiScanAnalystClient.cs`.
  - Auth: Not detected between backend and sidecar.
  - Configuration: `AiSidecar:BaseUrl`, `AiSidecar:ScanAnalystPath`, `AiSidecar:ReportExtractionPath`, `AiSidecar:ScoreCasePath`, `AiSidecar:ExplainCasePath`, `AiSidecar:RecommendActionPath`, `AiSidecar:HistoricalLearningPath`, and `AiSidecar:TimeoutSeconds` from `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/AiSidecarOptions.cs`.
  - Default endpoint base: `http://localhost:8100`.
- FastAPI sidecar endpoints - Exposed by `Workspace/Project/ai/service/decision_service/api.py`.
  - Incoming endpoints: `GET /health`, `POST /extract_report`, `POST /ingest_report`, `POST /score_case`, `POST /score_batch`, `POST /recommend_action`, `POST /request_more_evidence`, `POST /feedback`, `POST /historical_learning/query`, `POST /scan_analyst`, `POST /evaluate_model`, `POST /graph_neighbors`, `POST /graph/link_candidates`, and `POST /explain_case`.
  - Auth: Not detected.

**AI Provider:**
- OpenAI Responses API - Optional scan-planner refinement from the AI sidecar.
  - SDK/Client: Python standard-library `urllib.request` in `Workspace/Project/ai/service/decision_service/scan_analyst.py`.
  - Endpoint: `{openai_base_url}/responses`, defaulting to `https://api.openai.com/v1/responses` through `Workspace/Project/ai/service/decision_service/config.py`.
  - Auth: `OPENAI_API_KEY` or `IOC_MANAGER_OPENAI_API_KEY`.
  - Model config: `IOC_MANAGER_AI_SCAN_ANALYST_MODEL` or `IOC_MANAGER_OPENAI_MODEL`.
- LLM assist provider gateway - Optional phrasing assist uses a provider registry without a built-in remote provider implementation.
  - SDK/Client: provider callable registry in `Workspace/Project/ai/service/decision_service/llm_assist_phrasing.py`.
  - Auth: Provider-specific, not detected in code.
  - Configuration: `CTI_ENABLE_LLM_ASSIST`, `CTI_LLM_ASSIST_PROVIDER`, `CTI_LLM_ASSIST_MODEL`, and `CTI_LLM_ASSIST_TIMEOUT_MS`.

**Managed Scanner Connectors:**
- Agent scan execution endpoint - Backend dispatches read-only scan jobs to managed connector HTTP endpoints.
  - SDK/Client: named `HttpClient` `ScanExecutionTransport` in `Workspace/Project/backend/src/Backend.Api/Infrastructure/ScanExecutionDispatcher.cs`.
  - Auth: connector bearer token or custom header from encrypted target-server secret payloads handled by `Workspace/Project/backend/src/Backend.Api/Infrastructure/TargetServerConnectionSecretProtector.cs`.
  - Default path: `/api/v1/scans/execute` from `Workspace/Project/backend/src/Backend.Api/Infrastructure/ScanExecutionOptions.cs`.
- Agent rule distribution endpoint - Backend pushes rule revisions to managed connector HTTP endpoints.
  - SDK/Client: named `HttpClient` `RuleDistributionTransport` in `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionTransportDispatcher.cs`.
  - Auth: connector bearer token or custom header from encrypted target-server secret payloads.
  - Default path: `/api/v1/rules/distribute` from `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionExecutionOptions.cs`.
- SSH/SCP rule distribution - Backend can transfer rule files and run apply commands over SSH.
  - SDK/Client: external `scp` and `ssh` commands launched by `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionCommandRunner.cs`.
  - Auth: SSH key path from encrypted target-server secret payloads.

**Security Scanner Execution:**
- Local and remote scanner scripts - Secondary MVC app executes PowerShell scanner scripts and can fetch remote results over SSH/SCP.
  - SDK/Client: `powershell.exe`, `ssh`, and `scp` process execution in `src/IocManager.Web/Services/PowerShellScriptRunner.cs` and `src/IocManager.Web/Services/SshScriptExecutionHost.cs`.
  - Auth: local process permissions or SSH key configuration from `src/IocManager.Web/Options/PowerShellSettings.cs`.
  - Configuration: `PowerShell:*` and `VmwareTargets:*` from `src/IocManager.Web/appsettings.json`.

**Reporting / Visualization:**
- Power BI embed URL generation - Backend builds Power BI report embed URLs for visualization catalog entries.
  - SDK/Client: URL construction in `Workspace/Project/backend/src/Backend.Api/Infrastructure/PowerBiVisualizationCatalogService.cs`.
  - Auth: Not detected.
  - Endpoint base: `https://app.powerbi.com/reportEmbed`.

**Package Registries:**
- NuGet package restore - Configured to use `https://api.nuget.org/v3/index.json` in `Workspace/Project/backend/NuGet.Config`.
- npm package restore - `package-lock.json` entries resolve through the npm registry in `Workspace/Project/frontend/workbench/package-lock.json`.

## Data Storage

**Databases:**
- SQL Server / LocalDB - Primary backend storage.
  - Connection: `ConnectionStrings:Main`, `CONNECTIONSTRINGS__MAIN`, or `SQLSERVER_*` variables resolved by `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/DatabaseConnectionStringResolver.cs`.
  - Client: Entity Framework Core SQL Server via `CtiDbContext` in `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.
  - Registered contexts: `CtiDbContext` and `LegacyScanPipelineDbContext` in `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`.
- SQL Server / Azure SQL-style secondary MVC storage - Separate app uses `AzureSql:ConnectionString`.
  - Connection: `AzureSql:ConnectionString` configured by `src/IocManager.Web/Program.cs` and `src/IocManager.Web/Options/AzureSqlSettings.cs`.
  - Client: Entity Framework Core SQL Server through `src/IocManager.Web/Data/IocDbContext.cs`.
- Test-only in-memory database - Backend integration tests replace SQL Server with EF InMemory.
  - Client: `Microsoft.EntityFrameworkCore.InMemory` in `Workspace/Project/backend/tests/Backend.Tests/Backend.Tests.csproj`.
  - Setup: `Workspace/Project/backend/tests/Backend.Tests/Integration/TestWebApplicationFactory.cs`.

**File Storage:**
- Backend data-protection key ring - Persisted to filesystem through `AddDataProtection().PersistKeysToFileSystem(...)` in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`.
- Backend legacy pipeline temp/rule/report files - Configured by `LegacyScanPipelineOptions` in `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/LegacyScanPipelineOptions.cs`.
- AI sidecar artifacts and snapshots - Filesystem paths configured by `Workspace/Project/ai/service/decision_service/config.py` for artifacts root, action-policy matrix, snapshots, model registry, dataset registry, and feedback JSONL store.
- Scanner result files - Secondary MVC app writes local result JSON files under scanner result directories from `src/IocManager.Web/Services/PowerShellScriptRunner.cs`.

**Caching:**
- No Redis, distributed cache, or external cache provider detected.
- Frontend server state uses `@tanstack/react-query` from `Workspace/Project/frontend/workbench/package.json`; persistence outside browser/runtime memory is not detected.

## Authentication & Identity

**Auth Provider:**
- Custom JWT over ASP.NET Core Identity.
  - Implementation: `POST /api/auth/token` in `Workspace/Project/backend/src/Backend.Api/Controllers/AuthController.cs` calls `IAuthService`.
  - Identity store: ASP.NET Core Identity tables through `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/CtiDbContext.cs`.
  - Token service: `Workspace/Project/backend/src/Backend.Infrastructure/Security/JwtAuthService.cs`.
  - JWT validation: `JwtBearerDefaults.AuthenticationScheme` configured in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`.
  - Config: `Auth:Jwt:Issuer`, `Auth:Jwt:Audience`, `Auth:Jwt:SigningKey`, and `Auth:Jwt:AccessTokenLifetimeMinutes`.
- Optional SQL user table auth.
  - Implementation: `Workspace/Project/backend/src/Backend.Infrastructure/Security/SqlUserTableAuthService.cs`.
  - Switch: `Auth:SqlUserTable:Enabled` bound in `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`.
- Frontend session storage.
  - Implementation: JWT decoding and role extraction in `Workspace/Project/frontend/workbench/src/shared/auth/session.ts`.
  - Storage: browser `sessionStorage` key managed by `Workspace/Project/frontend/workbench/src/shared/auth/session.ts`.

## Monitoring & Observability

**Error Tracking:**
- No external error tracking service detected.

**Logs:**
- Backend API uses Serilog request logging and console sink in `Workspace/Project/backend/src/Backend.Api/Program.cs` and `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ApplicationBuilderExtensions.cs`.
- Backend worker uses Serilog console logging in `Workspace/Project/backend/src/Backend.Worker/Program.cs`.
- AI sidecar uses FastAPI/Uvicorn runtime logging; no external sink is configured in `Workspace/Project/ai/service/pyproject.toml`.

**Health Checks:**
- Backend liveness: `GET /health/live` in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ApplicationBuilderExtensions.cs`.
- Backend readiness: `GET /health/ready` checks SQL Server as required and AI sidecar as optional in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`.
- AI sidecar health: `GET /health` in `Workspace/Project/ai/service/decision_service/api.py`.

## CI/CD & Deployment

**Hosting:**
- Not detected. No Dockerfile, docker-compose file, or hosting-specific deployment config was found at the repo root or under `Workspace/Project`.

**CI Pipeline:**
- None detected. No `.github/workflows` directory was found.

## Environment Configuration

**Required env vars:**
- Backend database: `CONNECTIONSTRINGS__MAIN` or SQL Server variables such as `SQLSERVER_HOST`, `SQLSERVER_DB`, `SQLSERVER_DATABASE`, `SQLSERVER_PORT`, `SQLSERVER_USER`, `SQLSERVER_PASSWORD`, `SQLSERVER_TRUSTED_CONNECTION`, and `SQLSERVER_TRUST_SERVER_CERTIFICATE`.
- Backend production JWT: `AUTH__JWT__SIGNINGKEY` or equivalent `Auth:Jwt:SigningKey` configuration.
- Backend optional sidecar overrides: `AISIDECAR__BASEURL`, `AISIDECAR__REPORTEXTRACTIONPATH`, and `AISIDECAR__TIMEOUTSECONDS`.
- Backend optional bootstrap admin: `AUTH__BOOTSTRAPADMIN__ENABLED`, `AUTH__BOOTSTRAPADMIN__USERNAME`, `AUTH__BOOTSTRAPADMIN__EMAIL`, and `AUTH__BOOTSTRAPADMIN__PASSWORD`.
- Frontend: `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_USE_ASPNET_GATEWAY`.
- AI sidecar optional artifacts/config: `IOC_MANAGER_AI_ARTIFACTS_ROOT`, `CTI_SIDECAR_ARTIFACTS_ROOT`, `IOC_MANAGER_AI_ACTION_POLICY_MATRIX_PATH`, `CTI_SIDECAR_ACTION_POLICY_MATRIX_PATH`, `IOC_MANAGER_AI_SNAPSHOT_ROOT`, `CTI_SIDECAR_SNAPSHOT_ROOT`, `IOC_MANAGER_AI_REGISTRY_PATH`, `CTI_SIDECAR_REGISTRY_PATH`, `IOC_MANAGER_AI_DATASET_REGISTRY_PATH`, `CTI_SIDECAR_DATASET_REGISTRY_PATH`, `IOC_MANAGER_AI_FEEDBACK_PATH`, and `CTI_SIDECAR_FEEDBACK_PATH`.
- AI sidecar optional OpenAI: `OPENAI_API_KEY`, `IOC_MANAGER_OPENAI_API_KEY`, `OPENAI_BASE_URL`, `IOC_MANAGER_OPENAI_BASE_URL`, `IOC_MANAGER_AI_SCAN_ANALYST_MODEL`, `IOC_MANAGER_OPENAI_MODEL`, `IOC_MANAGER_OPENAI_TIMEOUT_SECONDS`, and `OPENAI_TIMEOUT_SECONDS`.

**Secrets location:**
- Backend development `.env` is auto-loaded by `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/DotEnvLoader.cs`; contents were not read.
- Safe templates exist at `Workspace/Project/backend/.env.example`, `Workspace/Project/frontend/workbench/.env.example`, and `Workspace/Project/ai/service/.env.example`; contents were not read.
- A frontend local env file exists at `src/Front-end/Project/detective-frontend/.env.local`; contents were not read.
- Worker project declares a .NET user secrets ID in `Workspace/Project/backend/src/Backend.Worker/Backend.Worker.csproj`.
- Managed target-server connector credentials are stored encrypted in the database and decrypted through `Workspace/Project/backend/src/Backend.Api/Infrastructure/TargetServerConnectionSecretProtector.cs`.

## Webhooks & Callbacks

**Incoming:**
- Backend REST endpoints are controller-based under `Workspace/Project/backend/src/Backend.Api/Controllers`.
- AI sidecar REST endpoints are declared in `Workspace/Project/ai/service/decision_service/api.py`.
- No dedicated external webhook receiver endpoint was detected.

**Outgoing:**
- Backend sends outgoing HTTP requests to AI sidecar endpoints through `Workspace/Project/backend/src/Backend.Infrastructure/Integrations`.
- Backend sends outgoing HTTP requests to managed scanner connector endpoints through `Workspace/Project/backend/src/Backend.Api/Infrastructure/ScanExecutionDispatcher.cs`.
- Backend sends outgoing HTTP requests to managed rule-distribution connector endpoints through `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionTransportDispatcher.cs`.
- AI sidecar optionally sends outgoing HTTP requests to the OpenAI Responses API through `Workspace/Project/ai/service/decision_service/scan_analyst.py`.
- SSH/SCP outgoing connections are used for rule distribution and secondary scanner execution in `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionTransportDispatcher.cs` and `src/IocManager.Web/Services/PowerShellScriptRunner.cs`.

---

*Integration audit: 2026-04-26*
