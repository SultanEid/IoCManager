import { describe, expect, it } from "vitest"
import {
  togglePinnedAlert,
  type PinnedWorkbenchItem,
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
})
