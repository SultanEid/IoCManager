"use client"

import { useState } from "react"
import {
  BarChart3,
  Clock3,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  LayoutTemplate,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import {
  downloadLegacyReportArtifact,
  type LegacyPipelineGeneratedReport,
  type LegacyPipelineReportDetail,
  deleteLegacyReport,
  generateLegacyReport,
  getLegacyReportDetail,
  listLegacyJobs,
  listLegacyNetworks,
  listLegacyReports,
  listLegacyTargets,
} from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const REPORT_TEMPLATES = [
  {
    value: "ExecutiveSummary",
    label: "Executive Summary",
    description: "High-level reporting across jobs, results, and findings in the selected scope.",
  },
  {
    value: "DetailedIocReport",
    label: "Detailed IOC Report",
    description: "Scanner-heavy finding coverage grouped around rule hits and indicator counts.",
  },
  {
    value: "TargetExposureSummary",
    label: "Target Exposure Summary",
    description: "Target inventory posture and finding linkage for selected hosts or subnets.",
  },
  {
    value: "ScanActivitySummary",
    label: "Scan Activity Summary",
    description: "Execution outcomes and recent result activity across the selected scope.",
  },
] as const

const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"] as const
const STATUS_OPTIONS = ["Succeeded", "NoFindings", "Failed"] as const

const REPORT_TYPE_LABELS: Record<string, string> = {
  ExecutiveSummary: "Executive Summary",
  DetailedIocReport: "Detailed IOC Report",
  TargetExposureSummary: "Target Exposure Summary",
  ScanActivitySummary: "Scan Activity Summary",
}

function defaultUtcRange() {
  const now = new Date()
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return {
    fromUtc: from.toISOString().replace(/\.\d{3}Z$/, "Z"),
    toUtc: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
  }
}

function formatUtc(value: string | null | undefined) {
  if (!value) {
    return "Not set"
  }

  return new Date(value).toLocaleString()
}

function formatReportType(reportType: string | null | undefined) {
  if (!reportType) {
    return "Unknown report"
  }

  return REPORT_TYPE_LABELS[reportType] ?? reportType
}

function summarizeQuery(query: {
  jobId?: string | null
  targetId?: string | null
  networkId?: string | null
  scannerFamily?: string | null
  fromUtc?: string | null
  toUtc?: string | null
  severity?: string | null
  status?: string | null
}) {
  const parts: string[] = []
  if (query.jobId) parts.push(`Job ${query.jobId}`)
  if (query.targetId) parts.push(`Target ${query.targetId}`)
  if (query.networkId) parts.push(`Subnet ${query.networkId}`)
  if (query.scannerFamily) parts.push(query.scannerFamily.toUpperCase())
  if (query.severity) parts.push(`${query.severity} severity`)
  if (query.status) parts.push(`${query.status} results`)
  if (query.fromUtc || query.toUtc) {
    parts.push(`${query.fromUtc ?? "..."} to ${query.toUtc ?? "..."}`)
  }

  return parts.length > 0 ? parts.join(" | ") : "Global scope"
}

type ReportPreviewState =
  | { kind: "generated"; report: LegacyPipelineGeneratedReport }
  | { kind: "saved"; report: LegacyPipelineReportDetail }

function BuilderMetric({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof LayoutTemplate
  label: string
  value: string
  description: string
}) {
  return (
    <div className="wb-metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="wb-kicker">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-surface-1/70 text-primary shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export default function ReportsPage() {
  const { session } = useAuth()
  const actorUserId = session?.userId ?? session?.username ?? "team-dev"
  const [refreshKey, setRefreshKey] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [loadingSavedReportId, setLoadingSavedReportId] = useState<string | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const [preview, setPreview] = useState<ReportPreviewState | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [form, setForm] = useState(() => {
    const range = defaultUtcRange()
    return {
      reportType: "ExecutiveSummary",
      title: "",
      jobId: "",
      targetId: "",
      networkId: "",
      scannerFamily: "",
      severity: "",
      status: "",
      fromUtc: range.fromUtc,
      toUtc: range.toUtc,
      persist: true,
    }
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
        fromUtc: form.fromUtc || null,
        toUtc: form.toUtc || null,
        scannerFamily: form.scannerFamily || null,
        severity: form.severity || null,
        status: form.status || null,
        persist: form.persist,
        actorUserId,
      })
      setPreview({ kind: "generated", report: response })
      setMessage(form.persist ? "Report generated and saved to the library." : "Preview generated without saving.")
      if (response.persistedReport) {
        setRefreshKey((value) => value + 1)
      }
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setGenerating(false)
    }
  }

  const openSavedReport = async (reportId: string) => {
    setLoadingSavedReportId(reportId)
    setErrorText(null)
    setMessage(null)
    try {
      const detail = await getLegacyReportDetail(reportId)
      setPreview({ kind: "saved", report: detail })
      setMessage("Saved report snapshot loaded.")
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setLoadingSavedReportId(null)
    }
  }

  const deleteSavedReport = async (reportId: string, title: string) => {
    if (!window.confirm(`Delete saved report "${title}"? This does not affect source scan data.`)) {
      return
    }

    setDeletingReportId(reportId)
    setErrorText(null)
    setMessage(null)
    try {
      const response = await deleteLegacyReport(reportId)
      if (preview?.kind === "saved" && preview.report.id === reportId) {
        setPreview(null)
      }

      if (preview?.kind === "generated" && preview.report.persistedReport?.id === reportId) {
        setPreview(null)
      }

      setMessage(`Deleted "${response.title}" from the saved library.`)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setDeletingReportId(null)
    }
  }

  const resetLastSevenDays = () => {
    const range = defaultUtcRange()
    setForm((current) => ({
      ...current,
      fromUtc: range.fromUtc,
      toUtc: range.toUtc,
    }))
  }

  const downloadReport = async (path: string | null, title: string, format: "pdf" | "csv") => {
    if (!path) {
      return
    }

    const downloadId = `${title}:${format}`
    setDownloadingKey(downloadId)
    setErrorText(null)
    try {
      await downloadLegacyReportArtifact(path, `${title}.${format}`)
    } catch (error) {
      const failure = classifyUiError(error)
      setErrorText(failure.message)
    } finally {
      setDownloadingKey(null)
    }
  }

  if (jobsQuery.isLoading || targetsQuery.isLoading || networksQuery.isLoading || reportsQuery.isLoading) {
    return <LoadingState label="Loading reports workspace" />
  }

  if (jobsQuery.isError || targetsQuery.isError || networksQuery.isError || reportsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(jobsQuery.error ?? targetsQuery.error ?? networksQuery.error ?? reportsQuery.error)} fallbackTitle="Reports unavailable" />
  }

  const jobs = jobsQuery.data ?? []
  const targets = targetsQuery.data ?? []
  const networks = networksQuery.data ?? []
  const reports = reportsQuery.data ?? []
  const previewTitle = preview?.kind === "saved" ? preview.report.title : preview?.report.title
  const previewReportType = formatReportType(preview?.kind === "saved" ? preview.report.reportType : preview?.report.reportType)
  const previewScope = preview?.kind === "saved" ? preview.report.scope : preview?.report.scope
  const previewSections = preview?.kind === "saved" ? preview.report.sections : preview?.report.sections
  const previewQuery = preview?.kind === "saved" ? preview.report.query : preview?.report.query
  const previewGeneratedAt = preview?.kind === "saved" ? preview.report.createdAtUtc : preview?.report.generatedAtUtc
  const previewPdf = preview?.kind === "saved" ? preview.report.pdfDownloadPath : preview?.report.persistedReport?.pdfDownloadPath ?? null
  const previewCsv = preview?.kind === "saved" ? preview.report.csvDownloadPath : preview?.report.persistedReport?.csvDownloadPath ?? null
  const previewDownloadBase = previewTitle ?? `${previewReportType ?? "report"}-${previewGeneratedAt ?? "download"}`

  return (
    <section className="wb-page">
      <header className="wb-page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="wb-kicker">Reports</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_18px_36px_rgba(0,0,0,0.22)]">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Presentation-ready reporting from stored operational evidence</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate management and analyst reports across jobs, targets, subnets, scanner families, and time range, then keep only the snapshots worth preserving.
                </p>
              </div>
            </div>
          </div>
          <div className="wb-insight max-w-sm">
            <div className="mb-2 flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold tracking-tight">Reader Mode</p>
            </div>
            <p>
              Preview stays transient until you choose to save it, while persisted reports reopen as stored briefing snapshots instead of regenerating from live data.
            </p>
          </div>
        </div>
      </header>

      <article className="wb-hero space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="wb-kicker">Report Builder</p>
            <p className="text-sm text-muted-foreground">Pick a template, shape the scope, and decide whether the output stays transient or becomes a saved library snapshot.</p>
          </div>
          <div className="grid min-w-[240px] gap-2 sm:grid-cols-3">
            <BuilderMetric icon={LayoutTemplate} label="Templates" value={String(REPORT_TEMPLATES.length)} description="Executive, IOC, target, and scan-focused report modes." />
            <BuilderMetric icon={FolderOpen} label="Saved Reports" value={String(reports.length)} description="Persisted briefing snapshots currently in the library." />
            <BuilderMetric icon={Clock3} label="Default Window" value="7 days" description="Global UTC builder default before custom override." />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {REPORT_TEMPLATES.map((template) => {
            const active = form.reportType === template.value
            return (
              <button
                key={template.value}
                type="button"
                onClick={() => setForm((current) => ({ ...current, reportType: template.value }))}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  active
                    ? "border-sky-300/60 bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(17,24,39,0.68))] shadow-[0_0_0_1px_rgba(125,211,252,0.2),0_24px_50px_rgba(0,0,0,0.22)]"
                    : "border-border/70 bg-surface-2/45 hover:border-border hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{template.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-surface-1/70 text-primary">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="wb-filter-bar space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="wb-chip">
              <Filter className="h-3.5 w-3.5" />
              Scope and Export Controls
            </span>
            <span className="wb-chip">
              <Database className="h-3.5 w-3.5" />
              Snapshot-backed Outputs
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(240px,1fr)_minmax(220px,0.9fr)]">
          <Input
            placeholder="Optional report title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.scannerFamily}
            onChange={(event) => setForm((current) => ({ ...current, scannerFamily: event.target.value }))}
          >
            <option value="">All scanner families</option>
            <option value="YARA">YARA</option>
            <option value="SIGMA">SIGMA</option>
            <option value="SNORT">SNORT</option>
            <option value="SURICATA">SURICATA</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface-1 px-3 text-sm">
            <input
              type="checkbox"
              checked={form.persist}
              onChange={(event) => setForm((current) => ({ ...current, persist: event.target.checked }))}
            />
            <span>{form.persist ? "Save snapshot in library" : "Preview only"}</span>
          </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.jobId}
            onChange={(event) => setForm((current) => ({ ...current, jobId: event.target.value }))}
          >
            <option value="">All jobs</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.scannerFamily.toUpperCase()} #{job.id}</option>)}
          </select>
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.targetId}
            onChange={(event) => setForm((current) => ({ ...current, targetId: event.target.value }))}
          >
            <option value="">All targets</option>
            {targets.map((target) => <option key={target.id} value={target.id}>{target.hostname ?? target.displayName ?? target.ipAddress}</option>)}
          </select>
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.networkId}
            onChange={(event) => setForm((current) => ({ ...current, networkId: event.target.value }))}
          >
            <option value="">All subnets</option>
            {networks.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)}
          </select>
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.severity}
            onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}
          >
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
          </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.9fr)_minmax(220px,0.9fr)_minmax(220px,0.9fr)]">
          <Input
            placeholder="From UTC (ISO-8601)"
            value={form.fromUtc}
            onChange={(event) => setForm((current) => ({ ...current, fromUtc: event.target.value }))}
          />
          <Input
            placeholder="To UTC (ISO-8601)"
            value={form.toUtc}
            onChange={(event) => setForm((current) => ({ ...current, toUtc: event.target.value }))}
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">All result statuses</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generate} disabled={generating}>
            {generating ? "Generating..." : "Generate Report"}
          </Button>
          <Button type="button" variant="outline" onClick={resetLastSevenDays}>
            Reset to last 7 days
          </Button>
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {errorText ? <p className="text-sm text-rose-300">{errorText}</p> : null}
        </div>
      </article>

      <article className="wb-reading-surface space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="wb-kicker">Preview</p>
            <p className="text-sm text-muted-foreground">Inspect the transient preview or reopen a persisted snapshot from the saved library.</p>
          </div>
          {preview ? (
            <div className="flex flex-wrap items-center gap-2">
              {previewPdf ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-2/60 px-3 py-2 text-sm text-foreground transition hover:border-primary/35 disabled:cursor-not-allowed disabled:text-muted-foreground"
                  onClick={() => downloadReport(previewPdf, previewDownloadBase, "pdf")}
                  disabled={downloadingKey === `${previewDownloadBase}:pdf`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingKey === `${previewDownloadBase}:pdf` ? "Downloading PDF..." : "Download PDF"}
                </button>
              ) : null}
              {previewCsv ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-2/60 px-3 py-2 text-sm text-foreground transition hover:border-primary/35 disabled:cursor-not-allowed disabled:text-muted-foreground"
                  onClick={() => downloadReport(previewCsv, previewDownloadBase, "csv")}
                  disabled={downloadingKey === `${previewDownloadBase}:csv`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingKey === `${previewDownloadBase}:csv` ? "Downloading CSV..." : "Download CSV"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {!preview ? (
          <EmptyState title="No preview yet" description="Generate a report or open a saved snapshot to inspect the report sections and export links." />
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--primary)_10%,transparent),color-mix(in_srgb,var(--surface-2)_88%,transparent)_30%,color-mix(in_srgb,var(--surface-1)_86%,transparent))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="wb-chip">
                    <Eye className="h-3.5 w-3.5" />
                    {preview.kind === "saved" ? "Saved Snapshot" : preview.report.persistedReport ? "Generated and Saved" : "Preview Only"}
                  </span>
                  <p className="mt-3 text-xl font-semibold tracking-tight">{previewTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{previewReportType} | {previewScope}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatUtc(previewGeneratedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/30 px-3 py-3 text-xs text-muted-foreground shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
                  {summarizeQuery(previewQuery ?? {})}
                </div>
              </div>
            </div>

            {previewSections?.map((section) => (
              <div key={section.title} className="wb-section-frame">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{section.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {section.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-[1.2rem] border border-border/60 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-1)_85%,transparent),color-mix(in_srgb,var(--background)_82%,transparent))] p-3 shadow-[0_16px_32px_rgba(0,0,0,0.16)]">
                      <p className="wb-kicker">{metric.label}</p>
                      <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                    </div>
                  ))}
                </div>

                {section.highlights.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {section.highlights.map((highlight) => (
                      <div key={highlight} className="rounded-2xl border border-border/55 bg-surface-1/55 px-4 py-3 text-sm text-muted-foreground">
                        {highlight}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="wb-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="wb-kicker">Saved Library</p>
            <p className="text-sm text-muted-foreground">Persisted report snapshots stay here until you delete them. Opening a saved report uses the stored snapshot instead of regenerating from live data.</p>
          </div>
          <span className="wb-chip">
            <FolderOpen className="h-3.5 w-3.5" />
            Snapshot Archive
          </span>
        </div>

        {reports.length === 0 ? (
          <EmptyState title="No saved reports" description="Persisted report snapshots and export links will appear here after generation." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Scope</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Formats</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const opening = loadingSavedReportId === report.id
                  const deleting = deletingReportId === report.id
                  return (
                    <tr key={report.id} className="border-t border-border/50 align-top">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-foreground">{report.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Report #{report.id}</p>
                        </div>
                      </td>
                      <td className="py-3">{formatReportType(report.reportType)}</td>
                      <td className="py-3 text-muted-foreground">{report.scope}</td>
                      <td className="py-3 text-muted-foreground">{formatUtc(report.createdAtUtc)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {report.pdfDownloadPath ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/65 bg-surface-2/70 px-2.5 py-1 text-xs text-foreground transition hover:border-primary/35 disabled:cursor-not-allowed disabled:text-muted-foreground"
                              onClick={() => downloadReport(report.pdfDownloadPath, report.title, "pdf")}
                              disabled={downloadingKey === `${report.title}:pdf`}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {downloadingKey === `${report.title}:pdf` ? "Downloading PDF..." : "PDF"}
                            </button>
                          ) : <span className="text-muted-foreground">PDF missing</span>}
                          {report.csvDownloadPath ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-full border border-border/65 bg-surface-2/70 px-2.5 py-1 text-xs text-foreground transition hover:border-primary/35 disabled:cursor-not-allowed disabled:text-muted-foreground"
                              onClick={() => downloadReport(report.csvDownloadPath, report.title, "csv")}
                              disabled={downloadingKey === `${report.title}:csv`}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {downloadingKey === `${report.title}:csv` ? "Downloading CSV..." : "CSV"}
                            </button>
                          ) : <span className="text-muted-foreground">CSV missing</span>}
                        </div>
                      </td>
                      <td className="py-3">{report.status}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => openSavedReport(report.id)} disabled={opening || deleting}>
                            {opening ? "Opening..." : "Open"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => deleteSavedReport(report.id, report.title)} disabled={opening || deleting}>
                            {deleting ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
