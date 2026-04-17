"use client"

import { usePathname } from "next/navigation"

export function RouteContentTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="route-content route-transition route-transition-enter">
      {children}
    </div>
  )
}
