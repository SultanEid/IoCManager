import { describe, expect, it } from "vitest"
import {
  canAccessAdminActions,
  canAccessLeadActions,
  deriveSessionFromToken,
  roleLabel,
  roleLabels,
} from "@/shared/auth/session"

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url")
}

function buildUnsignedJwt(payload: Record<string, unknown>) {
  const header = { alg: "none", typ: "JWT" }
  return `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}.`
}

describe("session auth", () => {
  it("derives roles and identity from token claims", () => {
    const token = buildUnsignedJwt({
      sub: "user-123",
      unique_name: "analyst1",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": ["Analyst", "Lead"],
    })

    const session = deriveSessionFromToken(token, "2099-01-01T00:00:00Z")
    expect(session.userId).toBe("user-123")
    expect(session.username).toBe("analyst1")
    expect(session.roles).toEqual(["Analyst", "Lead"])
    expect(canAccessLeadActions(session)).toBe(true)
    expect(canAccessAdminActions(session)).toBe(false)
  })

  it("supports admin role gating", () => {
    const token = buildUnsignedJwt({
      sub: "user-999",
      unique_name: "admin1",
      role: "Admin",
    })

    const session = deriveSessionFromToken(token, "2099-01-01T00:00:00Z")
    expect(canAccessAdminActions(session)).toBe(true)
    expect(canAccessLeadActions(session)).toBe(true)
  })

  it("maps role labels to neutral operational names", () => {
    expect(roleLabel("Lead")).toBe("Operator")
    expect(roleLabel("Admin")).toBe("Administrator")
    expect(roleLabels(["Analyst", "Lead", "Admin"])).toBe("Analyst, Operator, Administrator")
  })
})
