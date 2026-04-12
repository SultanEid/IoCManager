/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  type SessionState,
  clearSession,
  deriveSessionFromToken,
  getSession,
  setSession,
} from "@/shared/auth/session"

type AuthContextValue = {
  session: SessionState | null
  loading: boolean
  signIn: (token: string, expiresAtUtc: string) => SessionState
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSessionState(getSession())
    setLoading(false)
  }, [])

  const signIn = useCallback((token: string, expiresAtUtc: string) => {
    const next = deriveSessionFromToken(token, expiresAtUtc)
    setSession(next)
    setSessionState(next)
    return next
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      loading,
      signIn,
      signOut,
    }),
    [loading, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return context
}
