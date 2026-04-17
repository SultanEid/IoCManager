"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useApiData } from "@/hooks/use-api-data"

type IocRow = {
  id: number
  type: string
  value: string
  status: string
  confidence: number
  sourceCount: number
  firstSeenUtc: string
  lastSeenUtc: string
  expiresAtUtc?: string | null
  confidenceFactors: Record<string, number>
}

type GraphNodeDetail = {
  node: {
    id: number
    nodeType: string
    observableType: string
    label: string
    status: string
    confidence: number
  }
  neighbors: Array<{
    id: number
    nodeType: string
    observableType: string
    label: string
    status: string
    confidence: number
  }>
  edges: Array<{
    id: number
    source: number
    target: number
    relationshipType: string
    confidence: number
    evidenceCount: number
  }>
}

type CoverageRow = {
  observableId: number
  type: string
  value: string
  confidence: number
  families: Record<string, string>
}

type Story = {
  observableId: number
  summary: string
  evidenceCount: number
  ruleHits: number
  computedUtc: string
}

type AuditRow = {
  id: number
  when: string
  actor: string
  action: string
  entity: string
  details: string
}

function factorTone(value: number) {
  if (value >= 20) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
  }
  if (value >= 10) {
    return "border-amber-500/40 bg-amber-500/10 text-amber-200"
  }
  return "border-[var(--input)] text-[var(--muted-foreground)]"
}

function coverageTone(value: string | undefined) {
  const normalized = (value ?? "none").toLowerCase()
  if (normalized === "full") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
  }
  if (normalized === "partial") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-200"
  }
  return "border-red-500/35 bg-red-500/10 text-red-200"
}

function formatWhen(value: string | null | undefined) {
  if (!value) {
    return "Not available"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Not available"
  }

  return date.toLocaleString()
}

