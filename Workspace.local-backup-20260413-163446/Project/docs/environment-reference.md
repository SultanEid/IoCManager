# Environment Reference

This document is the single source of truth for local environment variables used by active product areas.

## Backend (`backend/.env`)

The backend auto-loads `.env` in development from the current/parent directories.

Required for local startup/readiness:

- `CONNECTIONSTRINGS__MAIN`, or
- `SQLSERVER_*` values (trusted connection for LocalDB, or SQL auth for full SQL Server).

`ConnectionStrings:Main` / `CONNECTIONSTRINGS__MAIN` remains the highest-priority override.

Recommended local defaults (LocalDB):

- `SQLSERVER_HOST=(localdb)\MSSQLLocalDB`
- `SQLSERVER_DB=ioc_manager_dev`
- `SQLSERVER_TRUSTED_CONNECTION=true`
- `SQLSERVER_TRUST_SERVER_CERTIFICATE=true`

Optional SQL authentication overrides:

- `SQLSERVER_PORT=1433`
- `SQLSERVER_USER=sa`
- `SQLSERVER_PASSWORD=<secret>`
- `SQLSERVER_DATABASE` (alias for `SQLSERVER_DB`)

Alternative (full connection string override):

- `CONNECTIONSTRINGS__MAIN` with credentials included.

Optional backend variables:

- `AISIDECAR__BASEURL` (default `http://localhost:8100`)
- `AISIDECAR__REPORTEXTRACTIONPATH` (default `/extract_report`)
- `AISIDECAR__TIMEOUTSECONDS` (default `30`)
- `AUTH__BOOTSTRAPADMIN__ENABLED`
- `AUTH__BOOTSTRAPADMIN__USERNAME`
- `AUTH__BOOTSTRAPADMIN__EMAIL`
- `AUTH__BOOTSTRAPADMIN__PASSWORD`

## Frontend (`frontend/workbench/.env.local`)

Required:

- `NEXT_PUBLIC_API_BASE_URL` (example: `https://localhost:7244`)
- `NEXT_PUBLIC_USE_ASPNET_GATEWAY`
  - `0` = demo mode (mock provider)
  - `1` = aspnet mode (live ASP.NET gateway)

## Templates

Use these safe templates:

- `backend/.env.example`
- `frontend/workbench/.env.example`
- `ai/service/.env.example`
