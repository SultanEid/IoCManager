"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/toast-provider"
import { useApiData } from "@/hooks/use-api-data"
import { promoteCluster } from "@/lib/intel-api"

type ClusterRow = {
  id: number
  name: string
  riskLevel: string
  averageConfidence: number
  observableCount: number
  seedObservableId: number
  caseId?: number | null
  computedUtc: string
}

type CoverageGap = {
  observableId: number
  type: string
  value: string
  confidence: number
  missingFamilies: string
}

export default function CorrelationPage() {
  const router = useRouter()
  const { notify } = useToast()
  const [focusedSeed, setFocusedSeed] = useState<number | null>(null)
  const [workingId, setWorkingId] = useState<number | null>(null)
  const { data: clusterData, loading: loadingClusters } = useApiData<{ clusters: ClusterRow[] }>("/api/correlation/clusters", {
    clusters: [],
  })
  const { data: coverageData, loading: loadingCoverage } = useApiData<{ gaps: CoverageGap[] }>("/api/detections/coverage", {
    gaps: [],
  })

  const topGaps = useMemo(() => coverageData.gaps.slice(0, 8), [coverageData.gaps])

  async function onPromote(clusterId: number) {
    setWorkingId(clusterId)
    try {
      const response = await promoteCluster(clusterId)
      notify(
        response.alreadyExisted ? `Case #${response.caseId} already exists for this cluster.` : `Cluster promoted to case #${response.caseId}.`,
        "success"
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to promote cluster.", "error")
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface fade-up p-5">
        <h2 className="mb-1 text-base font-semibold">Correlation Clusters</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          High-confidence IOC groups built from shared infrastructure, sightings, and attribution signals.
        </p>
      </section>

      <DataTable
        rows={clusterData.clusters}
        loading={loadingClusters}
        columns={[
          { key: "name", label: "Cluster" },
          {
            key: "riskLevel",
            label: "Risk",
            render: (row) => <span className="badge-chip uppercase">{String(row.riskLevel)}</span>,
          },
          { key: "averageConfidence", label: "Avg Confidence", className: "text-right" },
          { key: "observableCount", label: "IOCs", className: "text-right" },
          {
            key: "computedUtc",
            label: "Computed",
            render: (row) => new Date(row.computedUtc).toLocaleString(),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/graph?seed=${row.seedObservableId}`)}>
                  View Graph
                </Button>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/investigate?seed=${row.seedObservableId}`)}>
                  Open Story
                </Button>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => setFocusedSeed(row.seedObservableId)}>
                  Inspector
                </Button>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" onClick={() => onPromote(row.id)} disabled={workingId === row.id}>
                  {workingId === row.id ? "Promoting..." : row.caseId ? "Open Case" : "Promote to Case"}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <section className="surface fade-up fade-delay-1 p-5">
        <h3 className="mb-2 text-sm font-semibold">Case-readiness inspector</h3>
        {focusedSeed ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-[var(--muted-foreground)]">Seed IOC {focusedSeed} selected for deeper review.</p>
            <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/ioc/${focusedSeed}`)}>
              IOC Detail
            </Button>
            <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/investigate?seed=${focusedSeed}`)}>
              Investigation Workspace
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">Pick a cluster inspector action to prepare case context.</p>
        )}
      </section>

      <section className="surface fade-up fade-delay-2 p-5">
        <h3 className="mb-3 text-sm font-semibold">Coverage Gaps (High Confidence)</h3>
        {loadingCoverage ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="shimmer h-14 rounded-md" />
            ))}
          </div>
        ) : topGaps.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No uncovered high-confidence IOCs right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {topGaps.map((gap) => (
              <button
                key={gap.observableId}
                type="button"
                className="rounded-lg border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-3 text-left transition hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                onClick={() => router.push(`/graph?seed=${gap.observableId}`)}
              >
                <p className="truncate text-sm font-semibold">{gap.value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Missing: {gap.missingFamilies} | Confidence {gap.confidence}%
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
