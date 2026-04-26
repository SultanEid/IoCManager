# Coding Conventions

**Analysis Date:** 2026-04-26

## Naming Patterns

**Files:**
- Backend C# files use PascalCase by type or feature: `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`, `Workspace/Project/backend/src/Backend.Application/Validation/CaseValidators.cs`, `Workspace/Project/backend/src/Backend.Api/Middlewares/GlobalExceptionHandler.cs`.
- Backend interfaces use `I` prefixes and live in abstraction folders: `Workspace/Project/backend/src/Backend.Application/Abstractions/Services/ICaseService.cs`, `Workspace/Project/backend/src/Backend.Application/Abstractions/Persistence/ICasesRepository.cs`.
- Backend controllers end with `Controller`: `Workspace/Project/backend/src/Backend.Api/Controllers/CasesController.cs`, `Workspace/Project/backend/src/Backend.Api/Controllers/V2/AlertsController.cs`.
- Backend EF repositories end with `Repository`: `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Repositories/CasesRepository.cs`, `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Repositories/FeedbackRepository.cs`.
- Frontend source files use kebab-case: `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.tsx`, `Workspace/Project/frontend/workbench/src/shared/api/error-classification.ts`, `Workspace/Project/frontend/workbench/src/components/workbench/workbench-shell-storage.ts`.
- Frontend route files follow Next App Router names: `Workspace/Project/frontend/workbench/src/app/(workbench)/queue/page.tsx`, `Workspace/Project/frontend/workbench/src/app/(workbench)/error.tsx`, `Workspace/Project/frontend/workbench/src/app/layout.tsx`.
- Frontend tests are co-located with implementation as `*.test.ts` or `*.test.tsx`: `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.test.tsx`, `Workspace/Project/frontend/workbench/src/shared/api/client.test.ts`.
- Playwright specs use `*.spec.mjs` under `Workspace/Project/frontend/workbench/e2e/`: `Workspace/Project/frontend/workbench/e2e/auth.spec.mjs`.

**Functions:**
- C# public methods use PascalCase and asynchronous methods use `Async`: `CreateAsync`, `GetAsync`, `ListAsync`, `UpdateStatusAsync` in `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`.
- C# private helpers use PascalCase: `ToResponse` in `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`, `MapException` in `Workspace/Project/backend/src/Backend.Api/Middlewares/GlobalExceptionHandler.cs`.
- TypeScript functions and local helpers use camelCase: `parseProblemDetails`, `deriveErrorMessage`, and `buildUrl` in `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.
- React components use PascalCase named exports: `FilterChips` in `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.tsx`, `WorkbenchShell` in `Workspace/Project/frontend/workbench/src/components/workbench/app-shell.tsx`.
- Next route components use default exports with PascalCase names: `HomePage` in `Workspace/Project/frontend/workbench/src/app/page.tsx`.

**Variables:**
- C# private fields use `_camelCase`: `_casesRepository`, `_unitOfWork`, and `_dateTimeProvider` in `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`.
- C# locals use `camelCase`: `caseRecord`, `nowUtc`, and `approvalTier` in `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`.
- C# constants use PascalCase when declared as `const` members and use descriptive names: `SectionName` in configuration option classes under `Workspace/Project/backend/src/Backend.Infrastructure/Configuration/`.
- TypeScript constants and local variables use camelCase: `rootDir` in `Workspace/Project/frontend/workbench/vitest.config.ts`, `problemDetails` in `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.
- TypeScript environment constants may use SCREAMING_SNAKE_CASE: `API_BASE_URL` in `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.

**Types:**
- C# domain entities use PascalCase nouns: `CaseRecord` in `Workspace/Project/backend/src/Backend.Domain/Cases/CaseRecord.cs`, `DecisionRecord` in `Workspace/Project/backend/src/Backend.Domain/Decisions/DecisionRecord.cs`.
- C# request/response DTOs use `Request` and `Response` suffixes: `CreateCaseRequest` and `CaseResponse` in `Workspace/Project/backend/src/Backend.Contracts/Cases/CasesContracts.cs`.
- TypeScript types use PascalCase and colocate near consumers when feature-specific: `FilterChip` in `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.tsx`, `ProblemDetailsFields` in `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.
- Zod schemas use camelCase with a `Schema` suffix: `tokenResponseSchema`, `caseResponseSchema`, and `healthReadySchema` in `Workspace/Project/frontend/workbench/src/shared/api/schemas.ts`.

## Code Style

