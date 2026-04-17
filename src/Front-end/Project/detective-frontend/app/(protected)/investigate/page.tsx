"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/toast-provider"
import { useApiData } from "@/hooks/use-api-data"
import { useGraphPanZoom } from "@/hooks/use-graph-pan-zoom"

type GraphNode = {
  id: number
  nodeType: string
  observableType: string
  label: string
  status: string
  confidence: number
}

type GraphEdge = {
  id: number
  source: number
  target: number
  relationshipType: string
  confidence: number
  evidenceCount: number
}

type ClusterRow = {
  id: number
  name: string
  riskLevel: string
  averageConfidence: number
  observableCount: number
  seedObservableId: number
}

type Story = {
  observableId: number
  summary: string
  evidenceCount: number
  ruleHits: number
  computedUtc: string
}

const INVESTIGATE_STORAGE_KEY = "detective.investigate.view.v1"
const INVESTIGATE_SNAPSHOT_STORAGE_KEY = "detective.investigate.snapshot.v1"

type CoverageRow = {
  observableId: number
  type: string
  value: string
  confidence: number
  families: Record<string, string>
}

type CoverageGap = {
  observableId: number
  type: string
  value: string
  confidence: number
  missingFamilies: string
}

function nodeColor(confidence: number) {
  if (confidence >= 85) {
    return "var(--destructive)"
  }
  if (confidence >= 70) {
    return "var(--primary)"
  }
  if (confidence >= 55) {
    return "var(--accent-secondary)"
  }
  return "var(--muted-foreground)"
}

function buildEdgeLayers(
  edges: GraphEdge[],
  positions: Map<number, { x: number; y: number }>
) {
  const layers: Record<"high" | "mid" | "low", string[]> = {
    high: [],
    mid: [],
    low: [],
  }

  for (const edge of edges) {
    const source = positions.get(edge.source)
    const target = positions.get(edge.target)
    if (!source || !target) {
      continue
    }

    const command = `M ${source.x} ${source.y} L ${target.x} ${target.y}`
    if (edge.confidence >= 80) {
      layers.high.push(command)
      continue
    }
    if (edge.confidence >= 60) {
      layers.mid.push(command)
      continue
    }
    layers.low.push(command)
  }

  return {
    high: layers.high.join(" "),
    mid: layers.mid.join(" "),
    low: layers.low.join(" "),
  }
}

