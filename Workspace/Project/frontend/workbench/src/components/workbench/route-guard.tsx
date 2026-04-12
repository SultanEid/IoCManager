"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/shared/auth/auth-provider"
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
  const hasRequiredRole =
    !requiredRoles || requiredRoles.length === 0 || requiredRoles.some((role) => hasRole(session, role))

  useEffect(() => {
    if (loading) {
      return
    }

    if (!session) {
      const next = encodeURIComponent(pathname)
      router.replace(`/auth?next=${next}`)
    }
  }, [loading, pathname, router, session])

  if (loading || !session) {
    return <LoadingState label="Checking session" />
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
