import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { describe, expect, it } from "vitest"
import {
  WorkbenchInspectorDrawer,
  WorkbenchInspectorProvider,
  useWorkbenchInspector,
} from "@/components/workbench/workbench-inspector"

let closeInspectorFromTest: null | (() => void) = null

function InspectorTrigger() {
  const { openInspector, closeInspector } = useWorkbenchInspector()

  useEffect(() => {
    closeInspectorFromTest = closeInspector
  }, [closeInspector])

  return (
    <button
      type="button"
      onClick={() =>
        openInspector({
          title: "Entity Inspector",
          subtitle: "Selected entity details",
          sections: [
            {
              id: "summary",
              title: "Summary",
              fields: [{ label: "Type", value: "domain" }],
            },
          ],
        })
      }
    >
      Open Inspector
    </button>
  )
}

describe("WorkbenchInspector", () => {
  it("opens and closes drawer content", async () => {
    const user = userEvent.setup()
    render(
      <WorkbenchInspectorProvider>
        <InspectorTrigger />
        <WorkbenchInspectorDrawer />
      </WorkbenchInspectorProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Open Inspector" }))
    expect(screen.getByRole("heading", { name: "Entity Inspector" })).toBeInTheDocument()
    expect(screen.getByText("Type")).toBeInTheDocument()

    act(() => {
      closeInspectorFromTest?.()
    })
    await waitFor(() => expect(screen.queryByText("Type")).not.toBeInTheDocument())
  })
})
