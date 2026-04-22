import type { UserRole } from "@/shared/auth/session"

export type RoleScope = "dev" | "admin" | "analyst" | "it" | "none"

function normalizePath(path: string) {
  const trimmed = path.trim()
  if (!trimmed) {
    return "/"
  }

  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1)
  }

  return trimmed
}

export function resolveRoleScope(roles: readonly UserRole[]): RoleScope {
  if (roles.includes("DEV")) {
    return "dev"
  }

  if (roles.includes("Analyst") || roles.includes("Lead")) {
    return "analyst"
  }

  if (roles.includes("Admin")) {
    return "admin"
  }

  if (roles.includes("IT")) {
    return "it"
  }

  return "none"
}

export function getRoleDefaultRoute(roles: readonly UserRole[]) {
  const scope = resolveRoleScope(roles)
  switch (scope) {
    case "admin":
      return "/settings"
    case "it":
      return "/alerts"
    case "analyst":
    case "dev":
    case "none":
    default:
      return "/overview"
  }
}

export function canAccessCanonicalRoute(roles: readonly UserRole[], canonicalPath: string) {
  const path = normalizePath(canonicalPath)
  const scope = resolveRoleScope(roles)

  if (scope === "dev") {
    return true
  }

  if (scope === "admin") {
    return path === "/settings"
  }

  if (scope === "it") {
    return path === "/alerts" || path.startsWith("/alerts/")
  }

  if (scope === "analyst") {
    return true
  }

  return path === "/overview"
}

export function canAccessAdminSettings(roles: readonly UserRole[]) {
  const scope = resolveRoleScope(roles)
  return scope === "admin" || scope === "dev"
}

export function canAccessWorkflowSettings(roles: readonly UserRole[]) {
  const scope = resolveRoleScope(roles)
  return scope === "analyst" || scope === "admin" || scope === "dev"
}

export function isItOnlyScope(roles: readonly UserRole[]) {
  return resolveRoleScope(roles) === "it"
}
