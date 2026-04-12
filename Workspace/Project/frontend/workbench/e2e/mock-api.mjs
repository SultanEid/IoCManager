export const ids = {
  primaryCase: "8f2f680c-3079-4e5a-a163-142866f4e6fe",
  secondaryCase: "cf602ea5-1599-49d2-a235-cb34ef5a9d9f",
  primaryDecision: "06f35cd3-1ff2-48f2-9660-9eb7fbc03fd4",
  primaryEvidence: "6aa38697-4cc8-44eb-a7c9-f3117408cc2c",
  proposal: "2c6e89a7-5208-49ad-a947-df0e0a0f1501",
  recommendation: "2f47025b-472f-4ae1-98eb-bf49f80446cb",
  rollout: "83956f01-5c7d-43eb-8ac9-f5d81d77cdf2",
  rollback: "9908fae2-afeb-4a0c-ae3f-5f2511db95e8",
}

const now = "2026-03-13T01:00:00Z"
const soon = "2026-03-13T01:15:00Z"
const later = "2026-03-13T01:30:00Z"
const authToken = createUnsignedJwt({
  sub: "test-user",
  unique_name: "analyst",
  role: ["Analyst", "Lead", "Admin"],
  exp: 4102444800,
  iat: 1700000000,
})

function createUnsignedJwt(payload) {
  const header = { alg: "none", typ: "JWT" }
  const toBase64Url = (value) =>
    Buffer.from(JSON.stringify(value), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "")
  return `${toBase64Url(header)}.${toBase64Url(payload)}.signature`
}

