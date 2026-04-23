import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ScansPage from "@/app/(workbench)/results-ingestion/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
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

function success(data: unknown) {
  return {
    isLoading: false,
    isError: false,
    data,
    error: null,
  }
}

describe("ScansPage", () => {
  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      const key = Array.isArray(queryKey) ? queryKey : []

      if (key[0] === "legacy-pipeline" && key[1] === "scan-networks") {
        return success([])
      }

      if (key[0] === "legacy-pipeline" && key[1] === "scan-targets") {
        return success([])
      }

      if (key[0] === "legacy-pipeline" && key[1] === "scan-jobs") {
        return success([
          {
            id: "job-1",
            scanPlanId: null,
            scannerFamily: "yara",
            executionMode: null,
            triggerType: "Manual",
            status: "Completed",
            summary: "Single host sweep",
            queuedAtUtc: "2026-04-20T00:00:00Z",
            startedAtUtc: "2026-04-20T00:00:01Z",
            finishedAtUtc: "2026-04-20T00:00:05Z",
            batchId: null,
            totalTargets: 1,
            completedTargets: 1,
            failedTargets: 0,
            noFindingsTargets: 0,
          },
        ])
      }

      if (key[0] === "legacy-pipeline" && key[1] === "scan-results") {
        return success([
          {
            id: "331",
            jobId: "job-1",
            targetId: null,
            targetDisplay: "srv-app-01",
            scannerFamily: "yara",
            status: "Completed",
            findingsCount: 1,
            startedAtUtc: "2026-04-20T00:00:01Z",
            finishedAtUtc: "2026-04-20T00:00:05Z",
          },
        ])
      }

      return success([])
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("does not expose decision links from legacy scan results", () => {
    render(<ScansPage />)

    fireEvent.click(screen.getByRole("button", { expanded: false }))

    expect(screen.getByText("srv-app-01")).toBeInTheDocument()
    expect(screen.queryByText("Open decision")).not.toBeInTheDocument()
  })
})
