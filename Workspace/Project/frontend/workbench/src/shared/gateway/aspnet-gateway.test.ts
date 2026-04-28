import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  aiDecisionActionPlanOrPendingResponseSchema,
  aiDecisionExplanationOrPendingResponseSchema,
  aiDecisionResultResponseSchema,
  aiEvidenceSourcesResponseSchema,
  iocLatestAiDecisionResponseSchema,
  aiOverrideOrClosureResponseSchema,
  aiSimilarDetectionsResponseSchema,
  detectionDetailResponseSchema,
  discoveryRunResponseSchema,
  healthReadySchema,
  managedServerInventoryResponseSchema,
  permissionResponseSchema,
  promoteDiscoveredHostResponseSchema,
  reportResponseSchema,
  retentionPolicyResponseSchema,
  rolePermissionResponseSchema,
  roleResponseSchema,
  scanJobResponseSchema,
  scanPlanResponseSchema,
  scannerResponseSchema,
  submitAiDecisionAcceptedResponseSchema,
} from "@/shared/api/schemas"
import { ApiError } from "@/shared/api/error"
import { AspNetGateway } from "@/shared/gateway/aspnet-gateway"

const mockedRequestJson = vi.hoisted(() => vi.fn())
const mockedRequestForm = vi.hoisted(() => vi.fn())

vi.mock("@/shared/api/client", () => ({
  requestJson: mockedRequestJson,
  requestForm: mockedRequestForm,
}))

