# Testing Patterns

**Analysis Date:** 2026-04-26

## Test Framework

**Runner:**
- Backend: xUnit 2.8.1 with Microsoft.NET.Test.Sdk 17.10.0 in `Workspace/Project/backend/tests/Backend.Tests/Backend.Tests.csproj`.
- Backend integration hosting: `Microsoft.AspNetCore.Mvc.Testing` 8.0.16 and `WebApplicationFactory<Program>` in `Workspace/Project/backend/tests/Backend.Tests/Integration/TestWebApplicationFactory.cs`.
- Frontend unit/component: Vitest 4.1.0 with jsdom configured in `Workspace/Project/frontend/workbench/vitest.config.ts`.
- Frontend E2E: Playwright Test 1.58.2 configured in `Workspace/Project/frontend/workbench/playwright.config.mjs`.

**Assertion Library:**
- Backend uses FluentAssertions 6.12.1: `Workspace/Project/backend/tests/Backend.Tests/Validation/CreateCaseRequestValidatorTests.cs`, `Workspace/Project/backend/tests/Backend.Tests/Domain/CaseRecordTests.cs`.
- Backend also has a lightweight custom `Expect` helper in `Workspace/Project/backend/tests/Backend.Tests/Expect.cs`; prefer FluentAssertions for new tests unless matching a nearby file that uses `Expect`.
- Frontend uses Vitest `expect` plus `@testing-library/jest-dom/vitest` setup in `Workspace/Project/frontend/workbench/src/test/setup.ts`.
- E2E uses Playwright `expect` in specs such as `Workspace/Project/frontend/workbench/e2e/auth.spec.mjs`.

**Run Commands:**
```bash
dotnet test Workspace/Project/backend/Backend.sln              # Run backend tests
cd Workspace/Project/frontend/workbench && npm run test:run     # Run frontend Vitest tests once
cd Workspace/Project/frontend/workbench && npm test             # Run frontend Vitest in default mode
cd Workspace/Project/frontend/workbench && npm run test:coverage # Run frontend coverage
cd Workspace/Project/frontend/workbench && npm run test:e2e     # Run Playwright E2E tests
```

## Test File Organization

**Location:**
- Backend tests live in one test project: `Workspace/Project/backend/tests/Backend.Tests/`.
- Backend domain tests live under `Workspace/Project/backend/tests/Backend.Tests/Domain/`.
- Backend application tests live under `Workspace/Project/backend/tests/Backend.Tests/Application/`.
- Backend infrastructure tests live under `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/`.
- Backend API integration tests live under `Workspace/Project/backend/tests/Backend.Tests/Integration/`.
- Frontend unit and component tests are co-located with source in `Workspace/Project/frontend/workbench/src/`.
- Shared frontend test utilities live in `Workspace/Project/frontend/workbench/src/test/`.
- Frontend E2E tests live in `Workspace/Project/frontend/workbench/e2e/`.

**Naming:**
- Backend test classes use `{Subject}Tests`: `CaseRecordTests`, `HealthEndpointTests`, `AiReportExtractionClientTests`.
- Backend test methods use `MethodOrBehavior_ExpectedResult_WhenCondition`: `Validate_ReturnsError_WhenPriorityIsInvalid` in `Workspace/Project/backend/tests/Backend.Tests/Validation/CreateCaseRequestValidatorTests.cs`.
- Frontend Vitest files use `*.test.ts` or `*.test.tsx`: `Workspace/Project/frontend/workbench/src/shared/api/client.test.ts`, `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.test.tsx`.
- Playwright files use `*.spec.mjs`: `Workspace/Project/frontend/workbench/e2e/approval-flow.spec.mjs`.

**Structure:**
```text
Workspace/Project/backend/tests/Backend.Tests/
├── Application/
├── Domain/
├── Infrastructure/
├── Integration/
├── Validation/
├── GlobalUsings.cs
└── Backend.Tests.csproj

Workspace/Project/frontend/workbench/src/
├── app/**/*.test.tsx
├── components/**/*.test.tsx
├── shared/**/*.test.ts
├── shared/**/*.test.tsx
└── test/

Workspace/Project/frontend/workbench/e2e/
├── *.spec.mjs
└── mock-api.mjs
```

