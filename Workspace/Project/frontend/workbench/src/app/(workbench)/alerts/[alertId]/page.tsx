"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ScannerFamilyBadge } from "@/components/workbench/scanner-family-mark"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/workbench/status-badge"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { isItOnlyScope } from "@/shared/auth/role-access"
import type { V2AlertDetailResponse } from "@/shared/api/schemas"
import { gateway, isModeConfigured } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const STATUS_OPTIONS = ["Open", "Investigating", "Resolved", "Closed"] as const
const IOC_STATUS_OPTIONS = ["Open", "InReview", "Contained", "FalsePositive", "AcceptedRisk"] as const

function formatIocStatus(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
}

function ProgressMeter({
  percentComplete,
  completed,
  total,
}: {
  percentComplete: number
  completed: number
  total: number
}) {
  if (total === 0) {
    return (
      <div className="rounded-lg border border-border/65 bg-surface-1/60 px-3 py-2">
        <p className="text-sm font-semibold tracking-tight">No linked IOC evidence yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Progress will appear after findings are linked to this case.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-tight">{percentComplete}% complete</p>
        <p className="text-xs text-muted-foreground">
          {completed} / {total} IOC(s)
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-1"
        role="progressbar"
        aria-label="Case IOC progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentComplete}
      >
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${percentComplete}%` }} />
      </div>
    </div>
  )
}

function ownerLabel(ownerUserId: string) {
  return ownerUserId === "unassigned" ? "Unassigned" : ownerUserId
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function ScannerSpecificFields({ detail }: { detail: V2AlertDetailResponse["linkedIocs"][number] }) {
  if (detail.yaraDetail) {
    return (
      <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <dt className="wb-kicker">File Path</dt>
          <dd className="mt-1 break-all text-foreground">{detail.yaraDetail.filePath ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="wb-kicker">File Hash</dt>
          <dd className="mt-1 break-all text-foreground">{detail.yaraDetail.fileHash ?? "Unavailable"}</dd>
        </div>
      </dl>
    )
  }

  if (detail.sigmaDetail) {
    return (
      <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <dt className="wb-kicker">Log Source</dt>
          <dd className="mt-1 text-foreground">{detail.sigmaDetail.logSource ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="wb-kicker">Severity</dt>
          <dd className="mt-1 text-foreground">{detail.sigmaDetail.severity ?? "Unknown"}</dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="wb-kicker">Command Line</dt>
          <dd className="mt-1 break-all text-foreground">{detail.sigmaDetail.commandLine ?? "Unavailable"}</dd>
        </div>
      </dl>
    )
  }

  if (detail.networkDetail) {
    return (
      <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <dt className="wb-kicker">Source</dt>
          <dd className="mt-1 text-foreground">{detail.networkDetail.sourceIp ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="wb-kicker">Destination</dt>
          <dd className="mt-1 text-foreground">{detail.networkDetail.destIp ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="wb-kicker">Protocol</dt>
          <dd className="mt-1 text-foreground">{detail.networkDetail.protocol ?? "Unknown"}</dd>
        </div>
      </dl>
    )
  }

  return null
}

export default function AlertDetailPage() {
  const params = useParams<{ alertId: string }>()
  const { session } = useAuth()
  const alertId = params.alertId
  const [statusUpdate, setStatusUpdate] = useState<string | null>(null)
  const [iocStatusUpdate, setIocStatusUpdate] = useState<string | null>(null)
  const [detailOverride, setDetailOverride] = useState<V2AlertDetailResponse | null>(null)

  const alertQuery = useWorkbenchQuery(["alert", alertId, "detail"], (signal) => gateway.getAlertDetail(alertId, signal), {
    enabled: isModeConfigured,
  })

  useEffect(() => {
    setDetailOverride(null)
  }, [alertId, alertQuery.data?.updatedAtUtc])

  const detail = detailOverride ?? alertQuery.data ?? null
  const canShowNonAlertPivots = !isItOnlyScope(session?.roles ?? [])

  const updateStatus = async (nextStatus: string) => {
    if (!detail || statusUpdate) {
      return
    }

    const actorUserId = session?.username ?? session?.userId ?? "workbench"
    try {
      setStatusUpdate(nextStatus)
      const updated = await gateway.updateAlertStatus(alertId, nextStatus, actorUserId)
      setDetailOverride(updated)
    } finally {
      setStatusUpdate(null)
    }
  }

  const updateIocStatus = async (iocId: string, nextStatus: string) => {
    if (!detail || iocStatusUpdate) {
      return
    }

    const actorUserId = session?.username ?? session?.userId ?? "workbench"
    try {
      setIocStatusUpdate(iocId)
      const updated = await gateway.updateAlertIocStatus(alertId, iocId, nextStatus, actorUserId)
      setDetailOverride(updated)
    } finally {
      setIocStatusUpdate(null)
    }
  }

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Alert detail unavailable" />
  }

  if (alertQuery.isLoading) {
    return <LoadingState label="Loading alert detail" />
  }

  if (alertQuery.isError || !detail) {
    const failure = classifyUiError(alertQuery.error)
    return <ClassifiedFailureState failure={failure} fallbackTitle="Alert detail unavailable" />
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="wb-kicker">Alert Detail</p>
            <h1 className="mt-1 max-w-5xl text-xl font-semibold tracking-tight break-words">{detail.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{detail.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge value={detail.severity} />
            <StatusBadge value={detail.status} />
            <ScannerFamilyBadge family={detail.scannerFamily} />
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
            <p className="wb-kicker">Owner</p>
            <p className="mt-1 text-sm font-semibold">{ownerLabel(detail.ownerUserId)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
            <p className="wb-kicker">Target</p>
            <p className="mt-1 text-sm font-semibold">{detail.targetDisplay}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3 md:col-span-2">
            <p className="wb-kicker">Case Progress</p>
            <div className="mt-2">
              <ProgressMeter
                percentComplete={detail.progress.percentComplete}
                completed={detail.progress.completedCount}
                total={detail.progress.totalIocs}
              />
            </div>
            {detail.progress.totalIocs > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {detail.progress.openCount} open | {detail.progress.inReviewCount} in review
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-2/70 p-3">
            <p className="wb-kicker">Last Seen</p>
            <p className="mt-1 text-sm font-semibold">{new Date(detail.lastDetectedAtUtc).toLocaleString()}</p>
          </div>
        </div>
      </motion.header>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <SectionHeader
          title="Status Controls"
          description="Update the stored alert state without leaving the IOC evidence view."
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={detail.status === option ? "default" : "outline"}
              disabled={statusUpdate !== null}
              onClick={() => void updateStatus(option)}
            >
              {statusUpdate === option ? "Updating..." : option}
            </Button>
          ))}
        </div>
      </motion.article>

      <motion.article className="wb-panel grid gap-3 xl:grid-cols-2" variants={panelMotion}>
        <section>
          <SectionHeader
            title="Related Target"
            description="Legacy inventory context for the target associated with this alert."
          />
          {detail.target ? (
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
              <p className="text-sm font-medium">{detail.target.display}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {detail.target.ipAddress ?? "Unknown IP"} | {detail.target.targetOsType ?? "Unknown OS"} | {detail.target.status ?? "Unknown status"}
              </p>
              {canShowNonAlertPivots && detail.target.id ? (
                <div className="mt-3">
                  <Link href={`/servers?targetId=${detail.target.id}`} className="inline-flex">
                    <Button type="button" size="sm">Open target</Button>
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState title="No related target" description="This alert is not linked to a target inventory row." />
          )}
        </section>

        <section>
          <SectionHeader
            title="Related Scan Results"
            description="Legacy scan runs derived from the linked IOC evidence for this alert."
          />
          {detail.linkedScanResults.length === 0 ? (
            <EmptyState title="No linked scan results" description="This alert has not retained any related scan-result references yet." />
          ) : (
            <div className="space-y-2">
              {detail.linkedScanResults.map((result) => (
                <div key={result.resultId} className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Result {result.resultId}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={result.status} />
                      {canShowNonAlertPivots ? (
                        <Link href={`/scans/${encodeURIComponent(result.resultId)}`} className="inline-flex">
                          <Button type="button" size="sm" variant="outline">Open decision</Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Job {result.jobId ?? "Unknown"} | {result.findingsCount} finding(s)
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </motion.article>

      <motion.article className="wb-panel" variants={panelMotion}>
        <SectionHeader
          title="Linked IOC Findings"
          description="Exact promoted findings that keep this alert open, including raw payload and scanner-specific context."
        />
        {detail.linkedIocs.length === 0 ? (
          <EmptyState title="No linked IOCs" description="This alert does not currently have stored IOC evidence." />
        ) : (
          <div className="space-y-3">
            {detail.linkedIocs.map((ioc) => (
              <section key={ioc.iocId} className="rounded-xl border border-border/70 bg-surface-2/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold tracking-tight">{ioc.ruleName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <ScannerFamilyBadge family={ioc.scannerFamily} size="sm" />
                      <span>{ioc.indicatorKind}</span>
                      <span>{new Date(ioc.timestampUtc).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={ioc.severity} />
                    <StatusBadge value={ioc.status} />
                    <label className="sr-only" htmlFor={`ioc-status-${ioc.iocId}`}>
                      Update IOC status
                    </label>
                    <select
                      id={`ioc-status-${ioc.iocId}`}
                      className="h-8 rounded-lg border border-border/70 bg-surface-1 px-2 text-xs"
                      value={ioc.status}
                      disabled={iocStatusUpdate === ioc.iocId}
                      aria-label={`Update status for IOC ${ioc.iocId}`}
                      onChange={(event) => void updateIocStatus(ioc.iocId, event.target.value)}
                    >
                      {IOC_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {formatIocStatus(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="wb-kicker">Indicator</dt>
                    <dd className="mt-1 break-all text-foreground">{ioc.indicatorValue}</dd>
                  </div>
                  <div>
                    <dt className="wb-kicker">IOC Id</dt>
                    <dd className="mt-1 break-all text-foreground">{ioc.iocId}</dd>
                  </div>
                  <div>
                    <dt className="wb-kicker">Status Updated</dt>
                    <dd className="mt-1 text-foreground">
                      {new Date(ioc.statusUpdatedAtUtc).toLocaleString()} by {ioc.statusUpdatedByUserId}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <SectionHeader title="Scanner Context" description="Fields normalized from the scanner-specific detail tables." />
                  <ScannerSpecificFields detail={ioc} />
                </div>

                <details className="mt-4 rounded-lg border border-border/70 bg-surface-1/60 p-3">
                  <summary className="cursor-pointer text-xs font-semibold tracking-tight text-muted-foreground">
                    Raw payload
                  </summary>
                  <pre className="mt-3 overflow-x-auto text-xs text-muted-foreground">
                    {ioc.rawPayload ?? "No raw payload available."}
                  </pre>
                </details>
              </section>
            ))}
          </div>
        )}
      </motion.article>
    </motion.section>
  )
}
