import { describe, expect, it } from "vitest"
import {
  pushRecentWorkbenchItem,
  togglePinnedAlert,
  type PinnedWorkbenchItem,
  type RecentWorkbenchItem,
} from "@/components/workbench/workbench-shell-storage"

describe("workbench shell storage helpers", () => {
  it("toggles pinned alerts", () => {
    const initial: PinnedWorkbenchItem[] = []
    const pinned = togglePinnedAlert(initial, "alert-1")
    expect(pinned).toHaveLength(1)
    expect(pinned[0].alertId).toBe("alert-1")

    const unpinned = togglePinnedAlert(pinned, "alert-1")
    expect(unpinned).toEqual([])
  })

  it("pushes recent entries with dedupe and bounded history", () => {
    const current: RecentWorkbenchItem[] = [
      {
        key: "route:/queue",
        kind: "route",
        href: "/queue",
        label: "Queue",
        subtitle: "Queue",
        visitedAtUtc: "2026-03-15T00:00:00.000Z",
      },
      {
        key: "route:/alerts",
        kind: "route",
        href: "/alerts",
        label: "Alerts",
        subtitle: "Alerts",
        visitedAtUtc: "2026-03-15T00:00:00.000Z",
      },
    ]

    const next = pushRecentWorkbenchItem(
      current,
      {
        key: "route:/queue",
        kind: "route",
        href: "/queue",
        label: "Queue",
        subtitle: "Queue",
        visitedAtUtc: "2026-03-15T01:00:00.000Z",
      },
      2,
    )

    expect(next).toHaveLength(2)
    expect(next[0].key).toBe("route:/queue")
    expect(next[1].key).toBe("route:/alerts")
  })
})
