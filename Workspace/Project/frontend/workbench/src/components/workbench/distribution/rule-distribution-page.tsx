"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { classifyUiError } from "@/shared/api/error-classification"
import type { RuleListItem, RuleDistributionJobResponse } from "@/shared/api/schemas"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway } from "@/shared/gateway"
import type { CreateDistributionJobInput, DistributionJobFilters, RetryDistributionJobInput } from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const JOB_STATUS_FILTERS = ["Queued", "Running", "Retrying", "Succeeded", "Partial", "Failed", "Canceled"]

function formatTime(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Date(value).toLocaleString()
}

function isRetryCandidate(job: RuleDistributionJobResponse) {
  return (job.status === "Failed" || job.status === "Partial") && job.attemptCount < job.maxAttempts
}

function toUtcDateWindowStart(value: string) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function toUtcDateWindowEnd(value: string) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T23:59:59.999`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

type RuleDistributionPageProps = {
  embedded?: boolean
}

export function RuleDistributionPage({ embedded = false }: RuleDistributionPageProps) {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const sessionOperatorUserId = session?.userId ?? session?.username ?? ""

  const [selectedRuleId, setSelectedRuleId] = useState("")
  const [selectedTargetIds, setSelectedTargetIds] = useState<Record<string, boolean>>({})
  const [selectedGroupIds, setSelectedGroupIds] = useState<Record<string, boolean>>({})
  const [operatorUserId, setOperatorUserId] = useState(sessionOperatorUserId)
  const [notes, setNotes] = useState("")
  const [maxAttempts, setMaxAttempts] = useState("5")
  const [createError, setCreateError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState("")
  const [operatorFilter, setOperatorFilter] = useState("")
  const [ruleFamilyFilter, setRuleFamilyFilter] = useState("")
  const [targetFilter, setTargetFilter] = useState("")
  const [groupFilter, setGroupFilter] = useState("")
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const resolvedOperatorUserId = operatorUserId.trim()

  useEffect(() => {
    setOperatorUserId(sessionOperatorUserId)
  }, [sessionOperatorUserId])

  const ruleListQuery = useWorkbenchQuery(
    ["distribution", "rules"],
    (signal) => gateway.listRuleRepository({ page: 1, pageSize: 200, sort: "updated_desc" }, signal),
  )

  const targetServersQuery = useWorkbenchQuery(["distribution", "target-servers"], (signal) => gateway.listTargetServers(undefined, signal))
  const targetGroupsQuery = useWorkbenchQuery(["distribution", "target-groups"], (signal) => gateway.listTargetGroups(signal))

  const selectedRuleDetailQuery = useWorkbenchQuery(
    ["distribution", "rule-detail", selectedRuleId],
    (signal) => gateway.getRuleDetail(selectedRuleId, signal),
    { enabled: selectedRuleId.length > 0 },
  )

  const filters = useMemo<DistributionJobFilters>(() => {
    const mapped: DistributionJobFilters = {
      take: 200,
    }
    if (statusFilter) {
      mapped.status = statusFilter
    }
    if (operatorFilter) {
      mapped.operatorUserId = operatorFilter.trim()
    }
    if (ruleFamilyFilter) {
      mapped.ruleFamily = ruleFamilyFilter.trim().toLowerCase()
    }
    if (targetFilter) {
      mapped.targetServerId = targetFilter
    }
    if (groupFilter) {
      mapped.targetGroupId = groupFilter
    }
    const queuedFromUtc = toUtcDateWindowStart(fromFilter)
    if (queuedFromUtc) {
      mapped.queuedFromUtc = queuedFromUtc
    }
    const queuedToUtc = toUtcDateWindowEnd(toFilter)
    if (queuedToUtc) {
      mapped.queuedToUtc = queuedToUtc
    }
    return mapped
  }, [fromFilter, groupFilter, operatorFilter, ruleFamilyFilter, statusFilter, targetFilter, toFilter])

  const jobsQuery = useWorkbenchQuery(
    ["distribution", "jobs", filters],
    (signal) => gateway.listDistributionJobs(filters, signal),
    { refetchInterval: 10000 },
  )

  const selectedJobAttemptsQuery = useWorkbenchQuery(
    ["distribution", "job", selectedJobId, "attempts"],
    (signal) => gateway.listDistributionJobAttempts(selectedJobId as string, signal),
    { enabled: selectedJobId !== null, refetchInterval: 10000 },
  )

  const selectedJobTargetsQuery = useWorkbenchQuery(
    ["distribution", "job", selectedJobId, "targets"],
    (signal) => gateway.listDistributionJobTargets(selectedJobId as string, signal),
    { enabled: selectedJobId !== null, refetchInterval: 10000 },
  )

  const selectedJob = (jobsQuery.data ?? []).find((job) => job.id === selectedJobId) ?? null

  useEffect(() => {
    const jobs = jobsQuery.data ?? []
    if (jobs.length === 0) {
      if (selectedJobId !== null) {
        setSelectedJobId(null)
      }
      return
    }

    if (selectedJobId && jobs.some((job) => job.id === selectedJobId)) {
      return
    }

    setSelectedJobId(jobs[0].id)
  }, [jobsQuery.data, selectedJobId])

  const createMutation = useMutation({
    mutationFn: async () => {
      const selectedTargetServerIds = Object.entries(selectedTargetIds)
        .filter(([, selected]) => selected)
        .map(([id]) => id)
      const selectedTargetGroupIds = Object.entries(selectedGroupIds)
        .filter(([, selected]) => selected)
        .map(([id]) => id)

      if (selectedTargetServerIds.length === 0 && selectedTargetGroupIds.length === 0) {
        throw new Error("Select at least one target server or target group.")
      }

      const revisionId = selectedRuleDetailQuery.data?.currentRevision.id
      if (!revisionId) {
        throw new Error("Select a rule and wait for current revision to load.")
      }

      const parsedMaxAttempts = Number.parseInt(maxAttempts, 10)
      const payload: CreateDistributionJobInput = {
        ruleRevisionId: revisionId,
        targetServerIds: selectedTargetServerIds,
        targetGroupIds: selectedTargetGroupIds,
        operatorUserId: resolvedOperatorUserId,
        notes: notes.trim() || undefined,
        maxAttempts: Number.isFinite(parsedMaxAttempts) ? parsedMaxAttempts : undefined,
      }

      return gateway.createDistributionJob(payload)
    },
    onSuccess: async (job) => {
      setCreateError(null)
      setSelectedJobId(job.id)
      setNotes("")
      await queryClient.invalidateQueries({ queryKey: ["distribution", "jobs"] })
    },
    onError: (error) => {
      setCreateError(classifyUiError(error).message)
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const payload: RetryDistributionJobInput = {
        actorUserId: resolvedOperatorUserId,
        notes: `Manual retry requested by ${resolvedOperatorUserId || "operator"}.`,
      }
      return gateway.retryDistributionJob(jobId, payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["distribution", "jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["distribution", "job"] }),
      ])
    },
  })

  if (ruleListQuery.isLoading || targetServersQuery.isLoading || targetGroupsQuery.isLoading || jobsQuery.isLoading) {
    return <LoadingState label="Loading distribution workflow" />
  }

  if (ruleListQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(ruleListQuery.error)} fallbackTitle="Rule distribution unavailable" />
  }
  if (targetServersQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(targetServersQuery.error)} fallbackTitle="Rule distribution unavailable" />
  }
  if (targetGroupsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(targetGroupsQuery.error)} fallbackTitle="Rule distribution unavailable" />
  }
  if (jobsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(jobsQuery.error)} fallbackTitle="Rule distribution unavailable" />
  }

  const rules = ruleListQuery.data?.items ?? []
  const targetServers = targetServersQuery.data ?? []
  const targetGroups = targetGroupsQuery.data ?? []
  const jobs = jobsQuery.data ?? []

  return (
    <section className={embedded ? "space-y-4" : "wb-page space-y-4"}>
      {embedded ? (
        <article className="wb-panel space-y-2">
          <p className="wb-kicker">Rule Distribution</p>
          <h3 className="text-sm font-semibold tracking-tight">Distribution workflow inside rules management</h3>
          <p className="text-xs text-muted-foreground">
            Live distribution jobs, per-target execution state, and retry controls stay with the rest of the rule lifecycle.
          </p>
        </article>
      ) : (
        <header className="wb-page-header">
          <p className="wb-kicker">Rule Distribution</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Live distribution jobs and per-target execution state</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This workflow is backed only by persisted distribution jobs, attempts, and target outcomes from the backend.
          </p>
        </header>
      )}

      <article className="wb-panel space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">Create Distribution Job</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="wb-kicker">Rule</span>
            <select
              value={selectedRuleId}
              onChange={(event) => setSelectedRuleId(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">Select rule</option>
              {rules.map((rule: RuleListItem) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} ({rule.ruleFamily}) r{rule.currentRevisionNumber}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Operator</span>
            <Input value={operatorUserId} onChange={(event) => setOperatorUserId(event.target.value)} placeholder="Current session or operator id" />
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Max Attempts</span>
            <Input value={maxAttempts} onChange={(event) => setMaxAttempts(event.target.value)} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3">
            <p className="wb-kicker">Target Servers</p>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {targetServers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No target servers available.</p>
              ) : (
                targetServers.map((server) => (
                  <label key={server.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>{server.hostname} ({server.ipAddress})</span>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedTargetIds[server.id])}
                      onChange={(event) =>
                        setSelectedTargetIds((current) => ({
                          ...current,
                          [server.id]: event.target.checked,
                        }))
                      }
                    />
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3">
            <p className="wb-kicker">Target Groups</p>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {targetGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">No target groups available.</p>
              ) : (
                targetGroups.map((group) => (
                  <label key={group.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>{group.name} ({group.memberCount})</span>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedGroupIds[group.id])}
                      onChange={(event) =>
                        setSelectedGroupIds((current) => ({
                          ...current,
                          [group.id]: event.target.checked,
                        }))
                      }
                    />
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <label className="space-y-1">
          <span className="wb-kicker">Notes</span>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional distribution notes" />
        </label>

        <p className="text-xs text-muted-foreground">
          Current revision id: {selectedRuleDetailQuery.data?.currentRevision.id ?? "Select a rule to resolve revision id"}
        </p>

        {createError ? <p className="text-xs text-destructive">{createError}</p> : null}
        {resolvedOperatorUserId.length === 0 ? <p className="text-xs text-amber-200">Provide an operator identity before creating or retrying distribution jobs.</p> : null}

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || resolvedOperatorUserId.length === 0}>
            {createMutation.isPending ? "Creating..." : "Create Distribution Job"}
          </Button>
        </div>
      </article>

      <article className="wb-panel space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">Job Filters</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="wb-kicker">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All</option>
              {JOB_STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Operator</span>
            <Input value={operatorFilter} onChange={(event) => setOperatorFilter(event.target.value)} />
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Rule Family</span>
            <Input value={ruleFamilyFilter} onChange={(event) => setRuleFamilyFilter(event.target.value)} placeholder="yara/sigma/snort/suricata" />
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Target Server</span>
            <select
              value={targetFilter}
              onChange={(event) => setTargetFilter(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All</option>
              {targetServers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.hostname}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Target Group</span>
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All</option>
              {targetGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Queued From</span>
            <Input type="date" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} />
          </label>

          <label className="space-y-1">
            <span className="wb-kicker">Queued To</span>
            <Input type="date" value={toFilter} onChange={(event) => setToFilter(event.target.value)} />
          </label>
        </div>
      </article>

      <article className="wb-panel space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Distribution Jobs</h3>
          <p className="text-xs text-muted-foreground">Rows: {jobs.length}</p>
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            title="No distribution jobs"
            description="Create a distribution job to start real execution and per-target tracking."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/75 bg-surface-1/90">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Queued</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className={selectedJobId === job.id ? "bg-surface-2/50" : ""} onClick={() => setSelectedJobId(job.id)}>
                    <TableCell><StatusBadge value={job.status} /></TableCell>
                    <TableCell>{job.ruleFamily} r{job.revisionNumber}</TableCell>
                    <TableCell>{job.operatorUserId}</TableCell>
                    <TableCell>{job.successfulTargets}/{job.totalTargets}</TableCell>
                    <TableCell>{job.attemptCount}/{job.maxAttempts}</TableCell>
                    <TableCell>{formatTime(job.queuedAtUtc)}</TableCell>
                    <TableCell>{formatTime(job.completedAtUtc)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </article>

      <article className="wb-panel space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Job Drill-Down</h3>
          {selectedJob && isRetryCandidate(selectedJob) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => retryMutation.mutate(selectedJob.id)}
              disabled={retryMutation.isPending || resolvedOperatorUserId.length === 0}
            >
              {retryMutation.isPending ? "Retrying..." : "Retry Unresolved Targets"}
            </Button>
          ) : null}
        </div>

        {!selectedJobId ? (
          <EmptyState title="No job selected" description="Select a job row to inspect attempts and per-target outcomes." />
        ) : selectedJobAttemptsQuery.isLoading || selectedJobTargetsQuery.isLoading ? (
          <LoadingState label="Loading job detail" />
        ) : selectedJobAttemptsQuery.isError ? (
          <ClassifiedFailureState failure={classifyUiError(selectedJobAttemptsQuery.error)} fallbackTitle="Job detail unavailable" />
        ) : selectedJobTargetsQuery.isError ? (
          <ClassifiedFailureState failure={classifyUiError(selectedJobTargetsQuery.error)} fallbackTitle="Job detail unavailable" />
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-5">
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs">Success: {selectedJob?.successfulTargets ?? 0}</div>
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs">Failure: {selectedJob?.failedTargets ?? 0}</div>
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs">Unreachable: {selectedJob?.unreachableTargets ?? 0}</div>
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs">Validation Failed: {selectedJob?.validationFailedTargets ?? 0}</div>
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs">Partially Applied: {selectedJob?.partiallyAppliedTargets ?? 0}</div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3">
              <p className="wb-kicker">Attempt Timeline</p>
              {(selectedJobAttemptsQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No attempts recorded.</p>
              ) : (
                (selectedJobAttemptsQuery.data ?? []).map((attempt) => (
                  <div key={attempt.id} className="rounded-md border border-border/60 bg-surface-1/85 p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Attempt #{attempt.attemptNumber}</span>
                      <StatusBadge value={attempt.status} />
                      <span>Started: {formatTime(attempt.startedAtUtc)}</span>
                      <span>Completed: {formatTime(attempt.completedAtUtc)}</span>
                      {attempt.backoffSeconds !== null ? <span>Backoff: {attempt.backoffSeconds}s</span> : null}
                    </div>
                    <p className="mt-1 text-muted-foreground">{attempt.summary}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3">
              <p className="wb-kicker">Per-Target Outcomes</p>
              {(selectedJobTargetsQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No target outcomes recorded.</p>
              ) : (
                <div className="space-y-2">
                  {(selectedJobTargetsQuery.data ?? []).map((target) => (
                    <div key={target.id} className="rounded-md border border-border/60 bg-surface-1/85 p-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{target.targetHostname} ({target.targetIpAddress})</p>
                          <p className="text-muted-foreground">Attempts: {target.attemptCount} | Last Attempt: {formatTime(target.lastAttemptAtUtc)}</p>
                        </div>
                        <StatusBadge value={target.status} />
                      </div>
                      {target.lastError ? <p className="mt-1 text-destructive">{target.lastError}</p> : null}
                      <div className="mt-2 space-y-1">
                        {target.attempts.map((attempt) => (
                          <div key={attempt.id} className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <StatusBadge value={attempt.status} />
                            <span>Transport: {attempt.transport}</span>
                            <span>Completed: {formatTime(attempt.completedAtUtc)}</span>
                            {attempt.diagnostic ? <span>Detail: {attempt.diagnostic}</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </article>
    </section>
  )
}