**Formatting:**
- C# uses SDK defaults with 4-space indentation, file-scoped namespaces, braces on separate lines, nullable references enabled, and implicit usings enabled in project files such as `Workspace/Project/backend/src/Backend.Api/Backend.Api.csproj`.
- C# constructor injection is explicit and assigns private readonly fields, as in `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`.
- C# multiline LINQ and fluent chains indent continuation lines under the receiver, as in `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Repositories/CasesRepository.cs` and `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`.
- TypeScript uses 2-space indentation and generally omits semicolons in application files such as `Workspace/Project/frontend/workbench/src/shared/api/client.ts` and `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.tsx`.
- TypeScript config files may include semicolons when following generated or tool examples, such as `Workspace/Project/frontend/workbench/eslint.config.mjs`; application code should follow nearby file style.
- JSON files use 2-space or 4-space indentation depending on file origin; keep existing formatting in `Workspace/Project/frontend/workbench/package.json` and `Workspace/Project/frontend/workbench/tsconfig.json`.
- No `.editorconfig`, Prettier config, or C# formatter config is detected in the active `Workspace/Project/` tree. Use `dotnet format` and `npm run lint` only after checking local impact.

**Linting:**
- Frontend linting uses ESLint 9 with Next core web vitals and TypeScript presets in `Workspace/Project/frontend/workbench/eslint.config.mjs`.
- Run frontend linting from `Workspace/Project/frontend/workbench` with `npm run lint`.
- Backend analyzer configuration is not detected beyond SDK defaults in `Workspace/Project/backend/src/*/*.csproj`.
- Use suppressions sparingly and localize them. Existing suppressions appear for React hook compatibility in `Workspace/Project/frontend/workbench/src/shared/ui/data-grid.tsx` and `Workspace/Project/frontend/workbench/src/components/workbench/detection-studio/catalog-pane.tsx`.

## Import Organization

**Order:**
1. C# imports place project namespaces first in many files, then framework and package namespaces: `Workspace/Project/backend/src/Backend.Api/Program.cs`, `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`.
2. C# test imports commonly place domain/project namespaces first, then `FluentAssertions` and framework namespaces: `Workspace/Project/backend/tests/Backend.Tests/Domain/CaseRecordTests.cs`, `Workspace/Project/backend/tests/Backend.Tests/Integration/HealthEndpointTests.cs`.
3. TypeScript imports put external packages first, then alias imports from `@/`: `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.test.tsx`, `Workspace/Project/frontend/workbench/src/shared/api/client.test.ts`.
4. Type-only imports use inline `type` imports where practical: `import { type ZodType } from "zod"` in `Workspace/Project/frontend/workbench/src/shared/api/client.ts`, `import { cva, type VariantProps } from "class-variance-authority"` in `Workspace/Project/frontend/workbench/src/components/ui/button.tsx`.

**Path Aliases:**
- Frontend uses `@/*` for `Workspace/Project/frontend/workbench/src/*`, configured in `Workspace/Project/frontend/workbench/tsconfig.json` and `Workspace/Project/frontend/workbench/vitest.config.ts`.
- Prefer `@/shared/...`, `@/components/...`, and `@/lib/...` imports over deep relative imports in frontend source, as shown in `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.tsx`.
- Backend uses project references and namespaces rather than aliases: `Workspace/Project/backend/src/Backend.Application/Backend.Application.csproj`, `Workspace/Project/backend/src/Backend.Infrastructure/Backend.Infrastructure.csproj`.

## Error Handling

**Patterns:**
- Backend API errors flow through `GlobalExceptionHandler` in `Workspace/Project/backend/src/Backend.Api/Middlewares/GlobalExceptionHandler.cs`; use exceptions for failure states and let middleware convert them to Problem Details.
- Use `OptionalDependencyUnavailableException` for optional external dependency degradation so responses include `dependency`, `condition`, `dependencyType`, and `retryable` extensions; this is mapped in `Workspace/Project/backend/src/Backend.Api/Middlewares/GlobalExceptionHandler.cs`.
- Use FluentValidation request validators for input validation, not ad hoc controller checks: `Workspace/Project/backend/src/Backend.Application/Validation/CaseValidators.cs`, `Workspace/Project/backend/src/Backend.Application/Validation/RuleValidators.cs`.
- Domain invariants throw `ArgumentException`, `ArgumentOutOfRangeException`, or `InvalidOperationException` inside entities: `Workspace/Project/backend/src/Backend.Domain/Cases/CaseRecord.cs`, `Workspace/Project/backend/src/Backend.Domain/Rules/RuleRecord.cs`.
- Services return nullable results for not-found paths when callers decide response shape: `GetAsync` and `UpdateStatusAsync` in `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`.
- Frontend API calls throw `ApiError` with structured metadata from Problem Details: `Workspace/Project/frontend/workbench/src/shared/api/error.ts` and `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.
- Frontend API responses must pass Zod `safeParse`; schema failures throw `ApiError` with `isSchemaValidationFailure` in `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.
- Frontend provider hooks throw plain `Error` when used outside providers: `Workspace/Project/frontend/workbench/src/shared/auth/auth-provider.tsx`, `Workspace/Project/frontend/workbench/src/shared/theme/theme-provider.tsx`.

