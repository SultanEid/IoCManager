import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AlertDetailPage from "@/app/(workbench)/alerts/[alertId]/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const gatewayState = vi.hoisted(() => ({
  isModeConfigured: true,
}))

vi.mock("next/navigation", () => ({
  useParams: () => ({ alertId: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1" }),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {
    getAlertDetail: vi.fn(),
    updateAlertStatus: vi.fn(),
  },
  get isModeConfigured() {
    return gatewayState.isModeConfigured
  },
}))

vi.mock("@/shared/auth/session", () => ({
  getSession: () => ({
    userId: "lead-1",
    username: "lead-1",
    roles: ["Lead"],
  }),
}))

describe("AlertDetailPage", () => {
  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
    mockedUseWorkbenchQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        id: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
        title: "Linked alert",
        summary: "Alert summary",
        severity: "High",
        status: "Open",
        ownerUserId: "lead-1",
        approvalTierRequired: "Lead",
        scannerFamily: "yara",
        targetDisplay: "srv-app-01",
        linkedIocCount: 1,
        detectedAtUtc: "2026-04-20T00:00:00Z",
        lastDetectedAtUtc: "2026-04-20T00:00:00Z",
        createdAtUtc: "2026-04-20T00:00:00Z",
        updatedAtUtc: "2026-04-20T00:00:00Z",
        target: null,
        linkedIocs: [],
        linkedScanResults: [
          {
            resultId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
            jobId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
            status: "Completed",
            findingsCount: 1,
            startedAtUtc: "2026-04-20T00:00:00Z",
            finishedAtUtc: "2026-04-20T00:00:05Z",
          },
        ],
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("deep-links linked scan results into adjudication detail", () => {
    render(<AlertDetailPage />)

    const link = screen.getByText("Open adjudication").closest("a")
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("href", "/scans/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69")
  })
})
