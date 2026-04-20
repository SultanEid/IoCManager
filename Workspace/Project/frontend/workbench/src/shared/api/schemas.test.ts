import { describe, expect, it } from "vitest"
import {
  alertResponseSchema,
  aiAdjudicationResultResponseSchema,
  aiAdjudicationActionPlanOrPendingResponseSchema,
  aiAdjudicationExplanationOrPendingResponseSchema,
  alertRuleWorkflowResponseSchema,
  archiveRecordResponseSchema,
  detectionDetailResponseSchema,
  discoveredHostResponseSchema,
  discoveryRunResponseSchema,
  decisionResponseSchema,
  deploymentResponseSchema,
  feedbackResponseSchema,
  managedServerInventoryResponseSchema,
  healthReadySchema,
  permissionResponseSchema,
  promoteDiscoveredHostResponseSchema,
  retentionPolicyResponseSchema,
  rolePermissionResponseSchema,
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

  it("parses feedback response with taxonomy auxiliary fields", () => {
    const parsed = feedbackResponseSchema.parse({
      id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      caseId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      decisionId: null,
      verdict: "likely_malicious",
      confidence: 0.76,
      falsePositiveRisk: 0.14,
      reviewPriority: "high",
      shouldPromoteToIndicator: true,
      shouldSuppress: false,
      shouldAllowlist: false,
      shouldEscalate: true,
      notes: "Escalate to lead analyst",
      submittedByUserId: "analyst-1",
      submittedAtUtc: "2026-04-20T00:00:00Z",
    })

    expect(parsed.verdict).toBe("likely_malicious")
    expect(parsed.reviewPriority).toBe("high")
    expect(parsed.shouldPromoteToIndicator).toBe(true)
  })

  it("rejects legacy feedback verdict values in response payloads", () => {
    const parsed = feedbackResponseSchema.safeParse({
      id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      caseId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      decisionId: null,
      verdict: "NeedsMoreEvidence",
      confidence: 0.5,
      falsePositiveRisk: 0.5,
      reviewPriority: "medium",
      shouldPromoteToIndicator: false,
      shouldSuppress: false,
      shouldAllowlist: false,
      shouldEscalate: false,
      notes: "Legacy verdict should be rejected at the frontend boundary",
      submittedByUserId: "analyst-1",
      submittedAtUtc: "2026-04-20T00:00:00Z",
    })

    expect(parsed.success).toBe(false)
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

  it("parses retention and archive record payloads", () => {
    const policy = retentionPolicyResponseSchema.parse({
      id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      dataType: "ScanResult",
      retainDays: 30,
      archiveAfterDays: 14,
      isEnabled: true,
      createdAtUtc: "2026-04-20T00:00:00Z",
      updatedAtUtc: "2026-04-20T00:00:00Z",
    })

    const archive = archiveRecordResponseSchema.parse({
      id: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
      retentionPolicyId: policy.id,
      entityType: "scan_result",
      entityId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      archiveUri: "file://archives/scan_result/demo.json",
      archivedAtUtc: "2026-04-20T01:00:00Z",
      createdAtUtc: "2026-04-20T01:00:00Z",
    })

    expect(policy.dataType).toBe("ScanResult")
    expect(archive.retentionPolicyId).toBe(policy.id)
  })

  it("parses permission and role-permission payloads", () => {
    const permission = permissionResponseSchema.parse({
      id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
      key: "retention.manage",
      description: "Manage retention policies.",
      createdAtUtc: "2026-04-20T00:00:00Z",
    })

    const rolePermission = rolePermissionResponseSchema.parse({
      roleId: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
      permissionId: permission.id,
      grantedByUserId: "admin-1",
      grantedAtUtc: "2026-04-20T00:00:00Z",
    })

    expect(permission.key).toBe("retention.manage")
    expect(rolePermission.permissionId).toBe(permission.id)
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

  it("parses detection detail payload with linked alert/case summaries", () => {
    const parsed = detectionDetailResponseSchema.parse({
      id: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      fingerprint: "fp-1",
      scannerFamily: "yara",
      serverId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      serverHostname: "srv-01",
      scanJobId: null,
      jobAttemptId: null,
      targetExecutionId: null,
      ruleRevisionId: null,
      ruleName: "Rule A",
      iocId: null,
      iocType: "domain",
      iocValue: "x.example",
      disposition: "Detection",
      confidence: 0.7,
      observedAtUtc: "2026-04-20T00:00:00Z",
      firstObservedAtUtc: "2026-04-20T00:00:00Z",
      lastObservedAtUtc: "2026-04-20T00:00:00Z",
      occurrenceCount: 1,
      isExecutionArtifact: false,
      evidenceJson: "{}",
      rawPayloadHash: "hash",
      source: "telemetry",
      linkedAlerts: [],
      linkedCases: [
        {
          id: "85c86630-4876-4f03-bc30-1ec5f77d2d22",
          title: "Case 1",
          status: "Open",
          severity: "High",
          updatedAtUtc: "2026-04-20T00:00:00Z",
        },
      ],
    })

    expect(parsed.linkedCases).toHaveLength(1)
    expect(parsed.serverHostname).toBe("srv-01")
  })

  it("parses adjudication explanation and action-plan pending/ready payloads", () => {
    const pendingExplanation = aiAdjudicationExplanationOrPendingResponseSchema.parse({
      adjudicationId: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      status: "Running",
      message: "Explanation is not ready yet.",
    })
    expect("message" in pendingExplanation).toBe(true)

    const readyExplanation = aiAdjudicationExplanationOrPendingResponseSchema.parse({
      adjudicationId: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      status: "Completed",
      summary: "Deterministic summary.",
      decisionState: "monitor",
      recommendedAction: "collect_more_context",
      rationale: ["Grounded by telemetry."],
      citations: [],
      nextBestEvidence: [],
      policyVersion: "policy-v1",
      modelVersion: "model-v1",
      datasetVersion: "dataset-v1",
      generatedAtUtc: "2026-04-20T00:00:00Z",
      raw: {},
      phrasingDiagnostics: null,
    })
    expect("summary" in readyExplanation).toBe(true)

    const pendingActionPlan = aiAdjudicationActionPlanOrPendingResponseSchema.parse({
      adjudicationId: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      status: "Running",
      message: "Action plan is not ready yet.",
    })
    expect("message" in pendingActionPlan).toBe(true)

    const readyActionPlan = aiAdjudicationActionPlanOrPendingResponseSchema.parse({
      adjudicationId: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      status: "Completed",
      summary: "Escalate to lead analyst.",
      recommendedActions: [],
      prerequisites: [],
      cautions: ["Never auto-remediate"],
      neverAutoExecutes: true,
      policyConstrained: true,
      evidenceBased: true,
      generatedAtUtc: "2026-04-20T00:00:00Z",
      raw: {},
      phrasingDiagnostics: null,
    })
    expect("summary" in readyActionPlan).toBe(true)
  })

  it("parses adjudication results with safety diagnostics", () => {
    const parsed = aiAdjudicationResultResponseSchema.parse({
      adjudicationId: "5a8bff58-46f4-4f1c-acf0-a31ea2dad77c",
      status: "Completed",
      submittedAtUtc: "2026-04-20T00:00:00Z",
      startedAtUtc: "2026-04-20T00:00:01Z",
      completedAtUtc: "2026-04-20T00:00:10Z",
      failureCode: null,
      failureMessage: null,
      modelVersion: "model-v1",
      datasetVersion: "dataset-v1",
      decision: {
        verdict: "insufficient_evidence",
        action: "hold",
        confidence: 0.41,
        falsePositiveRisk: 0.62,
        reviewPriority: "high",
        shouldPromoteToIndicator: false,
        shouldSuppress: false,
        shouldAllowlist: false,
        shouldEscalate: false,
        reasons: ["Need more corroboration."],
        provenance: [],
        nextBestEvidence: ["Collect enrichment context."],
        abstainReason: "missing_non_string_corroboration",
        scoredAtUtc: "2026-04-20T00:00:05Z",
        safetyDiagnostics: {
          autoRemediationAllowed: false,
          weakEvidence: true,
          contradictoryEvidence: true,
          contradictionScore: 0.51,
          missingCriticalFields: ["object_metadata.object_id"],
          partialEvidence: true,
          enrichmentStatus: "degraded",
          falsePositiveRisk: 0.62,
          severityCapApplied: true,
          maxRecommendationSeverity: "review_only",
          degradationReasons: ["linked_enrichment_unavailable"],
        },
        raw: {},
      },
      explanationAvailable: true,
      actionPlanAvailable: true,
      similarDetectionsAvailable: false,
      evidenceSourcesAvailable: true,
    })

    expect(parsed.decision?.safetyDiagnostics?.weakEvidence).toBe(true)
    expect(parsed.decision?.safetyDiagnostics?.enrichmentStatus).toBe("degraded")
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
