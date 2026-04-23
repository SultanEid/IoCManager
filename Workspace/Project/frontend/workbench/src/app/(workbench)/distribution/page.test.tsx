import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import DistributionPage from "@/app/(workbench)/distribution/page"

const gatewayState = vi.hoisted(() => ({
  isMockMode: false,
  isModeConfigured: true,
}))

vi.mock("@/components/workbench/distribution/rule-distribution-page", () => ({
  RuleDistributionPage: () => <div>distribution-live-surface</div>,
}))

vi.mock("@/shared/gateway", () => ({
  get isMockMode() {
    return gatewayState.isMockMode
  },
  get isModeConfigured() {
    return gatewayState.isModeConfigured
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("DistributionPage mode behavior", () => {
  beforeEach(() => {
    gatewayState.isMockMode = false
    gatewayState.isModeConfigured = true
  })

  it("renders configuration-unavailable state when mode is misconfigured", () => {
    gatewayState.isModeConfigured = false

    render(<DistributionPage />)

    expect(screen.getByText("Configuration unavailable")).toBeInTheDocument()
  })

  it("renders explicit unavailable state in mock mode with no fake distribution telemetry", () => {
    gatewayState.isMockMode = true

    render(<DistributionPage />)

    expect(screen.getByText("Rule distribution unavailable")).toBeInTheDocument()
    expect(screen.getByText(/real-data only/i)).toBeInTheDocument()
  })

  it("renders live distribution surface in normal mode", () => {
    render(<DistributionPage />)

    expect(screen.getByText("distribution-live-surface")).toBeInTheDocument()
  })
})
