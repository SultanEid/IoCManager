import { describe, expect, it } from "vitest"
import {
  buildActivityTimeline,
  buildGraphNeighbors,
  buildLinkedReports,
  buildLinkedRules,
  buildNextBestEvidence,
  buildPolicyGuardrails,
  buildQueue,
  buildScoreAxes,
  buildSimilarHistoricalCases,
} from "@/shared/gateway/adapters"
import type { CaseDetailVM } from "@/shared/gateway/types"

const CASE_ID = "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69"

describe("gateway adapters", () => {
  it("builds deterministic neighbors and similar cases", () => {
    const firstNeighbors = buildGraphNeighbors(CASE_ID)
    const secondNeighbors = buildGraphNeighbors(CASE_ID)
    expect(firstNeighbors).toEqual(secondNeighbors)

    const firstSimilar = buildSimilarHistoricalCases(CASE_ID)
    const secondSimilar = buildSimilarHistoricalCases(CASE_ID)
    expect(firstSimilar).toEqual(secondSimilar)
  })

  it("builds next-best-evidence deterministically", () => {
    expect(buildNextBestEvidence(CASE_ID)).toEqual(buildNextBestEvidence(CASE_ID))
  })

  it("derives score axes in bounded ranges", () => {
    const axes = buildScoreAxes(CASE_ID, [], [])
    expect(axes.length).toBeGreaterThan(0)
    for (const axis of axes) {
      expect(axis.value).toBeGreaterThanOrEqual(0)
      expect(axis.value).toBeLessThanOrEqual(axis.max)
    }
  })

  it("builds timeline sorted by most recent first", () => {
    const timeline = buildActivityTimeline(
      [
        {
          id: "d1",
          caseId: CASE_ID,
          state: "Approved",
          recommendedAction: "contain_and_monitor",
          approvalTierRequired: "Lead",
          policyVersion: "v1",
          modelVersion: "m1",
          reasoning: "r",
          approvedByUserId: "lead-1",
          approvedAtUtc: "2026-03-13T05:00:00Z",
          createdAtUtc: "2026-03-13T04:00:00Z",
          updatedAtUtc: "2026-03-13T05:00:00Z",
        },
      ],
      [
        {
          id: "dep1",
          caseId: CASE_ID,
          ruleId: "11111111-1111-1111-1111-111111111111",
          targetEnvironment: "production",
          status: "Canary",
          requestedByUserId: "u1",
          approvedByUserId: null,
          approvedAtUtc: null,
          deployedAtUtc: null,
          createdAtUtc: "2026-03-13T03:00:00Z",
          updatedAtUtc: "2026-03-13T03:00:00Z",
        },
      ],
      [
        {
          id: "f1",
          caseId: CASE_ID,
          decisionId: null,
          verdict: "accept",
          notes: "Looks accurate",
          submittedByUserId: "analyst-1",
          submittedAtUtc: "2026-03-13T06:00:00Z",
        },
      ],
    )

    expect(timeline[0].source).toBe("feedback")
    expect(Date.parse(timeline[0].when)).toBeGreaterThanOrEqual(Date.parse(timeline[1].when))
  })

  it("maps linked rules to matching workflow proposals", () => {
    const linked = buildLinkedRules(
      [
        {
          id: "r1",
          caseId: CASE_ID,
          name: "c2-domain",
          ruleFamily: "yara",
          ruleBody: "rule c2 {}",
          version: "v3",
          status: "Active",
          createdAtUtc: "2026-03-13T01:00:00Z",
          updatedAtUtc: "2026-03-13T02:00:00Z",
        },
      ],
      {
        caseId: CASE_ID,
        proposals: [
          {
            id: "p1",
            caseId: CASE_ID,
            proposalName: "C2 hardening",
            ruleFamily: "yara",
            ruleBody: "body",
            proposedVersion: "v3",
            proposedByUserId: "analyst-1",
            rationale: "rationale",
            policyRiskScore: 0.41,
            status: "accepted",
            reviewedByUserId: "lead-1",
            reviewedAtUtc: "2026-03-13T03:00:00Z",
            reviewReason: "ok",
            overrideReason: null,
            createdAtUtc: "2026-03-13T02:00:00Z",
            updatedAtUtc: "2026-03-13T03:00:00Z",
          },
        ],
        recommendations: [],
        rolloutPlans: [],
        rollbackPlans: [],
        analystAcceptanceRate: 0.82,
      },
    )

    expect(linked[0].provenance).toContain("C2 hardening")
  })

  it("derives linked reports from evidence and feedback", () => {
    const reports = buildLinkedReports(
      [
        {
          id: "e1",
          caseId: CASE_ID,
          evidenceType: "dns",
          sourceSystem: "DNS",
          contentHash: "abc123",
          confidence: 0.8,
          collectedAtUtc: "2026-03-13T02:00:00Z",
          createdAtUtc: "2026-03-13T02:00:00Z",
        },
        {
          id: "e2",
          caseId: CASE_ID,
          evidenceType: "dns",
          sourceSystem: "DNS",
          contentHash: "def456",
          confidence: 0.9,
          collectedAtUtc: "2026-03-13T03:00:00Z",
          createdAtUtc: "2026-03-13T03:00:00Z",
        },
      ],
      [
        {
          id: "f1",
          caseId: CASE_ID,
          decisionId: null,
          verdict: "accept",
          notes: "clean",
          submittedByUserId: "u1",
          submittedAtUtc: "2026-03-13T03:10:00Z",
        },
      ],
    )

    expect(reports).toHaveLength(1)
    expect(reports[0].title).toContain("DNS")
    expect(reports[0].feedbackSignal).toContain("supportive")
  })

  it("builds policy guardrails with approval and rollback controls", () => {
    const guardrails = buildPolicyGuardrails(
      null,
      {
        caseId: CASE_ID,
        proposals: [],
        recommendations: [
          {
            id: "rec-1",
            caseId: CASE_ID,
            ruleProposalId: "p1",
            targetEnvironment: "prod",
            recommendedStage: "canary",
            riskScore: 0.52,
            predictedNoise: 0.2,
            baselineNoise: 0.1,
            predictedNoiseDelta: 0.1,
            analystAcceptanceRate: 0.75,
            requiresHumanApproval: true,
            autoPublishEnabled: false,
            requestedByUserId: "u1",
            rationale: "r",
            recommendedAtUtc: "2026-03-13T01:00:00Z",
            createdAtUtc: "2026-03-13T01:00:00Z",
            updatedAtUtc: "2026-03-13T01:00:00Z",
          },
        ],
        rolloutPlans: [],
        rollbackPlans: [
          {
            id: "rb-1",
            caseId: CASE_ID,
            ruleProposalId: "p1",
            rolloutPlanId: "ro-1",
            triggerCondition: "noise > threshold",
            recoveryPlaybook: "revert",
            predictedNoiseThreshold: 0.15,
            lastObservedNoise: null,
            triggerConditionMet: false,
            isTriggered: false,
            triggeredByUserId: null,
            triggeredAtUtc: null,
            triggerReason: null,
            createdAtUtc: "2026-03-13T01:00:00Z",
            updatedAtUtc: "2026-03-13T01:00:00Z",
          },
        ],
        analystAcceptanceRate: 0.71,
      },
      null,
      null,
      {
        id: CASE_ID,
        title: "Case",
        summary: "summary",
        priority: "High",
        status: "Open",
        ownerUserId: "u1",
        approvalTierRequired: "Lead",
        createdAtUtc: "2026-03-13T00:00:00Z",
        updatedAtUtc: "2026-03-13T00:00:00Z",
      },
    )

    expect(guardrails).toHaveLength(4)
    expect(guardrails[0].label).toContain("Human approval")
    expect(guardrails[3].label).toContain("Rollback threshold")
  })

  it("sorts queue by triage score descending", () => {
    const cases = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        title: "A",
        summary: "a",
        priority: "High",
        status: "Open",
        ownerUserId: "u1",
        approvalTierRequired: "Lead",
        createdAtUtc: "2026-03-13T00:00:00Z",
        updatedAtUtc: "2026-03-13T00:00:00Z",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        title: "B",
        summary: "b",
        priority: "Critical",
        status: "Open",
        ownerUserId: "u2",
        approvalTierRequired: "Admin",
        createdAtUtc: "2026-03-13T00:00:00Z",
        updatedAtUtc: "2026-03-13T00:00:00Z",
      },
    ]

    const details = cases.map((caseItem, index) => ({
      caseItem,
      latestDecision: null,
      latestDeployment: null,
      scoreAxes: [{ axis: "Blast Radius", value: index === 0 ? 20 : 80, max: 100 }],
      recommendedAction: "monitor",
      decisionState: "Proposed",
      approvalTier: caseItem.approvalTierRequired,
      rolloutPlan: "x",
      rollbackPlan: "y",
      topEvidence: [],
      graphNeighbors: [],
      similarHistoricalCases: [],
      nextBestEvidence: [],
      activityTimeline: [],
      linkedRules: [],
      linkedReports: [],
      policyGuardrails: [],
      isSimulated: true,
    })) as CaseDetailVM[]

    const queue = buildQueue(cases, details)
    expect(queue[0].caseId).toBe("00000000-0000-0000-0000-000000000002")
    expect(queue[0].triageScore).toBeGreaterThanOrEqual(queue[1].triageScore)
  })
})
