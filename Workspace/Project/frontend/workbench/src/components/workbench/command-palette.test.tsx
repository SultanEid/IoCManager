import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { WorkbenchCommandPalette } from "@/components/workbench/command-palette"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: () => ({
    data: [
      {
        id: "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69",
        title: "Command and Control Activity",
        summary: "summary",
        priority: "Critical",
        status: "AwaitingApproval",
        ownerUserId: "u1",
        approvalTierRequired: "Lead",
        createdAtUtc: "2026-03-13T00:00:00.000Z",
        updatedAtUtc: "2026-03-13T01:00:00.000Z",
      },
    ],
    isLoading: false,
    isError: false,
  }),
}))

afterEach(() => {
  cleanup()
})

function getPaletteInput() {
  const inputs = screen.getAllByPlaceholderText("Search workspace...")
  return inputs[inputs.length - 1]
}

describe("WorkbenchCommandPalette", () => {
  it("does not expose dialog content while closed", () => {
    render(<WorkbenchCommandPalette open={false} onOpenChange={() => undefined} roles={["Analyst"]} />)

    expect(screen.queryByText("IoC Manager Command Palette")).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Search workspace...")).not.toBeInTheDocument()
  })

  it("matches route search terms", async () => {
    const user = userEvent.setup()
    render(<WorkbenchCommandPalette open onOpenChange={() => undefined} roles={["Analyst"]} />)

    await user.type(getPaletteInput(), "alerts")

    expect(screen.getByText("Alerts")).toBeInTheDocument()
  })

  it("opens matching alert results", async () => {
    const user = userEvent.setup()
    push.mockReset()
    render(<WorkbenchCommandPalette open onOpenChange={() => undefined} roles={["Analyst"]} />)

    await user.type(getPaletteInput(), "command and control")

    await user.click(screen.getByText("Command and Control Activity"))
    expect(push).toHaveBeenCalledWith("/alerts/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69")
  })

  it("supports free-text fallback to alert search", async () => {
    const user = userEvent.setup()
    push.mockReset()
    render(<WorkbenchCommandPalette open onOpenChange={() => undefined} roles={["Analyst"]} />)

    await user.type(getPaletteInput(), "dns beacon")

    await user.click(screen.getByText('Search alerts for "dns beacon"'))
    expect(push).toHaveBeenCalledWith("/alerts?q=dns%20beacon")
  })
})
