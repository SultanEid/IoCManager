import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AlertsPage from "@/app/(workbench)/alerts/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const mockedRouter = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/alerts",
  useRouter: () => mockedRouter,
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {
    listAlertRegistry: vi.fn(),
  },
}))

vi.mock("@/components/workbench/alerts/alert-queue-panel", () => ({
  AlertQueuePanel: () => <div data-testid="alert-queue-panel" />,
}))

describe("AlertsPage", () => {
  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
    mockedUseWorkbenchQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        items: [
          {
            id: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
            title: "Case alert",
            summary: "Case summary",
            severity: "High",
            status: "Investigating",
            ownerUserId: "lead-1",
            approvalTierRequired: "Lead",
            scannerFamily: "yara",
            targetId: null,
            targetDisplay: "srv-app-01",
            ruleName: "Suspicious config",
            linkedIocCount: 4,
            progress: {
              totalIocs: 4,
              openCount: 1,
              inReviewCount: 0,
              completedCount: 3,
              percentComplete: 75,
            },
            firstDetectedAtUtc: "2026-04-20T00:00:00Z",
            lastDetectedAtUtc: "2026-04-20T00:00:00Z",
            createdAtUtc: "2026-04-20T00:00:00Z",
            updatedAtUtc: "2026-04-20T00:00:00Z",
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 25,
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders case IOC progress in the alert registry", () => {
    render(<AlertsPage />)

    expect(screen.getAllByText("75%").length).toBeGreaterThan(0)
    expect(screen.getAllByText("3/4").length).toBeGreaterThan(0)
  })

  it("renders grouped scan-result cases with a clean title", () => {
    mockedUseWorkbenchQuery.mockReturnValueOnce({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        items: [
          {
            id: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
            title: "YARA findings on srv-app-01 (job 44, result 159)",
            summary: "Grouped case summary",
            severity: "High",
            status: "Open",
            ownerUserId: "unassigned",
            approvalTierRequired: "Lead",
            scannerFamily: "yara",
            targetId: null,
            targetDisplay: "srv-app-01",
            ruleName: "Multiple rules",
            linkedIocCount: 3,
            progress: {
              totalIocs: 3,
              openCount: 3,
              inReviewCount: 0,
              completedCount: 0,
              percentComplete: 0,
            },
            firstDetectedAtUtc: "2026-04-20T00:00:00Z",
            lastDetectedAtUtc: "2026-04-20T00:00:00Z",
            createdAtUtc: "2026-04-20T00:00:00Z",
            updatedAtUtc: "2026-04-20T00:00:00Z",
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 25,
      },
    })

    render(<AlertsPage />)

    expect(screen.getAllByText("YARA findings on srv-app-01").length).toBeGreaterThan(0)
    expect(screen.queryByText("Multiple rules")).not.toBeInTheDocument()
  })

  it("shows a no-linked-IOC state instead of empty progress math", () => {
    mockedUseWorkbenchQuery.mockReturnValueOnce({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        items: [
          {
            id: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
            title: "Unlinked case alert",
            summary: "Case summary",
            severity: "High",
            status: "Open",
            ownerUserId: "unassigned",
            approvalTierRequired: "Lead",
            scannerFamily: "yara",
            targetId: null,
            targetDisplay: "Unscoped",
            ruleName: "Suspicious config",
            linkedIocCount: 0,
            progress: {
              totalIocs: 0,
              openCount: 0,
              inReviewCount: 0,
              completedCount: 0,
              percentComplete: 0,
            },
            firstDetectedAtUtc: "2026-04-20T00:00:00Z",
            lastDetectedAtUtc: "2026-04-20T00:00:00Z",
            createdAtUtc: "2026-04-20T00:00:00Z",
            updatedAtUtc: "2026-04-20T00:00:00Z",
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 25,
      },
    })

    render(<AlertsPage />)

    expect(screen.getAllByText("No linked IOCs").length).toBeGreaterThan(0)
    expect(screen.queryByText("0/0")).not.toBeInTheDocument()
  })
})
