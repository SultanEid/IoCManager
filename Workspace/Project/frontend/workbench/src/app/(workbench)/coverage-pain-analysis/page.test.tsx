import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import PyramidOfPainPage from "./page"

const push = vi.fn()
const useWorkbenchQueryMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: useWorkbenchQueryMock,
}))

vi.mock("@/shared/gateway/legacy-scan-pipeline", () => ({
  getLegacyPainAnalysis: vi.fn(),
}))

const analysis = {
  fromUtc: "2026-04-19T00:00:00.000Z",
  toUtc: "2026-04-26T00:00:00.000Z",
  totalCount: 6,
  levels: [
    {
      level: "Ttp",
      label: "TTP",
      count: 1,
      share: 0.1667,
      previewIocs: [
        {
          iocId: "ttp-1",
          scannerFamily: "SIGMA",
          targetId: null,
          targetDisplay: "srv-1",
          targetIp: "10.0.0.1",
          targetOsType: "Windows",
          jobId: null,
          scanPlanId: null,
          ruleName: "ATT&CK T1059 execution technique",
          indicatorValue: "T1059",
          indicatorKind: "payload",
          painLevel: "Ttp",
          severity: "High",
          timestampUtc: "2026-04-25T12:00:00.000Z",
          rawPayload: null,
          status: "Succeeded",
        },
      ],
    },
    { level: "Tool", label: "Tool", count: 1, share: 0.1667, previewIocs: [] },
    { level: "HostArtifact", label: "Host / Network Artifact", count: 1, share: 0.1667, previewIocs: [] },
    { level: "Domain", label: "Domain", count: 1, share: 0.1667, previewIocs: [] },
    { level: "IP", label: "IP", count: 1, share: 0.1667, previewIocs: [] },
    { level: "Hash", label: "Hash", count: 1, share: 0.1667, previewIocs: [] },
  ],
  trend: [],
}

describe("PyramidOfPainPage", () => {
  beforeEach(() => {
    push.mockReset()
    useWorkbenchQueryMock.mockReturnValue({
      data: analysis,
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders all Pyramid bands in the approved order", () => {
    const { container } = render(<PyramidOfPainPage />)
    const text = container.textContent ?? ""

    const expectedOrder = ["TTP", "Tool", "Host / Network Artifact", "Domain", "IP", "Hash"]
    const positions = expectedOrder.map((label) => text.indexOf(label))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
  })

  it("uses cached query settings for the heavy pain analysis request", () => {
    render(<PyramidOfPainPage />)

    expect(useWorkbenchQueryMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function),
      expect.objectContaining({
        staleTime: 5 * 60_000,
        gcTime: 15 * 60_000,
        placeholderData: expect.any(Function),
        refetchOnWindowFocus: false,
      }),
    )
  })

  it("offers 7, 30, and 90 day duration controls", () => {
    render(<PyramidOfPainPage />)

    expect(screen.getByRole("button", { name: /7 days/i })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /30 days/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /90 days/i })).toBeInTheDocument()
  })

  it("updates the analysis query when a duration changes", () => {
    render(<PyramidOfPainPage />)

    fireEvent.click(screen.getByRole("button", { name: /30 days/i }))

    expect(screen.getByRole("button", { name: /30 days/i })).toHaveAttribute("aria-pressed", "true")
    expect(useWorkbenchQueryMock).toHaveBeenLastCalledWith(
      expect.arrayContaining(["legacy-pipeline", "pain-analysis", 30]),
      expect.any(Function),
      expect.any(Object),
    )
  })

  it("preserves the selected painLevel in the IOC Explorer link", () => {
    render(<PyramidOfPainPage />)

    fireEvent.click(screen.getByRole("button", { name: /Domain/i }))

    const link = screen.getByRole("link", { name: /Open rows/i })
    expect(link).toHaveAttribute("href", expect.stringContaining("painLevel=Domain"))
  })

  it("keeps zero-count bands visible", () => {
    useWorkbenchQueryMock.mockReturnValue({
      data: { ...analysis, levels: analysis.levels.filter((level) => level.level !== "Hash") },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<PyramidOfPainPage />)

    expect(screen.getByRole("button", { name: /Hash/i })).toBeInTheDocument()
  })
})
