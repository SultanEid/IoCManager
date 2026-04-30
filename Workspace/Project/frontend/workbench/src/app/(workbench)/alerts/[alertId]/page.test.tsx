import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AlertDetailPage from "@/app/(workbench)/alerts/[alertId]/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const gatewayMocks = vi.hoisted(() => ({
  getAlertDetail: vi.fn(),
  updateAlertStatus: vi.fn(),
  updateAlertIocStatus: vi.fn(),
  listAlertOwners: vi.fn(),
  updateAlertOwner: vi.fn(),
  listAlertEmailUpdates: vi.fn(),
  sendAlertEmailUpdate: vi.fn(),
}))
const gatewayState = vi.hoisted(() => ({
  isModeConfigured: true,
}))

vi.mock("next/navigation", () => ({
  useParams: () => ({ alertId: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: gatewayMocks,
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
    ownerUserId: "soc",
    ownerDisplayName: "Security Operations Center",
    ownerEmail: "soc@local.test",
    approvalTierRequired: "Lead",
    scannerFamily: "yara",
    targetId: null,
    targetDisplay: "srv-app-01",
    ruleName: "Suspicious config",
    linkedIocCount: 1,
    progress: {
      totalIocs: 1,
      openCount: 1,
      inReviewCount: 0,
      completedCount: 0,
      percentComplete: 0,
    },
    firstDetectedAtUtc: "2026-04-20T00:00:00Z",
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

  let currentDetail: typeof baseDetail
  let emailRefetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    currentDetail = {
      ...baseDetail,
      progress: { ...baseDetail.progress },
      linkedIocs: baseDetail.linkedIocs.map((ioc) => ({ ...ioc })),
      linkedScanResults: baseDetail.linkedScanResults.map((result) => ({ ...result })),
    }
    emailRefetch = vi.fn()
    mockedUseWorkbenchQuery.mockReset()
    gatewayMocks.updateAlertIocStatus.mockReset()
    gatewayMocks.updateAlertOwner.mockReset()
    gatewayMocks.sendAlertEmailUpdate.mockReset()
    gatewayMocks.updateAlertOwner.mockResolvedValue({
      ...currentDetail,
      ownerUserId: "forensics",
      ownerDisplayName: "Digital Forensics",
      ownerEmail: "forensics@local.test",
    })
    gatewayMocks.sendAlertEmailUpdate.mockResolvedValue({
      id: "551ad0e4-7f91-42f7-9a33-d94e76594477",
      alertId: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
      subject: "Owner update",
      body: "Review this alert.",
      toEmail: "soc@local.test",
      ccEmails: ["lead@local.test"],
      deliveryStatus: "NotConfigured",
      failureDetail: "SMTP is not configured.",
      sentAtUtc: null,
      createdByUserId: "lead-1",
      createdAtUtc: "2026-04-20T00:05:00Z",
    })
    mockedUseWorkbenchQuery.mockImplementation((key: readonly unknown[]) => {
      if (key[0] === "alert-owners") {
        return {
          isLoading: false,
          isError: false,
          error: null,
          data: [
            { key: "soc", displayName: "Security Operations Center", email: "soc@local.test" },
            { key: "forensics", displayName: "Digital Forensics", email: "forensics@local.test" },
          ],
        }
      }

      if (key[2] === "email-updates") {
        return {
          isLoading: false,
          isError: false,
          error: null,
          refetch: emailRefetch,
          data: [
            {
              id: "551ad0e4-7f91-42f7-9a33-d94e76594477",
              alertId: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
              subject: "Prior update",
              body: "Already sent.",
              toEmail: "soc@local.test",
              ccEmails: ["lead@local.test"],
              deliveryStatus: "NotConfigured",
              failureDetail: "SMTP is not configured.",
              sentAtUtc: null,
              createdByUserId: "lead-1",
              createdAtUtc: "2026-04-20T00:05:00Z",
            },
          ],
        }
      }

      return {
        isLoading: false,
        isError: false,
        error: null,
        data: currentDetail,
      }
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders compact case source provenance", () => {
    render(<AlertDetailPage />)

    expect(screen.getByText("Case Source")).toBeInTheDocument()
    expect(screen.getByText("95fef7ff-c894-4d2d-9f95-b6de6e68b2e0")).toBeInTheDocument()
    expect(screen.getByText("f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69")).toBeInTheDocument()
    expect(screen.getByText("1 IOC(s)")).toBeInTheDocument()
    expect(screen.queryByText("Related Scan Results")).not.toBeInTheDocument()
    expect(screen.queryByText("Open decision")).not.toBeInTheDocument()
  })

  it("renders a muted fallback when source scan context is absent", () => {
    currentDetail = {
      ...currentDetail,
      linkedScanResults: [],
    }

    render(<AlertDetailPage />)

    expect(screen.getByText("Case Source")).toBeInTheDocument()
    expect(screen.getByText("Source scan context was not retained for this case.")).toBeInTheDocument()
  })

  it("renders IOC progress and updates linked IOC status", async () => {
    gatewayMocks.updateAlertIocStatus.mockResolvedValueOnce({
      ...currentDetail,
      status: "Investigating",
      progress: {
        totalIocs: 1,
        openCount: 0,
        inReviewCount: 1,
        completedCount: 0,
        percentComplete: 50,
      },
      linkedIocs: currentDetail.linkedIocs.map((ioc) => ({ ...ioc, status: "InReview", statusUpdatedByUserId: "lead-1" })),
    })

    render(<AlertDetailPage />)

    expect(screen.getByText("0% complete")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Update status for IOC/i), { target: { value: "InReview" } })

    await waitFor(() => {
      expect(gatewayMocks.updateAlertIocStatus).toHaveBeenCalledWith(
        "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
        "fb192f1b-bcc8-4617-9dde-6ed434770bf8",
        "InReview",
        "lead-1",
      )
    })
    expect(await screen.findByText("50% complete")).toBeInTheDocument()
  })

  it("renders an empty progress state when no IOCs are linked", () => {
    currentDetail = {
      ...currentDetail,
      linkedIocCount: 0,
      progress: {
        totalIocs: 0,
        openCount: 0,
        inReviewCount: 0,
        completedCount: 0,
        percentComplete: 0,
      },
      linkedIocs: [],
    }

    render(<AlertDetailPage />)

    expect(screen.getByText("No linked IOC evidence yet")).toBeInTheDocument()
    expect(screen.queryByText("0% complete")).not.toBeInTheDocument()
  })

  it("renders owner routing and email history", () => {
    render(<AlertDetailPage />)

    expect(screen.getAllByText("Security Operations Center").length).toBeGreaterThan(0)
    expect(screen.getAllByText("soc@local.test").length).toBeGreaterThan(0)
    expect(screen.getByText("Prior update")).toBeInTheDocument()
    expect(screen.getByText("SMTP is not configured.")).toBeInTheDocument()
  })

  it("updates the alert owner from configured owner choices", async () => {
    render(<AlertDetailPage />)

    fireEvent.change(screen.getByDisplayValue("Security Operations Center - soc@local.test"), {
      target: { value: "forensics" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save owner" }))

    await waitFor(() => {
      expect(gatewayMocks.updateAlertOwner).toHaveBeenCalledWith(
        "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
        { ownerUserId: "forensics", actorUserId: "lead-1" },
      )
    })
  })

  it("sends a manual email update to the stored owner mailbox", async () => {
    render(<AlertDetailPage />)

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Owner update" } })
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Review this alert." } })
    fireEvent.change(screen.getByLabelText("CC addresses"), {
      target: { value: "lead@local.test" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send update" }))

    await waitFor(() => {
      expect(gatewayMocks.sendAlertEmailUpdate).toHaveBeenCalledWith(
        "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
        {
          subject: "Owner update",
          body: "Review this alert.",
          ccEmails: ["lead@local.test"],
          actorUserId: "lead-1",
        },
      )
    })
  })
})
