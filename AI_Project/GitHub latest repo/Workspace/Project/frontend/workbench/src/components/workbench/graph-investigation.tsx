"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import cytoscape from "cytoscape"
import type { GraphEdgeType, GraphEntityType, GraphNodeVM, GraphRelationshipsVM } from "@/shared/gateway/types"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/shared/ui/state-panels"
import { cn } from "@/lib/utils"
import { useWorkbenchInspector } from "@/components/workbench/workbench-inspector"

type GraphInvestigationProps = {
  graph: GraphRelationshipsVM
}

const entityColor: Record<GraphEntityType, string> = {
  case: "#7bc0ff",
  identity: "#f7cd6b",
  host: "#7ed6a7",
  domain: "#f38c8c",
  ip: "#ba95ff",
  malware: "#ff6b6b",
  tool: "#86e2f4",
  artifact: "#d9a3ff",
}

function formatUtc(utc: string) {
  return new Date(utc).toLocaleString()
}

function toDateInputValue(utc: string) {
  const date = new Date(utc)
  const two = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`
}

function fromDateInputValue(value: string, fallbackUtc: string) {
  if (!value) {
    return fallbackUtc
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallbackUtc
  }

  return parsed.toISOString()
}

function intersects(startUtc: string, endUtc: string, filterStartUtc: string, filterEndUtc: string) {
  const start = Date.parse(startUtc)
  const end = Date.parse(endUtc)
  const rangeStart = Date.parse(filterStartUtc)
  const rangeEnd = Date.parse(filterEndUtc)
  return start <= rangeEnd && end >= rangeStart
}

function buildNodeInspectorPayload(node: GraphNodeVM) {
  return {
    title: node.label,
    subtitle: `${node.entityType} | ${node.confidence}% confidence`,
    sections: [
      {
        id: "entity-metadata",
        title: "Entity Metadata",
        fields: Object.entries(node.metadata).map(([label, value]) => ({ label, value })),
        emptyMessage: "No metadata available.",
      },
      {
        id: "provenance",
        title: "Provenance",
        items: node.provenance.map((item) => ({ title: item })),
        emptyMessage: "No provenance available.",
      },
      {
        id: "sightings",
        title: "Sightings",
        items: node.sightings.map((item) => ({
          title: item.source,
          subtitle: `${item.count} sightings`,
          meta: `${formatUtc(item.firstSeenUtc)} to ${formatUtc(item.lastSeenUtc)}`,
        })),
        emptyMessage: "No sightings available.",
      },
      {
        id: "linked-cases",
        title: "Linked Cases",
        items: node.linkedCases.map((item) => ({
          title: item.title,
          subtitle: `${item.caseId.slice(0, 8)} | ${item.status}`,
        })),
        emptyMessage: "No linked cases.",
      },
      {
        id: "related-rules",
        title: "Related Rules",
        items: node.relatedRules.map((item) => ({
          title: item.name,
          subtitle: item.status,
        })),
        emptyMessage: "No related rules.",
      },
    ],
  }
}

export function GraphInvestigation({ graph }: GraphInvestigationProps) {
  const { openInspector } = useWorkbenchInspector()

  const [activeEntityTypes, setActiveEntityTypes] = useState<Set<GraphEntityType>>(() => new Set(graph.nodes.map((node) => node.entityType)))
  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<GraphEdgeType>>(() => new Set(graph.edges.map((edge) => edge.edgeType)))
  const [rangeStartUtc, setRangeStartUtc] = useState(graph.timeBounds.startUtc)
  const [rangeEndUtc, setRangeEndUtc] = useState(graph.timeBounds.endUtc)
  const [selectedPathHintId, setSelectedPathHintId] = useState<string | null>(graph.pathHints[0]?.id ?? null)

  const containerRef = useRef<HTMLDivElement | null>(null)

  const entityTypes = useMemo(() => Array.from(new Set(graph.nodes.map((node) => node.entityType))), [graph.nodes])
  const edgeTypes = useMemo(() => Array.from(new Set(graph.edges.map((edge) => edge.edgeType))), [graph.edges])

  const selectedPathHint = useMemo(
    () => graph.pathHints.find((item) => item.id === selectedPathHintId) ?? null,
    [graph.pathHints, selectedPathHintId],
  )

  const visibleNodeIds = useMemo(() => {
    const directVisible = graph.nodes.filter((node) => {
      if (node.id === graph.focalCaseId) {
        return true
      }

      if (!activeEntityTypes.has(node.entityType)) {
        return false
      }

      return node.sightings.some((sighting) => intersects(sighting.firstSeenUtc, sighting.lastSeenUtc, rangeStartUtc, rangeEndUtc))
    })

    return new Set(directVisible.map((node) => node.id))
  }, [activeEntityTypes, graph.focalCaseId, graph.nodes, rangeEndUtc, rangeStartUtc])

  const visibleEdges = useMemo(
    () =>
      graph.edges.filter((edge) => {
        if (!activeEdgeTypes.has(edge.edgeType)) {
          return false
        }

        if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
          return false
        }

        return intersects(edge.firstSeenUtc, edge.lastSeenUtc, rangeStartUtc, rangeEndUtc)
      }),
    [activeEdgeTypes, graph.edges, rangeEndUtc, rangeStartUtc, visibleNodeIds],
  )

  const visibleEdgesByNode = useMemo(() => {
    const set = new Set<string>()
    for (const edge of visibleEdges) {
      set.add(edge.source)
      set.add(edge.target)
    }

    return set
  }, [visibleEdges])

  const visibleNodes = useMemo(
    () => graph.nodes.filter((node) => node.id === graph.focalCaseId || (visibleNodeIds.has(node.id) && visibleEdgesByNode.has(node.id))),
    [graph.focalCaseId, graph.nodes, visibleEdgesByNode, visibleNodeIds],
  )

  const visibleElements = useMemo(
    () => [
      ...visibleNodes.map((node) => ({
        group: "nodes" as const,
        data: {
          id: node.id,
          label: node.label,
          entityType: node.entityType,
          confidence: node.confidence,
          isFocal: node.id === graph.focalCaseId,
        },
      })),
      ...visibleEdges.map((edge) => ({
        group: "edges" as const,
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          edgeType: edge.edgeType,
          semantic: edge.semantic,
          confidence: edge.confidence,
        },
      })),
    ],
    [graph.focalCaseId, visibleEdges, visibleNodes],
  )

  const edgeSemantics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of visibleEdges) {
      counts.set(edge.semantic, (counts.get(edge.semantic) ?? 0) + 1)
    }

    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])
  }, [visibleEdges])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
      return
    }

    try {
      const canvas = document.createElement("canvas")
      if (!canvas.getContext("2d")) {
        return
      }
    } catch {
      return
    }

    const cy = cytoscape({
      container,
      elements: visibleElements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": 10,
            color: "#d9e2f5",
            "text-wrap": "wrap",
            "text-max-width": "110px",
            "background-color": "#7bc0ff",
            "border-width": "1px",
            "border-color": "#0f172b",
            width: "32px",
            height: "32px",
          },
        },
        ...Object.entries(entityColor).map(([type, color]) => ({
          selector: `node[entityType = \"${type}\"]`,
          style: {
            "background-color": color,
          },
        })),
        {
          selector: "node[isFocal]",
          style: {
            width: "44px",
            height: "44px",
            "border-width": "3px",
            "border-color": "#ecf3ff",
            "font-size": 11,
            "font-weight": 700,
          },
        },
        {
          selector: "edge",
          style: {
            label: "data(edgeType)",
            "font-size": 9,
            "curve-style": "bezier",
            width: "1.8px",
            "line-color": "#7f89a8",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#7f89a8",
            "text-background-opacity": 1,
            "text-background-color": "#0f1424",
            "text-background-padding": "2px",
            color: "#bac8e6",
          },
        },
        {
          selector: "node.path-active, edge.path-active",
          style: {
            "border-color": "#f6f8ff",
            "border-width": "3px",
            "line-color": "#f5d565",
            "target-arrow-color": "#f5d565",
            width: "3px",
            opacity: 1,
            "z-index": 999,
          },
        },
        {
          selector: "node.path-muted, edge.path-muted",
          style: {
            opacity: 0.2,
          },
        },
      ],
    })

    cy.on("tap", "node", (event) => {
      const id = event.target.id()
      const node = visibleNodes.find((item) => item.id === id)
      if (node) {
        openInspector(buildNodeInspectorPayload(node))
      }
    })

    const activeHint = selectedPathHint
    if (activeHint) {
      const activeNodeIds = new Set(activeHint.nodeIds)
      const activeEdgeIds = new Set(activeHint.edgeIds)

      cy.nodes().forEach((node) => {
        if (activeNodeIds.has(node.id())) {
          node.addClass("path-active")
        } else {
          node.addClass("path-muted")
        }
      })

      cy.edges().forEach((edge) => {
        if (activeEdgeIds.has(edge.id())) {
          edge.addClass("path-active")
        } else {
          edge.addClass("path-muted")
        }
      })
    }

    cy.layout({
      name: "cose",
      animate: true,
      animationDuration: 260,
      fit: true,
      padding: 28,
      nodeRepulsion: 4800,
      idealEdgeLength: 120,
    }).run()

    return () => {
      cy.destroy()
    }
  }, [graph.nodes, openInspector, selectedPathHint, visibleElements, visibleNodes])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="wb-panel-muted p-3">
            <p className="wb-kicker">Entity Link Controls</p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Entity Type Filter</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {entityTypes.map((type) => {
                    const active = activeEntityTypes.has(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
                          active
                            ? "border-primary/60 bg-primary/15 text-foreground"
                            : "border-border/70 bg-surface-2/75 text-muted-foreground",
                        )}
                        onClick={() => {
                          const next = new Set(activeEntityTypes)
                          if (active) {
                            next.delete(type)
                          } else {
                            next.add(type)
                          }
                          setActiveEntityTypes(next)
                        }}
                      >
                        {type}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Edge Type Filter</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {edgeTypes.map((type) => {
                    const active = activeEdgeTypes.has(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          active
                            ? "border-primary/60 bg-primary/15 text-foreground"
                            : "border-border/70 bg-surface-2/75 text-muted-foreground",
                        )}
                        onClick={() => {
                          const next = new Set(activeEdgeTypes)
                          if (active) {
                            next.delete(type)
                          } else {
                            next.add(type)
                          }
                          setActiveEdgeTypes(next)
                        }}
                      >
                        {type}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-xs text-muted-foreground">
                  From
                  <input
                    className="mt-1 w-full rounded-md border border-border/70 bg-surface-1/85 px-2 py-1.5 text-xs"
                    type="datetime-local"
                    value={toDateInputValue(rangeStartUtc)}
                    onChange={(event) => setRangeStartUtc(fromDateInputValue(event.target.value, graph.timeBounds.startUtc))}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  To
                  <input
                    className="mt-1 w-full rounded-md border border-border/70 bg-surface-1/85 px-2 py-1.5 text-xs"
                    type="datetime-local"
                    value={toDateInputValue(rangeEndUtc)}
                    onChange={(event) => setRangeEndUtc(fromDateInputValue(event.target.value, graph.timeBounds.endUtc))}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRangeStartUtc(graph.timeBounds.startUtc)
                    setRangeEndUtc(graph.timeBounds.endUtc)
                  }}
                >
                  All Time
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const endUtc = graph.timeBounds.endUtc
                    setRangeEndUtc(endUtc)
                    setRangeStartUtc(new Date(Date.parse(endUtc) - 24 * 60 * 60 * 1000).toISOString())
                  }}
                >
                  Last 24h
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const endUtc = graph.timeBounds.endUtc
                    setRangeEndUtc(endUtc)
                    setRangeStartUtc(new Date(Date.parse(endUtc) - 7 * 24 * 60 * 60 * 1000).toISOString())
                  }}
                >
                  Last 7d
                </Button>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border/75 bg-surface-1/90 p-2">
            {visibleNodes.length === 0 || visibleEdges.length === 0 ? (
              <EmptyState
                title="No related evidence map in current filter"
                description="Expand time bounds or enable more entity/edge types to recover related evidence links."
              />
            ) : null}
            <div ref={containerRef} className="h-[560px] w-full" />
          </div>
        </div>

        <aside className="space-y-3">
          <article className="wb-panel-muted p-3">
            <p className="wb-kicker">Related Evidence Paths</p>
            <div className="mt-2 space-y-1.5">
              {graph.pathHints.map((hint) => {
                const active = hint.id === selectedPathHintId
                return (
                  <button
                    key={hint.id}
                    type="button"
                    onClick={() => setSelectedPathHintId(active ? null : hint.id)}
                    className={cn(
                      "w-full rounded-lg border px-2.5 py-2 text-left transition-colors",
                      active
                        ? "border-primary/60 bg-primary/12"
                        : "border-border/70 bg-surface-2/70 hover:border-primary/45",
                    )}
                  >
                    <p className="text-xs font-semibold tracking-tight">{hint.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{hint.description}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Relevance {hint.relevanceScore}%</p>
                  </button>
                )
              })}
            </div>
          </article>

          <article className="wb-panel-muted p-3">
            <p className="wb-kicker">Edge Semantics</p>
            {edgeSemantics.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No visible edge semantics in this time window.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {edgeSemantics.map(([semantic, count]) => (
                  <div key={semantic} className="rounded-lg border border-border/65 bg-surface-2/75 px-2.5 py-2">
                    <p className="text-xs">{semantic}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{count} edge{count === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </aside>
      </div>
    </div>
  )
}