export default function InvestigatePage() {
  const router = useRouter()
  const { notify } = useToast()
  const searchParams = useSearchParams()
  const initialSeed = Number(searchParams.get("seed") ?? "1")
  const safeInitialSeed = Number.isFinite(initialSeed) && initialSeed > 0 ? initialSeed : 1
  const [seed, setSeed] = useState(safeInitialSeed)
  const [seedInput, setSeedInput] = useState(String(safeInitialSeed))
  const [depth, setDepth] = useState<1 | 2>(() => {
    if (typeof window === "undefined") {
      return 2
    }
    try {
      const raw = window.localStorage.getItem(INVESTIGATE_STORAGE_KEY)
      if (!raw) {
        return 2
      }
      const parsed = JSON.parse(raw) as { depth?: 1 | 2 }
      return parsed.depth === 1 || parsed.depth === 2 ? parsed.depth : 2
    } catch {
      return 2
    }
  })
  const [limit, setLimit] = useState(() => {
    if (typeof window === "undefined") {
      return 180
    }
    try {
      const raw = window.localStorage.getItem(INVESTIGATE_STORAGE_KEY)
      if (!raw) {
        return 180
      }
      const parsed = JSON.parse(raw) as { limit?: number }
      return parsed.limit && [120, 180, 240].includes(parsed.limit) ? parsed.limit : 180
    } catch {
      return 180
    }
  })
  const [selectedNodeId, setSelectedNodeId] = useState<number>(safeInitialSeed)
  const [hasSnapshot, setHasSnapshot] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }
    return window.localStorage.getItem(INVESTIGATE_SNAPSHOT_STORAGE_KEY) !== null
  })

  useEffect(() => {
    window.localStorage.setItem(INVESTIGATE_STORAGE_KEY, JSON.stringify({ depth, limit }))
  }, [depth, limit])

  const graphPath = `/api/graph/explore?seedId=${seed}&depth=${depth}&limit=${limit}`
  const { data: graphData, loading: loadingGraph } = useApiData<{ seedId: number; nodes: GraphNode[]; edges: GraphEdge[] }>(graphPath, {
    seedId: seed,
    nodes: [],
    edges: [],
  })
  const { data: clusterData, loading: loadingClusters } = useApiData<{ clusters: ClusterRow[] }>("/api/correlation/clusters", {
    clusters: [],
  })
  const { data: storyData, loading: loadingStory } = useApiData<{ story: Story }>(`/api/correlation/stories/${selectedNodeId}`, {
    story: {
      observableId: selectedNodeId,
      summary: "",
      evidenceCount: 0,
      ruleHits: 0,
      computedUtc: "",
    },
  })
  const { data: coverageData, loading: loadingCoverage } = useApiData<{ rows: CoverageRow[]; gaps: CoverageGap[] }>(
    "/api/detections/coverage",
    { rows: [], gaps: [] }
  )

  const selectedNode = useMemo(
    () => graphData.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId]
  )
  const selectedCoverage = useMemo(
    () => coverageData.rows.find((row) => row.observableId === selectedNodeId) ?? null,
    [coverageData.rows, selectedNodeId]
  )
  const selectedGap = useMemo(
    () => coverageData.gaps.find((gap) => gap.observableId === selectedNodeId) ?? null,
    [coverageData.gaps, selectedNodeId]
  )

  const layout = useMemo(() => {
    const width = 900
    const height = 500
    const positions = new Map<number, { x: number; y: number }>()
    if (graphData.nodes.length === 0) {
      return { width, height, positions }
    }

    const centerX = width / 2
    const centerY = height / 2
    const root = graphData.nodes.find((node) => node.id === graphData.seedId) ?? graphData.nodes[0]
    positions.set(root.id, { x: centerX, y: centerY })
    const others = graphData.nodes.filter((node) => node.id !== root.id)
    const radius = Math.min(width, height) * 0.38
    others.forEach((node, index) => {
      const angle = (index / Math.max(others.length, 1)) * Math.PI * 2
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      })
    })
    return { width, height, positions }
  }, [graphData.nodes, graphData.seedId])
  const {
    svgRef,
    groupRef,
    handlers,
    suppressClickRef,
    zoomPercent,
    isPanning,
    zoomIn,
    zoomOut,
    reset,
  } = useGraphPanZoom({ width: layout.width, height: layout.height })
  const edgeLayers = useMemo(() => buildEdgeLayers(graphData.edges, layout.positions), [graphData.edges, layout.positions])
  const labelsEnabled = graphData.nodes.length <= 140

  function applySeedInput() {
    const nextSeed = Math.max(1, Number(seedInput) || 1)
    setSeed(nextSeed)
    setSeedInput(String(nextSeed))
    setSelectedNodeId(nextSeed)
  }

  function saveSnapshot() {
    const snapshot = {
      seed,
      depth,
      limit,
      selectedNodeId,
      savedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(INVESTIGATE_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot))
    setHasSnapshot(true)
    notify("Investigation snapshot saved.", "success")
  }

  function loadSnapshot() {
    try {
      const raw = window.localStorage.getItem(INVESTIGATE_SNAPSHOT_STORAGE_KEY)
      if (!raw) {
        notify("No saved investigation snapshot found.", "info")
        return
      }
      const snapshot = JSON.parse(raw) as {
        seed?: number
        depth?: 1 | 2
        limit?: number
        selectedNodeId?: number
      }
      const nextSeed = Math.max(1, Number(snapshot.seed ?? 1))
      setSeed(nextSeed)
      setSeedInput(String(nextSeed))
      if (snapshot.depth === 1 || snapshot.depth === 2) {
        setDepth(snapshot.depth)
      }
      if (snapshot.limit && [120, 180, 240].includes(snapshot.limit)) {
        setLimit(snapshot.limit)
      }
      setSelectedNodeId(Math.max(1, Number(snapshot.selectedNodeId ?? nextSeed)))
      notify("Investigation snapshot restored.", "success")
    } catch {
      notify("Snapshot is malformed and could not be loaded.", "error")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="fade-up p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[132px_132px_132px_auto] xl:items-end">
            <label className="space-y-1.5 text-sm">
              <span className="text-[var(--muted-foreground)]">Seed IOC ID</span>
              <Input
                className="w-28"
                type="number"
                min={1}
                value={seedInput}
                onChange={(event) => setSeedInput(event.target.value)}
                onBlur={applySeedInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    applySeedInput()
                  }
                }}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-[var(--muted-foreground)]">Depth</span>
              <Select
                className="min-w-[8rem] w-auto"
                value={depth}
                onChange={(event) => setDepth(event.target.value === "1" ? 1 : 2)}
              >
                <option value={1}>1 hop</option>
                <option value={2}>2 hops</option>
              </Select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-[var(--muted-foreground)]">Node Limit</span>
              <Select
                className="min-w-[8.5rem] w-auto"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                <option value={120}>120</option>
                <option value={180}>180</option>
                <option value={240}>240</option>
              </Select>
            </label>
            <Button className="h-10 min-w-28 px-3.5 text-sm whitespace-nowrap sm:justify-self-start xl:justify-self-auto" type="button" variant="outline" onClick={applySeedInput}>
              Focus Seed
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap xl:justify-end">
            <div className="toolbar-zoom">
              <Button type="button" className="h-8 px-2 text-xs" size="sm" variant="outline" onClick={zoomOut} aria-label="Zoom out">
                -
              </Button>
              <span className="min-w-12 text-center text-xs text-[var(--muted-foreground)]">{zoomPercent}%</span>
              <Button type="button" className="h-8 px-2 text-xs" size="sm" variant="outline" onClick={zoomIn} aria-label="Zoom in">
                +
              </Button>
              <Button type="button" className="h-8 px-2 text-xs" size="sm" variant="outline" onClick={reset}>
                Reset
              </Button>
            </div>
            <Button className="h-10 px-3.5 text-sm whitespace-nowrap" type="button" variant="outline" onClick={saveSnapshot}>
              Save Snapshot
            </Button>
            <Button
              className="h-10 px-3.5 text-sm whitespace-nowrap"
              type="button"
              onClick={loadSnapshot}
              variant="outline"
              disabled={!hasSnapshot}
            >
              Load Snapshot
            </Button>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <article className="surface fade-up p-5">
          {loadingGraph ? (
            <div className="shimmer h-[500px] rounded-lg" />
          ) : graphData.nodes.length === 0 ? (
            <div className="flex h-[500px] items-center justify-center text-sm text-[var(--muted-foreground)]">
              No graph data returned for the selected seed/depth.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)]">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                className={`h-[500px] w-full ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
                style={{ touchAction: "none" }}
                {...handlers}
              >
                <g ref={groupRef}>
                  {edgeLayers.low ? (
                    <path d={edgeLayers.low} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.05} vectorEffect="non-scaling-stroke" />
                  ) : null}
                  {edgeLayers.mid ? (
                    <path d={edgeLayers.mid} fill="none" stroke="rgba(255,255,255,0.19)" strokeWidth={1.35} vectorEffect="non-scaling-stroke" />
                  ) : null}
                  {edgeLayers.high ? (
                    <path d={edgeLayers.high} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1.65} vectorEffect="non-scaling-stroke" />
                  ) : null}
                  {graphData.nodes.map((node) => {
                    const point = layout.positions.get(node.id)
                    if (!point) {
                      return null
                    }
                    const selected = selectedNodeId === node.id
                    return (
                      <g
                        key={node.id}
                        className="cursor-pointer"
                        onClick={() => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false
                            return
                          }
                          setSelectedNodeId(node.id)
                        }}
                      >
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={selected ? 13 : 10}
                          fill={nodeColor(node.confidence)}
                          stroke={selected ? "white" : "rgba(255,255,255,0.3)"}
                          strokeWidth={selected ? 2 : 1}
                        />
                        {labelsEnabled || selectedNodeId === node.id || node.id === graphData.seedId ? (
                          <text x={point.x} y={point.y - 16} textAnchor="middle" className="fill-[var(--foreground)] text-[10px]">
                            {node.observableType.toUpperCase()}
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </g>
              </svg>
            </div>
          )}
        </article>

        <aside className="space-y-4">
          <article className="surface fade-up fade-delay-1 p-5">
            <h2 className="mb-2 text-sm font-semibold">Node Inspector</h2>
            {selectedNode ? (
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold">{selectedNode.label}</p>
                <p className="text-[var(--muted-foreground)]">Type: {selectedNode.observableType.toUpperCase()}</p>
                <p className="text-[var(--muted-foreground)]">Status: {selectedNode.status}</p>
                <p className="text-[var(--muted-foreground)]">Confidence: {selectedNode.confidence}%</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/ioc/${selectedNode.id}`)}>
                    IOC Detail
                  </Button>
                  <Button
                    className="h-8 px-2.5 text-xs"
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSeed(selectedNode.id)
                      setSeedInput(String(selectedNode.id))
                      setSelectedNodeId(selectedNode.id)
                    }}
                  >
                    Re-seed
                  </Button>
                  <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/coverage?focus=${selectedNode.id}`)}>
                    Coverage Impact
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Select a node to inspect relationships and evidence context.</p>
            )}
          </article>

          <article className="surface fade-up fade-delay-2 p-5">
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
                  Evidence {storyData.story.evidenceCount} | Rule hits {storyData.story.ruleHits}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Awaiting backend field: no story text for this observable yet.</p>
            )}
          </article>

          <article className="surface fade-up fade-delay-3 p-5">
            <h3 className="mb-2 text-sm font-semibold">Case-ready Clusters</h3>
            {loadingClusters ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="shimmer h-12 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {clusterData.clusters.slice(0, 5).map((cluster) => (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => router.push(`/graph?seed=${cluster.seedObservableId}`)}
                    className="w-full rounded-lg border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-2.5 text-left transition hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                  >
                    <p className="truncate text-sm font-semibold">{cluster.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {cluster.riskLevel} risk | {cluster.observableCount} IOCs
                    </p>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="surface fade-up p-5">
            <h3 className="mb-2 text-sm font-semibold">Coverage Impact</h3>
            {loadingCoverage ? (
              <div className="space-y-2">
                <div className="shimmer h-10 rounded-md" />
                <div className="shimmer h-10 rounded-md" />
                <div className="shimmer h-10 rounded-md" />
              </div>
            ) : selectedCoverage ? (
              <div className="space-y-2 text-sm">
                {Object.entries(selectedCoverage.families).map(([family, state]) => (
                  <div key={family} className="flex items-center justify-between rounded-md border border-[var(--input)] px-2.5 py-2">
                    <span className="uppercase text-[11px] tracking-[0.08em] text-[var(--muted-foreground)]">{family}</span>
                    <span className="capitalize">{state}</span>
                  </div>
                ))}
                {selectedGap ? (
                  <p className="text-xs text-[var(--muted-foreground)]">Missing families: {selectedGap.missingFamilies}</p>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">No missing rule families for this selected node.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Awaiting backend field: no coverage row exists for this selected node.
              </p>
            )}
          </article>
        </aside>
      </section>
    </div>
  )
}
