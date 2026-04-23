"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { resolveWorkbenchRoute } from "@/components/workbench/workbench-route-meta"
import { useAuth } from "@/shared/auth/auth-provider"
import { canAccessCanonicalRoute, getRoleDefaultRoute } from "@/shared/auth/role-access"
import type { UserRole } from "@/shared/auth/session"
import { hasRole } from "@/shared/auth/session"
import { LoadingState, PermissionRestrictedState } from "@/shared/ui/state-panels"

export function RouteGuard({
  children,
  requiredRoles,
}: {
  children: React.ReactNode
  requiredRoles?: readonly UserRole[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, loading } = useAuth()
  const resolvedRoute = resolveWorkbenchRoute(pathname)
  const hasRequiredRole =
    !requiredRoles || requiredRoles.length === 0 || requiredRoles.some((role) => hasRole(session, role))
  const canAccessRoute = session ? canAccessCanonicalRoute(session.roles, resolvedRoute.canonicalPath) : false
  const defaultRoute = getRoleDefaultRoute(session?.roles ?? [])

  useEffect(() => {
    if (loading) {
      return
    }

    if (!session) {
      const next = encodeURIComponent(pathname)
      router.replace(`/auth?next=${next}`)
      return
    }

    if (!hasRequiredRole) {
      return
    }

    if (!canAccessRoute && pathname !== defaultRoute) {
      router.replace(defaultRoute)
    }
  }, [canAccessRoute, defaultRoute, hasRequiredRole, loading, pathname, router, session])

  if (loading || !session) {
    return <LoadingState label="Checking session" />
  }

  if (!canAccessRoute && pathname !== defaultRoute) {
    return <LoadingState label="Redirecting to permitted route" />
  }

  if (!hasRequiredRole) {
    return (
      <PermissionRestrictedState
        title="Permission restricted"
        description="Your role cannot access this route."
      />
    )
  }

  return <>{children}</>
}
