import { describe, expect, it } from "vitest"
import {
  canAccessCanonicalRoute,
  canAccessWorkflowSettings,
  getRoleDefaultRoute,
  isItOnlyScope,
  resolveRoleScope,
} from "@/shared/auth/role-access"

describe("role access", () => {
  it("resolves scope precedence with DEV as highest", () => {
    expect(resolveRoleScope(["IT"])).toBe("it")
    expect(resolveRoleScope(["Admin"])).toBe("admin")
    expect(resolveRoleScope(["Lead"])).toBe("analyst")
    expect(resolveRoleScope(["Admin", "Analyst"])).toBe("analyst")
    expect(resolveRoleScope(["DEV", "Admin"])).toBe("dev")
  })

  it("uses role-specific default routes", () => {
    expect(getRoleDefaultRoute(["Admin"])).toBe("/settings")
    expect(getRoleDefaultRoute(["IT"])).toBe("/alerts")
    expect(getRoleDefaultRoute(["Analyst"])).toBe("/overview")
    expect(getRoleDefaultRoute(["DEV"])).toBe("/overview")
  })

  it("enforces canonical route access by role", () => {
    expect(canAccessCanonicalRoute(["Admin"], "/settings")).toBe(true)
    expect(canAccessCanonicalRoute(["Admin"], "/alerts")).toBe(false)
    expect(canAccessCanonicalRoute(["IT"], "/alerts")).toBe(true)
    expect(canAccessCanonicalRoute(["IT"], "/alerts/abc")).toBe(true)
    expect(canAccessCanonicalRoute(["IT"], "/scans")).toBe(false)
    expect(canAccessCanonicalRoute(["Analyst"], "/reports")).toBe(true)
    expect(canAccessCanonicalRoute(["DEV"], "/rules")).toBe(true)
  })

  it("exposes workflow settings and IT-only helpers", () => {
    expect(canAccessWorkflowSettings(["Analyst"])).toBe(true)
    expect(canAccessWorkflowSettings(["Admin"])).toBe(true)
    expect(canAccessWorkflowSettings(["IT"])).toBe(false)
    expect(isItOnlyScope(["IT"])).toBe(true)
    expect(isItOnlyScope(["IT", "Lead"])).toBe(false)
  })
})
