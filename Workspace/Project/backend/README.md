# Backend

ASP.NET Core Web API + Worker for IoC Manager.

## Local setup (validated path)

1. Copy `.env.example` to `.env`.
2. Set SQL Server values in `.env` (`SQLSERVER_*`) or provide `CONNECTIONSTRINGS__MAIN`.
   - See the shared env reference: [Environment Reference](../docs/environment-reference.md).
3. Restore/build using the currently validated local workaround:

```powershell
dotnet restore Backend.sln -p:MSBuildEnableWorkloadResolver=false /m:1
dotnet build Backend.sln -c Debug --no-restore -p:MSBuildEnableWorkloadResolver=false /m:1
```

4. Run the API:

```powershell
dotnet run --project src/Backend.Api --no-build --no-restore
```

5. Run tests:

```powershell
dotnet test tests/Backend.Tests/Backend.Tests.csproj -c Debug --no-build -p:MSBuildEnableWorkloadResolver=false
```

6. (Optional) Run the worker:

```powershell
dotnet run --project src/Backend.Worker
```

## Workaround note

- `-p:MSBuildEnableWorkloadResolver=false` is the currently validated local workaround for restore/build in this environment.
- This does **not** prove the underlying restore-graph/workload-resolver issue is fully resolved.

## Notes

- In `Development`, `.env` is auto-loaded from `backend/.env` (or parent directories).
- Local/dev default connection path is SQL Server LocalDB: `Server=(localdb)\MSSQLLocalDB;Database=ioc_manager_dev;Trusted_Connection=True;TrustServerCertificate=True`.
- In `Development` with `Database:ApplyMigrationsOnStartup=false`, the app will ensure the relational schema exists from the current EF model and seed identity roles/bootstrap user.
- In non-development environments, keep migration-based startup (`Database:ApplyMigrationsOnStartup=true`) and supply a full production-ready connection string.
- Database is required for startup/readiness.
- AI sidecar is optional for startup/readiness and evaluated at request-time for sidecar-dependent endpoints.
- Detailed provider migration audit: [SQL Server Persistence Migration Audit](../docs/sqlserver-persistence-migration-audit.md).

## Health endpoints

- `GET /health/live`: process liveness only.
- `GET /health/ready`: readiness payload:
  - top-level `status` (`ready` or `not_ready`)
  - `components[]` with `name`, `status`, `required`, `message`
- Optional sidecar degradation does not fail readiness when required components are healthy.

## Backend + AI sidecar integration

- Backend report ingestion calls the sidecar endpoint configured under `AiSidecar`.
- Defaults are `BaseUrl=http://localhost:8100` and `ReportExtractionPath=/extract_report`.
- Backend readiness probes the sidecar `/readyz` endpoint and treats sidecar
  unavailability as optional component degradation.
- If the sidecar is configured with `IOC_MANAGER_AI_SERVICE_TOKEN`, set the
  matching backend `AiSidecar:ServiceToken` value through the deployment secret
  store or `AISIDECAR__SERVICETOKEN`.
- Override via environment variables in `backend/.env`:
  - `AISIDECAR__BASEURL`
  - `AISIDECAR__REPORTEXTRACTIONPATH`
  - `AISIDECAR__TIMEOUTSECONDS`
  - `AISIDECAR__SERVICETOKEN`

Run sidecar locally before report ingestion endpoints:

```powershell
cd ..\ai\service
pip install -e .[dev]
uvicorn decision_service.main:app --host 0.0.0.0 --port 8100
```

## Power BI dashboard embeds

The dashboard supports two Power BI modes:

- Placeholder/direct iframe mode for local development when service-principal
  credentials are not configured.
- App-owned embed mode for durable rendering. Configure `Reporting:PowerBi`
  with `Enabled=true`, `TenantId`, `ClientId`, `ClientSecret`, workspace IDs,
  and report IDs. The backend will request Power BI embed tokens and the
  workbench refreshes them before expiry, so visuals do not depend on a browser
  Power BI sign-in cookie.

Use deployment secrets or environment variables for credentials, for example:

```powershell
REPORTING__POWERBI__ENABLED=true
REPORTING__POWERBI__TENANTID=<tenant-id>
REPORTING__POWERBI__CLIENTID=<service-principal-client-id>
REPORTING__POWERBI__CLIENTSECRET=<service-principal-secret>
REPORTING__POWERBI__WORKSPACES__0__WORKSPACEID=<workspace-id>
REPORTING__POWERBI__WORKSPACES__0__REPORTS__0__REPORTID=<report-id>
```

## Minimal smoke semantics

- `GET /api/alerts` returning `401` validates routing/pipeline/auth boundary only.
- It does not validate full business functionality.

