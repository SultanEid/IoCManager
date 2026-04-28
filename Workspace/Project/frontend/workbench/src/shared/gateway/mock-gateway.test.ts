import { describe, expect, it } from "vitest"
import { MockGateway } from "@/shared/gateway/mock-gateway"

describe("MockGateway Zira demo mode", () => {
  const gateway = new MockGateway()

  it("exposes autonomous Zira status without user input", async () => {
    const status = await gateway.getScanAnalystStatus()

    expect(status.agentEnabled).toBe(true)
    expect(status.autonomyEnabled).toBe(true)
    expect(status.operatingMode).toBe("MockFallback")
    expect(status.personaName).toBe("Zira")
    expect(status.currentActivity).toBeTruthy()
    expect(status.latestActionSummary).toBeTruthy()
    expect(status.lastAutonomousActivity).not.toBeNull()
    expect(status.lastAutonomousActivity?.action).toBe("CreateAndRun")
    expect(status.recentActions?.length).toBeGreaterThan(0)
    expect(status.completedPlans?.length).toBeGreaterThan(0)
  })

  it("supports recommend-only planning in demo mode", async () => {
    const response = await gateway.sendScanAnalystChatTurn({
      actorUserId: "analyst-1",
      message: "Review the newest hosts and recommend a focused first pass.",
      action: "RecommendOnly",
      simulatedConditions: ["new_hosts_found"],
    })

    expect(response.operatingMode).toBe("MockFallback")
    expect(response.messages).toHaveLength(2)
    expect(response.latestAnalysis.action).toBe("RecommendOnly")
    expect(response.latestAnalysis.proposedPlan).not.toBeNull()
    expect(response.latestAnalysis.createdPlan).toBeNull()
    expect(response.latestAnalysis.queuedJob).toBeNull()
    expect(response.latestAnalysis.runSummary).toBeNull()
    expect(response.activeMockConditions).toEqual(["new_hosts_found"])
  })

  it("supports create-plan without execution in demo mode", async () => {
    const response = await gateway.sendScanAnalystChatTurn({
      actorUserId: "analyst-1",
      message: "Create a plan for the stale coverage hosts but do not run it yet.",
      action: "CreatePlan",
      simulatedConditions: ["stale_coverage"],
    })

    expect(response.latestAnalysis.action).toBe("CreatePlan")
    expect(response.latestAnalysis.createdPlan).not.toBeNull()
    expect(response.latestAnalysis.queuedJob).toBeNull()
    expect(response.latestAnalysis.runSummary).toBeNull()
    expect(response.activeMockConditions).toEqual(["stale_coverage"])
  })

  it("supports create-and-run plus run summary in demo mode", async () => {
    const response = await gateway.sendScanAnalystChatTurn({
      actorUserId: "analyst-1",
      message: "Create and run a follow-up plan for the failed recent job.",
      action: "CreateAndRun",
      simulatedConditions: ["failed_recent_job"],
    })

    expect(response.latestAnalysis.action).toBe("CreateAndRun")
    expect(response.latestAnalysis.createdPlan).not.toBeNull()
    expect(response.latestAnalysis.queuedJob).not.toBeNull()
    expect(response.latestAnalysis.runSummary).not.toBeNull()
    expect(response.latestRunSummary?.narrativeSummary).toContain("simulated")

    const runSummary = await gateway.getScanAnalystRunSummary(response.latestAnalysis.queuedJob!.id)
    expect(runSummary.jobStatus).toBe("Completed")
    expect(runSummary.detectionCount).toBeGreaterThan(0)
    expect(runSummary.targetExecutions.length).toBeGreaterThan(0)
  })

  it("returns persisted Aegis mitigation reports by id", async () => {
    const localGateway = new MockGateway()
    const generated = await localGateway.generateReportMitigation({
      sourceName: "demo report",
      sourceType: "bulletin",
      documentText: "indicator: example.test",
      includeWorkspaceContext: true,
      actorUserId: "analyst-1",
    })

    const reportId = generated.persistedMitigationReport!.id
    const report = await localGateway.getReport(reportId)

    expect(report.id).toBe(reportId)
    expect(report.summaryJson).toContain("aegisMitigationPlanVersion")
  })

  it("returns distinct family-specific mock proposals and results", async () => {
    const families = [
      {
        capability: "Yara" as const,
        expectedRuleFamily: "yara",
        expectedRuleName: "Suspicious Archive Loader",
        expectedSummaryFragment: "YARA",
      },
      {
        capability: "Sigma" as const,
        expectedRuleFamily: "sigma",
        expectedRuleName: "Encoded PowerShell Child Process",
        expectedSummaryFragment: "Sigma",
      },
      {
        capability: "Suricata" as const,
        expectedRuleFamily: "suricata",
        expectedRuleName: "Suspicious TLS Egress Pattern",
        expectedSummaryFragment: "Suricata",
      },
    ]

    for (const family of families) {
      const response = await gateway.sendScanAnalystChatTurn({
        actorUserId: "analyst-1",
        message: `Prepare and run a ${family.capability} follow-up.`,
        action: "CreateAndRun",
        preferredScannerCapability: family.capability,
      })

      expect(response.latestAnalysis.recommendedScannerCapability).toBe(family.capability)
      expect(response.latestAnalysis.proposedPlan.scannerCapability).toBe(family.capability)
      expect(response.latestAnalysis.proposedPlan.rules[0]?.ruleFamily).toBe(family.expectedRuleFamily)
      expect(response.latestAnalysis.runSummary?.detections[0]?.ruleName).toBe(family.expectedRuleName)
      expect(response.latestAnalysis.runSummary?.narrativeSummary).toContain(family.expectedSummaryFragment)
    }
  })

  it("preserves user edits when Zira revises the proposed plan", async () => {
    const recommended = await gateway.sendScanAnalystChatTurn({
      actorUserId: "analyst-1",
      message: "Draft a plan for the lab subnet and prefer Sigma.",
      action: "RecommendOnly",
    })

    const editedPlan = {
      ...recommended.latestAnalysis.proposedPlan,
      name: "zira-edited-plan",
      operatorNotes: "User removed Linux hosts from the first pass.",
      targetServerIds: recommended.latestAnalysis.proposedPlan.targetServerIds.slice(0, 1),
    }

    const revised = await gateway.sendScanAnalystChatTurn({
      sessionId: recommended.sessionId,
      actorUserId: "analyst-1",
      message: "Use this revised version and create the plan.",
      action: "CreatePlan",
      editedPlan,
    })

    expect(revised.latestAnalysis.proposedPlan.name).toBe("zira-edited-plan")
    expect(revised.latestAnalysis.proposedPlan.operatorNotes).toContain("removed Linux hosts")
    expect(revised.latestAnalysis.proposedPlan.targetServerIds).toHaveLength(1)
    expect(revised.latestAnalysis.createdPlan?.name).toBe("zira-edited-plan")
  })
})
