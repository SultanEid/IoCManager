import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import IocsExplorerPage from "./page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const navigation = vi.hoisted(() => {
  const state = {
    pathname: "/ioc-ingestion",
    searchParams: new URLSearchParams(),
    push: vi.fn<(url: string) => void>(),
    replace: vi.fn<(url: string) => void>(),
    setUrl(url: string) {
      const nextUrl = new URL(url, "https://workbench.test")
      state.pathname = nextUrl.pathname
      state.searchParams = new URLSearchParams(nextUrl.search)
    },
    reset(url = "/ioc-ingestion") {
      const nextUrl = new URL(url, "https://workbench.test")
      state.pathname = nextUrl.pathname
      state.searchParams = new URLSearchParams(nextUrl.search)
      state.push.mockClear()
      state.replace.mockClear()
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
  }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "analyst-1",
      username: "analyst",
    },
  }),
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {
    listDetections: vi.fn(),
    getLatestAiDecisionForIoc: vi.fn(),
    generateAiDecisionForIoc: vi.fn(),
    getAiDecisionResult: vi.fn(),
  },
}))

vi.mock("@/shared/gateway/legacy-scan-pipeline", () => ({
  exportLegacyIocFindingsCsv: vi.fn(),
  exportLegacyIocFindingsJson: vi.fn(),
  getLegacyIocFindingDetail: vi.fn(),
  listLegacyIocFindings: vi.fn(),
  listLegacyTargets: vi.fn(),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

const target = {
  id: "target-1",
  networkId: "network-1",
  networkName: "Lab",
  displayName: "Zombie",
  hostname: "zombie",
  ipAddress: "192.168.207.130",
  status: "Online",
  targetOsType: "Windows",
  lastSweepAtUtc: null,
}

function makeFinding(index: number) {
  return {
    iocId: `ioc-${index}`,
    scannerFamily: "YARA",
    targetId: target.id,
    targetDisplay: target.displayName,
    targetIp: target.ipAddress,
    targetOsType: target.targetOsType,
    jobId: `job-${index}`,
    scanPlanId: null,
    ruleName: `IOCManager_Test_Rule_${index}`,
    indicatorValue: `C:\\IOC\\sample-${index}.json`,
    indicatorKind: "file_path",
    painLevel: "HostArtifact",
    severity: "High",
    timestampUtc: "2026-04-24T14:14:24.000Z",
    rawPayload: null,
    status: "Open",
  }
}

function installQueryMock(totalCount = 125) {
  mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
    if (Array.isArray(queryKey) && queryKey[0] === "legacy-pipeline" && queryKey[1] === "ioc-explorer-targets") {
      return {
        data: [target],
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
      }
    }

    if (Array.isArray(queryKey) && queryKey[0] === "legacy-pipeline" && queryKey[1] === "ioc-findings" && queryKey[2] !== "detail") {
      const filters = queryKey[2] as { page: number; pageSize: number }
      const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize))
      const page = Math.min(Math.max(filters.page, 1), totalPages)
      return {
        data: {
          items: [makeFinding(1), makeFinding(2)],
          totalCount,
          page,
          pageSize: filters.pageSize,
          availableSeverities: ["High", "Medium"],
        },
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
      }
    }

    if (Array.isArray(queryKey) && queryKey[0] === "scanning") {
      return {
        data: { items: [] },
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
      }
    }

    return {
      data: null,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    }
  })
}

describe("IocsExplorerPage pagination and filters", () => {
  beforeEach(() => {
    navigation.reset()
    installQueryMock()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("routes to the last page from the pagination controls", () => {
    navigation.reset("/ioc-ingestion?page=2")

    render(<IocsExplorerPage />)

    fireEvent.click(screen.getAllByRole("button", { name: "Go to last page" })[0])

    expect(navigation.replace).toHaveBeenLastCalledWith("/ioc-ingestion?page=3")
  })

  it("disables first and previous on the first page", () => {
    render(<IocsExplorerPage />)

    for (const button of screen.getAllByRole("button", { name: "Go to first page" })) {
      expect(button).toBeDisabled()
    }
    for (const button of screen.getAllByRole("button", { name: "Go to previous page" })) {
      expect(button).toBeDisabled()
    }
    for (const button of screen.getAllByRole("button", { name: "Go to next page" })) {
      expect(button).toBeEnabled()
    }
    for (const button of screen.getAllByRole("button", { name: "Go to last page" })) {
      expect(button).toBeEnabled()
    }
  })

  it("disables next and last on the last page", () => {
    navigation.reset("/ioc-ingestion?page=3")

    render(<IocsExplorerPage />)

    for (const button of screen.getAllByRole("button", { name: "Go to next page" })) {
      expect(button).toBeDisabled()
    }
    for (const button of screen.getAllByRole("button", { name: "Go to last page" })) {
      expect(button).toBeDisabled()
    }
  })

  it("resets to page one when the page size changes", () => {
    navigation.reset("/ioc-ingestion?page=3")

    render(<IocsExplorerPage />)

    fireEvent.change(screen.getAllByLabelText("Page size")[0], { target: { value: "100" } })

    expect(navigation.replace).toHaveBeenLastCalledWith("/ioc-ingestion?pageSize=100")
  })

  it("removes active filters and resets pagination", () => {
    navigation.reset("/ioc-ingestion?q=bluefin&scannerFamily=YARA&page=3")

    render(<IocsExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Remove search filter" }))

    expect(navigation.replace).toHaveBeenLastCalledWith("/ioc-ingestion?scannerFamily=YARA")
  })
})
