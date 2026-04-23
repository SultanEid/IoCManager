import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import DetectionDecisionPage from "@/app/(workbench)/results-ingestion/[detectionId]/page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const mockedGateway = vi.hoisted(() => ({
  getDetectionDetail: vi.fn(),
  submitAiDecision: vi.fn(),
  getAiDecisionResult: vi.fn(),
  getAiDecisionExplanation: vi.fn(),
  getAiDecisionActionPlan: vi.fn(),
  listAiDecisionEvidenceSources: vi.fn(),
  listAiDecisionSimilarDetections: vi.fn(),
  submitAiDecisionOverrideOrClosure: vi.fn(),
}))

const gatewayState = vi.hoisted(() => ({
  isMockMode: false,
  isModeConfigured: true,
}))

vi.mock("next/navigation", () => ({
  useParams: () => ({ detectionId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69" }),
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "analyst-1",
      username: "analyst-1",
      roles: ["Analyst"],
    },
  }),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: mockedGateway,
  get isMockMode() {
    return gatewayState.isMockMode
  },
  get isModeConfigured() {
    return gatewayState.isModeConfigured
  },
}))

const detectionDetailBase = {
  id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
  fingerprint: "fp-1",
  scannerFamily: "yara",
  serverId: "17f37d2d-b2b7-49b6-aa8f-3f42031f0a0a",
  serverHostname: "srv-01",
  scanJobId: null,
  jobAttemptId: null,
  targetExecutionId: null,
  ruleRevisionId: null,
  ruleName: "rule-x",
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
}

