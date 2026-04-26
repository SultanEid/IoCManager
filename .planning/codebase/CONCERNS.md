# Codebase Concerns

**Analysis Date:** 2026-04-26

## Tech Debt

**Repository footprint and source-of-truth ambiguity:**
- Issue: The tracked repository is dominated by archived/vendor/template material: `Archive/` accounts for 6,540 of 7,393 tracked files, while active product code lives mainly under `Workspace/Project/`. Additional untracked copies and backups exist under `AI_Project/`, `tmp/`, and `Workspace.local-backup-*`.
- Files: `Archive/`, `Workspace/Project/`, `AI_Project/`, `tmp/`, `Workspace.local-backup-20260413-163345/`, `Workspace.local-backup-20260413-163446/`, `.gitignore`
- Impact: Code search, dependency review, and security scanning are noisy; old template dependencies can be mistaken for active code; generated/backup files can mask the real app structure.
- Fix approach: Treat `Workspace/Project/` as the product root for new work, remove tracked archive/vendor trees from source control or move them to external artifacts, and keep `Archive/`, `AI_Project/`, `tmp/`, screenshots, logs, and generated datasets ignored.

**Schema ownership split between EF migrations and runtime SQL initializers:**
- Issue: The backend uses EF Core migrations and also runs ad hoc schema initializers at startup, including alert, operational, and legacy pipeline DDL.
- Files: `Workspace/Project/backend/src/Backend.Api/Program.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/AlertRegistrySchemaInitializer.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/OperationalStoreSchemaInitializer.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/LegacyScanPipelineSchemaInitializer.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Migrations/`
- Impact: Schema drift can occur when runtime initializers and migrations evolve independently. Production startup also performs database shape changes, which couples deployment health to DDL permissions and timing.
- Fix approach: Move durable schema changes into EF migrations, keep startup initializers limited to idempotent reference-data checks, and test migrations against an empty database and an upgraded legacy database.

**Large multi-responsibility backend modules:**
- Issue: Several files combine routing, orchestration, parsing, persistence mapping, and UI-shaped response building.
- Files: `Workspace/Project/backend/src/Backend.Api/Features/ScanAnalystPoc/ScanAnalystPocService.cs`, `Workspace/Project/backend/src/Backend.Api/Controllers/V2/RulesController.cs`, `Workspace/Project/backend/src/Backend.Api/Controllers/V2/InfrastructureController.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/LegacyScanPipelineService.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/ResultIngestionService.cs`
- Impact: Local changes carry high regression risk because behavior is spread through long methods and partial concerns. Tests need broad setup to cover small changes.
- Fix approach: Extract command/query handlers and pure mappers by endpoint family. Keep controllers thin and move legacy scan parsing/execution into smaller services with fixture-level tests.

**Frontend schema and gateway concentration:**
- Issue: Large generated or hand-maintained API schemas and gateway adapters centralize many backend contracts in a few frontend files.
- Files: `Workspace/Project/frontend/workbench/src/shared/api/schemas.ts`, `Workspace/Project/frontend/workbench/src/shared/gateway/aspnet-gateway.ts`, `Workspace/Project/frontend/workbench/src/shared/gateway/mock-gateway.ts`, `Workspace/Project/frontend/workbench/src/shared/gateway/legacy-scan-pipeline.ts`
- Impact: Backend contract changes require manual frontend updates across large files. Mock and live paths can diverge while still compiling.
- Fix approach: Generate API client/schema code from OpenAPI or split schemas by domain. Add parity tests that exercise the same workflow through mock and ASP.NET gateways.

## Known Bugs

**Frontend lead-action checks allow Analyst where backend requires Lead:**
- Symptoms: Analyst users can see or start UI flows that call endpoints protected by `AuthorizationPolicies.LeadAccess`, then receive authorization failures from the API.
- Files: `Workspace/Project/frontend/workbench/src/shared/auth/session.ts`, `Workspace/Project/frontend/workbench/src/shared/auth/role-access.ts`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/AuthorizationPolicies.cs`, `Workspace/Project/backend/src/Backend.Api/Controllers/V2/ScanningController.cs`, `Workspace/Project/backend/src/Backend.Api/Controllers/V2/RulesController.cs`
- Trigger: Sign in as an Analyst and use scan-plan, rule-management, or infrastructure actions wired through `canAccessLeadActions`.
- Workaround: Backend authorization blocks the request; UI should align to Lead/Admin/DEV for write actions.

**Saved report PDF rendering uses a deterministic temp file path:**
- Symptoms: Concurrent PDF downloads for the same report can race because both requests write, read, and delete the same `%TEMP%/ioc-report-{reportId}.pdf` file.
- Files: `Workspace/Project/backend/src/Backend.Api/Controllers/V2/ReportsController.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/LegacyScanPipelineFileWriters.cs`
- Trigger: Two users or browser retries request the same saved report PDF at the same time.
- Workaround: Retry the download. Fix by using a per-request GUID temp path or writing PDF bytes to memory.

**Legacy script result-file metadata points at deleted temp files:**
- Symptoms: `LegacyScriptScanExecutor` builds `ScanExecutionResultFile` entries from `tempFiles`, then deletes those same files in `finally`.
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/LegacyScriptScanExecutor.cs`
- Trigger: A script-backed YARA/Sigma/Snort/Suricata scan returns result file metadata.
- Workaround: Use raw output stored on the scan result. Fix by separating rule-bundle temp files from durable result artifacts.

