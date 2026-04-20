export type PinnedWorkbenchItem = {
  kind: "alert"
  alertId: string
  pinnedAtUtc: string
}

export type RecentWorkbenchItem = {
  key: string
  kind: "route" | "alert"
  href: string
  label: string
  subtitle: string
  visitedAtUtc: string
}

const PINNED_STORAGE_KEY = "ioc.manager.pinned"
const RECENT_STORAGE_KEY = "ioc.manager.recent"
const LEGACY_PINNED_STORAGE_KEY = "cti.workbench.pinned"
const LEGACY_RECENT_STORAGE_KEY = "cti.workbench.recent"

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

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function readPinnedWorkbenchItems(): PinnedWorkbenchItem[] {
  if (!canUseStorage()) {
    return []
  }

  const stored =
    window.localStorage.getItem(PINNED_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_PINNED_STORAGE_KEY)
  const parsed = parseJson<Array<PinnedWorkbenchItem | { kind?: string; caseId?: string; alertId?: string; pinnedAtUtc?: string }>>(stored, [])
  return parsed
    .map((item) => {
      const resolvedId = "alertId" in item && typeof item.alertId === "string"
        ? item.alertId
        : "caseId" in item && typeof item.caseId === "string"
          ? item.caseId
          : null
      if (!resolvedId) {
        return null
      }

      return {
        kind: "alert" as const,
        alertId: resolvedId,
        pinnedAtUtc: item.pinnedAtUtc ?? new Date().toISOString(),
      }
    })
    .filter((item): item is PinnedWorkbenchItem => Boolean(item))
}

export function writePinnedWorkbenchItems(items: PinnedWorkbenchItem[]) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(items))
}

export function togglePinnedAlert(items: PinnedWorkbenchItem[], alertId: string) {
  const existing = items.find((item) => item.alertId === alertId)
  if (existing) {
    return items.filter((item) => item.alertId !== alertId)
  }

  return [
    {
      kind: "alert" as const,
      alertId,
      pinnedAtUtc: new Date().toISOString(),
    },
    ...items,
  ]
}

// Legacy alias retained for one release cycle.
export const togglePinnedCase = togglePinnedAlert

export function readRecentWorkbenchItems(): RecentWorkbenchItem[] {
  if (!canUseStorage()) {
    return []
  }

  const stored =
    window.localStorage.getItem(RECENT_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_RECENT_STORAGE_KEY)
  const parsed = parseJson<RecentWorkbenchItem[]>(stored, [])
  return parsed.filter((item) => typeof item.key === "string" && typeof item.href === "string")
}

export function writeRecentWorkbenchItems(items: RecentWorkbenchItem[]) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items))
}

export function pushRecentWorkbenchItem(
  current: RecentWorkbenchItem[],
  next: RecentWorkbenchItem,
  limit = 10,
) {
  const deduped = current.filter((item) => item.key !== next.key)
  return [next, ...deduped].slice(0, limit)
}
