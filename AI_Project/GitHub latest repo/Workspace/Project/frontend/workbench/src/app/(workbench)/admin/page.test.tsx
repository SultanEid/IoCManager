import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/shared/api/error"
import AdminPage from "@/app/(workbench)/admin/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const navigation = vi.hoisted(() => {
  const state = {
    pathname: "/settings",
    searchParams: new URLSearchParams(),
    push: vi.fn<(url: string) => void>(),
    replace: vi.fn<(url: string) => void>(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined),
    redirect: vi.fn<(url: string) => void>(),
    setUrl(url: string) {
      const nextUrl = new URL(url, "https://workbench.test")
      state.pathname = nextUrl.pathname
      state.searchParams = new URLSearchParams(nextUrl.search)
    },
    reset(nextPathname = "/settings") {
      state.pathname = nextPathname
      state.searchParams = new URLSearchParams()
      state.push.mockClear()
      state.replace.mockClear()
      state.back.mockClear()
      state.forward.mockClear()
      state.refresh.mockClear()
      state.prefetch.mockClear()
      state.redirect.mockClear()
    },
  }

  state.push.mockImplementation((url) => state.setUrl(url))
  state.replace.mockImplementation((url) => state.setUrl(url))

  return state
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    back: navigation.back,
    forward: navigation.forward,
    refresh: navigation.refresh,
    prefetch: navigation.prefetch,
  }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
  redirect: navigation.redirect,
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {
    getHealthInfo: vi.fn(),
    getHealthReady: vi.fn(),
    listJobRuns: vi.fn(),
    listUsers: vi.fn(),
    listRoles: vi.fn(),
    createUser: vi.fn(),
    runModelRetraining: vi.fn(),
  },
  isMockMode: false,
  isModeConfigured: true,
  isAspNetMode: true,
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "admin-1",
      roles: ["Admin"],
    },
  }),
}))

vi.mock("@/shared/auth/session", () => ({
  canAccessAdminActions: () => true,
  roleLabel: (value: string) => value,
}))

type QueryResult = {
  isLoading: boolean
  isError: boolean
  data?: unknown
  error?: unknown
}

function success(data: unknown): QueryResult {
  return {
    isLoading: false,
    isError: false,
    data,
    error: null,
  }
}

function failure(error: unknown): QueryResult {
  return {
    isLoading: false,
    isError: true,
    data: null,
    error,
  }
}

function setQueryState(state: { health: QueryResult; ready: QueryResult; jobs: QueryResult }) {
  mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
    const key = Array.isArray(queryKey) ? queryKey[1] : ""
    if (key === "health") {
      return state.health
    }

    if (key === "ready") {
      return state.ready
    }

    if (key === "jobs") {
      return state.jobs
    }

    if (key === "users" || key === "roles") {
      return success([])
    }

    if (key === "audit") {
      return success({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 15,
      })
    }

    return success([])
  })
}

describe("AdminPage health/readiness contract behavior", () => {
  const healthPayload = {
    service: "Backend.Api",
    environment: "Development",
    utcNow: "2026-03-30T10:00:00Z",
  }

  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
    navigation.reset("/settings")
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders content and optional-degraded context when readiness is ready", () => {
    setQueryState({
      health: success(healthPayload),
      ready: success({
        status: "ready",
        components: [
          { name: "database", status: "healthy", required: true, message: "Database reachable." },
          {
            name: "ai_sidecar",
            status: "degraded",
            required: false,
            message: "AI sidecar temporarily unavailable.",
          },
        ],
      }),
      jobs: success([]),
    })

    render(<AdminPage />)

    expect(screen.getByText("Environment status and orchestration controls")).toBeInTheDocument()
    expect(screen.getByTestId("admin-optional-degraded")).toBeInTheDocument()
    expect(screen.getByText(/Optional dependency degraded/i)).toBeInTheDocument()
    expect(screen.getByText(/ai_sidecar/i)).toBeInTheDocument()
  })

  it("renders permission-restricted state when readiness call is forbidden", () => {
    setQueryState({
      health: success(healthPayload),
      ready: failure(
        new ApiError("Forbidden", 403, {
          title: "Forbidden",
          detail: "Role does not permit this surface.",
        }, {
          title: "Forbidden",
          detail: "Role does not permit this surface.",
        }),
      ),
      jobs: success([]),
    })

    render(<AdminPage />)

    expect(screen.getByText("Permission restricted")).toBeInTheDocument()
  })

  it("renders dependency-down state when readiness reports dependency issue", () => {
    setQueryState({
      health: success(healthPayload),
      ready: failure(
        new ApiError("AI sidecar is temporarily unavailable. Retry later.", 503, null, {
          title: "Dependency Temporarily Unavailable",
          detail: "AI sidecar is temporarily unavailable. Retry later.",
          dependency: "ai_sidecar",
          dependencyType: "optional",
          condition: "temporarily_unavailable",
          retryable: true,
        }),
      ),
      jobs: success([]),
    })

    render(<AdminPage />)

    expect(screen.getByText("Dependency down")).toBeInTheDocument()
  })

  it("renders unavailable state for non-dependency readiness failures", () => {
    setQueryState({
      health: success(healthPayload),
      ready: failure(new ApiError("Bad request", 400)),
      jobs: success([]),
    })

    render(<AdminPage />)

    expect(screen.getByText("Settings unavailable")).toBeInTheDocument()
  })
})