**Process cancellation can leave spawned scanner processes running:**
- Symptoms: `ProcessExecutionHelper.RunAsync` waits with a cancellation token but does not explicitly terminate the child process tree on cancellation.
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/ProcessExecutionHelper.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/LegacyScriptScanExecutor.cs`
- Trigger: API shutdown, request cancellation, or worker cancellation while PowerShell/scanner scripts are running.
- Workaround: Operators may need to kill orphaned scanner processes manually. Fix by killing the process tree on cancellation and recording a canceled execution state.

## Security Considerations

**SQL-table auth contains a built-in privileged credential path:**
- Risk: When SQL-table auth is enabled, a hard-coded team credential grants an Admin token independently of the user table.
- Files: `Workspace/Project/backend/src/Backend.Infrastructure/Security/SqlUserTableAuthService.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`
- Current mitigation: The path is only used when `Auth:SqlUserTable:Enabled` selects `SqlUserTableAuthService`.
- Recommendations: Remove the built-in credential path, require bootstrap credentials from secret-backed configuration, and add a test that no static bypass user can authenticate.

**Legacy SQL-table password handling uses unsalted SHA-256 and accepts pre-hashed passwords:**
- Risk: Stolen password hashes are easier to attack, and `AcceptPreHashedPassword` allows a hash value to authenticate directly if the option is enabled.
- Files: `Workspace/Project/backend/src/Backend.Infrastructure/Security/SqlUserTableDirectoryService.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/SqlUserTableAuthOptions.cs`
- Current mitigation: ASP.NET Identity is used when SQL-table auth is disabled.
- Recommendations: Migrate SQL-table users to ASP.NET Identity hashing or PBKDF2/Argon2 with salts, disable pre-hashed password acceptance, and force password rotation after migration.

**Configurable SQL table name is interpolated into raw SQL:**
- Risk: `Auth:SqlUserTable:TableName` is inserted into SQL command text without identifier validation.
- Files: `Workspace/Project/backend/src/Backend.Infrastructure/Security/SqlUserTableDirectoryService.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/SqlUserTableAuthOptions.cs`
- Current mitigation: The value is configuration, not request input.
- Recommendations: Validate the table name against a strict schema-qualified identifier allowlist or map enum values to known table names before building SQL.

**AI sidecar exposes write/evaluation endpoints without application authentication:**
- Risk: Any caller that can reach the sidecar can score cases, submit feedback, query historical learning, and evaluate models.
- Files: `Workspace/Project/ai/service/decision_service/api.py`, `Workspace/Project/ai/service/decision_service/main.py`, `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiDecisionClient.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Integrations/AiReportExtractionClient.cs`
- Current mitigation: The sidecar appears intended for backend-internal use.
- Recommendations: Bind the sidecar to localhost/private networks, add shared-secret or mTLS authentication, and reject direct public traffic at deployment ingress.

**Custom rate limiter trusts spoofable forwarding headers and keeps unbounded client state:**
- Risk: Any caller can vary `X-Forwarded-For` to bypass per-client throttling and grow the in-memory `_counters` dictionary.
- Files: `Workspace/Project/backend/src/Backend.Api/Middlewares/ApiRequestThrottlingMiddleware.cs`
- Current mitigation: Per-window counters limit repeated requests for a stable key.
- Recommendations: Use ASP.NET Core rate limiting with trusted proxy configuration, normalize client identity after forwarded-header middleware, and expire idle counter keys.

**Script execution boundary is powerful and configuration-driven:**
- Risk: The API launches PowerShell with execution-policy bypass for scanner scripts and accepts configured script paths/executables.
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/LegacyScriptScanExecutor.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/DiscoveryObservationProvider.cs`, `scripts/Invoke-YaraScan.ps1`, `scripts/Invoke-SigmaScan.ps1`, `scripts/Invoke-SnortScan.ps1`, `scripts/Invoke-SuricataScan.ps1`
- Current mitigation: Arguments are passed via `ProcessStartInfo.ArgumentList`, and write endpoints require authenticated roles.
- Recommendations: Restrict script paths to signed/known files, run scanners under a low-privilege service account, enforce execution timeouts, and audit script invocation parameters without logging secrets.