## Test Structure

**Suite Organization:**
```typescript
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FilterChips } from "@/shared/ui/filter-chips"

describe("FilterChips", () => {
  it("renders chips and calls onChange", () => {
    const onChange = vi.fn()
    render(<FilterChips title="Status" active="all" onChange={onChange} chips={[]} />)

    fireEvent.click(screen.getByText("Open"))
    expect(onChange).toHaveBeenCalledWith("open")
  })
})
```

Use the full pattern from `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.test.tsx`; keep `describe` names aligned to the component or module under test.

```csharp
public sealed class CaseRecordTests
{
    [Fact]
    public void TransitionTo_ThrowsForInvalidFlow()
    {
        var item = CaseRecord.Open(...);

        var act = () => item.TransitionTo(CaseStatus.Approved, "lead-1", nowUtc.AddMinutes(1));

        act.Should().Throw<InvalidOperationException>();
    }
}
```

Use the full backend pattern from `Workspace/Project/backend/tests/Backend.Tests/Domain/CaseRecordTests.cs`; keep Arrange, Act, Assert separated by blank lines.

**Patterns:**
- Backend unit tests use `[Fact]` for single examples and `[Theory]` with `[InlineData]` for matrix coverage: `Workspace/Project/backend/tests/Backend.Tests/Domain/FeedbackAuxiliaryOutputsTests.cs`, `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/ScanExecutionDispatcherTests.cs`.
- Backend integration tests use `IClassFixture<TestWebApplicationFactory>` and `IAsyncLifetime` when per-test database reset is required: `Workspace/Project/backend/tests/Backend.Tests/Integration/HealthEndpointTests.cs`, `Workspace/Project/backend/tests/Backend.Tests/Integration/CasesEndpointsTests.cs`.
- Frontend component tests render with Testing Library and assert by user-visible text or roles: `Workspace/Project/frontend/workbench/src/components/workbench/route-guard.test.tsx`, `Workspace/Project/frontend/workbench/src/shared/ui/filter-chips.test.tsx`.
- Frontend async UI tests use `waitFor` when checking redirects or delayed effects: `Workspace/Project/frontend/workbench/src/components/workbench/route-guard.test.tsx`.
- E2E tests use `test.beforeEach` for session and API mocking, then navigate by route and assert headings or URLs: `Workspace/Project/frontend/workbench/e2e/auth.spec.mjs`.

## Mocking

**Framework:** Vitest mocks for frontend unit tests, custom stubs/fakes for backend tests, Playwright route interception for E2E.

**Patterns:**
```typescript
const mockedSession = vi.hoisted(() => ({
  getSession: vi.fn(),
  clearSession: vi.fn(),
}))

vi.mock("@/shared/auth/session", () => ({
  getSession: mockedSession.getSession,
  clearSession: mockedSession.clearSession,
}))
```

Use `vi.hoisted` for mocks that must be visible inside `vi.mock` factories, as in `Workspace/Project/frontend/workbench/src/shared/api/client.test.ts`.

```csharp
private sealed class StubHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_responseFactory(request));
    }
}
```

Use local `HttpMessageHandler` stubs for outbound HTTP clients, as in `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/Integrations/AiReportExtractionClientTests.cs`.

**What to Mock:**
- Mock browser APIs missing from jsdom in `Workspace/Project/frontend/workbench/src/test/setup.ts`, such as `ResizeObserver`, `scrollIntoView`, and `getAnimations`.
- Mock `next/navigation` for route-aware component tests: `Workspace/Project/frontend/workbench/src/test/next-navigation.ts`, `Workspace/Project/frontend/workbench/src/components/workbench/route-guard.test.tsx`.
- Mock auth provider state for permission and redirect tests: `Workspace/Project/frontend/workbench/src/components/workbench/route-guard.test.tsx`.
- Mock `globalThis.fetch` for frontend API client tests: `Workspace/Project/frontend/workbench/src/shared/api/client.test.ts`.
- Replace backend external integrations in `TestWebApplicationFactory`: `IAiReportExtractionClient`, `IIcmpProbe`, `IRuleDistributionTransportDispatcher`, and `IScanExecutionDispatcher` in `Workspace/Project/backend/tests/Backend.Tests/Integration/TestWebApplicationFactory.cs`.
- Use Playwright `page.route("**/api/**", ...)` through `mockWorkbenchApi` for E2E API simulation in `Workspace/Project/frontend/workbench/e2e/mock-api.mjs`.