## Logging

**Framework:** Serilog for backend request logging and `ILogger<T>` for application/infrastructure logs.

**Patterns:**
- Configure Serilog at startup in `Workspace/Project/backend/src/Backend.Api/Program.cs` with configuration, DI services, log context enrichment, and console sink.
- Use structured log templates with named properties, for example `TraceId={TraceId}` in `Workspace/Project/backend/src/Backend.Api/Middlewares/GlobalExceptionHandler.cs` and `RunId={RunId}` in `Workspace/Project/backend/src/Backend.Worker/Jobs/ModelRetrainingWorker.cs`.
- Use `LogWarning` for optional dependency or recoverable operational failures and `LogError` for unhandled worker failures: `Workspace/Project/backend/src/Backend.Api/Infrastructure/ScanPlanExecutionWorker.cs`, `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionWorker.cs`.
- Frontend application logging framework is not detected. Avoid adding `console.*` in production UI paths unless the surrounding file already establishes that diagnostic pattern.

## Comments

**When to Comment:**
- Keep comments short and justify non-obvious behavior. Existing examples explain compatibility or operational fallbacks in `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`, `Workspace/Project/frontend/workbench/src/shared/gateway/aspnet-gateway.ts`, and `Workspace/Project/backend/src/Backend.Api/Infrastructure/RuleDistributionCommandRunner.cs`.
- Use comments for intentional lint exceptions only when the exception is local and specific, as in `Workspace/Project/frontend/workbench/src/shared/ui/data-grid.tsx`.
- Do not add comments for straightforward assignment, request mapping, or test setup already clear from code.

**JSDoc/TSDoc:**
- JSDoc/TSDoc is not a primary convention in active frontend code under `Workspace/Project/frontend/workbench/src/`.
- XML docs are mostly generated in EF migrations under `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Migrations/`; do not copy generated migration comment style into handwritten source.

## Function Design

**Size:** Keep services and helpers focused on one workflow. Use extraction for repeated mapping or parsing, such as `ToResponse` in `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs` and `parseProblemDetails` in `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.

**Parameters:** Pass `CancellationToken` through backend async APIs and repository methods: `Workspace/Project/backend/src/Backend.Application/Abstractions/Persistence/ICasesRepository.cs`, `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`.

**Return Values:** Use `Task<T>`/`Task<IReadOnlyList<T>>` for backend async operations and nullable return values for optional lookup results. Use typed `Promise<TSchema>` in frontend API helpers and validate external payloads with Zod before returning: `Workspace/Project/frontend/workbench/src/shared/api/client.ts`.

## Module Design

**Exports:** Backend modules expose public sealed classes for concrete services, validators, controllers, and middleware: `Workspace/Project/backend/src/Backend.Application/Services/CaseService.cs`, `Workspace/Project/backend/src/Backend.Api/Middlewares/GlobalExceptionHandler.cs`.

**Barrel Files:** Frontend uses targeted index-style gateway modules, such as `Workspace/Project/frontend/workbench/src/shared/gateway/index.ts`; do not add broad barrels that hide ownership across `shared`, `components`, and `app`.

**Dependency Registration:** Register backend services in layer-specific extension classes: application services in `Workspace/Project/backend/src/Backend.Application/DependencyInjection/ServiceCollectionExtensions.cs`, infrastructure services in `Workspace/Project/backend/src/Backend.Infrastructure/DependencyInjection/ServiceCollectionExtensions.cs`, and API services in `Workspace/Project/backend/src/Backend.Api/DependencyInjection/ServiceCollectionExtensions.cs`.

**UI Components:** Put reusable primitives in `Workspace/Project/frontend/workbench/src/components/ui/` and workbench-specific components in `Workspace/Project/frontend/workbench/src/components/workbench/`. Use `cn` from `Workspace/Project/frontend/workbench/src/lib/utils.ts` for Tailwind class merging.

---

*Convention analysis: 2026-04-26*
