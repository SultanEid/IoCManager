import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ManagedServerDetailPage } from "@/components/workbench/servers/managed-server-detail-page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {},
}))

function success(data: unknown) {
  return {
    isLoading: false,
    isError: false,
    data,
    error: null,
  }
}

describe("ManagedServerDetailPage", () => {
  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      const key = Array.isArray(queryKey) ? queryKey : []

      if (key[0] === "servers" && key[1] === "detail" && key.length === 3 && key[2] !== "subnets") {
        return success({
          id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
          subnetId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
          hostname: "srv-app-01",
          ipAddress: "10.10.1.25",
          operatingSystem: "Windows Server 2022",
          environment: "prod",
          status: "Active",
          connectivityStatus: "Online",
          lastHeartbeatUtc: "2026-04-20T00:00:00Z",
          lastContactUtc: "2026-04-20T00:00:00Z",
          connectionProtocol: null,
          connectionHost: null,
          connectionPort: null,
          connectionAuthMode: null,
          connectionUsername: null,
          hasConnectionSecret: false,
          connectionSecretUpdatedAtUtc: null,
          scannerAssignments: [],
          scannerCapabilities: [],
          createdAtUtc: "2026-04-20T00:00:00Z",
          updatedAtUtc: "2026-04-20T00:00:00Z",
        })
      }

      if (key[0] === "servers" && key[1] === "detail" && key[2] === "subnets") {
        return success([
          {
            id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
            networkId: "net-1",
            name: "Prod App Tier",
            cidrBlock: "10.10.1.0/24",
            gateway: "10.10.1.1",
            createdAtUtc: "2026-04-20T00:00:00Z",
            updatedAtUtc: "2026-04-20T00:00:00Z",
          },
        ])
      }

      if (key[3] === "alerts") {
        return success({
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 8,
        })
      }

      if (key[3] === "detections") {
        return success({
          total: 1,
          take: 8,
          skip: 0,
          items: [
            {
              id: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
              fingerprint: "fp-1",
              scannerFamily: "yara",
              serverId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
              scanJobId: null,
              jobAttemptId: null,
              targetExecutionId: null,
              ruleRevisionId: null,
              iocId: null,
              disposition: "Detection",
              confidence: 0.91,
              observedAtUtc: "2026-04-20T00:00:00Z",
              firstObservedAtUtc: "2026-04-20T00:00:00Z",
              lastObservedAtUtc: "2026-04-20T00:00:00Z",
              occurrenceCount: 1,
              isExecutionArtifact: false,
              evidenceJson: "{}",
              rawPayloadHash: "hash",
              provenanceCount: 1,
              provenance: [],
              serverHostname: "srv-app-01",
              iocValue: "x.example",
              ruleName: "Detect Evil",
              source: "api",
            },
          ],
        })
      }

      if (key[3] === "reports") {
        return success({
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 8,
        })
      }

      if (key[3] === "groups") {
        return success([])
      }

      return success([])
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("deep-links recent detections into adjudication detail", () => {
    render(<ManagedServerDetailPage serverId="85c86630-4876-4f03-bc30-1ec5f77d2d22" />)

    const link = screen.getByText("Open adjudication").closest("a")
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute("href", "/scans/95fef7ff-c894-4d2d-9f95-b6de6e68b2e0")
  })
})
