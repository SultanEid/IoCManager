import { describe, expect, it } from "vitest"
import { isWorkbenchNavActive, resolveWorkbenchRoute } from "@/components/workbench/workbench-route-meta"

describe("resolveWorkbenchRoute", () => {
  it("normalizes legacy investigation routes to alerts", () => {
    const resolved = resolveWorkbenchRoute("/graph-relationships")
    expect(resolved.canonicalPath).toBe("/alerts")
    expect(resolved.title).toBe("Alert Registry")
    expect(resolved.module).toBe("Core")
  })

  it("builds alert breadcrumbs for alert detail routes", () => {
    const alertId = "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69"
    const resolved = resolveWorkbenchRoute(`/alerts/${alertId}`)

    expect(resolved.caseId).toBe(alertId)
    expect(resolved.breadcrumbs.map((item) => item.label)).toEqual([
      "Core",
      "Alerts",
      "Alert f13a8eba",
    ])
    expect(resolved.title).toContain("Alert f13a8eba")
  })

  it("maps legacy case subroutes to canonical alert detail", () => {
    const alertId = "f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69"
    const resolved = resolveWorkbenchRoute(`/cases/${alertId}/decision-trace`)

    expect(resolved.canonicalPath).toBe(`/alerts/${alertId}`)
    expect(resolved.module).toBe("Alert")
  })

  it("resolves rules subroutes with operation breadcrumbs", () => {
    const resolved = resolveWorkbenchRoute("/rules/review")
    expect(resolved.canonicalPath).toBe("/rules")
    expect(resolved.module).toBe("Operations")
    expect(resolved.title).toBe("Rules Management")
    expect(resolved.breadcrumbs.map((item) => item.label)).toEqual(["Operations", "Rules Management"])
  })

  it("resolves legacy rules studio routes to canonical rules routes", () => {
    const resolved = resolveWorkbenchRoute("/rules-studio/review")
    expect(resolved.canonicalPath).toBe("/rules")
    expect(resolved.module).toBe("Operations")
    expect(resolved.title).toBe("Rules Management")
  })

  it("resolves repository rule detail routes", () => {
    const resolved = resolveWorkbenchRoute("/rules/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69")
    expect(resolved.canonicalPath).toBe("/rules/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69")
    expect(resolved.module).toBe("Operations")
    expect(resolved.title).toContain("Rule Detail")
  })

  it("resolves ingestion feed-explorer aliases to canonical ingestion routes", () => {
    const resolved = resolveWorkbenchRoute("/detection-studio/feed-explorer")
    expect(resolved.canonicalPath).toBe("/ioc-ingestion/feed-explorer")
    expect(resolved.module).toBe("Operations")
    expect(resolved.title).toBe("Feed Explorer")
  })

  it("resolves servers subroutes with module-aware breadcrumbs", () => {
    const resolved = resolveWorkbenchRoute("/servers/subnets")
    expect(resolved.canonicalPath).toBe("/servers/subnets")
    expect(resolved.module).toBe("Operations")
    expect(resolved.title).toBe("Subnet Operations")
    expect(resolved.breadcrumbs.map((item) => item.label)).toEqual([
      "Operations",
      "Servers",
      "Subnets",
    ])
  })

  it("resolves scan-plan route and compatibility aliases", () => {
    const canonical = resolveWorkbenchRoute("/scan-plan")
    const direct = resolveWorkbenchRoute("/servers/scan-plans")
    const alias = resolveWorkbenchRoute("/operations/scan-plans")

    expect(canonical.canonicalPath).toBe("/scan-plan")
    expect(canonical.title).toBe("Scan Plan")
    expect(canonical.breadcrumbs.map((item) => item.label)).toEqual(["Operations", "Scan Plan"])

    expect(direct.canonicalPath).toBe("/scan-plan")
    expect(direct.title).toBe("Scan Plan")
    expect(direct.breadcrumbs.map((item) => item.label)).toEqual(["Operations", "Scan Plan"])

    expect(alias.canonicalPath).toBe("/scan-plan")
    expect(alias.module).toBe("Operations")
    expect(alias.title).toBe("Scan Plan")
  })

  it("resolves server detail routes", () => {
    const resolved = resolveWorkbenchRoute("/servers/servers/srv-gateway-01")
    expect(resolved.canonicalPath).toBe("/servers/servers/srv-gateway-01")
    expect(resolved.module).toBe("Operations")
    expect(resolved.title).toContain("Server Detail")
    expect(resolved.breadcrumbs.map((item) => item.label)).toEqual([
      "Operations",
      "Servers",
      "Server srv-gateway",
    ])
  })

  it("keeps canonical nav active across nested routes", () => {
    expect(isWorkbenchNavActive("/servers/scanner-fleet", "/servers")).toBe(true)
    expect(isWorkbenchNavActive("/rules/review", "/rules")).toBe(true)
    expect(isWorkbenchNavActive("/ioc-ingestion/feed-explorer", "/ioc-ingestion")).toBe(true)
    expect(isWorkbenchNavActive("/servers/scan-plans", "/scan-plan")).toBe(true)
    expect(isWorkbenchNavActive("/alerts/f13a8eba-b80d-4a7e-a8b4-d4c7bb589b69", "/alerts")).toBe(true)
  })
})
