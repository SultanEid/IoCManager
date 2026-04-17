# SQL Server Persistence Migration Audit

Date: 2026-04-09

## Scope

- Provider migration from PostgreSQL/Npgsql to SQL Server/EF Core SQL Server.
- Schema-only cutover: no automated PostgreSQL-to-SQL Server data transfer.
- Migration baseline regenerated from current EF model, then SQL Server integrity migration added.

## Provider and Registration Changes

- Replaced `Npgsql.EntityFrameworkCore.PostgreSQL` with `Microsoft.EntityFrameworkCore.SqlServer` in:
  - `backend/src/Backend.Infrastructure/Backend.Infrastructure.csproj`
- Switched `UseNpgsql(...)` to `UseSqlServer(...)` with retry policy:
  - `backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`
  - `backend/src/Backend.Infrastructure/Persistence/CtiDbContextFactory.cs`
- Added SQL Server startup failure classification and connection-target diagnostics:
  - `backend/src/Backend.Infrastructure/DependencyInjection/InitializationExtensions.cs`

## Connection String Contract Migration

Order of precedence preserved:

1. `ConnectionStrings:Main`
2. `CONNECTIONSTRINGS__MAIN`
3. Built fallback contract

Fallback contract migrated from `Postgres:*` / `POSTGRES_*` / `PGPASSWORD` to SQL Server:

- `SqlServer:*`
- `SQLSERVER_*` (`HOST`, `SERVER`, `PORT`, `DB`, `DATABASE`, `USER`, `USERNAME`, `PASSWORD`, `TRUSTED_CONNECTION`, `TRUST_SERVER_CERTIFICATE`)

Default local/dev fallback:

- `Server=(localdb)\MSSQLLocalDB;Database=ioc_manager_dev;Trusted_Connection=True;TrustServerCertificate=True`

Files:

- `backend/src/Backend.Infrastructure/Configuration/DatabaseConnectionStringResolver.cs`
- `backend/.env.example`
- `backend/src/Backend.Api/appsettings.json`
- `backend/src/Backend.Api/appsettings.Development.json`
- `backend/src/Backend.Worker/appsettings.json`
- `backend/README.md`
- `docs/environment-reference.md`

## Mapping and Model Audit Outcomes

### Type Mapping Changes

- `jsonb` -> `nvarchar(max)` with `ISJSON(...)` constraints:
  - `EvidenceItem.PayloadJson`
  - `ReportIngestionRun.InputPayloadJson`
  - `ReportIngestionRun.OutputPayloadJson`
  - `ReportIngestionClaim.AbstainReasonCodesJson`
  - `ReportIngestionClaim.CitationsJson`
- `text` -> `nvarchar(max)`:
  - `RuleProposal.RuleBody`
- `text[]` -> JSON-backed `nvarchar(max)` via converter + comparer:
  - `RuleRecord.LinkedAttackTechniques`
  - `RuleRevisionRecord.LinkedAttackTechniques`
  - Implemented in `backend/src/Backend.Infrastructure/Persistence/Configurations/StringArrayJsonConversion.cs`

### Constraint SQL Normalization

- Check constraints updated to SQL Server-safe syntax (`[Column]` style), including:
  - CTI canonical/snapshot confidence and time-window checks
  - Report-ingestion confidence/offset checks
  - JSON validity checks via `ISJSON(...)`

### Concurrency Tokens (rowversion)

- Added `rowversion` concurrency tokens on mutable operational entities.
- Excluded append-only CTI entities protected by mutation-blocking triggers.
- `DbUpdateConcurrencyException` mapped to HTTP 409 in:
  - `backend/src/Backend.Api/Middlewares/GlobalExceptionHandler.cs`

### Indexed String Length Safety

- Existing indexed string columns remain <= SQL Server key limits (including composite indexes) under current mappings.
- No indexed `nvarchar(max)` columns introduced.

### Nullability Correctness

- JSON payload fields intended as required remain `IsRequired()`.
- `string[]` JSON-backed columns are required and validated with `ISJSON(...)`.

## PostgreSQL-Specific Removal

- Removed provider usage and startup assumptions tied to:
  - `Npgsql`, PostgreSQL exception types/messages
  - `information_schema`/`public` probes
  - PostgreSQL migration SQL (`DO $$`, `plpgsql`, array DDL)
- Legacy PostgreSQL migration files were removed and replaced with SQL Server migrations.

## Migrations Regeneration

Regenerated migration set in:

- `backend/src/Backend.Infrastructure/Persistence/Migrations`

Contains:

1. SQL Server baseline migration from current EF model.
2. SQL Server integrity migration adding:
   - Append-only protection triggers (UPDATE/DELETE rejection) on immutable CTI tables.
   - Temporal integrity triggers for:
     - decisions vs snapshot timing
     - decision bundles vs decisions/snapshots
     - decision-evidence reference timing
     - policy/model version reference cutoff timing

`Down` removes all SQL Server triggers deterministically via `OBJECT_ID(..., 'TR')` checks.

## Tooling Reproducibility

- Added local .NET tool manifest:
  - `backend/.config/dotnet-tools.json`
- Pinned:
  - `dotnet-ef` `8.0.12`

## Verification Hooks

- Migration SQL test moved to SQL Server provider and asserts trigger DDL + rowversion/check artifacts:
  - `backend/tests/Backend.Tests/Infrastructure/Persistence/CtiMigrationSqlTests.cs`
- Development startup schema verification remains safe and provider-agnostic (no PostgreSQL schema assumptions).

## Unresolved Provider-Specific Tradeoffs

- SQL Server has no native `jsonb`; JSON fields are text + `ISJSON(...)` checks (no binary JSON storage semantics).
- SQL Server has no native array columns; `string[]` is persisted as JSON text.
  - Native PostgreSQL array operators/indexing are not available.
- Trigger logic assumes `dbo` schema and current table naming strategy.
- LocalDB default path is Windows-oriented; Linux/macOS devs must provide explicit SQL Server connection overrides.