describe("AspNetGateway", () => {
  beforeEach(() => {
    mockedRequestJson.mockReset()
    mockedRequestForm.mockReset()
  })

  it("routes readiness calls to /health/ready with the typed schema", async () => {
    const payload = {
      status: "ready",
      components: [
        {
          name: "database",
          status: "healthy",
          required: true,
          message: "Database reachable.",
        },
      ],
    }
    mockedRequestJson.mockResolvedValue(payload)

    const gateway = new AspNetGateway()
    const result = await gateway.getHealthReady()

    expect(result).toEqual(payload)
    expect(mockedRequestJson).toHaveBeenCalledTimes(1)
    expect(mockedRequestJson.mock.calls[0][0]).toBe("/health/ready")
    expect(mockedRequestJson.mock.calls[0][1]).toBe(healthReadySchema)
  })

  it("queues discovery runs via v2 infrastructure endpoint", async () => {
    const payload = {
      id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      requestedCidr: "10.10.1.0/24",
      rangeStartIp: "10.10.1.10",
      rangeEndIp: "10.10.1.20",
      status: "Queued",
      queuedAtUtc: "2026-04-09T10:00:00Z",
      startedAtUtc: null,
      completedAtUtc: null,
      totalHosts: 11,
      reachableHosts: 0,
      unreachableHosts: 0,
      summary: "",
    }
    mockedRequestJson.mockResolvedValue(payload)

    const gateway = new AspNetGateway()
    const result = await gateway.queueDiscoveryRun({
      subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      actorUserId: "lead-1",
      rangeStartIp: "10.10.1.10",
      rangeEndIp: "10.10.1.20",
    })

    expect(result.status).toBe("Queued")
    expect(mockedRequestJson.mock.calls.at(-1)?.[0]).toBe("/api/v2/infrastructure/discovery/runs")
    expect(mockedRequestJson.mock.calls.at(-1)?.[1]).toBe(discoveryRunResponseSchema)
  })

  it("lists discovered hosts and promotes selected host", async () => {
    mockedRequestJson
      .mockResolvedValueOnce([
        {
          id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
          subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
          ipAddress: "10.10.1.10",
          hostname: "srv-app-10",
          reachability: "Reachable",
          firstDiscoveredAtUtc: "2026-04-09T10:00:01Z",
          lastCheckedAtUtc: "2026-04-09T10:00:02Z",
          lastSeenAtUtc: "2026-04-09T10:00:02Z",
          lastDiscoveryRunId: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
          promotedTargetServerId: null,
          promotedAtUtc: null,
        },
      ])
      .mockResolvedValueOnce({
        discoveredHostId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
        targetServerId: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
        alreadyPromoted: false,
        promotedAtUtc: "2026-04-09T10:05:00Z",
      })

    const gateway = new AspNetGateway()
    const hosts = await gateway.listDiscoveredHosts("85c86630-4876-4f03-bc30-1ec5f77d2d22")
    expect(hosts).toHaveLength(1)

    const promoteResult = await gateway.promoteDiscoveredHost("f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69", {
      hostname: "srv-app-10",
      operatingSystem: "Windows",
      environment: "lab",
      actorUserId: "lead-1",
    })
    expect(promoteResult.alreadyPromoted).toBe(false)

    expect(mockedRequestJson.mock.calls[0]?.[0]).toBe(
      "/api/v2/infrastructure/discovered-hosts?subnetId=85c86630-4876-4f03-bc30-1ec5f77d2d22",
    )
    expect(mockedRequestJson.mock.calls[1]?.[0]).toBe(
      "/api/v2/infrastructure/discovered-hosts/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69/promote",
    )
    expect(mockedRequestJson.mock.calls[1]?.[1]).toBe(promoteDiscoveredHostResponseSchema)
  })

  it("composes managed inventory filters into query parameters", async () => {
    mockedRequestJson.mockResolvedValue({
      servers: [],
      totalServers: 0,
      unhealthyServers: 0,
      unreachableServers: 0,
      staleContactServers: 0,
    })

    const gateway = new AspNetGateway()
    await gateway.listManagedServers({
      status: "Offline",
      scannerCapability: "Yara",
      subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      lastContact: "stale",
    })

    expect(mockedRequestJson).toHaveBeenCalledTimes(1)
    expect(mockedRequestJson.mock.calls[0]?.[0]).toBe(
      "/api/v2/infrastructure/managed-servers?status=Offline&scannerCapability=Yara&subnetId=85c86630-4876-4f03-bc30-1ec5f77d2d22&lastContact=stale",
    )
    expect(mockedRequestJson.mock.calls[0]?.[1]).toBe(managedServerInventoryResponseSchema)
  })

  it("routes scan-plan create/run/cancel through /api/v2/scanning", async () => {
    mockedRequestJson
      .mockResolvedValueOnce({
        id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
        name: "Daily Yara",
        description: "Daily plan",
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
        nextRunAtUtc: null,
        lastQueuedAtUtc: null,
        lastCompletedAtUtc: null,
        lastResultStatus: null,
        lastResultSummary: null,
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
            ruleName: "Daily Yara",
            ruleFamily: "yara",
            revisionNumber: 1,
            versionLabel: "v1",
          },
        ],
        createdAtUtc: "2026-04-09T10:00:00Z",
        updatedAtUtc: "2026-04-09T10:00:00Z",
      })
      .mockResolvedValueOnce({
        id: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
        scanPlanId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
        triggerSource: "Manual",
        status: "Queued",
        queuedAtUtc: "2026-04-09T10:01:00Z",
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
        createdAtUtc: "2026-04-09T10:01:00Z",
        updatedAtUtc: "2026-04-09T10:01:00Z",
      })
      .mockResolvedValueOnce({
        id: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
        scanPlanId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
        triggerSource: "Manual",
        status: "Cancelled",
        queuedAtUtc: "2026-04-09T10:01:00Z",
        startedAtUtc: null,
        completedAtUtc: "2026-04-09T10:02:00Z",
        triggeredByUserId: "lead-1",
        summary: "",
        cancellationRequested: true,
        cancellationRequestedAtUtc: "2026-04-09T10:01:30Z",
        cancellationReason: "Operator requested",
        totalTargets: 1,
        completedTargets: 0,
        failedTargets: 0,
        cancelledTargets: 1,
        partiallyCompletedTargets: 0,
        createdAtUtc: "2026-04-09T10:01:00Z",
        updatedAtUtc: "2026-04-09T10:02:00Z",
      })

    const gateway = new AspNetGateway()
    await gateway.createScanPlan({
      name: "Daily Yara",
      description: "Daily plan",
      scannerCapability: "Yara",
      ruleSelectionMode: "RuleSet",
      cadenceType: "Daily",
      runAtHourUtc: 2,
      runAtMinuteUtc: 30,
      operatorNotes: "notes",
      status: "Active",
      actorUserId: "lead-1",
      targetServerIds: ["85c86630-4876-4f03-bc30-1ec5f77d2d22"],
      ruleRevisionIds: ["3f8df2a9-1c49-4c41-b096-c57f5a5e62c7"],
    })
    await gateway.runScanPlan("f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69", "lead-1")
    await gateway.cancelScanJob("3f8df2a9-1c49-4c41-b096-c57f5a5e62c7", "lead-1", "Operator requested")

    expect(mockedRequestJson.mock.calls[0]?.[0]).toBe("/api/v2/scanning/plans")
    expect(mockedRequestJson.mock.calls[0]?.[1]).toBe(scanPlanResponseSchema)
    expect(mockedRequestJson.mock.calls[1]?.[0]).toBe("/api/v2/scanning/plans/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69/run")
    expect(mockedRequestJson.mock.calls[1]?.[1]).toBe(scanJobResponseSchema)
    expect(mockedRequestJson.mock.calls[2]?.[0]).toBe("/api/v2/scanning/jobs/3f8df2a9-1c49-4c41-b096-c57f5a5e62c7/cancel")
    expect(mockedRequestJson.mock.calls[2]?.[1]).toBe(scanJobResponseSchema)
  })

  it("maps scan-job filters and job-target endpoint", async () => {
    mockedRequestJson
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
          scanJobId: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
          targetServerId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
          targetHostname: "srv-app-01",
          targetIpAddress: "10.10.1.10",
          scannerId: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
          scannerName: "edge-1",
          status: "Completed",
          startedAtUtc: "2026-04-09T10:01:00Z",
          completedAtUtc: "2026-04-09T10:01:10Z",
          summary: "Completed",
          errorMessage: null,
          createdAtUtc: "2026-04-09T10:01:00Z",
          updatedAtUtc: "2026-04-09T10:01:10Z",
        },
      ])

    const gateway = new AspNetGateway()
    await gateway.listScanJobs({
      scanPlanId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      status: "PartiallyCompleted",
      queuedFromUtc: "2026-04-09T00:00:00Z",
      queuedToUtc: "2026-04-10T00:00:00Z",
      take: 50,
    })
    await gateway.listScanJobTargets("3f8df2a9-1c49-4c41-b096-c57f5a5e62c7")

    expect(mockedRequestJson.mock.calls[0]?.[0]).toBe(
      "/api/v2/scanning/jobs?scanPlanId=f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69&status=PartiallyCompleted&queuedFromUtc=2026-04-09T00%3A00%3A00Z&queuedToUtc=2026-04-10T00%3A00%3A00Z&take=50",
    )
    expect(mockedRequestJson.mock.calls[1]?.[0]).toBe("/api/v2/scanning/jobs/3f8df2a9-1c49-4c41-b096-c57f5a5e62c7/targets")
    const targetsSchema = mockedRequestJson.mock.calls[1]?.[1] as { safeParse: (value: unknown) => { success: boolean } }
    expect(targetsSchema.safeParse([
      {
        id: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
        scanJobId: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
        targetServerId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
        targetHostname: "srv-app-01",
        targetIpAddress: "10.10.1.10",
        scannerId: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
        scannerName: "edge-1",
        status: "Completed",
        startedAtUtc: "2026-04-09T10:01:00Z",
        completedAtUtc: "2026-04-09T10:01:10Z",
        summary: "Completed",
        errorMessage: null,
        createdAtUtc: "2026-04-09T10:01:00Z",
        updatedAtUtc: "2026-04-09T10:01:10Z",
      },
    ]).success).toBe(true)
  })

  it("routes detection detail and decision endpoints through typed schemas", async () => {
    mockedRequestJson.mockResolvedValue({})

    const gateway = new AspNetGateway()
    await gateway.getDetectionDetail("5a8bff58-46f4-4f1c-acf0-a31ea2dad77c")
    await gateway.getLatestAiDecisionForIoc("17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a")
    await gateway.generateAiDecisionForIoc("17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a", {
      submittedByUserId: "lead-1",
    })
    await gateway.getLatestAiDecisionForDetection("5a8bff58-46f4-4f1c-acf0-a31ea2dad77c")
    await gateway.submitAiDecision({
      caseId: "case-1",
      detectionId: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      iocType: "domain",
      iocValue: "x.example",
      observedAtUtc: "2026-04-20T00:00:00Z",
      detectionPackage: {},
      submittedByUserId: "lead-1",
    })
    await gateway.getAiDecisionResult("5a8bff58-46f4-4f1c-acf0-a31ea2dad77c")
    await gateway.getAiDecisionExplanation("5a8bff58-46f4-4f1c-acf0-a31ea2dad77c")
    await gateway.getAiDecisionActionPlan("5a8bff58-46f4-4f1c-acf0-a31ea2dad77c")
    await gateway.listAiDecisionEvidenceSources("5a8bff58-46f4-4f1c-acf0-a31ea2dad77c", { limit: 10, cursor: "abc" })
    await gateway.listAiDecisionSimilarDetections("5a8bff58-46f4-4f1c-acf0-a31ea2dad77c", { limit: 10, cursor: "abc" })
    await gateway.submitAiDecisionOverrideOrClosure("5a8bff58-46f4-4f1c-acf0-a31ea2dad77c", {
      actionType: "Close",
      reason: "Accepted",
      closureDisposition: "accepted_recommendation",
      isFinal: true,
      submittedByUserId: "lead-1",
    })

    expect(mockedRequestJson.mock.calls[0]?.[0]).toBe("/api/v2/scanning/results/5a8bff58-46f4-4f1c-acf0-a31ea2dad77c")
    expect(mockedRequestJson.mock.calls[0]?.[1]).toBe(detectionDetailResponseSchema)
    expect(mockedRequestJson.mock.calls[1]?.[0]).toBe("/api/v2/ai/decisions/iocs/17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a/latest")
    expect(mockedRequestJson.mock.calls[1]?.[1]).toBe(iocLatestAiDecisionResponseSchema)
    expect(mockedRequestJson.mock.calls[2]?.[0]).toBe("/api/v2/ai/decisions/iocs/17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a/generate")
    expect(mockedRequestJson.mock.calls[2]?.[1]).toBe(submitAiDecisionAcceptedResponseSchema)
    expect(mockedRequestJson.mock.calls[3]?.[0]).toBe("/api/v2/ai/decisions/detections/5a8bff58-46f4-4f1c-acf0-a31ea2dad77c/latest")
    expect(mockedRequestJson.mock.calls[3]?.[1]).toBe(aiDecisionResultResponseSchema)
    expect(mockedRequestJson.mock.calls[4]?.[0]).toBe("/api/v2/ai/decisions")
    expect(mockedRequestJson.mock.calls[4]?.[1]).toBe(submitAiDecisionAcceptedResponseSchema)
    expect(mockedRequestJson.mock.calls[5]?.[1]).toBe(aiDecisionResultResponseSchema)
    expect(mockedRequestJson.mock.calls[6]?.[1]).toBe(aiDecisionExplanationOrPendingResponseSchema)
    expect(mockedRequestJson.mock.calls[7]?.[1]).toBe(aiDecisionActionPlanOrPendingResponseSchema)
    expect(mockedRequestJson.mock.calls[8]?.[0]).toBe(
      "/api/v2/ai/decisions/5a8bff58-46f4-4f1c-acf0-a31ea2dad77c/evidence-sources?limit=10&cursor=abc",
    )
    expect(mockedRequestJson.mock.calls[8]?.[1]).toBe(aiEvidenceSourcesResponseSchema)
    expect(mockedRequestJson.mock.calls[9]?.[0]).toBe(
      "/api/v2/ai/decisions/5a8bff58-46f4-4f1c-acf0-a31ea2dad77c/similar-detections?limit=10&cursor=abc",
    )
    expect(mockedRequestJson.mock.calls[9]?.[1]).toBe(aiSimilarDetectionsResponseSchema)
    expect(mockedRequestJson.mock.calls[10]?.[0]).toBe(
      "/api/v2/ai/decisions/5a8bff58-46f4-4f1c-acf0-a31ea2dad77c/override-closure",
    )
    expect(mockedRequestJson.mock.calls[10]?.[1]).toBe(aiOverrideOrClosureResponseSchema)
  })

  it("routes retention and identity admin contracts through typed schemas", async () => {
    mockedRequestJson
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
        dataType: "ScanResult",
        retainDays: 30,
        archiveAfterDays: 14,
        isEnabled: true,
        createdAtUtc: "2026-04-20T00:00:00Z",
        updatedAtUtc: "2026-04-20T00:00:00Z",
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        id: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
        name: "Operator",
      })
      .mockResolvedValueOnce({
        id: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
        key: "retention.manage",
        description: "Manage retention policies.",
        createdAtUtc: "2026-04-20T00:00:00Z",
      })
      .mockResolvedValueOnce({
        roleId: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
        permissionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
        grantedByUserId: "admin-1",
        grantedAtUtc: "2026-04-20T00:00:00Z",
      })

    const gateway = new AspNetGateway()
    await gateway.listRetentionPolicies()
    await gateway.createRetentionPolicy({
      dataType: "ScanResult",
      retainDays: 30,
      archiveAfterDays: 14,
      actorUserId: "admin-1",
    })
    await gateway.listArchiveRecords("85c86630-4876-4f03-bc30-1ec5f77d2d22")
    await gateway.listPermissions()
    await gateway.listRolePermissions("17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a")
    await gateway.createRole({ name: "Operator" })
    await gateway.createPermission({
      key: "retention.manage",
      description: "Manage retention policies.",
      actorUserId: "admin-1",
    })
    await gateway.assignRolePermission({
      roleId: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
      permissionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      actorUserId: "admin-1",
    })

    expect(mockedRequestJson.mock.calls[0]?.[0]).toBe("/api/v2/retention/policies")
    expect(mockedRequestJson.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ safeParse: expect.any(Function) }))
    expect(mockedRequestJson.mock.calls[1]?.[1]).toBe(retentionPolicyResponseSchema)
    expect(mockedRequestJson.mock.calls[2]?.[0]).toBe("/api/v2/retention/archives?retentionPolicyId=85c86630-4876-4f03-bc30-1ec5f77d2d22")
    expect(mockedRequestJson.mock.calls[2]?.[1]).toEqual(expect.objectContaining({ safeParse: expect.any(Function) }))
    expect(mockedRequestJson.mock.calls[3]?.[1]).toEqual(expect.objectContaining({ safeParse: expect.any(Function) }))
    expect(mockedRequestJson.mock.calls[4]?.[1]).toEqual(expect.objectContaining({ safeParse: expect.any(Function) }))
    expect(mockedRequestJson.mock.calls[5]?.[1]).toBe(roleResponseSchema)
    expect(mockedRequestJson.mock.calls[6]?.[1]).toBe(permissionResponseSchema)
    expect(mockedRequestJson.mock.calls[7]?.[1]).toBe(rolePermissionResponseSchema)
  })

  it("routes scanner create and capability updates through typed schemas", async () => {
    mockedRequestJson
      .mockResolvedValueOnce({
        id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
        name: "edge-yara-1",
        engineType: "Yara",
        version: "4.5.0",
        healthStatus: "Healthy",
        lastHeartbeatUtc: null,
        createdAtUtc: "2026-04-20T00:00:00Z",
        updatedAtUtc: "2026-04-20T00:00:00Z",
        capabilities: ["Yara"],
      })
      .mockResolvedValueOnce({
        id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
        name: "edge-yara-1",
        engineType: "Yara",
        version: "4.5.0",
        healthStatus: "Healthy",
        lastHeartbeatUtc: null,
        createdAtUtc: "2026-04-20T00:00:00Z",
        updatedAtUtc: "2026-04-20T01:00:00Z",
        capabilities: ["Yara", "Sigma"],
      })

    const gateway = new AspNetGateway()
    await gateway.createScanner({
      name: "edge-yara-1",
      engineType: "Yara",
      version: "4.5.0",
      actorUserId: "lead-1",
      capabilities: ["Yara"],
    })
    await gateway.updateScannerCapabilities("85c86630-4876-4f03-bc30-1ec5f77d2d22", {
      capabilities: ["Yara", "Sigma"],
      actorUserId: "lead-1",
    })

    expect(mockedRequestJson.mock.calls[0]?.[0]).toBe("/api/v2/infrastructure/scanners")
    expect(mockedRequestJson.mock.calls[0]?.[1]).toBe(scannerResponseSchema)
    expect(mockedRequestJson.mock.calls[1]?.[0]).toBe("/api/v2/infrastructure/scanners/85c86630-4876-4f03-bc30-1ec5f77d2d22/capabilities")
    expect(mockedRequestJson.mock.calls[1]?.[1]).toBe(scannerResponseSchema)
  })

  it("fetches saved reports by id through the v2 report detail endpoint", async () => {
    const payload = {
      id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      title: "Aegis mitigation: report",
      reportType: "Operational",
      summaryJson: "{\"aegisMitigationPlanVersion\":1}",
      generatedAtUtc: "2026-04-20T00:00:00Z",
      createdAtUtc: "2026-04-20T00:00:00Z",
      updatedAtUtc: "2026-04-20T00:00:00Z",
      alertIds: [],
    }
    mockedRequestJson.mockResolvedValue(payload)

    const gateway = new AspNetGateway()
    const result = await gateway.getReport("85c86630-4876-4f03-bc30-1ec5f77d2d22")

    expect(result).toEqual(payload)
    expect(mockedRequestJson).toHaveBeenCalledTimes(1)
    expect(mockedRequestJson.mock.calls[0][0]).toBe("/api/v2/reports/85c86630-4876-4f03-bc30-1ec5f77d2d22")
    expect(mockedRequestJson.mock.calls[0][1]).toBe(reportResponseSchema)
  })

  it("does not hide compatibility failures on core v2 operator reads", async () => {
    const compatibilityError = new ApiError(
      "Compatibility failure",
      500,
      null,
      { detail: "Invalid object name 'dbo.ManagedServers'" },
    )
    mockedRequestJson.mockRejectedValue(compatibilityError)

    const gateway = new AspNetGateway()

    await expect(gateway.listAlertRegistry()).rejects.toBe(compatibilityError)
    await expect(gateway.listReports()).rejects.toBe(compatibilityError)
    await expect(gateway.listAuditLogs()).rejects.toBe(compatibilityError)
    await expect(gateway.listManagedServers()).rejects.toBe(compatibilityError)
    await expect(gateway.listDetections()).rejects.toBe(compatibilityError)
  })

  it("does not hide compatibility failures on admin and infrastructure reads", async () => {
    const compatibilityError = new ApiError(
      "Compatibility failure",
      500,
      null,
      { detail: "Invalid object name 'dbo.role_permissions'" },
    )
    mockedRequestJson.mockRejectedValue(compatibilityError)

    const gateway = new AspNetGateway()

    await expect(gateway.listJobRuns()).rejects.toBe(compatibilityError)
    await expect(gateway.listUsers()).rejects.toBe(compatibilityError)
    await expect(gateway.listRoles()).rejects.toBe(compatibilityError)
    await expect(gateway.listPermissions()).rejects.toBe(compatibilityError)
    await expect(gateway.listRolePermissions()).rejects.toBe(compatibilityError)
    await expect(gateway.listRetentionPolicies()).rejects.toBe(compatibilityError)
    await expect(gateway.listSubnets()).rejects.toBe(compatibilityError)
    await expect(gateway.listTargetServers()).rejects.toBe(compatibilityError)
    await expect(gateway.listTargetGroups()).rejects.toBe(compatibilityError)
    await expect(gateway.listScanners()).rejects.toBe(compatibilityError)
  })
})

