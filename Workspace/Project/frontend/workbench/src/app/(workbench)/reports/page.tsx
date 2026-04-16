"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import {
  generateLegacyReport,
  listLegacyJobs,
  listLegacyNetworks,
  listLegacyReports,
  listLegacyTargets,
} from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const REPORT_TYPES = [
  "ExecutiveSummary",
  "DetailedIocReport",
  "TargetExposureSummary",
  "ScanActivitySummary",
] as const

export default function ReportsPage() {
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "team-dev"
  const [refreshKey, setRefreshKey] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof generateLegacyReport>> | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [form, setForm] = useState({
    reportType: "ExecutiveSummary",
    title: "",
    jobId: "",
    targetId: "",
    networkId: "",
    scannerFamily: "",
    persist: true,
  })

  const jobsQuery = useWorkbenchQuery(["legacy-pipeline", "report-jobs", refreshKey], (signal) => listLegacyJobs(signal))
  const targetsQuery = useWorkbenchQuery(["legacy-pipeline", "report-targets"], (signal) => listLegacyTargets(undefined, signal))
  const networksQuery = useWorkbenchQuery(["legacy-pipeline", "report-networks"], (signal) => listLegacyNetworks(signal))
  const reportsQuery = useWorkbenchQuery(["legacy-pipeline", "report-history", refreshKey], (signal) => listLegacyReports(signal))

  const generate = async () => {
    setGenerating(true)
    setErrorText(null)
    setMessage(null)
    try {
      const response = await generateLegacyReport({
        reportType: form.reportType,
        title: form.title || null,
        jobId: form.jobId || null,
        targetId: form.targetId || null,
        networkId: form.networkId || null,
        fromUtc: null,
        toUtc: null,
        scannerFamily: form.scannerFamily || null,
        severity: null,
        status: null,
        persist: form.persist,
        actorUserId,
      })
      setPreview(response)
      setMessage(form.persist ? "Report generated and saved." : "Preview generated.")
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setGenerating(false)
    }
  }

  if (jobsQuery.isLoading || targetsQuery.isLoading || networksQuery.isLoading || reportsQuery.isLoading) {
    return <LoadingState label="Loading reports" />
  }

  if (jobsQuery.isError || targetsQuery.isError || networksQuery.isError || reportsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(jobsQuery.error ?? targetsQuery.error ?? networksQuery.error ?? reportsQuery.error)} fallbackTitle="Reports unavailable" />
  }

  const jobs = jobsQuery.data ?? []
  const targets = targetsQuery.data ?? []
  const networks = networksQuery.data ?? []
  const reports = reportsQuery.data ?? []

  return (
    <section className="wb-page">
      <header className="wb-page-header">
        <p className="wb-kicker">Reports</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Generate scan reports and summaries</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Build executive and technical summaries for jobs, targets, and subnets from stored scan data.
        </p>
      </header>

      <article className="wb-panel space-y-5">
        <div className="space-y-1">
          <p className="wb-kicker">Report Builder</p>
          <p className="text-sm text-muted-foreground">Combine scope, scanner family, and persistence options before generating the report preview.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)]">
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.reportType} onChange={(event) => setForm((current) => ({ ...current, reportType: event.target.value }))}>
            {REPORT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <Input placeholder="Optional report title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.jobId} onChange={(event) => setForm((current) => ({ ...current, jobId: event.target.value }))}>
            <option value="">All jobs</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.scannerFamily.toUpperCase()} #{job.id}</option>)}
          </select>
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.targetId} onChange={(event) => setForm((current) => ({ ...current, targetId: event.target.value }))}>
            <option value="">All targets</option>
            {targets.map((target) => <option key={target.id} value={target.id}>{target.hostname ?? target.ipAddress}</option>)}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.8fr)_minmax(220px,0.8fr)_minmax(280px,1fr)]">
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.networkId} onChange={(event) => setForm((current) => ({ ...current, networkId: event.target.value }))}>
            <option value="">All subnets</option>
            {networks.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)}
          </select>
          <select className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm" value={form.scannerFamily} onChange={(event) => setForm((current) => ({ ...current, scannerFamily: event.target.value }))}>
            <option value="">All scanner families</option>
            <option value="YARA">YARA</option>
            <option value="SIGMA">SIGMA</option>
            <option value="SNORT">SNORT</option>
            <option value="SURICATA">SURICATA</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.persist} onChange={(event) => setForm((current) => ({ ...current, persist: event.target.checked }))} />
            <span>Persist and export PDF/CSV metadata</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={generate} disabled={generating}>{generating ? "Generating..." : "Generate Report"}</Button>
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {errorText ? <p className="text-sm text-rose-300">{errorText}</p> : null}
        </div>
      </article>

      <article className="wb-panel">
        <p className="wb-kicker">Preview</p>
        {!preview ? (
          <div className="mt-4">
            <EmptyState title="No preview yet" description="Generate a report to inspect the sections and persisted artifact metadata." />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
              <p className="text-base font-semibold">{preview.title}</p>
              <p className="text-sm text-muted-foreground">{preview.reportType} | {preview.scope}</p>
            </div>
            {preview.sections.map((section) => (
              <div key={section.title} className="rounded-xl border border-border/70 bg-surface-2/55 p-4">
                <p className="text-base font-semibold">{section.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                  {section.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-lg border border-border/60 bg-surface-1/60 p-3">
                      <p className="wb-kicker">{metric.label}</p>
                      <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                    </div>
                  ))}
                </div>
                {section.highlights.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {section.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="wb-panel">
        <p className="wb-kicker">Saved Reports</p>
        {reports.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No saved reports" description="Persisted report rows and download links will appear here after generation." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Scope</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Download</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t border-border/50">
                    <td className="py-3">{report.title}</td>
                    <td className="py-3">{report.reportType}</td>
                    <td className="py-3">{report.scope}</td>
                    <td className="py-3">{new Date(report.createdAtUtc).toLocaleString()}</td>
                    <td className="py-3">
                      {report.downloadPath ? (
                        <a className="text-sky-300 underline" href={report.downloadPath}>Download</a>
                      ) : (
                        <span className="text-muted-foreground">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
