import { describe, expect, it } from "vitest"
import { deriveSessionFromToken } from "@/shared/auth/session"
import { issuePersonaToken, listMockPersonas } from "@/shared/mock/personas"

describe("mock personas", () => {
  it("issues role-aware tokens compatible with session parsing", () => {
    const persona = listMockPersonas().find((item) => item.id === "admin-1")
    expect(persona).toBeDefined()
    if (!persona) {
      return
    }

    const token = issuePersonaToken(persona)
    const session = deriveSessionFromToken(token.accessToken, token.expiresAtUtc)

    expect(session.userId).toBe("admin-1")
    expect(session.username).toBe("admin.demo")
    expect(session.roles).toContain("Admin")
  })
})