**What NOT to Mock:**
- Do not mock domain entities for backend domain tests; instantiate real records such as `CaseRecord.Open` in `Workspace/Project/backend/tests/Backend.Tests/Domain/CaseRecordTests.cs`.
- Do not mock FluentValidation validators when testing validation behavior; instantiate validators directly as in `Workspace/Project/backend/tests/Backend.Tests/Validation/CreateCaseRequestValidatorTests.cs`.
- Do not mock Zod parsing in API client tests; assert real schema validation failures as in `Workspace/Project/frontend/workbench/src/shared/api/client.test.ts`.
- Do not use live backend services for Playwright UI flows; use `mockWorkbenchApi` in `Workspace/Project/frontend/workbench/e2e/mock-api.mjs` unless the test explicitly targets live integration.

## Fixtures and Factories

**Test Data:**
```csharp
var nowUtc = new DateTimeOffset(2026, 03, 14, 08, 00, 00, TimeSpan.Zero);
var caseRecord = CaseRecord.Open(
    "Feedback case",
    "Repository roundtrip",
    CasePriority.High,
    "analyst-1",
    ApprovalTier.Lead,
    "analyst-1",
    nowUtc.AddMinutes(-10));
```

Use explicit timestamps and stable IDs where deterministic assertions matter, following `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/Persistence/FeedbackRepositoryTests.cs`.

```javascript
export const ids = {
  primaryCase: "8f2f680c-3079-4e5a-a163-142866f4e6fe",
  secondaryCase: "cf602ea5-1599-49d2-a235-cb34ef5a9d9f",
}
```

Use shared E2E fixture IDs and state builders from `Workspace/Project/frontend/workbench/e2e/mock-api.mjs`.

**Location:**
- Backend integration factory: `Workspace/Project/backend/tests/Backend.Tests/Integration/TestWebApplicationFactory.cs`.
- Backend authenticated client helpers: `Workspace/Project/backend/tests/Backend.Tests/Integration/AuthenticatedClientExtensions.cs`.
- Backend integration fake services: `Workspace/Project/backend/tests/Backend.Tests/Integration/TestAiReportExtractionClient.cs`, `Workspace/Project/backend/tests/Backend.Tests/Integration/TestIcmpProbe.cs`, `Workspace/Project/backend/tests/Backend.Tests/Integration/TestScanExecutionDispatcher.cs`.
- Frontend Next navigation mock helpers: `Workspace/Project/frontend/workbench/src/test/next-navigation.ts`.
- Frontend jsdom setup: `Workspace/Project/frontend/workbench/src/test/setup.ts`.
- Frontend E2E mock API and session helpers: `Workspace/Project/frontend/workbench/e2e/mock-api.mjs`.

## Coverage

**Requirements:** No enforced coverage threshold is detected for backend or frontend.

**View Coverage:**
```bash
cd Workspace/Project/frontend/workbench && npm run test:coverage
```

Backend coverage tooling is not configured in `Workspace/Project/backend/tests/Backend.Tests/Backend.Tests.csproj`; add coverage tooling only with an explicit phase requirement.

## Test Types

