"use client"

import { type ReactNode, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    async function verify() {
      try {
        await apiFetch("/api/auth/me")
      } catch {
        router.replace("/auth")
      }
    }

    void verify()
  }, [router])

  return <>{children}</>
}
