import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PowerBiVisualAnalyticsPanel } from "@/components/workbench/dashboard/power-bi-visual-analytics-panel"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const powerBiClient = vi.hoisted(() => ({
  embed: vi.fn(() => ({ on: vi.fn() })),
  reset: vi.fn(),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@/shared/gateway", () => ({
  gateway: {
    getPowerBiVisualizationCatalog: vi.fn(),
  },
}))

vi.mock("powerbi-client", () => ({
  factories: {
    hpmFactory: {},
    wpmpFactory: {},
    routerFactory: {},
  },
  models: {
    BackgroundType: {
      Transparent: "Transparent",
    },
    Permissions: {
      Read: 0,
    },
    TokenType: {
      Embed: 1,
    },
  },
  service: {
    Service: vi.fn(function Service() {
      return powerBiClient
    }),
  },
}))

describe("PowerBiVisualAnalyticsPanel", () => {
  beforeEach(() => {
    powerBiClient.embed.mockClear()
    powerBiClient.reset.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders the configured Power BI iframe on the dashboard", () => {
    mockedUseWorkbenchQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        status: "configured",
        defaultVisualizationKey: "security-overview",
        message: "Authorized Power BI embeds are available.",
        workspaces: [
          {
            key: "security-ops",
            displayName: "Security Operations",
            description: "Security reporting workspace.",
            workspaceId: "workspace-1",
          },
        ],
        visualizations: [
          {
            key: "security-overview",
            title: "Security Overview",
            description: "Executive posture.",
            workspaceKey: "security-ops",
            workspaceName: "Security Operations",
            workspaceId: "workspace-1",
            reportId: "report-1",
            embedUrl: "https://app.powerbi.com/reportEmbed?reportId=report-1&groupId=workspace-1",
            status: "ready",
            requiresUserSignIn: true,
            isConfigured: true,
            isDefault: true,
            embedHeightPx: 760,
            tags: ["Executive"],
          },
        ],
      },
    })

    render(<PowerBiVisualAnalyticsPanel />)

    const frame = screen.getByTitle("Security Overview")
    expect(screen.getByText("Executive charts")).toBeInTheDocument()
    expect(frame).toBeInTheDocument()
    expect(frame).toHaveAttribute("src", "https://app.powerbi.com/reportEmbed?reportId=report-1&groupId=workspace-1")
  })

  it("embeds with a Power BI embed token when one is available", async () => {
    mockedUseWorkbenchQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        status: "configured",
        defaultVisualizationKey: "security-overview",
        message: "Authorized Power BI embeds are available.",
        workspaces: [],
        visualizations: [
          {
            key: "security-overview",
            title: "Security Overview",
            description: "Executive posture.",
            workspaceKey: "security-ops",
            workspaceName: "Security Operations",
            workspaceId: "workspace-1",
            reportId: "report-1",
            embedUrl: "https://app.powerbi.com/reportEmbed?reportId=report-1&groupId=workspace-1",
            status: "ready",
            requiresUserSignIn: false,
            isConfigured: true,
            isDefault: true,
            embedHeightPx: 760,
            tags: ["Executive"],
            embedToken: "embed-token",
            embedTokenExpiresAtUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            tokenType: "Embed",
          },
        ],
      },
    })

    render(<PowerBiVisualAnalyticsPanel />)

    expect(screen.getByLabelText("Security Overview")).toBeInTheDocument()
    await waitFor(() => {
      expect(powerBiClient.embed).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          accessToken: "embed-token",
          id: "report-1",
          tokenType: 1,
          type: "report",
        }),
      )
    })
  })
})
