import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ScanPlanManagementPage } from "@/components/workbench/servers/scan-plan-management-page"

const mockedReplace = vi.hoisted(() => vi.fn())
const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const mockedGateway = vi.hoisted(() => ({
  listScanPlans: vi.fn(),
  listTargetServers: vi.fn(),
  listRuleRepository: vi.fn(),
  listScanJobs: vi.fn(),
  listScanJobTargets: vi.fn(),
  getRuleDetail: vi.fn(),
  createScanPlan: vi.fn(),
  updateScanPlan: vi.fn(),
  runScanPlan: vi.fn(),
  cancelScanJob: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockedReplace }),
  usePathname: () => "/scan-plan",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: mockedGateway,
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "lead-1",
      roles: ["Lead"],
    },
  }),
}))

vi.mock("@/shared/auth/session", () => ({
  canAccessLeadActions: () => true,
}))

type QueryResult = {
  isLoading: boolean
  isError: boolean
  data: unknown
  error: unknown
}

function success(data: unknown): QueryResult {
  return { isLoading: false, isError: false, data, error: null }
}

function setQueryState() {
  mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
    const key = Array.isArray(queryKey) ? String(queryKey[1] ?? "") : ""
    if (key === "plans") {
      return success([
        {
          id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
          name: "Nightly Plan",
          description: "Nightly sweep",
          scannerCapability: "Yara",
          ruleSelectionMode: "RuleSet",
          ruleScopeType: null,
          ruleScopeValue: null,
          cadenceType: "Daily",
          intervalMinutes: null,
          runAtHourUtc: 2,
          runAtMinuteUtc: 30,
          weeklyDayOfWeek: null,
          operatorNotes: "notes",
          status: "Active",
          nextRunAtUtc: "2026-04-12T02:30:00Z",
          lastQueuedAtUtc: "2026-04-11T02:30:00Z",
          lastCompletedAtUtc: "2026-04-11T02:38:00Z",
          lastResultStatus: "Completed",
          lastResultSummary: "Targets total=1; completed=1; failed=0.",
          targetServerIds: ["85c86630-4876-4f03-bc30-1ec5f77d2d22"],
          ruleRevisionIds: ["3f8df2a9-1c49-4c41-b096-c57f5a5e62c7"],
          targetServers: [
            {
              targetServerId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
              hostname: "srv-app-01",
              ipAddress: "10.10.1.10",
            },
          ],
          rules: [
            {
              ruleRevisionId: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
              ruleArtifactId: "26f24d4f-4cc2-496e-b529-ccf30a975680",
              ruleName: "Credential Rule",
              ruleFamily: "yara",
              revisionNumber: 2,
              versionLabel: "v2",
            },
          ],
          createdAtUtc: "2026-04-10T00:00:00Z",
          updatedAtUtc: "2026-04-10T00:00:00Z",
        },
      ])
    }
    if (key === "target-servers") {
      return success([
        {
          id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
          subnetId: "95c86630-4876-4f03-bc30-1ec5f77d2d22",
          hostname: "srv-app-01",
          ipAddress: "10.10.1.10",
          operatingSystem: "Linux",
          environment: "prod",
          status: "Online",
          createdAtUtc: "2026-04-10T00:00:00Z",
          updatedAtUtc: "2026-04-10T00:00:00Z",
        },
      ])
    }
    if (key === "rules") {
      return success({
        items: [
          {
            id: "26f24d4f-4cc2-496e-b529-ccf30a975680",
            name: "Credential Rule",
            ruleFamily: "yara",
            source: "local",
            description: "desc",
            tags: [],
            severity: "High",
            status: "Approved",
            scopeType: "global",
            scopeValue: null,
            currentRevisionNumber: 2,
            currentVersionLabel: "v2",
            isDeleted: false,
            createdAtUtc: "2026-04-10T00:00:00Z",
            updatedAtUtc: "2026-04-10T00:00:00Z",
            createdByUserId: "lead-1",
            updatedByUserId: "lead-1",
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 200,
      })
    }
    if (key === "jobs") {
      return success([
        {
          id: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
          scanPlanId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
          triggerSource: "Manual",
          status: "Queued",
          queuedAtUtc: "2026-04-11T10:00:00Z",
          startedAtUtc: null,
          completedAtUtc: null,
          triggeredByUserId: "lead-1",
          summary: "",
          cancellationRequested: false,
          cancellationRequestedAtUtc: null,
          cancellationReason: null,
          totalTargets: 1,
          completedTargets: 0,
          failedTargets: 0,
          cancelledTargets: 0,
          partiallyCompletedTargets: 0,
          createdAtUtc: "2026-04-11T10:00:00Z",
          updatedAtUtc: "2026-04-11T10:00:00Z",
        },
      ])
    }
    if (key === "job-targets") {
      return success([
        {
          id: "f44c14fc-2937-4e58-86dc-e5fd97c577cd",
          scanJobId: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
          targetServerId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
          targetHostname: "srv-app-01",
          targetIpAddress: "10.10.1.10",
          scannerId: null,
          scannerName: "scanner-a",
          status: "Queued",
          startedAtUtc: null,
          completedAtUtc: null,
          summary: "",
          errorMessage: null,
          createdAtUtc: "2026-04-11T10:00:00Z",
          updatedAtUtc: "2026-04-11T10:00:00Z",
        },
      ])
    }
    return success([])
  })
}