function createState() {
  return {
    cases: [
      {
        id: ids.primaryCase,
        title: "Escalate suspicious DNS tunnel",
        summary: "Observed beaconing and data exfiltration signatures from a finance endpoint.",
        priority: "High",
        status: "AwaitingApproval",
        ownerUserId: "analyst-1",
        approvalTierRequired: "Lead",
        createdAtUtc: now,
        updatedAtUtc: later,
      },
      {
        id: ids.secondaryCase,
        title: "Investigate lateral movement signals",
        summary: "Potential credential abuse pattern needs additional corroboration.",
        priority: "Medium",
        status: "Open",
        ownerUserId: "analyst-2",
        approvalTierRequired: "Analyst",
        createdAtUtc: now,
        updatedAtUtc: soon,
      },
    ],
    evidenceByCase: {
      [ids.primaryCase]: [
        {
          id: ids.primaryEvidence,
          caseId: ids.primaryCase,
          evidenceType: "network",
          sourceSystem: "EDR",
          contentHash: "hash-primary-1",
          confidence: 0.91,
          collectedAtUtc: now,
          createdAtUtc: now,
        },
      ],
      [ids.secondaryCase]: [],
    },
    decisionsByCase: {
      [ids.primaryCase]: [
        {
          id: ids.primaryDecision,
          caseId: ids.primaryCase,
          state: "Proposed",
          recommendedAction: "contain_and_monitor",
          approvalTierRequired: "Lead",
          policyVersion: "policy-v1",
          modelVersion: "model-v1",
          reasoning: "Multi-source confidence exceeds policy threshold.",
          approvedByUserId: null,
          approvedAtUtc: null,
          createdAtUtc: now,
          updatedAtUtc: later,
        },
      ],
      [ids.secondaryCase]: [],
    },
    deploymentsByCase: {
      [ids.primaryCase]: [],
      [ids.secondaryCase]: [],
    },
    feedbackByCase: {
      [ids.primaryCase]: [],
      [ids.secondaryCase]: [],
    },
    workflowByCase: {
      [ids.primaryCase]: {
        caseId: ids.primaryCase,
        proposals: [
          {
            id: ids.proposal,
            caseId: ids.primaryCase,
            proposalName: "Contain suspicious powershell chain",
            ruleFamily: "sigma",
            ruleBody: "title: Suspicious powershell chain\ncondition: selection",
            proposedVersion: "v1",
            proposedByUserId: "analyst-1",
            rationale: "High-risk branch requires controlled rollout.",
            policyRiskScore: 0.62,
            status: "Proposed",
            reviewedByUserId: null,
            reviewedAtUtc: null,
            reviewReason: null,
            overrideReason: null,
            createdAtUtc: now,
            updatedAtUtc: now,
          },
        ],
        recommendations: [
          {
            id: ids.recommendation,
            caseId: ids.primaryCase,
            ruleProposalId: ids.proposal,
            targetEnvironment: "production",
            recommendedStage: "canary",
            riskScore: 0.62,
            predictedNoise: 0.28,
            baselineNoise: 0.41,
            predictedNoiseDelta: -0.13,
            analystAcceptanceRate: 0.6,
            requiresHumanApproval: true,
            autoPublishEnabled: false,
            requestedByUserId: "analyst-1",
            rationale: "Predicted noise materially better than blanket baseline.",
            recommendedAtUtc: now,
            createdAtUtc: now,
            updatedAtUtc: now,
          },
        ],
        rolloutPlans: [
          {
            id: ids.rollout,
            caseId: ids.primaryCase,
            ruleProposalId: ids.proposal,
            deploymentRecommendationId: ids.recommendation,
            currentStage: "canary",
            canaryTrafficPercent: 25,
            predictedNoise: 0.28,
            observedNoise: null,
            observedNoiseDelta: null,
            analystAcceptanceRate: 0.6,
            requiresManualPromotion: true,
            shadowStartedAtUtc: now,
            canaryStartedAtUtc: soon,
            promotedAtUtc: null,
            rolledBackAtUtc: null,
            lastStageReason: "Initial canary rollout",
            lastOverrideReason: null,
            createdAtUtc: now,
            updatedAtUtc: soon,
          },
        ],
        rollbackPlans: [
          {
            id: ids.rollback,
            caseId: ids.primaryCase,
            ruleProposalId: ids.proposal,
            rolloutPlanId: ids.rollout,
            triggerCondition: "Observed noise above threshold",
            recoveryPlaybook: "cti-playbook://rollback/v1",
            predictedNoiseThreshold: 0.35,
            lastObservedNoise: null,
            triggerConditionMet: false,
            isTriggered: false,
            triggeredByUserId: null,
            triggeredAtUtc: null,
            triggerReason: null,
            createdAtUtc: now,
            updatedAtUtc: now,
          },
        ],
        analystAcceptanceRate: 0.6,
      },
      [ids.secondaryCase]: {
        caseId: ids.secondaryCase,
        proposals: [],
        recommendations: [],
        rolloutPlans: [],
        rollbackPlans: [],
        analystAcceptanceRate: 0,
      },
    },
  }
}

function responseJson(route, status, payload) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  })
}

function readBody(route) {
  const raw = route.request().postData()
  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function resolveCaseId(pathname) {
  return pathname.split("/").at(-1)
}

function resolveCaseIdFromPrefix(pathname, prefix) {
  const value = pathname.replace(prefix, "")
  return value.split("/")[0]
}

export async function bootstrapSession(page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "cti.workbench.session.v1",
      JSON.stringify({
        token: "test-token",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        userId: "test-user",
        username: "analyst",
        roles: ["Analyst", "Lead", "Admin"],
      }),
    )
  })
}

export async function clearSession(page) {
  await page.addInitScript(() => {
    window.sessionStorage.removeItem("cti.workbench.session.v1")
  })
}