**Local environment files are present in working directories:**
- Risk: Local env files can contain secrets and are easy to accidentally stage when ignore rules drift.
- Files: `Workspace/Project/frontend/workbench/.env.local`, `src/Front-end/Project/detective-frontend/.env.local`, `.gitignore`
- Current mitigation: Env file contents were not read during this audit; `.gitignore` contains several env and generated-data ignore rules.
- Recommendations: Keep `.env.local` untracked, add repo-wide `.env*` ignore coverage except `.env.example`, and use secret scanners in CI.

## Performance Bottlenecks

**Unbounded in-memory queues and throttling dictionaries:**
- Problem: Background work queues use unbounded channels, and request throttling uses a process-local dictionary without eviction.
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/DiscoveryRunQueue.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/ScanJobQueue.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/AiDecisionQueue.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionJobQueue.cs`, `Workspace/Project/backend/src/Backend.Api/Middlewares/ApiRequestThrottlingMiddleware.cs`
- Cause: In-process primitives are simple but provide no backpressure, persistence, or cross-instance coordination.
- Improvement path: Add bounded channels or durable queues, expose queue-depth metrics, and reject/enqueue work with explicit capacity policies.

**Uploaded rule ZIPs are extracted and bundled synchronously per request:**
- Problem: Rule uploads copy ZIPs to disk, extract all entries, read rule files, and build bundles inside request processing.
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/LegacyScanPipelineService.Execution.cs`, `Workspace/Project/backend/src/Backend.Api/Controllers/V2/LegacyScanPipelineController.cs`
- Cause: Upload staging and validation are coupled to the HTTP request path.
- Improvement path: Enforce decompressed-size and entry-count limits, stream validation where possible, and move expensive scan preparation to a queued job.

**Large generated snapshots increase build and review cost:**
- Problem: EF model snapshots/migrations and frontend schemas are several thousand lines each.
- Files: `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Migrations/CtiDbContextModelSnapshot.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Migrations/20260418051559_AddIocDrivenAlerts.Designer.cs`, `Workspace/Project/frontend/workbench/src/shared/api/schemas.ts`
- Cause: Generated artifacts are committed as single large files.
- Improvement path: Keep generated files isolated, avoid manual edits, and use contract-generation automation so reviewers focus on domain changes.

## Fragile Areas

**Legacy scanner integration:**
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/LegacyScanPipelineService.*.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/LegacyScriptScanExecutor.cs`, `scripts/Invoke-YaraScan.ps1`, `scripts/Invoke-SigmaScan.ps1`, `scripts/Invoke-SnortScan.ps1`, `scripts/Invoke-SuricataScan.ps1`
- Why fragile: C# orchestration, PowerShell scripts, SSH behavior, scanner output parsing, temp files, and database writes all participate in one workflow.
- Safe modification: Change one scanner family at a time, add fixture-based tests for script output envelopes, and verify cancellation and cleanup behavior.
- Test coverage: Backend tests cover dispatch and ingestion paths, but cancellation, orphaned process handling, and durable result-file retention need focused tests.

**AI decision service and generated datasets:**
- Files: `Workspace/Project/ai/service/decision_service/api.py`, `Workspace/Project/ai/service/decision_service/decision_support.py`, `Workspace/Project/ai/service/decision_service/source_adapters.py`, `Workspace/Project/ai/datasets/`, `Workspace/Project/ai/service/artifacts/model_registry.json`, `Workspace/Project/ai/service/artifacts/dataset_registry.json`
- Why fragile: Model behavior depends on registry JSON, dataset manifests, source adapters, and heuristic scoring code. Several AI-service files exceed 1,000 lines.
- Safe modification: Keep dataset/artifact changes explicit, run AI service tests for model contract and evaluation paths, and record dataset version changes in registry files.
- Test coverage: Many Python tests exist under `Workspace/Project/ai/service/tests/`, but sidecar authentication/ingress boundaries and production deployment behavior are not covered.

**Authorization split across backend and frontend:**
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/AuthorizationPolicies.cs`, `Workspace/Project/frontend/workbench/src/shared/auth/session.ts`, `Workspace/Project/frontend/workbench/src/shared/auth/role-access.ts`, `Workspace/Project/frontend/workbench/src/components/workbench/route-guard.tsx`
- Why fragile: Backend roles and frontend route/action gates are maintained separately.
- Safe modification: Treat backend policies as authoritative, generate or centralize frontend capability metadata, and test representative users against real API responses.
- Test coverage: Frontend role tests exist, but they encode the current mismatch rather than validating backend parity.

## Scaling Limits

