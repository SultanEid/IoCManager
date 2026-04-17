"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { useApiData } from "@/hooks/use-api-data"

type DashboardMetric = {
  id: number
  title: string
  value: string
  delta: string
  headline: string
  description: string
}

type VisitorPoint = {
  date: string
  desktop: number
  mobile: number
}

type SectionRow = {
  id: number
  header: string
  type: string
  status: string
  target: string
  limit: string
  reviewer: string
}

type ClusterRow = {
  id: number
  name: string
  riskLevel: string
  averageConfidence: number
  observableCount: number
  seedObservableId: number
}

type CoverageGap = {
  observableId: number
  value: string
  confidence: number
  missingFamilies: string
}

function buildAreaPath(points: number[], width: number, height: number) {
  if (points.length === 0) {
    return { line: "", area: "" }
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = Math.max(1, max - min)
  const step = points.length === 1 ? width : width / (points.length - 1)

  const coords = points.map((value, index) => {
    const x = index * step
    const normalized = (value - min) / range
    const y = height - normalized * height
    return { x, y }
  })

  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
  const area = `${line} L ${width} ${height} L 0 ${height} Z`

  return { line, area }
}

export default function DashboardPage() {
  const router = useRouter()
  const [range, setRange] = useState<"7d" | "30d" | "90d">("90d")
  const { data: summaryData, loading: loadingSummary } = useApiData<{ metrics: DashboardMetric[] }>("/api/dashboard/summary", {
    metrics: [],
  })
  const { data: sectionData, loading: loadingSections } = useApiData<{ rows: SectionRow[] }>("/api/dashboard/sections", {
    rows: [],
  })
  const { data: visitorData, loading: loadingPoints } = useApiData<{ points: VisitorPoint[] }>(
    `/api/dashboard/visitors?range=${range}`,
    {
      points: [],
    }
  )
  const { data: clusterData, loading: loadingClusters } = useApiData<{ clusters: ClusterRow[] }>("/api/correlation/clusters", {
    clusters: [],
  })
  const { data: coverageData, loading: loadingCoverage } = useApiData<{ gaps: CoverageGap[] }>("/api/detections/coverage", {
    gaps: [],
  })

  const desktopPath = useMemo(
    () => buildAreaPath(visitorData.points.map((point) => point.desktop), 900, 260),
    [visitorData.points]
  )
  const mobilePath = useMemo(
    () => buildAreaPath(visitorData.points.map((point) => point.mobile), 900, 260),
    [visitorData.points]
  )

  return (
    <>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {loadingSummary
          ? Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className={`surface fade-up space-y-3 p-5 ${index > 0 ? "fade-delay-1" : ""}`}>
                <div className="shimmer h-4 w-3/5 rounded-md" />
                <div className="shimmer h-10 w-2/3 rounded-md" />
                <div className="shimmer h-4 w-4/5 rounded-md" />
                <div className="shimmer h-4 w-full rounded-md" />
              </article>
            ))
          : summaryData.metrics.map((metric, index) => (
              <article key={metric.id} className={`surface fade-up space-y-3 p-5 ${index > 0 ? "fade-delay-1" : ""}`}>
                <div className="flex items-start justify-between">
                  <h2 className="text-sm text-[var(--muted-foreground)]">{metric.title}</h2>
                  <span className="badge-chip">{metric.delta}</span>
                </div>
                <p className="text-4xl font-semibold tracking-tight">{metric.value}</p>
                <p className="text-base font-semibold">{metric.headline}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{metric.description}</p>
              </article>
            ))}
      </section>

      <section className="surface fade-up fade-delay-2 mt-5 p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold">Total Visitors</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Desktop and mobile traffic trend</p>
          </div>
          <div className="flex rounded-lg border border-[var(--input)] p-1">
            <Button className={`rounded px-3 py-1.5 text-sm ${range === "90d" ? "bg-[var(--muted)]" : ""}`} size="sm" variant="ghost" onClick={() => setRange("90d")}>
              Last 3 months
            </Button>
            <Button className={`rounded px-3 py-1.5 text-sm ${range === "30d" ? "bg-[var(--muted)]" : ""}`} size="sm" variant="ghost" onClick={() => setRange("30d")}>
              Last 30 days
            </Button>
            <Button className={`rounded px-3 py-1.5 text-sm ${range === "7d" ? "bg-[var(--muted)]" : ""}`} size="sm" variant="ghost" onClick={() => setRange("7d")}>
              Last 7 days
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_95%,transparent)] p-2 md:p-4">
          {loadingPoints ? (
            <div className="shimmer h-[260px] w-full min-w-[900px] rounded-lg" />
          ) : (
            <svg viewBox="0 0 900 260" className="h-[260px] w-[900px]">
              <defs>
                <linearGradient id="desktopFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(255,255,255,0.58)" />
                  <stop offset="95%" stopColor="rgba(255,255,255,0.06)" />
                </linearGradient>
                <linearGradient id="mobileFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(255,255,255,0.28)" />
                  <stop offset="95%" stopColor="rgba(255,255,255,0.04)" />
                </linearGradient>
              </defs>
              <path d={desktopPath.area} fill="url(#desktopFill)" />
              <path d={mobilePath.area} fill="url(#mobileFill)" />
              <path d={desktopPath.line} fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="2.2" />
              <path d={mobilePath.line} fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.8" />
            </svg>
          )}
        </div>
      </section>

      <section className="fade-up fade-delay-3 mt-5">
        <DataTable
          rows={sectionData.rows}
          loading={loadingSections}
          columns={[
            { key: "header", label: "Header" },
            { key: "type", label: "Section Type" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <span className="badge-chip">
                  {String(row.status)}
                </span>
              ),
            },
            { key: "target", label: "Target", className: "text-right" },
            { key: "limit", label: "Limit", className: "text-right" },
            { key: "reviewer", label: "Reviewer" },
          ]}
        />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="fade-up p-5">
          <CardTitle className="text-sm">Correlation Stories</CardTitle>
          <CardDescription className="mb-3 text-xs">Top correlated clusters with explainable context.</CardDescription>
          {loadingClusters ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="shimmer h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {clusterData.clusters.slice(0, 4).map((cluster) => (
                <Button
                  key={cluster.id}
                  type="button"
                  onClick={() => router.push(`/graph?seed=${cluster.seedObservableId}`)}
                  className="h-auto w-full justify-start rounded-lg border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-3 text-left transition-[border-color,background-color] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                  variant="ghost"
                >
                  <p className="text-sm font-semibold">{cluster.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {cluster.observableCount} observables | {cluster.averageConfidence}% confidence | {cluster.riskLevel} risk
                  </p>
                </Button>
              ))}
            </div>
          )}
        </Card>

        <Card className="fade-up fade-delay-1 p-5">
          <CardTitle className="text-sm">Coverage Gaps</CardTitle>
          <CardDescription className="mb-3 text-xs">High-confidence IOCs with incomplete Sigma/YARA/Snort coverage.</CardDescription>
          {loadingCoverage ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="shimmer h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {coverageData.gaps.slice(0, 4).map((gap) => (
                <Button
                  key={gap.observableId}
                  type="button"
                  onClick={() => router.push(`/graph?seed=${gap.observableId}`)}
                  className="h-auto w-full justify-start rounded-lg border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-3 text-left transition-[border-color,background-color] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                  variant="ghost"
                >
                  <p className="truncate text-sm font-semibold">{gap.value}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Missing: {gap.missingFamilies} | Confidence {gap.confidence}%</p>
                </Button>
              ))}
            </div>
          )}
        </Card>
      </section>
    </>
  )
}