export default function IocDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = Number(params.id)
  const safeId = Number.isFinite(id) && id > 0 ? id : 1

  const { data: iocData, loading: loadingIoc } = useApiData<{ items: IocRow[]; pagination: { total: number } }>(
    "/api/iocs?pageSize=500",
    { items: [], pagination: { total: 0 } }
  )
  const { data: nodeData, loading: loadingNode } = useApiData<GraphNodeDetail>(`/api/graph/node/${safeId}`, {
    node: {
      id: safeId,
      nodeType: "",
      observableType: "",
      label: "",
      status: "",
      confidence: 0,
    },
    neighbors: [],
    edges: [],
  })
  const { data: storyData, loading: loadingStory } = useApiData<{ story: Story }>(`/api/correlation/stories/${safeId}`, {
    story: {
      observableId: safeId,
      summary: "",
      evidenceCount: 0,
      ruleHits: 0,
      computedUtc: "",
    },
  })
  const { data: coverageData, loading: loadingCoverage } = useApiData<{ rows: CoverageRow[]; gaps: Array<{ observableId: number; missingFamilies: string }> }>(
    "/api/detections/coverage",
    { rows: [], gaps: [] }
  )
  const { data: auditData, loading: loadingAudit } = useApiData<{ rows: AuditRow[] }>("/api/audit/logs", { rows: [] })

  const ioc = useMemo(() => iocData.items.find((item) => item.id === safeId) ?? null, [iocData.items, safeId])
  const coverage = useMemo(
    () => coverageData.rows.find((row) => row.observableId === safeId) ?? null,
    [coverageData.rows, safeId]
  )
  const coverageGap = useMemo(
    () => coverageData.gaps.find((gap) => gap.observableId === safeId) ?? null,
    [coverageData.gaps, safeId]
  )
  const confidenceFactors = useMemo(() => {
    if (!ioc?.confidenceFactors) {
      return [] as Array<[string, number]>
    }
    return Object.entries(ioc.confidenceFactors).sort((a, b) => b[1] - a[1])
  }, [ioc])

  const lifecycleEvents = [
    { label: "First Seen", value: formatWhen(ioc?.firstSeenUtc) },
    { label: "Last Seen", value: formatWhen(ioc?.lastSeenUtc) },
    { label: "Expires At", value: formatWhen(ioc?.expiresAtUtc) },
    { label: "Lifecycle Status", value: ioc?.status ? ioc.status : "Awaiting backend field" },
  ]

  const auditRows = useMemo(() => {
    return auditData.rows
      .filter((row) => row.entity.includes(String(safeId)) || row.details.includes(String(safeId)))
      .slice(0, 6)
  }, [auditData.rows, safeId])

  const displayValue = ioc?.value || nodeData.node.label || `IOC #${safeId}`
  const displayType = ioc?.type?.toUpperCase() || nodeData.node.observableType?.toUpperCase() || "UNKNOWN"
  const displayStatus = ioc?.status || nodeData.node.status || "n/a"

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      <section className="space-y-4">
        <article className="surface fade-up p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="section-head">
              <p className="section-kicker">IOC Detail</p>
              <h2 className="text-xl font-semibold">{displayValue}</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {displayType} · {displayStatus}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="h-9 px-3 text-sm" size="sm" type="button" variant="outline" onClick={() => router.push(`/graph?seed=${safeId}`)}>
                Pivot Graph
              </Button>
              <Button className="h-9 px-3 text-sm" size="sm" type="button" variant="outline" onClick={() => router.push(`/investigate?seed=${safeId}`)}>
                Open Story
              </Button>
              <Button className="h-9 px-3 text-sm" size="sm" type="button" variant="outline" onClick={() => router.push(`/coverage?focus=${safeId}`)}>
                Coverage Impact
              </Button>
            </div>
          </div>

          {loadingIoc ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="shimmer h-16 rounded-md" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-[var(--input)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Confidence</p>
                <p className="text-lg font-semibold">{ioc?.confidence ?? nodeData.node.confidence}%</p>
              </div>
              <div className="rounded-lg border border-[var(--input)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Sources</p>
                <p className="text-lg font-semibold">{ioc?.sourceCount ?? "n/a"}</p>
              </div>
              <div className="rounded-lg border border-[var(--input)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Neighbors</p>
                <p className="text-lg font-semibold">{nodeData.neighbors.length}</p>
              </div>
              <div className="rounded-lg border border-[var(--input)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Edges</p>
                <p className="text-lg font-semibold">{nodeData.edges.length}</p>
              </div>
            </div>
          )}
        </article>

        <article className="surface fade-up fade-delay-1 p-5">
          <h3 className="mb-3 text-sm font-semibold">Confidence Explainability</h3>
          {confidenceFactors.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Awaiting backend field: confidence factors are not available for this IOC yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {confidenceFactors.map(([key, value]) => (
                <div key={key} className={`rounded-full border px-3 py-1.5 text-xs ${factorTone(value)}`}>
                  <span className="mr-1 capitalize">{key.replace(/_/g, " ")}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="surface fade-up fade-delay-2 p-5">
          <h3 className="mb-3 text-sm font-semibold">Lifecycle Timeline</h3>
          <div className="space-y-2">
            {lifecycleEvents.map((event) => (
              <div key={event.label} className="flex items-center justify-between rounded-lg border border-[var(--input)] px-3 py-2">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">{event.label}</p>
                <p className="text-sm font-medium">{event.value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="surface fade-up fade-delay-3 p-5">
          <h3 className="mb-3 text-sm font-semibold">Relationship Context</h3>
          {loadingNode ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="shimmer h-11 rounded-md" />
              ))}
            </div>
          ) : nodeData.neighbors.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No neighbor data returned for this node.</p>
          ) : (
            <div className="space-y-2">
              {nodeData.neighbors.slice(0, 10).map((neighbor) => (
                <button
                  key={neighbor.id}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--input)] p-2.5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--primary)_38%,transparent)]"
                  type="button"
                  onClick={() => router.push(`/ioc/${neighbor.id}`)}
                >
                  <span className="truncate text-sm font-medium">{neighbor.label}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{neighbor.confidence}%</span>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>

      <aside className="space-y-4">
        <article className="surface fade-up p-5">
          <h3 className="mb-2 text-sm font-semibold">Detection Coverage</h3>
          {loadingCoverage ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="shimmer h-10 rounded-md" />
              ))}
            </div>
          ) : coverage ? (
            <div className="space-y-2 text-sm">
              {Object.entries(coverage.families).map(([family, state]) => (
                <div key={family} className={`flex items-center justify-between rounded-md border px-2 py-1.5 ${coverageTone(state)}`}>
                  <span className="uppercase text-[10px] tracking-[0.12em]">{family}</span>
                  <span className="font-semibold capitalize">{state}</span>
                </div>
              ))}
              {coverageGap ? (
                <p className="text-xs text-[var(--muted-foreground)]">Missing families: {coverageGap.missingFamilies}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Awaiting backend field: no coverage row exists for this IOC yet.</p>
          )}
        </article>

        <article className="surface fade-up fade-delay-1 p-5">
          <h3 className="mb-2 text-sm font-semibold">Correlation Story</h3>
          {loadingStory ? (
            <div className="space-y-2">
              <div className="shimmer h-4 rounded-md" />
              <div className="shimmer h-4 rounded-md" />
              <div className="shimmer h-4 w-3/4 rounded-md" />
            </div>
          ) : storyData.story.summary ? (
            <div className="space-y-2 text-sm">
              <p className="text-[var(--muted-foreground)]">{storyData.story.summary}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Evidence {storyData.story.evidenceCount} · Rule hits {storyData.story.ruleHits}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Awaiting backend field: no narrative story is available for this IOC.</p>
          )}
        </article>

        <article className="surface fade-up fade-delay-2 p-5">
          <h3 className="mb-2 text-sm font-semibold">Audit Trail Summary</h3>
          {loadingAudit ? (
            <div className="space-y-2">
              <div className="shimmer h-10 rounded-md" />
              <div className="shimmer h-10 rounded-md" />
            </div>
          ) : auditRows.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Awaiting backend field: no IOC-scoped audit entries were matched for this indicator.
            </p>
          ) : (
            <div className="space-y-2">
              {auditRows.map((row) => (
                <div key={row.id} className="rounded-md border border-[var(--input)] px-3 py-2">
                  <p className="text-xs text-[var(--muted-foreground)]">{formatWhen(row.when)} · {row.actor}</p>
                  <p className="text-sm font-semibold">{row.action}</p>
                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{row.details}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </aside>
    </div>
  )
}
