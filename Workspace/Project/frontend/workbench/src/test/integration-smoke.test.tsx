import fs from "node:fs"
import path from "node:path"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NAV_ITEMS } from "@/components/workbench/nav"
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/state-panels"

const requiredRoutes = [
  "/overview",
  "/alerts",
  "/rules",
  "/servers",
  "/ioc-ingestion",
  "/results-ingestion",
  "/scan-plan",
  "/reports",
  "/settings",
]

const expectedPrimaryNav = [
  { href: "/overview", label: "Dashboard" },
  { href: "/alerts", label: "Alerts" },
  { href: "/servers", label: "Servers" },
  { href: "/results-ingestion", label: "Scans" },
  { href: "/scan-plan", label: "Scan Plan" },
  { href: "/rules", label: "Rules Management" },
  { href: "/ioc-ingestion", label: "IOCs Explorer" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
]

const legacyRoutes = [
  "/problematic-queue",
  "/cases",
  "/matches",
  "/investigations",
  "/graph-relationships",
  "/rules-studio",
  "/detection-studio",
  "/operations",
  "/coverage",
  "/coverage/attack",
  "/ioc-registry",
  "/threat-intel",
  "/ingestion-feeds",
  "/reporting",
  "/admin",
  "/reports-ingestion",
  "/deployments",
  "/settings-admin",
]

describe("integration smoke", () => {
  it("includes all IA routes in navigation", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href)
    for (const route of requiredRoutes) {
      expect(hrefs).toContain(route)
    }

    for (const legacyRoute of legacyRoutes) {
      expect(hrefs).not.toContain(legacyRoute)
    }
  })

  it("matches the approved IoC Manager primary navigation order", () => {
    const nav = NAV_ITEMS.map((item) => ({ href: item.href, label: item.label }))
    expect(nav).toEqual(expectedPrimaryNav)
  })

  it("has required route page files", () => {
    const appRoot = path.resolve(process.cwd(), "src/app/(workbench)")
    const files = [
      "overview/page.tsx",
      "queue/page.tsx",
      "alerts/page.tsx",
      "alerts/[alertId]/page.tsx",
      "rules/page.tsx",
      "rules/review/page.tsx",
      "rules/simulation/page.tsx",
      "rules/canary-rollouts/page.tsx",
      "rules/rollback-history/page.tsx",
      "servers/page.tsx",
      "servers/subnets/page.tsx",
      "servers/asset-groups/page.tsx",
      "servers/scanner-fleet/page.tsx",
      "servers/servers/[serverId]/page.tsx",
      "ioc-ingestion/page.tsx",
      "ioc-ingestion/feed-explorer/page.tsx",
      "results-ingestion/page.tsx",
      "scan-plan/page.tsx",
      "reports/page.tsx",
      "reporting/page.tsx",
      "settings/page.tsx",
      "cases/page.tsx",
      "cases/[caseId]/page.tsx",
      "cases/[caseId]/evidence-bundle/page.tsx",
      "cases/[caseId]/decision-trace/page.tsx",
      "cases/[caseId]/rule-proposals/page.tsx",
      "cases/[caseId]/simulation-results/page.tsx",
    ]

    for (const file of files) {
      expect(fs.existsSync(path.join(appRoot, file))).toBe(true)
    }
  })

  it("renders loading/empty/error states", () => {
    render(
      <div>
        <LoadingState label="Loading test" />
        <EmptyState title="No Data" description="Nothing here" />
        <ErrorState title="Error" description="Failure" />
      </div>,
    )

    expect(screen.getByText("Loading test...")).toBeInTheDocument()
    expect(screen.getByText("No Data")).toBeInTheDocument()
    expect(screen.getByText("Error")).toBeInTheDocument()
  })
})
