import { describe, expect, it } from "vitest"
import {
  alertResponseSchema,
  alertRuleWorkflowResponseSchema,
  discoveredHostResponseSchema,
  discoveryRunResponseSchema,
  decisionResponseSchema,
  deploymentResponseSchema,
  managedServerInventoryResponseSchema,
  healthReadySchema,
  promoteDiscoveredHostResponseSchema,
  ruleImportAttemptSchema,
  ruleRevisionItemSchema,
  ruleFamilySchema,
  scannerResponseSchema,
  tokenResponseSchema,
} from "@/shared/api/schemas"

describe("API schemas", () => {
  it("parses token response", () => {
    const parsed = tokenResponseSchema.parse({
      accessToken: "abc",
      expiresAtUtc: "2026-03-13T00:00:00Z",
      tokenType: "Bearer",
    })

    expect(parsed.tokenType).toBe("Bearer")
  })

  it("parses alert response", () => {
    const parsed = alertResponseSchema.parse({
      id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      title: "Suspicious command chain",
      summary: "PowerShell plus encoded payload",
      priority: "High",
      status: "Open",
      ownerUserId: "analyst-1",
      approvalTierRequired: "Lead",
      createdAtUtc: "2026-03-13T00:00:00Z",
      updatedAtUtc: "2026-03-13T00:00:00Z",
    })

    expect(parsed.priority).toBe("High")
  })

  it("rejects invalid deployment payload", () => {
    const parsed = deploymentResponseSchema.safeParse({
      id: "not-a-uuid",
      caseId: "also-bad",
      ruleId: "bad",
      targetEnvironment: "canary",
      status: "Proposed",
      requestedByUserId: "lead-1",
      approvedByUserId: null,
      approvedAtUtc: null,
      deployedAtUtc: null,
      createdAtUtc: "date",
      updatedAtUtc: "date",
    })

    expect(parsed.success).toBe(false)
  })

  it("parses decision response", () => {
    const parsed = decisionResponseSchema.parse({
      id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      caseId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      state: "Proposed",
      recommendedAction: "deploy_canary",
      approvalTierRequired: "Lead",
      policyVersion: "cti-policy-v1",
      modelVersion: "model-v2",
      reasoning: "Strong evidence chain",
      approvedByUserId: null,
      approvedAtUtc: null,
      createdAtUtc: "2026-03-13T00:00:00Z",
      updatedAtUtc: "2026-03-13T00:01:00Z",
    })

    expect(parsed.recommendedAction).toBe("deploy_canary")
  })

  it("parses alert rule workflow response", () => {
    const parsed = alertRuleWorkflowResponseSchema.parse({
      caseId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      proposals: [],
      recommendations: [],
      rolloutPlans: [],
      rollbackPlans: [],
      analystAcceptanceRate: 0.5,
    })

    expect(parsed.analystAcceptanceRate).toBe(0.5)
  })

  it("parses health ready stable response", () => {
    const parsed = healthReadySchema.parse({
      status: "ready",
      components: [
        {
          name: "database",
          status: "healthy",
          required: true,
          message: "Database reachable.",
        },
        {
          name: "ai_sidecar",
          status: "degraded",
          required: false,
          message: "AI sidecar temporarily unavailable.",
        },
      ],
    })

    expect(parsed.status).toBe("ready")
    expect(parsed.components[1].required).toBe(false)
    expect(parsed.components[1].status).toBe("degraded")
  })

  it("parses discovery run response", () => {
    const parsed = discoveryRunResponseSchema.parse({
      id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      requestedCidr: "10.10.1.0/24",
      rangeStartIp: "10.10.1.10",
      rangeEndIp: "10.10.1.20",
      status: "Partial",
      queuedAtUtc: "2026-04-09T10:00:00Z",
      startedAtUtc: "2026-04-09T10:00:01Z",
      completedAtUtc: "2026-04-09T10:00:03Z",
      totalHosts: 11,
      reachableHosts: 5,
      unreachableHosts: 6,
      summary: "Discovery complete",
    })

    expect(parsed.status).toBe("Partial")
    expect(parsed.totalHosts).toBe(11)
  })

  it("parses discovered host and promotion payloads", () => {
    const host = discoveredHostResponseSchema.parse({
      id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      ipAddress: "10.10.1.10",
      hostname: "srv-app-10",
      reachability: "Reachable",
      firstDiscoveredAtUtc: "2026-04-09T10:00:01Z",
      lastCheckedAtUtc: "2026-04-09T10:00:03Z",
      lastSeenAtUtc: "2026-04-09T10:00:03Z",
      lastDiscoveryRunId: "3f8df2a9-1c49-4c41-b096-c57f5a5e62c7",
      promotedTargetServerId: null,
      promotedAtUtc: null,
    })

    const promoted = promoteDiscoveredHostResponseSchema.parse({
      discoveredHostId: host.id,
      targetServerId: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
      alreadyPromoted: false,
      promotedAtUtc: "2026-04-09T10:01:00Z",
    })

    expect(host.reachability).toBe("Reachable")
    expect(promoted.alreadyPromoted).toBe(false)
  })

  it("parses managed server inventory payload", () => {
    const parsed = managedServerInventoryResponseSchema.parse({
      servers: [
        {
          id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
          subnetId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
          hostname: "srv-core-01",
          ipAddress: "10.10.1.25",
          operatingSystem: "Windows Server 2022",
          environment: "prod",
          status: "Active",
          connectivityStatus: "Online",
          lastHeartbeatUtc: "2026-04-10T08:00:00Z",
          lastContactUtc: "2026-04-10T08:10:00Z",
          connectionProtocol: "WinRm",
          connectionHost: "srv-core-01.corp.local",
          connectionPort: 5985,
          connectionAuthMode: "Password",
          connectionUsername: "svc_scanner",
          hasConnectionSecret: true,
          connectionSecretUpdatedAtUtc: "2026-04-10T08:05:00Z",
          scannerAssignments: [
            {
              targetServerId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
              scannerId: "1d53ef59-c6a5-4f7d-a2d4-5cbf95927915",
      scannerName: "suricata-west-1",
              connectivityStatus: "Online",
              lastHeartbeatUtc: "2026-04-10T08:00:00Z",
              lastContactUtc: "2026-04-10T08:10:00Z",
              isEnabled: true,
      capabilities: ["Suricata", "Sigma"],
              updatedAtUtc: "2026-04-10T08:10:00Z",
            },
          ],
    scannerCapabilities: ["Suricata", "Sigma"],
          createdAtUtc: "2026-04-09T10:00:00Z",
          updatedAtUtc: "2026-04-10T08:10:00Z",
        },
      ],
        totalServers: 1,
        unhealthyServers: 0,
        unreachableServers: 0,
        staleContactServers: 0,
        page: 1,
        pageSize: 20,
      })

    expect(parsed.servers[0]?.scannerCapabilities).toContain("Suricata")
  })

  it("rejects unsupported scanner capability token", () => {
    const parsed = scannerResponseSchema.safeParse({
      id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      name: "scanner-1",
      engineType: "custom",
      version: "1.0.0",
      healthStatus: "Healthy",
      lastHeartbeatUtc: "2026-04-10T08:00:00Z",
      createdAtUtc: "2026-04-10T08:00:00Z",
      updatedAtUtc: "2026-04-10T08:00:00Z",
      capabilities: ["CustomEngine"],
    })

    expect(parsed.success).toBe(false)
  })

  it("accepts canonical rule family tokens", () => {
    const tokens = ["yara", "sigma", "snort", "suricata"]
    for (const token of tokens) {
      expect(ruleFamilySchema.safeParse(token).success).toBe(true)
    }
  })

  it("accepts suricata as canonical and rejects unknown tokens", () => {
    expect(ruleFamilySchema.safeParse("suricata").success).toBe(true)
    expect(ruleFamilySchema.safeParse("elastic").success).toBe(false)
  })

  it("parses staged validation payloads on revisions and imports", () => {
    const validation = {
      canPersist: true,
      isDeploymentReady: false,
      evaluatedAtUtc: "2026-04-10T08:00:00Z",
      stages: [
        {
          stage: "syntax",
          passed: true,
          capabilityDepth: "heuristic",
          limitation: "Full engine-level syntax validation is unavailable in this phase.",
          diagnostics: [
            {
              code: "syntax.engine_validation.unavailable",
              severity: "note",
              message: "Heuristic syntax checks were applied.",
              line: null,
              column: null,
            },
          ],
        },
        {
          stage: "metadata",
          passed: true,
          capabilityDepth: "heuristic",
          limitation: null,
          diagnostics: [],
        },
        {
          stage: "deployment_readiness",
          passed: false,
          capabilityDepth: "heuristic",
          limitation: "Checks are signal-based in this phase.",
          diagnostics: [
            {
              code: "readiness.assignment.none_enabled",
              severity: "warning",
              message: "No enabled scanner assignment was found.",
              line: null,
              column: null,
            },
          ],
        },
      ],
    }

    const revision = ruleRevisionItemSchema.parse({
      id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      ruleArtifactId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      revisionNumber: 3,
      versionLabel: "v3",
      originalContent: "rule x { condition: true }",
      metadataJson: "{}",
      changeType: "updated",
      changeReason: null,
      status: "approved",
      validation,
      ruleImportAttemptId: null,
      createdAtUtc: "2026-04-10T08:00:00Z",
      createdByUserId: "lead.ops",
    })

    const attempt = ruleImportAttemptSchema.parse({
      id: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      fileName: "rule.yar",
      fileHash: "abc123",
      declaredRuleFamily: "yara",
      wasSuccessful: true,
      failureReason: null,
      sourceMetadataJson: "{}",
      parsedMetadataJson: "{}",
      diagnostics: [
        {
          code: "readiness.production_not_ready",
          severity: "note",
          message: "Revision is not production-ready.",
          line: null,
          column: null,
        },
      ],
      validation,
      ruleArtifactId: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      ruleRevisionId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      createdAtUtc: "2026-04-10T08:01:00Z",
      updatedAtUtc: "2026-04-10T08:01:00Z",
      createdByUserId: "lead.ops",
    })

    expect(revision.validation.stages).toHaveLength(3)
    expect(attempt.validation.isDeploymentReady).toBe(false)
  })

  it("rejects invalid validation severity values", () => {
    const parsed = ruleImportAttemptSchema.safeParse({
      id: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      fileName: "rule.yar",
      fileHash: "abc123",
      declaredRuleFamily: "yara",
      wasSuccessful: false,
      failureReason: "failed",
      sourceMetadataJson: "{}",
      parsedMetadataJson: "{}",
      diagnostics: [
        {
          code: "x",
          severity: "info",
          message: "bad severity",
          line: null,
          column: null,
        },
      ],
      validation: {
        canPersist: false,
        isDeploymentReady: false,
        evaluatedAtUtc: "2026-04-10T08:01:00Z",
        stages: [],
      },
      ruleArtifactId: null,
      ruleRevisionId: null,
      createdAtUtc: "2026-04-10T08:01:00Z",
      updatedAtUtc: "2026-04-10T08:01:00Z",
      createdByUserId: "lead.ops",
    })

    expect(parsed.success).toBe(false)
  })
})
