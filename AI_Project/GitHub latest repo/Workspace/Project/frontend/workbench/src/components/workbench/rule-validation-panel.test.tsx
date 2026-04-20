import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RuleValidationPanel } from "@/components/workbench/rule-validation-panel"
import type { RuleValidationResult } from "@/shared/api/schemas"

const validation: RuleValidationResult = {
  canPersist: true,
  isDeploymentReady: false,
  evaluatedAtUtc: "2026-04-10T08:00:00Z",
  stages: [
    {
      stage: "syntax",
      passed: true,
      capabilityDepth: "heuristic",
      limitation: "Full engine-level syntax validation is unavailable in this phase.",
      diagnostics: [
        {
          code: "syntax.engine_validation.unavailable",
          severity: "note",
          message: "Heuristic syntax checks were applied.",
          line: null,
          column: null,
        },
      ],
    },
    {
      stage: "metadata",
      passed: true,
      capabilityDepth: "heuristic",
      limitation: null,
      diagnostics: [],
    },
    {
      stage: "deployment_readiness",
      passed: false,
      capabilityDepth: "heuristic",
      limitation: "Checks are signal-based in this phase.",
      diagnostics: [
        {
          code: "readiness.assignment.none_enabled",
          severity: "warning",
          message: "No enabled scanner assignment was found.",
          line: null,
          column: null,
        },
      ],
    },
  ],
}

describe("RuleValidationPanel", () => {
  it("renders grouped stages and honesty callout", () => {
    render(<RuleValidationPanel validation={validation} title="Import Validation Pipeline" />)

    expect(screen.getByText("Import Validation Pipeline")).toBeInTheDocument()
    expect(screen.getByText("Syntax")).toBeInTheDocument()
    expect(screen.getByText("Metadata")).toBeInTheDocument()
    expect(screen.getByText("Deployment Readiness")).toBeInTheDocument()
    expect(screen.getByText("Engine-level validation is not fully available in this phase. Treat passing results as limited-confidence checks.")).toBeInTheDocument()
    expect(screen.getByText("readiness.assignment.none_enabled")).toBeInTheDocument()
  })
})
