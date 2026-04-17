import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FilterChips } from "@/shared/ui/filter-chips"

describe("FilterChips", () => {
  it("renders chips and calls onChange", () => {
    const onChange = vi.fn()
    render(
      <FilterChips
        title="Status"
        active="all"
        onChange={onChange}
        chips={[
          { key: "all", label: "All" },
          { key: "open", label: "Open" },
        ]}
      />,
    )

    fireEvent.click(screen.getByText("Open"))
    expect(onChange).toHaveBeenCalledWith("open")
  })
})