function renderPage() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <ScanPlanManagementPage />
    </QueryClientProvider>,
  )
}

describe("ScanPlanManagementPage", () => {
  beforeEach(() => {
    mockedReplace.mockReset()
    mockedUseWorkbenchQuery.mockReset()
    Object.values(mockedGateway).forEach((fn) => fn.mockReset())
    setQueryState()
    mockedGateway.runScanPlan.mockResolvedValue({
      id: "4fb0b9ff-717f-4116-93f9-bf814e95fbc0",
      status: "Queued",
    })
    mockedGateway.cancelScanJob.mockResolvedValue({
      id: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
      status: "Cancelled",
    })
    mockedGateway.updateScanPlan.mockResolvedValue({})
    mockedGateway.createScanPlan.mockResolvedValue({})
    mockedGateway.getRuleDetail.mockResolvedValue({
      currentRevision: {
        id: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("supports edit, run-now, and cancel actions", async () => {
    renderPage()

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    expect(screen.getByLabelText("Name")).toHaveValue("Nightly Plan")

    fireEvent.click(screen.getByRole("button", { name: "Run Now" }))
    await waitFor(() =>
      expect(mockedGateway.runScanPlan).toHaveBeenCalledWith("f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69", "lead-1", "Manual"),
    )

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(mockedGateway.cancelScanJob).toHaveBeenCalledWith(
        "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
        "lead-1",
        "Cancelled by operator.",
      ),
    )
  })

  it("saves updated and new scan plans", async () => {
    renderPage()

    fireEvent.change(screen.getByPlaceholderText("Search plan, target, or rule"), { target: { value: "Nightly" } })
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }))
    expect(mockedReplace).toHaveBeenCalledWith("/scan-plan?q=Nightly")

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Nightly Plan Updated" } })
    fireEvent.click(screen.getByRole("button", { name: "Save Plan" }))
    await waitFor(() => expect(mockedGateway.updateScanPlan).toHaveBeenCalled())

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Fresh Plan" } })
    fireEvent.change(screen.getByPlaceholderText("UUIDs separated by comma, space, or newline."), {
      target: { value: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7" },
    })
    const serverCheckbox = screen.getByLabelText("srv-app-01 (10.10.1.10)")
    fireEvent.click(serverCheckbox)
    fireEvent.click(screen.getByRole("button", { name: "Save Plan" }))
    await waitFor(() => expect(mockedGateway.createScanPlan).toHaveBeenCalled())
  })
})