export async function mockWorkbenchApi(page, options = {}) {
  const authReject = Boolean(options.authReject)
  const state = createState()

  await page.route("**/api/**", async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const { pathname } = url

    if (pathname === "/api/auth/token" && method === "POST") {
      if (authReject) {
        return responseJson(route, 401, { detail: "Invalid username or password." })
      }

      return responseJson(route, 200, {
        accessToken: authToken,
        expiresAtUtc: "2099-01-01T00:00:00Z",
        tokenType: "Bearer",
      })
    }

    if (pathname === "/api/cases" && method === "GET") {
      return responseJson(route, 200, state.cases)
    }

    if (pathname.startsWith("/api/cases/") && method === "GET") {
      const caseId = resolveCaseId(pathname)
      const item = state.cases.find((entry) => entry.id === caseId)
      if (!item) {
        return responseJson(route, 404, { detail: "Case not found" })
      }

      return responseJson(route, 200, item)
    }

    if (pathname.startsWith("/api/evidence/case/") && method === "GET") {
      const caseId = resolveCaseIdFromPrefix(pathname, "/api/evidence/case/")
      return responseJson(route, 200, state.evidenceByCase[caseId] ?? [])
    }

    if (pathname.startsWith("/api/decisions/case/") && method === "GET") {
      const caseId = resolveCaseIdFromPrefix(pathname, "/api/decisions/case/")
      return responseJson(route, 200, state.decisionsByCase[caseId] ?? [])
    }

    if (pathname.startsWith("/api/rules/case/") && method === "GET") {
      return responseJson(route, 200, [])
    }

    if (pathname.startsWith("/api/deployments/case/") && method === "GET") {
      const caseId = resolveCaseIdFromPrefix(pathname, "/api/deployments/case/")
      return responseJson(route, 200, state.deploymentsByCase[caseId] ?? [])
    }

    if (pathname.startsWith("/api/feedback/case/") && method === "GET") {
      const caseId = resolveCaseIdFromPrefix(pathname, "/api/feedback/case/")
      return responseJson(route, 200, state.feedbackByCase[caseId] ?? [])
    }

    if (pathname.startsWith("/api/rule-workflow/cases/") && method === "GET") {
      const caseId = resolveCaseIdFromPrefix(pathname, "/api/rule-workflow/cases/")
      const workflow = state.workflowByCase[caseId]
      if (!workflow) {
        return responseJson(route, 404, { detail: "Workflow not found" })
      }

      return responseJson(route, 200, workflow)
    }

    if (pathname === "/api/rule-workflow/proposals" && method === "POST") {
      const body = readBody(route)
      const workflow = state.workflowByCase[body.caseId]
      if (!workflow) {
        return responseJson(route, 404, { detail: "Workflow not found" })
      }

      const proposal = {
        id: "30bf0707-0cb9-4c28-8a00-703641d8e8fe",
        caseId: body.caseId,
        proposalName: body.proposalName,
        ruleFamily: body.ruleFamily,
        ruleBody: body.ruleBody,
        proposedVersion: body.proposedVersion,
        proposedByUserId: body.proposedByUserId,
        rationale: body.rationale,
        policyRiskScore: body.policyRiskScore ?? 0.5,
        status: "Proposed",
        reviewedByUserId: null,
        reviewedAtUtc: null,
        reviewReason: null,
        overrideReason: null,
        createdAtUtc: now,
        updatedAtUtc: now,
      }

      workflow.proposals.unshift(proposal)
      return responseJson(route, 201, proposal)
    }

    if (pathname.startsWith("/api/rule-workflow/proposals/") && pathname.endsWith("/review") && method === "PATCH") {
      const proposalId = pathname.split("/")[4]
      const body = readBody(route)
      const workflow = Object.values(state.workflowByCase).find((entry) =>
        entry.proposals.some((proposal) => proposal.id === proposalId),
      )

      if (!workflow) {
        return responseJson(route, 404, { detail: "Proposal not found" })
      }

      const proposal = workflow.proposals.find((item) => item.id === proposalId)
      proposal.status = body.decision === "accept" ? "Accepted" : "Rejected"
      proposal.reviewedByUserId = body.reviewerUserId
      proposal.reviewedAtUtc = later
      proposal.reviewReason = body.reviewReason ?? null
      proposal.overrideReason = body.overrideReason ?? null
      proposal.updatedAtUtc = later
      return responseJson(route, 200, proposal)
    }

    if (pathname.startsWith("/api/rule-workflow/proposals/") && pathname.endsWith("/simulate") && method === "POST") {
      const proposalId = pathname.split("/")[4]
      const workflow = Object.values(state.workflowByCase).find((entry) =>
        entry.proposals.some((proposal) => proposal.id === proposalId),
      )
      if (!workflow) {
        return responseJson(route, 404, { detail: "Proposal not found" })
      }

      const proposal = workflow.proposals.find((item) => item.id === proposalId)
      const recommendation = workflow.recommendations[0]
      const rolloutPlan = workflow.rolloutPlans[0]
      const rollbackPlan = workflow.rollbackPlans[0]

      return responseJson(route, 200, {
        proposal,
        recommendation,
        rolloutPlan,
        rollbackPlan,
      })
    }

    if (pathname.startsWith("/api/rule-workflow/rollouts/") && pathname.endsWith("/stage") && method === "PATCH") {
      const rolloutId = pathname.split("/")[4]
      const body = readBody(route)
      const workflow = Object.values(state.workflowByCase).find((entry) =>
        entry.rolloutPlans.some((rollout) => rollout.id === rolloutId),
      )
      if (!workflow) {
        return responseJson(route, 404, { detail: "Rollout plan not found" })
      }

      const rollout = workflow.rolloutPlans.find((item) => item.id === rolloutId)
      rollout.currentStage = body.stage
      rollout.lastStageReason = body.reason
      rollout.lastOverrideReason = body.overrideReason ?? null
      rollout.updatedAtUtc = later
      if (body.stage === "rollback") {
        rollout.rolledBackAtUtc = later
      }

      return responseJson(route, 200, rollout)
    }

    if (pathname.startsWith("/api/rule-workflow/rollouts/") && pathname.endsWith("/canary-observation") && method === "PATCH") {
      const rolloutId = pathname.split("/")[4]
      const body = readBody(route)
      const workflow = Object.values(state.workflowByCase).find((entry) =>
        entry.rolloutPlans.some((rollout) => rollout.id === rolloutId),
      )
      if (!workflow) {
        return responseJson(route, 404, { detail: "Rollout plan not found" })
      }

      const rollout = workflow.rolloutPlans.find((item) => item.id === rolloutId)
      const reviewed = Number(body.analystReviewedCount ?? 0)
      const accepted = Number(body.analystAcceptedCount ?? 0)

      rollout.observedNoise = Number(body.observedNoise)
      rollout.observedNoiseDelta = Number((rollout.observedNoise - rollout.predictedNoise).toFixed(2))
      rollout.analystAcceptanceRate = reviewed > 0 ? Number((accepted / reviewed).toFixed(2)) : 0
      rollout.updatedAtUtc = later
      workflow.analystAcceptanceRate = rollout.analystAcceptanceRate

      const rollback = workflow.rollbackPlans.find((item) => item.rolloutPlanId === rollout.id)
      if (rollback) {
        rollback.lastObservedNoise = rollout.observedNoise
        rollback.triggerConditionMet = rollout.observedNoise > rollback.predictedNoiseThreshold
        rollback.updatedAtUtc = later
      }

      return responseJson(route, 200, rollout)
    }

    if (pathname.startsWith("/api/rule-workflow/rollbacks/") && pathname.endsWith("/trigger") && method === "POST") {
      const rollbackId = pathname.split("/")[4]
      const body = readBody(route)
      const workflow = Object.values(state.workflowByCase).find((entry) =>
        entry.rollbackPlans.some((rollback) => rollback.id === rollbackId),
      )
      if (!workflow) {
        return responseJson(route, 404, { detail: "Rollback plan not found" })
      }

      const rollback = workflow.rollbackPlans.find((item) => item.id === rollbackId)
      rollback.isTriggered = true
      rollback.triggerConditionMet = true
      rollback.triggeredByUserId = body.actorUserId
      rollback.triggeredAtUtc = later
      rollback.triggerReason = body.reason
      rollback.lastObservedNoise = body.observedNoise ?? rollback.lastObservedNoise
      rollback.updatedAtUtc = later

      const rollout = workflow.rolloutPlans.find((item) => item.id === rollback.rolloutPlanId)
      if (rollout) {
        rollout.currentStage = "rollback"
        rollout.rolledBackAtUtc = later
        rollout.lastStageReason = body.reason
        rollout.updatedAtUtc = later
      }

      return responseJson(route, 200, rollback)
    }

    return responseJson(route, 404, { detail: `No mock for ${method} ${pathname}` })
  })
}
