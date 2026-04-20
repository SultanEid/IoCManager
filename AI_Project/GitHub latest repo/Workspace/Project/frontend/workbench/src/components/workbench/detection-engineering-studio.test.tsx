import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { DetectionEngineeringStudio } from "@/components/workbench/detection-engineering-studio"
import type { ReactNode } from "react"

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) => (
    <textarea data-testid="monaco-editor" value={value ?? ""} onChange={(event) => onChange?.(event.target.value)} />
  ),
  DiffEditor: ({ modified }: { modified?: string }) => <textarea data-testid="monaco-diff" value={modified ?? ""} readOnly />,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {},
  isMockMode: true,
  isModeConfigured: true,
  isAspNetMode: false,
}))

afterEach(() => {
  cleanup()
})

describe("DetectionEngineeringStudio", () => {
  it("renders route-backed subpage workflow copy", () => {
    render(<DetectionEngineeringStudio subpageKey="review" />)

    expect(screen.getByRole("heading", { name: "Rule Review" })).toBeInTheDocument()
    expect(screen.getByTestId("detection-subpage-switcher")).toHaveTextContent("Rule Catalog")
    expect(screen.getByTestId("detection-subpage-switcher")).not.toHaveTextContent("Feed Explorer")
  })

  it("filters catalog by family and lifecycle", () => {
    render(<DetectionEngineeringStudio subpageKey="catalog" />)

    const catalog = screen.getByPlaceholderText("Search ID, alert, rule, family, lifecycle...").closest("section")
    expect(catalog).not.toBeNull()
    fireEvent.click(within(catalog as HTMLElement).getByRole("button", { name: "Sigma" }))
    expect(screen.getByText("1 rules")).toBeInTheDocument()

    fireEvent.click(within(catalog as HTMLElement).getByRole("button", { name: "Approved" }))
    expect(screen.getByText("1 rules")).toBeInTheDocument()
  })

  it("shows the Suricata family filter", () => {
    render(<DetectionEngineeringStudio subpageKey="catalog" />)

    expect(screen.getByRole("button", { name: "Suricata" })).toBeInTheDocument()
  })

  it("syncs selected rule between left catalog and right inspector", () => {
    render(<DetectionEngineeringStudio subpageKey="catalog" />)

    fireEvent.click(screen.getAllByText("Suricata JA3 Burst Detector")[0])
    expect(screen.getAllByText("Rule suggestion from alert lineage AL-4012").length).toBeGreaterThan(0)
  })

  it("disables approve action when lint checks fail", () => {
    render(<DetectionEngineeringStudio subpageKey="catalog" />)

    const approveButton = screen.getAllByRole("button", { name: "Approve" })[0]
    expect(approveButton).toBeEnabled()

    fireEvent.change(screen.getByTestId("monaco-editor"), { target: { value: "" } })
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled()
  })

  it("switches from edit to diff mode in Monaco workflow", () => {
    render(<DetectionEngineeringStudio subpageKey="catalog" />)

    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("editor-diff-mode"))
    expect(screen.getByTestId("monaco-diff")).toBeInTheDocument()
  })

  it("renders subpage-specific operational workflows", () => {
    const { rerender } = render(<DetectionEngineeringStudio subpageKey="review" />)
    expect(screen.getByText("Review Queue")).toBeInTheDocument()

    rerender(<DetectionEngineeringStudio subpageKey="simulation" />)
    expect(screen.getByText("Simulation Runs")).toBeInTheDocument()

    rerender(<DetectionEngineeringStudio subpageKey="canary-rollouts" />)
    expect(screen.getByRole("button", { name: "Rollback Drill" })).toBeInTheDocument()

    rerender(<DetectionEngineeringStudio subpageKey="rollback-history" />)
    expect(screen.getByText("Rollback events are immutable records used for policy replay, impact audits, and post-incident control tuning.")).toBeInTheDocument()

    rerender(<DetectionEngineeringStudio subpageKey="feed-explorer" />)
    expect(screen.getByText("Feed explorer binds external rule candidates to alert context and duplicate risk before repository import.")).toBeInTheDocument()
  })

  it("shows workflow error state when running a failure drill", () => {
    render(<DetectionEngineeringStudio subpageKey="catalog" />)

    fireEvent.click(screen.getByRole("button", { name: "Failure Drill" }))
    expect(screen.getByTestId("workflow-error-state")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Recover" }))
    expect(screen.queryByTestId("workflow-error-state")).not.toBeInTheDocument()
  })
})



