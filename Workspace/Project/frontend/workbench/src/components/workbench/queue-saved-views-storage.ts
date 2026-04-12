export type QueueGroupingKey =
  | "none"
  | "uncertainty"
  | "blastRadius"
  | "approvalTier"
  | "source"
  | "owner"
  | "sla"

export type SavedQueueViewFilters = {
  state: string
  tier: string
  group: QueueGroupingKey
  minSla: number
  missingOnly: boolean
  q: string
}

export type SavedQueueView = {
  id: string
  name: string
  createdAtUtc: string
  filters: SavedQueueViewFilters
}

export const QUEUE_SAVED_VIEWS_STORAGE_KEY = "cti.queue.savedViews.v1"

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function isQueueGroupingKey(value: string): value is QueueGroupingKey {
  return (
    value === "none" ||
    value === "uncertainty" ||
    value === "blastRadius" ||
    value === "approvalTier" ||
    value === "source" ||
    value === "owner" ||
    value === "sla"
  )
}

function isSavedQueueViewFilters(value: unknown): value is SavedQueueViewFilters {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.state === "string" &&
    typeof candidate.tier === "string" &&
    typeof candidate.group === "string" &&
    isQueueGroupingKey(candidate.group) &&
    typeof candidate.minSla === "number" &&
    Number.isFinite(candidate.minSla) &&
    typeof candidate.missingOnly === "boolean" &&
    typeof candidate.q === "string"
  )
}

function isSavedQueueView(value: unknown): value is SavedQueueView {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.createdAtUtc === "string" &&
    isSavedQueueViewFilters(candidate.filters)
  )
}

export function readSavedQueueViews(): SavedQueueView[] {
  if (!canUseStorage()) {
    return []
  }

  const parsed = parseJson<unknown[]>(window.localStorage.getItem(QUEUE_SAVED_VIEWS_STORAGE_KEY), [])
  return parsed.filter(isSavedQueueView)
}

export function writeSavedQueueViews(views: SavedQueueView[]) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(QUEUE_SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views))
}
