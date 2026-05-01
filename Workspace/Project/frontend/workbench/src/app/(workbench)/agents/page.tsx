"use client"

import Link from "next/link"
import { Bot, ChevronDown, ShieldCheck, Sparkles } from "lucide-react"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"

function formatPercentMetric(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "Not reported"
}

function formatNumberMetric(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "Not reported"
}

function metricValue(metrics: Record<string, number>, camel: string, snake: string) {
  return metrics[camel] ?? metrics[snake]
}

function hasFiniteMetric(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
}

export default function AgentsPage() {
  const ziraStatus = useWorkbenchQuery(["agents", "zira-status"], (signal) => gateway.getScanAnalystStatus(signal))
  const aegisPlans = useWorkbenchQuery(["agents", "aegis-plans"], (signal) => gateway.listReportMitigationPlans(signal))
  const modelStats = useWorkbenchQuery(["agents", "model-statistics"], (signal) => gateway.getAiModelStatistics(signal))
  const ziraSummary = ziraStatus.isLoading
    ? "Checking Zira status..."
    : ziraStatus.isError
      ? "Zira status is unavailable. Check that the backend API is running and reachable from this browser origin."
      : ziraStatus.data?.latestActionSummary ?? ziraStatus.data?.currentActivity ?? "Zira is available. No recent activity has been reported yet."
  const metrics = modelStats.data?.metrics ?? {}
  const datasetCounts = modelStats.data?.datasetCounts ?? {}
  const hasReportedModelData =
    hasFiniteMetric(metricValue(metrics, "precision", "precision")) ||
    hasFiniteMetric(metricValue(metrics, "recall", "recall")) ||
    hasFiniteMetric(metricValue(metrics, "coverage", "coverage")) ||
    hasFiniteMetric(metricValue(metrics, "validationSampleSize", "validation_sample_size")) ||
    hasFiniteMetric(metricValue(metrics, "prAuc", "pr_auc")) ||
    hasFiniteMetric(metricValue(metrics, "calibrationError", "calibration_error")) ||
    hasFiniteMetric(datasetCounts.observables) ||
    hasFiniteMetric(datasetCounts.detections)

  return (
    <section className="space-y-6">
      <div className="wb-hero-panel">
        <div className="max-w-3xl space-y-3">
          <p className="wb-kicker">AI Agents</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Zira plans scans. Aegis plans mitigation.</h1>
          <p className="text-sm leading-6 text-muted-foreground md:text-base">
            Launch either agent from one place. Zira owns scan planning, while Aegis turns report evidence into read-only mitigation guidance.
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <article className="wb-panel space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/35 bg-cyan-400/10 text-cyan-200">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="wb-kicker">Zira</p>
                  <h2 className="mt-1 text-xl font-semibold">Scan planning</h2>
                </div>
                <span className="wb-chip">{ziraStatus.data?.indicatorLabel ?? "Loading"}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Ask for recommendations, create plans, or run bounded scans against live inventory.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-surface-2/45 p-3 text-sm text-muted-foreground">
            {ziraSummary}
          </div>
          <Link className="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80" href="/scan-analyst">
            Open Zira
          </Link>
        </article>

        <article className="wb-panel space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-400/35 bg-emerald-400/10 text-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="wb-kicker">Aegis</p>
                  <h2 className="mt-1 text-xl font-semibold">Mitigation planning</h2>
                </div>
                <span className="wb-chip">{aegisPlans.data?.totalCount ?? 0} plans</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Review reports, pasted text, PDFs, and IOC files without modifying systems.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-surface-2/45 p-3 text-sm text-muted-foreground">
            <Sparkles className="mr-2 inline h-4 w-4 text-primary" />
            Aegis may suggest follow-up scans, but Zira owns creating or running them.
          </div>
          <Link className="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80" href="/agents/aegis">
            Open Aegis
          </Link>
        </article>
      </div>

      <details className="wb-panel-muted group space-y-5" open={hasReportedModelData}>
        <summary className="-m-1 flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 rounded-lg p-1 transition-colors hover:bg-surface-2/45 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="wb-kicker">Diagnostics</p>
            <h2 className="mt-2 text-base font-semibold">Decision model telemetry</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {modelStats.isError
                ? "Telemetry is unavailable. Agent entry points remain usable."
                : modelStats.isLoading
                  ? "Checking optional model registry metrics."
                  : hasReportedModelData
                    ? `${modelStats.data?.modelVersion ?? "Unversioned model"} on ${modelStats.data?.datasetVersion ?? "unversioned dataset"}.`
                    : "No production model metrics are reported yet. Expand only for diagnostics."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {modelStats.isLoading ? <span className="wb-chip">Checking</span> : null}
            {modelStats.data?.status ? <span className="wb-chip">{modelStats.data.status}</span> : null}
            {modelStats.data?.readinessStatus ? <span className="wb-chip">{modelStats.data.readinessStatus}</span> : null}
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </div>
        </summary>

        {!hasReportedModelData && !modelStats.isLoading ? (
          <div className="rounded-lg border border-border/60 bg-surface-2/45 p-3 text-sm text-muted-foreground">
            Detailed model metrics are not reported yet. The hub keeps this section collapsed until real precision, recall, coverage, or dataset counts are available.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-surface-2/45 p-4">
                <p className="wb-kicker">Precision</p>
                <p className="mt-2 text-2xl font-semibold">{formatPercentMetric(metricValue(metrics, "precision", "precision"))}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-2/45 p-4">
                <p className="wb-kicker">Recall</p>
                <p className="mt-2 text-2xl font-semibold">{formatPercentMetric(metricValue(metrics, "recall", "recall"))}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-2/45 p-4">
                <p className="wb-kicker">Coverage</p>
                <p className="mt-2 text-2xl font-semibold">{formatPercentMetric(metricValue(metrics, "coverage", "coverage"))}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-2/45 p-4">
                <p className="wb-kicker">Validation Sample</p>
                <p className="mt-2 text-2xl font-semibold">{formatNumberMetric(metricValue(metrics, "validationSampleSize", "validation_sample_size"))}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-surface-2/45 p-4">
                <p className="wb-kicker">PR AUC</p>
                <p className="mt-2 text-lg font-semibold">{formatNumberMetric(metricValue(metrics, "prAuc", "pr_auc"))}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-2/45 p-4">
                <p className="wb-kicker">Calibration Error</p>
                <p className="mt-2 text-lg font-semibold">{formatNumberMetric(metricValue(metrics, "calibrationError", "calibration_error"))}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-2/45 p-4">
                <p className="wb-kicker">Dataset Rows</p>
                <p className="mt-2 text-lg font-semibold">
                  {formatNumberMetric(datasetCounts.observables)} observables / {formatNumberMetric(datasetCounts.detections)} detections
                </p>
              </div>
            </div>
          </>
        )}
      </details>
    </section>
  )
}
