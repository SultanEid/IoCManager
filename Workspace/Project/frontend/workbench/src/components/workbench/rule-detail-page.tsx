"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { RuleValidationPanel } from "@/components/workbench/rule-validation-panel"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { LoadingState, EmptyState } from "@/shared/ui/state-panels"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function RuleDetailPage({ ruleId }: { ruleId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const sessionActorUserId = useMemo(() => session?.userId ?? session?.username ?? "", [session?.userId, session?.username])
  const [actorUserId, setActorUserId] = useState(sessionActorUserId)
  const [restoreStatus, setRestoreStatus] = useState("draft")
  const resolvedActorUserId = actorUserId.trim()
  const isRuleIdFormatValid = isUuid(ruleId)

  useEffect(() => {
    setActorUserId(sessionActorUserId)
  }, [sessionActorUserId])

  const detailQuery = useWorkbenchQuery(
    ["rules-repository", "detail", ruleId],
    (signal) => gateway.getRuleDetail(ruleId, signal),
    { enabled: isRuleIdFormatValid },
  )

  const archiveMutation = useMutation({
    mutationFn: () => gateway.archiveRule(ruleId, { actorUserId: resolvedActorUserId, changeReason: "manual archive" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rules-repository"] })
      void queryClient.invalidateQueries({ queryKey: ["rules-repository", "detail", ruleId] })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () => gateway.restoreRule(ruleId, { actorUserId: resolvedActorUserId, restoredStatus: restoreStatus, changeReason: "manual restore" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rules-repository"] })
      void queryClient.invalidateQueries({ queryKey: ["rules-repository", "detail", ruleId] })
    },
  })

  if (!isRuleIdFormatValid) {
    return (
      <section className="wb-page space-y-6">
        <div className="wb-panel flex flex-col items-center justify-center gap-3 border border-primary/18 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-1)_94%,transparent),color-mix(in_srgb,var(--background)_90%,transparent))] py-16 text-center">
          <p className="wb-kicker text-primary/90">Rule Detail</p>
          <h2 className="text-lg font-semibold tracking-tight">Invalid rule link</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            This rule route does not contain a complete rule identifier. Return to the repository and open the rule from the current inventory.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push("/rules")}>
            Back to repository
          </Button>
        </div>
      </section>
    )
  }

  if (detailQuery.isLoading) {
    return <LoadingState label="Loading rule detail" />
  }

  if (detailQuery.isError) {
    return (
      <section className="wb-page space-y-4">
        <ClassifiedFailureState failure={classifyUiError(detailQuery.error)} fallbackTitle="Rule detail unavailable" />
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => router.push("/rules")}>
            Back to repository
          </Button>
          <Button type="button" size="sm" onClick={() => void detailQuery.refetch()}>
            Try again
          </Button>
        </div>
      </section>
    )
  }

  const detail = detailQuery.data
  if (!detail) {
    return <EmptyState title="Rule not found" description="Requested rule id does not exist or is no longer accessible." />
  }

  const rule = detail.rule
  const currentRevision = detail.currentRevision

  return (
    <section className="wb-page space-y-6">
      <header className="wb-page-header">
        <p className="wb-kicker">Rule Detail</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{rule.name}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge value={rule.ruleFamily} />
          <StatusBadge value={rule.status} />
          <span className="text-sm text-muted-foreground">{rule.source}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => router.push("/rules")}>Back to repository</Button>
          {!rule.isDeleted ? (
            <Button type="button" size="sm" variant="destructive" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending || resolvedActorUserId.length === 0}>
              {archiveMutation.isPending ? "Archiving..." : "Archive"}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => restoreMutation.mutate()} disabled={restoreMutation.isPending || resolvedActorUserId.length === 0}>
              {restoreMutation.isPending ? "Restoring..." : "Restore"}
            </Button>
          )}
          <Input
            value={actorUserId}
            onChange={(event) => setActorUserId(event.target.value)}
            placeholder="Current session or operator id"
            className="w-44"
          />
          {rule.isDeleted ? (
            <Input
              value={restoreStatus}
              onChange={(event) => setRestoreStatus(event.target.value)}
              placeholder="Restore status"
              className="w-44"
            />
          ) : null}
        </div>
        {resolvedActorUserId.length === 0 ? (
          <p className="mt-2 text-xs text-amber-200">Provide an operator identity before archiving or restoring this rule.</p>
        ) : null}
      </header>

      <article className="grid gap-4 lg:grid-cols-3">
        <section className="wb-panel space-y-2 border border-border/70 bg-[linear-gradient(180deg,rgba(12,18,26,0.98),rgba(17,23,34,0.88))] lg:col-span-1">
          <h3 className="text-sm font-semibold tracking-tight">Metadata</h3>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={rule.ruleFamily} />
            <StatusBadge value={rule.severity} />
            <StatusBadge value={rule.status} />
          </div>
          <p className="text-xs text-muted-foreground">Scope: {rule.scopeType}{rule.scopeValue ? `:${rule.scopeValue}` : ""}</p>
          <p className="text-xs text-muted-foreground">Version: {rule.currentVersionLabel} (r{rule.currentRevisionNumber})</p>
          <p className="text-xs text-muted-foreground">Tags: {rule.tags.join(", ") || "-"}</p>
          <p className="text-xs text-muted-foreground">Created: {new Date(rule.createdAtUtc).toLocaleString()} by {rule.createdByUserId}</p>
          <p className="text-xs text-muted-foreground">Updated: {new Date(rule.updatedAtUtc).toLocaleString()} by {rule.updatedByUserId}</p>
        </section>

        <section className="wb-panel space-y-3 border border-border/70 bg-[linear-gradient(180deg,rgba(11,16,24,0.98),rgba(15,21,31,0.9))] lg:col-span-2">
          <h3 className="text-sm font-semibold tracking-tight">Current Content</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <p>Revision {currentRevision.revisionNumber} - {currentRevision.versionLabel}</p>
            <StatusBadge value={currentRevision.validation.isDeploymentReady ? "ready" : "notready"} />
            <StatusBadge value={currentRevision.validation.canPersist ? "passing" : "failing"} />
          </div>
          <pre className="max-h-[32rem] overflow-auto rounded-lg border border-border/70 bg-surface-2/65 p-3 text-xs">
            <code>{currentRevision.originalContent}</code>
          </pre>
          <RuleValidationPanel validation={currentRevision.validation} title="Current Revision Validation" />
        </section>
      </article>

      <article className="grid gap-4 lg:grid-cols-2">
        <section className="wb-panel space-y-2 border border-border/70 bg-[linear-gradient(180deg,rgba(11,16,24,0.96),rgba(16,22,32,0.88))]">
          <h3 className="text-sm font-semibold tracking-tight">Revision History</h3>
          {detail.revisions.length === 0 ? <p className="text-xs text-muted-foreground">No revisions.</p> : null}
          <ul className="space-y-2">
            {detail.revisions.map((revision) => (
              <li key={revision.id} className="rounded-lg border border-border/70 bg-surface-2/50 p-2 text-xs">
                <p className="font-medium">r{revision.revisionNumber} - {revision.versionLabel}</p>
                <p className="text-muted-foreground">{revision.changeType} - {revision.status} - {new Date(revision.createdAtUtc).toLocaleString()}</p>
                <p className="text-muted-foreground">by {revision.createdByUserId}</p>
                {revision.changeReason ? <p className="text-muted-foreground">Reason: {revision.changeReason}</p> : null}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge value={revision.validation.isDeploymentReady ? "ready" : "notready"} />
                  <StatusBadge value={revision.validation.canPersist ? "passing" : "failing"} />
                </div>
                <div className="mt-2">
                  <RuleValidationPanel validation={revision.validation} title={`Revision r${revision.revisionNumber} Validation`} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="wb-panel space-y-2 border border-border/70 bg-[linear-gradient(180deg,rgba(11,16,24,0.96),rgba(16,22,32,0.88))]">
          <h3 className="text-sm font-semibold tracking-tight">Import Attempts</h3>
          {detail.importAttempts.length === 0 ? <p className="text-xs text-muted-foreground">No import attempts linked to this rule.</p> : null}
          <ul className="space-y-2">
            {detail.importAttempts.map((attempt) => (
              <li key={attempt.id} className="rounded-lg border border-border/70 bg-surface-2/50 p-2 text-xs">
                <p className="font-medium">{attempt.fileName} - {attempt.wasSuccessful ? "success" : "failed"}</p>
                <p className="text-muted-foreground">{attempt.declaredRuleFamily} - {new Date(attempt.createdAtUtc).toLocaleString()}</p>
                {attempt.failureReason ? <p className="text-destructive">{attempt.failureReason}</p> : null}
                <div className="mt-2">
                  <RuleValidationPanel validation={attempt.validation} title="Import Validation" />
                </div>
              </li>
            ))}
          </ul>
          {detail.importAttempts.length > 0 ? (
            <Link href={`/rules?includeDeleted=true&q=${encodeURIComponent(rule.name)}`} className="text-xs text-primary underline-offset-4 hover:underline">
              Open in repository search
            </Link>
          ) : null}
        </section>
      </article>
    </section>
  )
}