**Unit Tests:**
- Backend domain unit tests validate invariants, transitions, normalization, and value behavior without DI or HTTP: `Workspace/Project/backend/tests/Backend.Tests/Domain/CaseRecordTests.cs`, `Workspace/Project/backend/tests/Backend.Tests/Domain/FeedbackTaxonomyTests.cs`.
- Backend validation tests instantiate FluentValidation validators directly: `Workspace/Project/backend/tests/Backend.Tests/Validation/CreateCaseRequestValidatorTests.cs`, `Workspace/Project/backend/tests/Backend.Tests/Validation/SubmitFeedbackRequestValidatorTests.cs`.
- Frontend pure logic tests cover schemas, selectors, auth, role access, and modules: `Workspace/Project/frontend/workbench/src/shared/api/schemas.test.ts`, `Workspace/Project/frontend/workbench/src/shared/mock/selectors.test.ts`, `Workspace/Project/frontend/workbench/src/shared/auth/role-access.test.ts`.

**Integration Tests:**
- Backend endpoint tests use `TestWebApplicationFactory`, in-memory EF, test auth headers, and reset state per test: `Workspace/Project/backend/tests/Backend.Tests/Integration/TestWebApplicationFactory.cs`, `Workspace/Project/backend/tests/Backend.Tests/Integration/HealthEndpointTests.cs`.
- Backend repository tests use real `CtiDbContext` with EF in-memory database: `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/Persistence/FeedbackRepositoryTests.cs`.
- Backend outbound integration client tests use stubbed HTTP responses: `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/Integrations/AiReportExtractionClientTests.cs`.
- Frontend integration-style component tests render route/page components with mocked app dependencies: `Workspace/Project/frontend/workbench/src/test/integration-smoke.test.tsx`, `Workspace/Project/frontend/workbench/src/app/(workbench)/settings/page.test.tsx`.

**E2E Tests:**
- Playwright starts Next dev server on `127.0.0.1:3211` and reuses existing server per `Workspace/Project/frontend/workbench/playwright.config.mjs`.
- E2E specs cover auth, approval flow, case detail, queue, IOC registry, rule review, rollout flow, route redirects, and theme contrast under `Workspace/Project/frontend/workbench/e2e/`.
- E2E tests should call `bootstrapSession` or `clearSession`, then `mockWorkbenchApi`, before navigating: `Workspace/Project/frontend/workbench/e2e/auth.spec.mjs`, `Workspace/Project/frontend/workbench/e2e/case-detail.spec.mjs`.

## Common Patterns

**Async Testing:**
```typescript
await waitFor(() => {
  expect(replace).toHaveBeenCalledWith("/auth?next=%2Fqueue")
})
```

Use `waitFor` for frontend effects and navigation assertions, as in `Workspace/Project/frontend/workbench/src/components/workbench/route-guard.test.tsx`.

```csharp
public Task InitializeAsync() => _factory.ResetDatabaseAsync();
public Task DisposeAsync() => Task.CompletedTask;
```

Use `IAsyncLifetime` for backend integration reset hooks, as in `Workspace/Project/backend/tests/Backend.Tests/Integration/HealthEndpointTests.cs`.

**Error Testing:**
```csharp
var act = () => item.TransitionTo(CaseStatus.Approved, "lead-1", nowUtc.AddMinutes(1));
act.Should().Throw<InvalidOperationException>();
```

Use `act.Should().Throw<T>()` for synchronous backend failures, as in `Workspace/Project/backend/tests/Backend.Tests/Domain/CaseRecordTests.cs`.

```csharp
var action = async () => await client.ExtractAsync(BuildRequest(), CancellationToken.None);
await action.Should().ThrowAsync<OptionalDependencyUnavailableException>()
    .Where(ex => ex.DependencyName == "ai_sidecar" && ex.Condition == "temporarily_unavailable");
```

Use `ThrowAsync<T>()` plus `.Where(...)` for async backend exception metadata, as in `Workspace/Project/backend/tests/Backend.Tests/Infrastructure/Integrations/AiReportExtractionClientTests.cs`.

```typescript
await expect(
  requestJson("/api/v2/identity/users", z.array(z.object({ id: z.string() }))),
).rejects.toBeInstanceOf(ApiError)
```

Use `rejects` for promise failures unless the test needs to inspect the thrown object fields manually, as in `Workspace/Project/frontend/workbench/src/shared/api/client.test.ts`.

---

*Testing analysis: 2026-04-26*