describe("DetectionDecisionPage", () => {
  beforeEach(() => {
    gatewayState.isMockMode = false
    gatewayState.isModeConfigured = true
    mockedGateway.submitAiDecision.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      status: "Queued",
      submittedAtUtc: "2026-04-20T00:00:00Z",
      links: {
        result: "/result",
        explanation: "/exp",
        actionPlan: "/plan",
        similarDetections: "/sim",
        evidenceSources: "/evi",
        overrideClosure: "/override",
      },
    })
    mockedGateway.getAiDecisionResult.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      status: "Completed",
      submittedAtUtc: "2026-04-20T00:00:00Z",
      startedAtUtc: "2026-04-20T00:00:00Z",
      completedAtUtc: "2026-04-20T00:00:01Z",
      failureCode: null,
      failureMessage: null,
      modelVersion: "m1",
      datasetVersion: "d1",
      decision: {
        verdict: "suspicious",
        action: "monitor",
        confidence: 0.6,
        falsePositiveRisk: 0.3,
        reviewPriority: "high",
        shouldPromoteToIndicator: false,
        shouldSuppress: false,
        shouldAllowlist: false,
        shouldEscalate: false,
        reasons: ["reason"],
        provenance: [],
        nextBestEvidence: [],
        abstainReason: null,
        scoredAtUtc: "2026-04-20T00:00:01Z",
        safetyDiagnostics: {
          autoRemediationAllowed: false,
          weakEvidence: true,
          contradictoryEvidence: true,
          contradictionScore: 0.51,
          missingCriticalFields: ["object_metadata.object_id"],
          partialEvidence: true,
          enrichmentStatus: "degraded",
          falsePositiveRisk: 0.3,
          severityCapApplied: true,
          maxRecommendationSeverity: "review_only",
          degradationReasons: ["linked_enrichment_unavailable"],
        },
        raw: {},
      },
      explanationAvailable: false,
      actionPlanAvailable: false,
      similarDetectionsAvailable: false,
      evidenceSourcesAvailable: false,
    })
    mockedGateway.getAiDecisionExplanation.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      status: "Running",
      message: "pending",
    })
    mockedGateway.getAiDecisionActionPlan.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      status: "Running",
      message: "pending",
    })
    mockedGateway.listAiDecisionEvidenceSources.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      limit: 20,
      nextCursor: null,
      items: [],
    })
    mockedGateway.listAiDecisionSimilarDetections.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      limit: 20,
      nextCursor: null,
      items: [],
    })
    mockedGateway.submitAiDecisionOverrideOrClosure.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      overrideId: "8afdfb88-f5c2-40ef-87ff-872e0e7248c1",
      actionType: "Close",
      previousStatus: "Completed",
      newStatus: "Closed",
      reason: "ok",
      notes: null,
      overrideVerdict: null,
      closureDisposition: "accepted_recommendation",
      isFinal: true,
      submittedByUserId: "analyst-1",
      submittedAtUtc: "2026-04-20T00:00:02Z",
    })

    mockedUseWorkbenchQuery.mockImplementation(() => ({
      isLoading: false,
      isError: false,
      data: {
        ...detectionDetailBase,
        linkedAlerts: [],
        linkedCases: [
          {
            id: "case-1",
            title: "Case 1",
            status: "Open",
            severity: "High",
            updatedAtUtc: "2026-04-20T00:00:00Z",
          },
        ],
      },
    }))
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("requires analyst case selection when multiple linked cases are present", () => {
    mockedUseWorkbenchQuery.mockImplementation(() => ({
      isLoading: false,
      isError: false,
      data: {
        ...detectionDetailBase,
        linkedAlerts: [],
        linkedCases: [
          {
            id: "case-1",
            title: "Case 1",
            status: "Open",
            severity: "High",
            updatedAtUtc: "2026-04-20T00:00:00Z",
          },
          {
            id: "case-2",
            title: "Case 2",
            status: "Open",
            severity: "Critical",
            updatedAtUtc: "2026-04-20T00:00:00Z",
          },
        ],
      },
    }))

    render(<DetectionDecisionPage />)

    const submit = screen.getByRole("button", { name: "Run AI decision" })
    expect(submit).toBeDisabled()
    expect(screen.getByText(/select the target case before submitting analysis/i)).toBeInTheDocument()
  })

  it("blocks decision content in demo mode", () => {
    gatewayState.isMockMode = true

    render(<DetectionDecisionPage />)

    expect(screen.getByText("AI decision unavailable")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Run AI decision" })).not.toBeInTheDocument()
  })

  it("renders operator-facing safety, provenance, and action summaries", async () => {
    mockedGateway.getAiDecisionExplanation.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      status: "Completed",
      summary: "Deterministic explanation.",
      decisionState: "hold",
      recommendedAction: "collect_more_context",
      rationale: ["Grounded by telemetry."],
      citations: [],
      nextBestEvidence: [],
      policyVersion: "policy-v1",
      modelVersion: "model-v1",
      datasetVersion: "dataset-v1",
      generatedAtUtc: "2026-04-20T00:00:01Z",
      raw: {},
      phrasingDiagnostics: null,
    })
    mockedGateway.getAiDecisionActionPlan.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      status: "Completed",
      summary: "Review first.",
      recommendedActions: [
        {
          action: "open_review",
          rank: 1,
          score: 0.74,
          rationale: "Need human review.",
          prerequisites: [],
          cautions: [],
          escalationTarget: "analyst_queue",
          requiredReviewerRole: "tier1_analyst",
          requiresHumanApproval: true,
          executionMode: "manual_only",
        },
      ],
      prerequisites: [],
      cautions: [],
      neverAutoExecutes: true,
      policyConstrained: true,
      evidenceBased: true,
      generatedAtUtc: "2026-04-20T00:00:01Z",
      raw: {},
      phrasingDiagnostics: null,
    })
    mockedGateway.listAiDecisionEvidenceSources.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      limit: 20,
      nextCursor: null,
      items: [],
    })
    mockedGateway.getAiDecisionResult.mockResolvedValue({
      decisionId: "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      status: "Completed",
      submittedAtUtc: "2026-04-20T00:00:00Z",
      startedAtUtc: "2026-04-20T00:00:00Z",
      completedAtUtc: "2026-04-20T00:00:01Z",
      failureCode: null,
      failureMessage: null,
      modelVersion: "m1",
      datasetVersion: "d1",
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
        reasons: ["Need non-lexical corroboration."],
        provenance: [
          {
            source: "sigma_decision",
            key: "rule_id",
            value: "SIG-1",
            evidenceId: "evt-1",
            citationRef: "citation-1",
          },
        ],
        nextBestEvidence: ["Collect enrichment context."],
        abstainReason: "missing_non_string_corroboration",
        scoredAtUtc: "2026-04-20T00:00:01Z",
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

    render(<DetectionDecisionPage />)

    await userEvent.click(screen.getByRole("button", { name: "Run AI decision" }))
    await waitFor(() => expect(mockedGateway.submitAiDecision).toHaveBeenCalledWith(expect.objectContaining({
      caseId: "case-1",
      detectionId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
      observedAtUtc: "2026-04-20T00:00:00Z",
      detectionPackage: expect.objectContaining({
        caseId: "case-1",
        detectionId: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
        observedAt: "2026-04-20T00:00:00Z",
      }),
    })))
    await waitFor(() => expect(screen.getByText("Decision Support")).toBeInTheDocument())

    expect(screen.getByText(/False-positive risk is 62%/i)).toBeInTheDocument()
    expect(screen.getByText(/Decision Provenance/i)).toBeInTheDocument()
    expect(screen.getByText(/Internal policy state: Hold/i)).toBeInTheDocument()
    expect(screen.getByText(/Recommended Actions/i)).toBeInTheDocument()
    expect(screen.queryByText(/Phrasing origin not reported/i)).not.toBeInTheDocument()
  })

  it("maps accept/reject/modify/defer operator actions to expected API payloads", async () => {
    render(<DetectionDecisionPage />)

    await userEvent.click(screen.getByRole("button", { name: "Run AI decision" }))
    await waitFor(() => expect(mockedGateway.submitAiDecision).toHaveBeenCalledTimes(1))

    const submitOperatorAction = screen.getByRole("button", { name: "Submit operator action" })
    const reasonInput = screen.getByPlaceholderText("Why are you taking this action?")
    expect(submitOperatorAction).toBeDisabled()
    await userEvent.type(reasonInput, "accept reason")
    expect(submitOperatorAction).toBeEnabled()
    await userEvent.click(submitOperatorAction)

    await waitFor(() => expect(mockedGateway.submitAiDecisionOverrideOrClosure).toHaveBeenLastCalledWith(
      "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      expect.objectContaining({
        actionType: "Close",
        closureDisposition: "accepted_recommendation",
        isFinal: true,
      }),
    ))

    await userEvent.clear(reasonInput)
    await userEvent.click(screen.getByRole("button", { name: "Reject" }))
    await userEvent.type(screen.getByPlaceholderText("Why are you taking this action?"), "reject reason")
    expect(submitOperatorAction).toBeDisabled()
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Override verdict" }), "malicious")
    expect(submitOperatorAction).toBeEnabled()
    await userEvent.click(submitOperatorAction)

    await waitFor(() => expect(mockedGateway.submitAiDecisionOverrideOrClosure).toHaveBeenLastCalledWith(
      "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      expect.objectContaining({
        actionType: "Override",
        overrideVerdict: "malicious",
        isFinal: true,
      }),
    ))

    await userEvent.click(screen.getByRole("button", { name: "Modify" }))
    await userEvent.clear(screen.getByPlaceholderText("Why are you taking this action?"))
    await userEvent.type(screen.getByPlaceholderText("Why are you taking this action?"), "modify reason")
    expect(submitOperatorAction).toBeDisabled()
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Override verdict" }), "suspicious")
    await userEvent.type(
      screen.getByPlaceholderText("Explain how the analyst decision differs from the recommendation."),
      "updated rationale",
    )
    expect(submitOperatorAction).toBeEnabled()
    await userEvent.click(submitOperatorAction)

    await waitFor(() => expect(mockedGateway.submitAiDecisionOverrideOrClosure).toHaveBeenLastCalledWith(
      "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      expect.objectContaining({
        actionType: "Override",
        overrideVerdict: "suspicious",
        notes: "updated rationale",
        isFinal: true,
      }),
    ))

    await userEvent.click(screen.getByRole("button", { name: "Defer" }))
    await userEvent.clear(screen.getByPlaceholderText("Why is follow-up required?"))
    await userEvent.type(screen.getByPlaceholderText("Why is follow-up required?"), "defer reason")
    await userEvent.clear(screen.getByPlaceholderText("Record the follow-up plan, owner, or next shift handoff."))
    expect(submitOperatorAction).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText("Record the follow-up plan, owner, or next shift handoff."), "follow up next shift")
    expect(submitOperatorAction).toBeEnabled()
    await userEvent.click(submitOperatorAction)

    await waitFor(() => expect(mockedGateway.submitAiDecisionOverrideOrClosure).toHaveBeenLastCalledWith(
      "95fef7ff-c894-4d2d-9f95-b6de6e68b2e0",
      expect.objectContaining({
        actionType: "Close",
        closureDisposition: "deferred_followup",
        notes: "follow up next shift",
        isFinal: false,
      }),
    ))
  }, 15000)
})


