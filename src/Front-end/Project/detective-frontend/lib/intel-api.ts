import { apiFetch } from "@/lib/api"

export type IocRow = {
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

export type GraphNode = {
  id: number
  nodeType: string
  observableType: string
  label: string
  status: string
  confidence: number
}

export type GraphEdge = {
  id: number
  source: number
  target: number
  relationshipType: string
  confidence: number
  evidenceCount: number
}

export type CorrelationCluster = {
  id: number
  name: string
  riskLevel: string
  averageConfidence: number
  observableCount: number
  seedObservableId: number
  caseId?: number | null
  computedUtc: string
}

export type CorrelationStory = {
  observableId: number
  summary: string
  evidenceCount: number
  ruleHits: number
  computedUtc: string
}

export type CoverageRow = {
  observableId: number
  type: string
  value: string
  confidence: number
  families: Record<string, string>
}

export type CoverageGap = {
  observableId: number
  type: string
  value: string
  confidence: number
  missingFamilies: string
}

export async function getIocs(query: string) {
  return apiFetch<{ items: IocRow[]; pagination: { total: number; page: number; pageSize: number } }>(
    `/api/iocs${query ? `?${query}` : ""}`
  )
}

export async function getGraphNode(id: number) {
  return apiFetch<{ node: GraphNode; neighbors: GraphNode[]; edges: GraphEdge[] }>(`/api/graph/node/${id}`)
}

export async function exploreGraph(seedId: number, depth = 2, limit = 180) {
  return apiFetch<{ seedId: number; nodes: GraphNode[]; edges: GraphEdge[] }>(
    `/api/graph/explore?seedId=${seedId}&depth=${depth}&limit=${limit}`
  )
}

export async function getClusters() {
  return apiFetch<{ clusters: CorrelationCluster[] }>("/api/correlation/clusters")
}

export async function getStory(observableId: number) {
  return apiFetch<{ story: CorrelationStory }>(`/api/correlation/stories/${observableId}`)
}

export async function runCorrelation() {
  return apiFetch<{
    startedUtc: string
    finishedUtc: string
    durationMs: number
    rulesFiredCount: number
    clustersProduced: number
    computedAt: string
  }>("/api/correlation/run", { method: "POST" })
}

export async function getCoverage() {
  return apiFetch<{ rows: CoverageRow[]; gaps: CoverageGap[] }>("/api/detections/coverage")
}

export async function promoteCluster(clusterId: number) {
  return apiFetch<{ caseId: number; clusterId: number; alreadyExisted: boolean }>(
    `/api/cases/promote-cluster/${clusterId}`,
    { method: "POST" }
  )
}
