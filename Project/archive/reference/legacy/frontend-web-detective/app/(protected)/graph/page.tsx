"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/components/toast-provider"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { useApiData } from "@/hooks/use-api-data"
import { useGraphPanZoom } from "@/hooks/use-graph-pan-zoom"
import { apiFetch } from "@/lib/api"
import { runCorrelation } from "@/lib/intel-api"

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

type GraphResponse = {
  seedId: number
  nodes: GraphNode[]
  edges: GraphEdge[]
}

type StoryResponse = {
  story: {
    observableId: number
    summary: string
    evidenceCount: number
    ruleHits: number
    computedUtc: string
  }
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

export default function GraphPage() {
  const params = useSearchParams()
  const { notify } = useToast()
  const seed = Number(params.get("seed") ?? "1")
  const safeSeed = Number.isFinite(seed) && seed > 0 ? seed : 1
  const [depth, setDepth] = useState<1 | 2>(2)
  const [limit, setLimit] = useState(180)
  const [selected, setSelected] = useState<number>(safeSeed)
  const [running, setRunning] = useState(false)
  const [story, setStory] = useState<StoryResponse["story"] | null>(null)

  const graphPath = `/api/graph/explore?seedId=${safeSeed}&depth=${depth}&limit=${limit}`
  const { data, loading, error } = useApiData<GraphResponse>(
    graphPath,
    { seedId: safeSeed, nodes: [], edges: [] }
  )

  useEffect(() => {
    setSelected(safeSeed)
  }, [safeSeed])

  const selectedNode = useMemo(() => data.nodes.find((node) => node.id === selected) ?? null, [data.nodes, selected])
  const linkedEdgeCount = useMemo(
    () => data.edges.filter((edge) => edge.source === selected || edge.target === selected).length,
    [data.edges, selected]
  )

  useEffect(() => {
    let mounted = true

    async function loadStory() {
      if (!selectedNode) {
        setStory(null)
        return
      }

      try {
        const response = await apiFetch<StoryResponse>(`/api/correlation/stories/${selectedNode.id}`)
        if (mounted) {
          setStory(response.story)
        }
      } catch {
        if (mounted) {
          setStory(null)
        }
      }
    }

    loadStory()
    return () => {
      mounted = false
    }
  }, [selectedNode])

  const layout = useMemo(() => {
    const width = 980
    const height = 520
    if (data.nodes.length === 0) {
      return { width, height, positions: new Map<number, { x: number; y: number }>() }
    }

    const positions = new Map<number, { x: number; y: number }>()
    const centerX = width / 2
    const centerY = height / 2
    const seedNode = data.nodes.find((node) => node.id === data.seedId) ?? data.nodes[0]
    positions.set(seedNode.id, { x: centerX, y: centerY })

    const others = data.nodes.filter((node) => node.id !== seedNode.id)
    const radius = Math.min(width, height) * 0.38
    others.forEach((node, index) => {
      const angle = (index / Math.max(1, others.length)) * Math.PI * 2
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      })
    })

    return { width, height, positions }
  }, [data.nodes, data.seedId])
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
  const edgeLayers = useMemo(() => buildEdgeLayers(data.edges, layout.positions), [data.edges, layout.positions])
  const labelsEnabled = data.nodes.length <= 140

  async function rerunCorrelation() {
    setRunning(true)
    try {
      const response = await runCorrelation()
      notify(`Correlation run complete. ${response.clustersProduced} clusters produced.`, "success")
    } catch (err) {
      notify(err instanceof Error ? err.message : "Correlation run failed.", "error")
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_360px]">
      <Card className="fade-up p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">IOC Relationship Graph</h2>
            <p className="text-xs text-[var(--muted-foreground)]">Seed node {safeSeed} with correlation context</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="toolbar-zoom">
              <Button type="button" className="h-7 px-2 text-xs" size="sm" variant="outline" onClick={zoomOut} aria-label="Zoom out">
                -
              </Button>
              <span className="min-w-12 text-center text-xs text-[var(--muted-foreground)]">{zoomPercent}%</span>
              <Button type="button" className="h-7 px-2 text-xs" size="sm" variant="outline" onClick={zoomIn} aria-label="Zoom in">
                +
              </Button>
              <Button type="button" className="h-7 px-2 text-xs" size="sm" variant="outline" onClick={reset}>
                Reset
              </Button>
            </div>
            <Select
              className="h-9 min-w-[7.5rem] w-auto text-sm"
              value={depth}
              onChange={(event) => setDepth(event.target.value === "1" ? 1 : 2)}
            >
              <option value={1}>Depth 1</option>
              <option value={2}>Depth 2</option>
            </Select>
            <Select className="h-9 min-w-[8.5rem] w-auto text-sm" value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
              <option value={120}>120 nodes</option>
              <option value={180}>180 nodes</option>
              <option value={240}>240 nodes</option>
            </Select>
            <Button type="button" className="h-9 px-3 text-sm" variant="outline" onClick={rerunCorrelation} disabled={running}>
              {running ? "Running..." : "Recompute"}
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-2">
          {loading ? (
            <div className="shimmer h-[520px] rounded-lg" />
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className={`h-[520px] w-full ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
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
                {data.nodes.map((node) => {
                  const position = layout.positions.get(node.id)
                  if (!position) {
                    return null
                  }

                  const active = selected === node.id
                  return (
                    <g
                      key={node.id}
                      onClick={() => {
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false
                          return
                        }
                        setSelected(node.id)
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={active ? 13 : 10}
                        fill={nodeColor(node.confidence)}
                        stroke={active ? "white" : "rgba(255,255,255,0.4)"}
                        strokeWidth={active ? 2 : 1}
                      />
                      {labelsEnabled || active || node.id === data.seedId ? (
                        <text
                          x={position.x}
                          y={position.y - 15}
                          textAnchor="middle"
                          className="pointer-events-none fill-[var(--foreground)] text-[10px]"
                        >
                          {node.observableType.toUpperCase()}
                        </text>
                      ) : null}
                    </g>
                  )
                })}
              </g>
            </svg>
          )}
        </div>
      </Card>

      <aside className="space-y-4">
        <Card className="fade-up fade-delay-1 p-5">
          <CardTitle className="mb-2 text-sm">Selected Node</CardTitle>
          {selectedNode ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{selectedNode.label}</p>
              <p className="text-[var(--muted-foreground)]">Type: {selectedNode.observableType.toUpperCase()}</p>
              <p className="text-[var(--muted-foreground)]">Status: {selectedNode.status}</p>
              <p className="text-[var(--muted-foreground)]">Confidence: {selectedNode.confidence}%</p>
              <p className="text-[var(--muted-foreground)]">
                Linked edges: {linkedEdgeCount}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">Node ID: {selectedNode.id}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Select a node to inspect details.</p>
          )}
          {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
        </Card>

        <Card className="fade-up fade-delay-2 p-5">
          <CardTitle className="mb-2 text-sm">Correlation Story</CardTitle>
          {selectedNode && story?.observableId === selectedNode.id ? (
            <div className="space-y-2 text-sm">
              <p className="text-[var(--muted-foreground)]">{story.summary}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Evidence: {story.evidenceCount} | Rule Hits: {story.ruleHits}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No story available for this node yet.</p>
          )}
          {!story ? <CardDescription className="mt-3 text-xs">Awaiting backend story detail for this observable.</CardDescription> : null}
        </Card>
      </aside>
    </section>
  )
}
