import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Timeline } from "@/components/workbench/timeline"

describe("Timeline", () => {
  it("renders event entries", () => {
    render(
      <Timeline
        events={[
          { id: "1", title: "Decision Proposed", subtitle: "Awaiting approval", when: "2026-03-13T00:00:00Z" },
          { id: "2", title: "Deployment Canary", subtitle: "10% scope", when: "2026-03-13T00:10:00Z" },
        ]}
      />,
    )

    expect(screen.getByText("Decision Proposed")).toBeInTheDocument()
    expect(screen.getByText("Deployment Canary")).toBeInTheDocument()
  })
})
