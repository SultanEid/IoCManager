import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ReportsPage from "@/app/(workbench)/reports/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const navigation = vi.hoisted(() => {
  const state = {
    pathname: "/reports",
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
    reset(nextPathname = "/reports") {
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
const gatewayState = vi.hoisted(() => ({
  isMockMode: false,
  isModeConfigured: true,
  isAspNetMode: true,
}))
const mockedGateway = vi.hoisted(() => ({
  listReports: vi.fn(),
  getReport: vi.fn(),
  listTargetServers: vi.fn(),
  generateReport: vi.fn(),
  deleteReport: vi.fn(),
  listReportMitigationPlans: vi.fn(),
  generateReportMitigation: vi.fn(),
  translateReportMitigationPlan: vi.fn(),
}))

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

vi.mock("@/shared/gateway", () => ({
  gateway: mockedGateway,
  get isMockMode() {
    return gatewayState.isMockMode
  },
  get isModeConfigured() {
    return gatewayState.isModeConfigured
  },
  get isAspNetMode() {
    return gatewayState.isAspNetMode
  },
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "lead-1",
      username: "lead",
    },
  }),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ReportsPage mode behavior", () => {
  beforeEach(() => {
    gatewayState.isMockMode = false
    gatewayState.isModeConfigured = true
    gatewayState.isAspNetMode = true
    navigation.reset("/reports")
    mockedGateway.listReports.mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    })
    mockedGateway.getReport.mockRejectedValue(new Error("Unexpected report detail lookup."))
    mockedGateway.listTargetServers.mockResolvedValue([])
    mockedGateway.listReportMitigationPlans.mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    })
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      if (Array.isArray(queryKey) && queryKey[0] === "reports" && queryKey[1] === "targets") {
        return {
          isLoading: false,
          isError: false,
          data: [],
        }
      }

      if (Array.isArray(queryKey) && queryKey[0] === "reports" && queryKey[1] === "aegis-plans") {
        return {
          isLoading: false,
          isError: false,
          data: {
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: 20,
          },
        }
      }

      return {
        isLoading: false,
        isError: false,
        data: {
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
        },
      }
    })
  })

  it("renders contract-backed empty state in normal mode", () => {
    render(<ReportsPage />)

    expect(screen.getByText("Report workspace")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Library (0)" }))
    expect(screen.getByText("No saved reports")).toBeInTheDocument()
  })

  it("keeps the saved-library empty state in demo mode", () => {
    gatewayState.isMockMode = true
    gatewayState.isAspNetMode = false

    render(<ReportsPage />)

    fireEvent.click(screen.getByRole("button", { name: "Library (0)" }))
    expect(screen.getByText("No saved reports")).toBeInTheDocument()
  })

  it("clears the saved report preview when the review modal closes", async () => {
    const report = {
      id: "28a7a4d1-b7c3-4a89-af8e-b7da9ff760a6",
      title: "Executive Summary - 2026-04-24 08:32 UTC",
      reportType: "ExecutiveSummary",
      summaryJson: JSON.stringify({
        Scope: "Global scope",
        Filters: {},
        Sections: [
          {
            Title: "Executive Assessment",
            Summary: "Decision-ready summary.",
            Metrics: [],
            Highlights: ["Critical posture."],
            Narrative: null,
            Tables: [],
          },
        ],
      }),
      generatedAtUtc: "2026-04-24T08:32:07Z",
      createdAtUtc: "2026-04-24T08:32:07Z",
      updatedAtUtc: "2026-04-24T08:32:07Z",
      alertIds: [],
    }

    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      if (Array.isArray(queryKey) && queryKey[0] === "reports" && queryKey[1] === "targets") {
        return {
          isLoading: false,
          isError: false,
          data: [],
        }
      }

      if (Array.isArray(queryKey) && queryKey[0] === "reports" && queryKey[1] === "aegis-plans") {
        return {
          isLoading: false,
          isError: false,
          data: {
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: 20,
          },
        }
      }

      return {
        isLoading: false,
        isError: false,
        data: {
          items: [report],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        },
      }
    })

    render(<ReportsPage />)

    fireEvent.click(screen.getByRole("button", { name: "Library (1)" }))
    fireEvent.click(screen.getAllByRole("button", { name: /^Preview$/ })[0])

    expect(await screen.findByRole("dialog", { name: "Report review" })).toBeInTheDocument()
    expect(screen.getAllByText("Executive Assessment").length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: /Export HTML/i })[0]).toHaveAttribute("href", `/api/v2/reports/${report.id}/html`)

    fireEvent.click(screen.getByRole("button", { name: "Close report review" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Report review" })).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: "Builder" }))
    expect(screen.getByText("No preview yet")).toBeInTheDocument()
    expect(screen.queryByText("Critical posture.")).not.toBeInTheDocument()
  })

  it("renders a persisted generated preview with an HTML export action", async () => {
    const persistedReport = {
      id: "28a7a4d1-b7c3-4a89-af8e-b7da9ff760a6",
      title: "Executive Summary - 2026-04-24 08:32 UTC",
      reportType: "ExecutiveSummary",
      summaryJson: "{}",
      generatedAtUtc: "2026-04-24T08:32:07Z",
      createdAtUtc: "2026-04-24T08:32:07Z",
      updatedAtUtc: "2026-04-24T08:32:07Z",
      alertIds: [],
    }
    mockedGateway.generateReport.mockResolvedValue({
      requestedReportType: "ExecutiveSummary",
      title: persistedReport.title,
      status: "persisted",
      generatedAtUtc: persistedReport.generatedAtUtc,
      sections: [
        {
          title: "Executive Assessment",
          summary: "Decision-ready summary.",
          metrics: [],
          highlights: ["Critical posture."],
          narrative: null,
          tables: [],
        },
      ],
      alertIds: [],
      persistedReport,
    })

    render(<ReportsPage />)

    fireEvent.click(screen.getByRole("button", { name: /Preview report/i }))

    expect(await screen.findByText("Critical posture.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Export HTML/i })).toHaveAttribute("href", `/api/v2/reports/${persistedReport.id}/html`)
  })

  it("keeps report review color restrained to severities and scanner badges", async () => {
    mockedGateway.generateReport.mockResolvedValue({
      requestedReportType: "DetailedIocReport",
      title: "IOC Manager Mixed Scan",
      status: "preview",
      generatedAtUtc: "2026-05-05T14:21:04Z",
      sections: [
        {
          title: "Detection Overview",
          summary: "Normalized IOC evidence.",
          metrics: [
            { label: "Total Findings", value: "115", detail: "Normalized IOC rows in scope." },
            { label: "High / Critical", value: "0", detail: "Highest-priority findings in scope." },
            { label: "Critical", value: "4", detail: "Critical findings in scope." },
          ],
          highlights: ["Sigma: IOC Manager Mixed Scan Sigma Marker | 12 findings"],
          narrative: null,
          tables: [],
        },
      ],
      alertIds: [],
      persistedReport: null,
    })

    render(<ReportsPage />)

    fireEvent.click(screen.getByRole("button", { name: /Preview report/i }))

    expect(await screen.findByText("Detection Overview")).toBeInTheDocument()
    expect(screen.getByText("115")).toHaveClass("text-foreground")
    expect(screen.getAllByText("0").some((element) => element.classList.contains("text-emerald-300"))).toBe(true)
    expect(screen.getByText("4")).toHaveClass("text-red-700")
    expect(screen.getAllByText("Sigma").length).toBeGreaterThan(0)
  })

  it("keeps Aegis review cards tone-coded and renames the review gate", async () => {
    const report = {
      id: "9f2523a3-0a2f-4cf8-8939-86c1d01f7d75",
      title: "Aegis mitigation: Severe alert",
      reportType: "Operational",
      summaryJson: JSON.stringify({
        aegisMitigationPlanVersion: 1,
        result: {
          plannerModel: "Aegis",
          extractedIocs: [],
          claims: [],
          mitigationPlan: {
            executiveSummary: "Operator-ready response plan.",
            threatSummary: "Aegis threat summary.",
            severity: "high",
            confidence: "medium",
            requiresHumanReview: true,
            affectedAssetHypotheses: ["Web-Server (192.168.207.130)"],
            immediateActions: [],
            hardeningActions: [],
            scanRecommendations: [],
            assumptions: [],
            gaps: [],
            validationSteps: [],
          },
        },
      }),
      generatedAtUtc: "2026-05-06T08:03:00Z",
      createdAtUtc: "2026-05-06T08:03:00Z",
      updatedAtUtc: "2026-05-06T08:03:00Z",
      alertIds: [],
    }

    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      if (Array.isArray(queryKey) && queryKey[0] === "reports" && queryKey[1] === "targets") {
        return {
          isLoading: false,
          isError: false,
          data: [],
        }
      }

      if (Array.isArray(queryKey) && queryKey[0] === "reports" && queryKey[1] === "aegis-plans") {
        return {
          isLoading: false,
          isError: false,
          data: {
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: 20,
          },
        }
      }

      return {
        isLoading: false,
        isError: false,
        data: {
          items: [report],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        },
      }
    })

    render(<ReportsPage />)

    fireEvent.click(screen.getByRole("button", { name: "Library (1)" }))
    fireEvent.click(screen.getAllByRole("button", { name: /^Preview$/ })[0])

    expect(await screen.findByText("Operator-ready response plan")).toBeInTheDocument()
    expect(screen.getByText("Action Required")).toHaveClass("text-rose-100")
    expect(screen.getByText("medium")).toHaveClass("text-orange-100")
    expect(screen.queryByText("Human review recommended")).not.toBeInTheDocument()
  })

  it("opens a review query report by id when it is outside the first page", async () => {
    const report = {
      id: "ef2f082c-7d8f-4a0e-8189-0a4476034331",
      title: "Source bulletin review",
      reportType: "Operational",
      summaryJson: JSON.stringify({
        scope: "Source report",
        filters: {},
        sections: [
          {
            title: "Source Assessment",
            summary: "Opened from source link.",
            metrics: [],
            highlights: [],
            narrative: null,
            tables: [],
          },
        ],
      }),
      generatedAtUtc: "2026-04-24T08:32:07Z",
      createdAtUtc: "2026-04-24T08:32:07Z",
      updatedAtUtc: "2026-04-24T08:32:07Z",
      alertIds: [],
    }
    navigation.setUrl(`/reports?review=${report.id}`)
    mockedGateway.getReport.mockResolvedValue(report)

    render(<ReportsPage />)

    expect(await screen.findByRole("dialog", { name: "Report review" })).toBeInTheDocument()
    expect(screen.getAllByText("Source Assessment").length).toBeGreaterThan(0)
    expect(mockedGateway.getReport).toHaveBeenCalledWith(report.id, expect.any(AbortSignal))
  })
})