**Single-process workers and queues:**
- Current capacity: Queues are in-memory unbounded channels with single readers for discovery, scan jobs, AI decisions, and rule distribution.
- Limit: Queued work is lost on process restart, duplicate processing can occur across multiple API instances, and there is no shared backpressure.
- Scaling path: Move work scheduling to a durable table-backed queue, Hangfire/Quartz, Azure Service Bus, RabbitMQ, or another queue with leases and retries.
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/DiscoveryRunQueue.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/ScanJobQueue.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/AiDecisionQueue.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionJobQueue.cs`

**Sidecar batch endpoints lack request-size and item-count limits:**
- Current capacity: `/score_batch` iterates all submitted items sequentially.
- Limit: Large batches can monopolize the sidecar process and memory.
- Scaling path: Add maximum item counts, payload-size limits, timeout budgets, and async batch jobs for large scoring workloads.
- Files: `Workspace/Project/ai/service/decision_service/api.py`

## Dependencies at Risk

**Archived UI/template dependencies:**
- Risk: Old ASP.NET/MVC templates, bundled JavaScript libraries, and package folders are tracked in `Archive/`.
- Impact: Security scanners and dependency audits may report issues for inactive code, and developers may accidentally copy stale patterns into active code.
- Migration plan: Remove `Archive/` from tracked source or move it to an artifact store; keep a short provenance note in `docs/` if historical reference is required.
- Files: `Archive/`, `Archive/Mvc/Admin/Tocly/packages.config`, `Archive/Mvc/Admin/Tocly/package.json`, `Archive/Asp-Net/Admin/Tocly/package.json`

**Python dependency ranges are lower-bounds only:**
- Risk: The AI sidecar accepts any newer compatible-looking versions for FastAPI, Pydantic, NumPy, pandas, scikit-learn, and PyYAML unless the environment supplies a lockfile.
- Impact: Model behavior, validation behavior, and serialization may change between installs.
- Migration plan: Add a committed lockfile or constraints file for the sidecar runtime and a separate dev constraints file for tests.
- Files: `Workspace/Project/ai/service/pyproject.toml`

## Missing Critical Features

**No repository CI pipeline detected:**
- Problem: No `.github/` workflow directory is present, so test/lint/security checks are not codified in the repository.
- Blocks: Consistent validation for backend, frontend, AI sidecar, secret scanning, and generated artifact drift.
- Files: `.github/`, `Workspace/Project/backend/tests/Backend.Tests/`, `Workspace/Project/frontend/workbench/src/**/*.test.tsx`, `Workspace/Project/ai/service/tests/`

**No central production deployment boundary for the sidecar:**
- Problem: The sidecar exposes FastAPI endpoints without in-code auth and relies on deployment topology for protection.
- Blocks: Safe standalone deployment and clear threat modeling for model evaluation and feedback ingestion endpoints.
- Files: `Workspace/Project/ai/service/decision_service/api.py`, `Workspace/Project/ai/service/README.md`, `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/AiSidecarOptions.cs`

## Test Coverage Gaps

**Authentication hardening:**
- What's not tested: Absence of built-in bypass credentials, SQL-table password migration rules, pre-hashed password rejection, and table-name validation.
- Files: `Workspace/Project/backend/src/Backend.Infrastructure/Security/SqlUserTableAuthService.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Security/SqlUserTableDirectoryService.cs`, `Workspace/Project/backend/tests/Backend.Tests/Integration/AuthSecurityEndpointsTests.cs`
- Risk: Authentication shortcuts can remain active while endpoint tests still pass.
- Priority: High

**Script process lifecycle:**
- What's not tested: Cancellation kills child process trees, execution timeout behavior, durable result artifacts, and cleanup failure logging.
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/ProcessExecutionHelper.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/Execution/LegacyScriptScanExecutor.cs`, `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/ScanExecutionDispatcherTests.cs`
- Risk: Production workers can leak processes or report files that no longer exist.
- Priority: High

**Upload extraction limits:**
- What's not tested: ZIP decompressed-size limits, entry-count limits, deeply nested archives, unsupported extensions in archives, and cleanup after partial extraction failures.
- Files: `Workspace/Project/backend/src/Backend.Api/Infrastructure/LegacyScanPipelineService.Execution.cs`, `Workspace/Project/backend/src/Backend.Api/Controllers/V2/LegacyScanPipelineController.cs`
- Risk: Large or adversarial uploads can exhaust disk, CPU, or memory.
- Priority: High

**Frontend/backend authorization parity:**
- What's not tested: UI role gates against real backend policy expectations for Analyst, Lead, Admin, IT, and DEV.
- Files: `Workspace/Project/frontend/workbench/src/shared/auth/session.ts`, `Workspace/Project/frontend/workbench/src/shared/auth/role-access.ts`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/AuthorizationPolicies.cs`
- Risk: UI presents unavailable actions or hides valid actions, creating workflow failures and false confidence in client-side authorization.
- Priority: Medium

---

*Concerns audit: 2026-04-26*
