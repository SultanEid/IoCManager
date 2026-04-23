import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/shared/api/error"
import { RuleDistributionPage } from "@/components/workbench/distribution/rule-distribution-page"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    }),
    useMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    }),
  }
})

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: "lead-1",
      username: "lead-1",
      roles: ["Lead"],
    },
  }),
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {
    listRuleRepository: vi.fn(),
    listTargetServers: vi.fn(),
    listTargetGroups: vi.fn(),
    getRuleDetail: vi.fn(),
    listDistributionJobs: vi.fn(),
    listDistributionJobAttempts: vi.fn(),
    listDistributionJobTargets: vi.fn(),
    createDistributionJob: vi.fn(),
    retryDistributionJob: vi.fn(),
  },
}))

function success(data: unknown) {
  return {
    isLoading: false,
    isError: false,
    data,
    error: null,
  }
}

function failure(error: unknown) {
  return {
    isLoading: false,
    isError: true,
    data: null,
    error,
  }
}

const ruleId = "11111111-1111-1111-1111-111111111111"
const revisionId = "22222222-2222-2222-2222-222222222222"
const serverId = "33333333-3333-3333-3333-333333333333"
const groupId = "44444444-4444-4444-4444-444444444444"
const jobIdRunning = "55555555-5555-5555-5555-555555555555"
const jobIdFailed = "66666666-6666-6666-6666-666666666666"

const baseRuleList = {
  items: [
    {
      id: ruleId,
      name: "Suspicious DNS",
      ruleFamily: "yara",
      source: "lab",
      description: "Detect suspicious DNS behavior",
      tags: ["dns"],
      severity: "medium",
      status: "approved",
      scopeType: "global",
      scopeValue: null,
      currentRevisionNumber: 3,
      currentVersionLabel: "v3",
      isDeleted: false,
      createdAtUtc: "2026-04-11T01:00:00Z",
      updatedAtUtc: "2026-04-11T01:00:00Z",
      createdByUserId: "lead-1",
      updatedByUserId: "lead-1",
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 200,
}

const baseRuleDetail = {
  rule: baseRuleList.items[0],
  currentRevision: {
    id: revisionId,
    ruleArtifactId: "77777777-7777-7777-7777-777777777777",
    revisionNumber: 3,
    versionLabel: "v3",
    originalContent: "rule body",
    metadataJson: "{}",
    changeType: "updated",
    changeReason: null,
    status: "approved",
    validation: {
      canPersist: true,
      isDeploymentReady: true,
      evaluatedAtUtc: "2026-04-11T01:00:00Z",
      stages: [],
    },
    ruleImportAttemptId: null,
    createdAtUtc: "2026-04-11T01:00:00Z",
    createdByUserId: "lead-1",
  },
  revisions: [],
  importAttempts: [],
}

const baseTargetServers = [
  {
    id: serverId,
    subnetId: "88888888-8888-8888-8888-888888888888",
    hostname: "srv-dist-01",
    ipAddress: "10.10.1.50",
    operatingSystem: "Linux",
    environment: "lab",
    status: "Active",
    createdAtUtc: "2026-04-11T01:00:00Z",
    updatedAtUtc: "2026-04-11T01:00:00Z",
  },
]

const baseTargetGroups = [
  {
    id: groupId,
    name: "Lab Group",
    description: "Lab targets",
    isEnabled: true,
    memberCount: 1,
    createdAtUtc: "2026-04-11T01:00:00Z",
    updatedAtUtc: "2026-04-11T01:00:00Z",
  },
]

const runningJob = {
  id: jobIdRunning,
  ruleRevisionId: revisionId,
  ruleFamily: "yara",
  revisionNumber: 3,
  versionLabel: "v3",
  status: "Running",
  operatorUserId: "lead-1",
  attemptCount: 1,
  maxAttempts: 5,
  totalTargets: 2,
  successfulTargets: 1,
  failedTargets: 0,
  unreachableTargets: 0,
  validationFailedTargets: 0,
  partiallyAppliedTargets: 1,
  queuedAtUtc: "2026-04-11T02:00:00Z",
  startedAtUtc: "2026-04-11T02:00:10Z",
  completedAtUtc: null,
  nextAttemptAtUtc: null,
  summary: "attempt in progress",
  notes: "note",
  createdAtUtc: "2026-04-11T02:00:00Z",
  updatedAtUtc: "2026-04-11T02:00:10Z",
}

const failedJob = {
  id: jobIdFailed,
  ruleRevisionId: revisionId,
  ruleFamily: "sigma",
  revisionNumber: 6,
  versionLabel: "v6",
  status: "Failed",
  operatorUserId: "lead-2",
  attemptCount: 5,
  maxAttempts: 5,
  totalTargets: 1,
  successfulTargets: 0,
  failedTargets: 1,
  unreachableTargets: 0,
  validationFailedTargets: 0,
  partiallyAppliedTargets: 0,
  queuedAtUtc: "2026-04-11T03:00:00Z",
  startedAtUtc: "2026-04-11T03:00:10Z",
  completedAtUtc: "2026-04-11T03:03:10Z",
  nextAttemptAtUtc: null,
  summary: "all failed",
  notes: "failed",
  createdAtUtc: "2026-04-11T03:00:00Z",
  updatedAtUtc: "2026-04-11T03:03:10Z",
}

type QueryState = {
  jobs?: unknown[]
  jobsError?: unknown
  jobsResolver?: (filters: { status?: string; queuedFromUtc?: string; queuedToUtc?: string }) => unknown[]
  attemptsByJobId?: Record<string, unknown[]>
  targetsByJobId?: Record<string, unknown[]>
}

function setQueryState(state: QueryState) {
  mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
    const key = Array.isArray(queryKey) ? String(queryKey[1]) : ""

    if (key === "rules") {
      return success(baseRuleList)
    }

    if (key === "target-servers") {
      return success(baseTargetServers)
    }

    if (key === "target-groups") {
      return success(baseTargetGroups)
    }

    if (key === "rule-detail") {
      return success(baseRuleDetail)
    }

    if (key === "jobs") {
      if (state.jobsError) {
        return failure(state.jobsError)
      }

      const filters = Array.isArray(queryKey) ? (queryKey[2] as { status?: string; queuedFromUtc?: string; queuedToUtc?: string }) : {}
      if (state.jobsResolver) {
        return success(state.jobsResolver(filters))
      }

      return success(state.jobs ?? [])
    }

    if (key === "job") {
      const selectedJobId = Array.isArray(queryKey) ? String(queryKey[2] ?? "") : ""
      const detailKind = Array.isArray(queryKey) ? String(queryKey[3] ?? "") : ""

      if (detailKind === "attempts") {
        return success(state.attemptsByJobId?.[selectedJobId] ?? [])
      }

      if (detailKind === "targets") {
        return success(state.targetsByJobId?.[selectedJobId] ?? [])
      }
    }

    return success([])
  })
}

