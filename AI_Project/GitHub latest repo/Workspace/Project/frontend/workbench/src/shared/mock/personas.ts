import type { TokenResponse } from "@/shared/api/schemas"
import type { UserPersona } from "@/shared/domain/cti"
import { toJwt } from "@/shared/mock/utils"

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

export const MOCK_PERSONAS: UserPersona[] = [
  {
    id: "analyst-1",
    username: "analyst.demo",
    displayName: "Analyst",
    roles: ["Analyst"],
    focus: "Design review for analyst triage workflows",
  },
  {
    id: "lead-1",
    username: "operator.demo",
    displayName: "Operator",
    roles: ["Lead"],
    focus: "Design review for approval and rollout workflows",
  },
  {
    id: "admin-1",
    username: "admin.demo",
    displayName: "Administrator",
    roles: ["Admin"],
    focus: "Design review for platform and orchestration controls",
  },
]

export function listMockPersonas() {
  return MOCK_PERSONAS
}

export function issuePersonaToken(persona: UserPersona): TokenResponse {
  const expiresAtUtc = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  const accessToken = toJwt({
    sub: persona.id,
    unique_name: persona.username,
    [ROLE_CLAIM]: persona.roles,
    role: persona.roles,
    exp: Math.floor(Date.parse(expiresAtUtc) / 1000),
  })

  return {
    accessToken,
    expiresAtUtc,
    tokenType: "Bearer",
  }
}
