import { decodeJwt } from "jose"

export type UserRole = "IT" | "Analyst" | "Lead" | "Admin" | "DEV"

export type SessionState = {
  token: string
  expiresAtUtc: string
  userId: string | null
  username: string | null
  roles: UserRole[]
}

const STORAGE_KEY = "cti.workbench.session.v1"
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

function isRole(value: string): value is UserRole {
  return value === "IT" || value === "Analyst" || value === "Lead" || value === "Admin" || value === "DEV"
}

export function roleLabel(role: UserRole | string) {
  if (role === "IT") {
    return "IT Operations"
  }

  if (role === "Lead") {
    return "Operator"
  }

  if (role === "Admin") {
    return "Administrator"
  }

  if (role === "DEV") {
    return "Developer"
  }

  return role
}

export function roleLabels(roles: readonly string[]) {
  return roles.map((role) => roleLabel(role)).join(", ")
}

function normalizeRoles(claims: Record<string, unknown>): UserRole[] {
  const roleValue = claims[ROLE_CLAIM] ?? claims.role ?? claims.roles
  if (Array.isArray(roleValue)) {
    return roleValue.filter((value): value is UserRole => typeof value === "string" && isRole(value))
  }

  if (typeof roleValue === "string" && isRole(roleValue)) {
    return [roleValue]
  }

  return []
}

export function deriveSessionFromToken(token: string, expiresAtUtc: string): SessionState {
  const claims = decodeJwt(token)
  const userId = typeof claims.sub === "string" ? claims.sub : null
  const username = typeof claims.unique_name === "string" ? claims.unique_name : typeof claims.name === "string" ? claims.name : null

  return {
    token,
    expiresAtUtc,
    userId,
    username,
    roles: normalizeRoles(claims),
  }
}

export function setSession(session: SessionState) {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function getSession(): SessionState | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionState>
    if (!parsed.token || !parsed.expiresAtUtc) {
      return null
    }

    const expiresAt = new Date(parsed.expiresAtUtc)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      clearSession()
      return null
    }

    return {
      token: parsed.token,
      expiresAtUtc: parsed.expiresAtUtc,
      userId: parsed.userId ?? null,
      username: parsed.username ?? null,
      roles: Array.isArray(parsed.roles) ? parsed.roles.filter((role): role is UserRole => isRole(role)) : [],
    }
  } catch {
    clearSession()
    return null
  }
}

export function clearSession() {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(STORAGE_KEY)
}

export function hasRole(session: SessionState | null, role: UserRole) {
  return Boolean(session?.roles.includes(role))
}

export function canAccessLeadActions(session: SessionState | null) {
  return hasRole(session, "Analyst") || hasRole(session, "Lead") || hasRole(session, "DEV")
}

export function canAccessAdminActions(session: SessionState | null) {
  return hasRole(session, "Admin") || hasRole(session, "DEV")
}

export function canAccessWorkflowSettingsActions(session: SessionState | null) {
  return hasRole(session, "Analyst") || hasRole(session, "Lead") || hasRole(session, "Admin") || hasRole(session, "DEV")
}

export function canAccessAlertActions(session: SessionState | null) {
  return hasRole(session, "IT") || hasRole(session, "Analyst") || hasRole(session, "Lead") || hasRole(session, "DEV")
}