describe("RuleDistributionPage", () => {
  beforeEach(() => {
    mockedUseWorkbenchQuery.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders loading state while queries are in flight", () => {
    mockedUseWorkbenchQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      data: null,
      error: null,
    })

    render(<RuleDistributionPage />)

    expect(screen.getByText("Loading distribution workflow...")).toBeInTheDocument()
  })

  it("renders dependency-down fallback for backend dependency errors", () => {
    setQueryState({
      jobsError: new ApiError("Dependency Temporarily Unavailable", 503, null, {
        title: "Dependency Temporarily Unavailable",
        detail: "Database unavailable",
        dependency: "database",
        dependencyType: "required",
        condition: "temporarily_unavailable",
        retryable: true,
      }),
    })

    render(<RuleDistributionPage />)

    expect(screen.getByText("Dependency down")).toBeInTheDocument()
  })

  it("renders empty state when no persisted jobs are available", () => {
    setQueryState({ jobs: [] })

    render(<RuleDistributionPage />)

    expect(screen.getByText("No distribution jobs")).toBeInTheDocument()
  })

  it("updates job rows deterministically when status filter changes", () => {
    setQueryState({
      jobsResolver: (filters) => (filters.status === "Failed" ? [failedJob] : [runningJob]),
      attemptsByJobId: {
        [jobIdRunning]: [],
        [jobIdFailed]: [],
      },
      targetsByJobId: {
        [jobIdRunning]: [],
        [jobIdFailed]: [],
      },
    })

    render(<RuleDistributionPage />)

    expect(screen.getByText("yara r3")).toBeInTheDocument()
    expect(screen.queryByText("sigma r6")).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Failed" } })

    expect(screen.getByText("sigma r6")).toBeInTheDocument()
    expect(screen.queryByText("yara r3")).not.toBeInTheDocument()
  })

  it("renders attempt timeline and per-target outcomes in drill-down", async () => {
    setQueryState({
      jobs: [runningJob],
      attemptsByJobId: {
        [jobIdRunning]: [
          {
            id: "99999999-9999-9999-9999-999999999999",
            ruleDistributionJobId: jobIdRunning,
            attemptNumber: 2,
            status: "Partial",
            startedAtUtc: "2026-04-11T02:05:00Z",
            completedAtUtc: "2026-04-11T02:05:30Z",
            backoffSeconds: 30,
            triggeredByUserId: "lead-1",
            summary: "One target partially applied",
            createdAtUtc: "2026-04-11T02:05:00Z",
            updatedAtUtc: "2026-04-11T02:05:30Z",
          },
        ],
      },
      targetsByJobId: {
        [jobIdRunning]: [
          {
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            ruleDistributionJobId: jobIdRunning,
            targetServerId: serverId,
            targetHostname: "srv-lab-01",
            targetIpAddress: "10.10.1.51",
            status: "PartiallyApplied",
            isRetryable: true,
            attemptCount: 2,
            lastError: "Connector partial apply",
            lastAttemptAtUtc: "2026-04-11T02:05:30Z",
            succeededAtUtc: null,
            createdAtUtc: "2026-04-11T02:00:00Z",
            updatedAtUtc: "2026-04-11T02:05:30Z",
            attempts: [
              {
                id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                ruleDistributionAttemptId: "99999999-9999-9999-9999-999999999999",
                ruleDistributionTargetId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                status: "PartiallyApplied",
                transport: "agent-http",
                remoteCorrelationId: "corr-123",
                diagnostic: "Connector partial apply",
                isRetryable: true,
                startedAtUtc: "2026-04-11T02:05:00Z",
                completedAtUtc: "2026-04-11T02:05:30Z",
                createdAtUtc: "2026-04-11T02:05:30Z",
                updatedAtUtc: "2026-04-11T02:05:30Z",
              },
            ],
          },
        ],
      },
    })

    render(<RuleDistributionPage />)

    await waitFor(() => {
      expect(screen.getByText("Attempt #2")).toBeInTheDocument()
    })

    expect(screen.getByText("srv-lab-01 (10.10.1.51)")).toBeInTheDocument()
    expect(screen.getByText("Partially Applied: 1")).toBeInTheDocument()
    expect(screen.getByText("Detail: Connector partial apply")).toBeInTheDocument()
  })
})
