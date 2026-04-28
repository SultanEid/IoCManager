import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AlertDetailPage from "@/app/(workbench)/alerts/[alertId]/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const mockedGateway = vi.hoisted(() => ({
  getAlertDetail: vi.fn(),
  updateAlertStatus: vi.fn(),
  updateAlertIocStatus: vi.fn(),
}))
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
  gateway: mockedGateway,
  get isModeConfigured() {
    return gatewayState.isModeConfigured
  },
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "lead-1",
      username: "lead-1",
      roles: ["Lead"],
    },
  }),
}))

describe("AlertDetailPage", () => {
  const baseDetail = {
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
    progress: {
      totalIocs: 1,
      openCount: 1,
      inReviewCount: 0,
      completedCount: 0,
      percentComplete: 0,
    },
    detectedAtUtc: "2026-04-20T00:00:00Z",
    lastDetectedAtUtc: "2026-04-20T00:00:00Z",
    createdAtUtc: "2026-04-20T00:00:00Z",
    updatedAtUtc: "2026-04-20T00:00:00Z",
    target: null,
    linkedIocs: [
      {
        iocId: "fb192f1b-bcc8-4617-9dde-6ed434770bf8",
        scannerFamily: "yara",
        ruleName: "Suspicious config",
        indicatorValue: "C:\\IOC\\ZombieVM\\configs\\bluefin.json",
        indicatorKind: "file",
        severity: "Medium",
        status: "Open",
        statusUpdatedAtUtc: "2026-04-20T00:00:00Z",
        statusUpdatedByUserId: "system",
        timestampUtc: "2026-04-20T00:00:00Z",
        rawPayload: "{}",
        yaraDetail: {
          filePath: "C:\\IOC\\ZombieVM\\configs\\bluefin.json",
          fileHash: "30d82fca708abf90288aef2fc876ff57e90fcb4bd76833f738597d9ca611cef9",
        },
        sigmaDetail: null,
        networkDetail: null,
      },
    ],
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
  }

  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
    mockedGateway.updateAlertIocStatus.mockReset()
    mockedUseWorkbenchQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      data: baseDetail,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("deep-links linked scan results into decision detail", () => {
    render(<AlertDetailPage />)

    const link = screen.getByText("Open decision").closest("a")
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("href", "/scans/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69")
  })

  it("renders IOC progress and updates linked IOC status", async () => {
    mockedGateway.updateAlertIocStatus.mockResolvedValueOnce({
      ...baseDetail,
      status: "Investigating",
      progress: {
        totalIocs: 1,
        openCount: 0,
        inReviewCount: 1,
        completedCount: 0,
        percentComplete: 50,
      },
      linkedIocs: baseDetail.linkedIocs.map((ioc) => ({ ...ioc, status: "InReview", statusUpdatedByUserId: "lead-1" })),
    })

    render(<AlertDetailPage />)

    expect(screen.getByText("0% complete")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Update status for IOC/i), { target: { value: "InReview" } })

    await waitFor(() => {
      expect(mockedGateway.updateAlertIocStatus).toHaveBeenCalledWith(
        "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
        "fb192f1b-bcc8-4617-9dde-6ed434770bf8",
        "InReview",
        "lead-1",
      )
    })
    expect(await screen.findByText("50% complete")).toBeInTheDocument()
  })

  it("renders an empty progress state when no IOCs are linked", () => {
    mockedUseWorkbenchQuery.mockReturnValueOnce({
      isLoading: false,
      isError: false,
      error: null,
      data: {
        ...baseDetail,
        linkedIocCount: 0,
        progress: {
          totalIocs: 0,
          openCount: 0,
          inReviewCount: 0,
          completedCount: 0,
          percentComplete: 0,
        },
        linkedIocs: [],
      },
    })

    render(<AlertDetailPage />)

    expect(screen.getByText("No linked IOC evidence yet")).toBeInTheDocument()
    expect(screen.queryByText("0% complete")).not.toBeInTheDocument()
  })
})
