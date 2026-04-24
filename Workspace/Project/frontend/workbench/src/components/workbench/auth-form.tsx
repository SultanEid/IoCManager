"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Lock, User } from "lucide-react"
import { resolveWorkbenchRoute } from "@/components/workbench/workbench-route-meta"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/shared/api/error"
import { canAccessCanonicalRoute, getRoleDefaultRoute } from "@/shared/auth/role-access"
import { deriveSessionFromToken, roleLabel } from "@/shared/auth/session"
import { gateway, isMockMode } from "@/shared/gateway"
import { useAuth } from "@/shared/auth/auth-provider"
import { listMockPersonas } from "@/shared/mock/personas"

function resolveAuthErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Invalid username or password."
  }

  if (error instanceof Error) {
    const message = error.message.trim()
    if (message.startsWith("{") && message.endsWith("}")) {
      return "Sign in failed. Please verify your credentials and try again."
    }
    return message
  }

  return "Sign in failed. Please verify your credentials and try again."
}

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuth()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busyPersona, setBusyPersona] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectPath = useMemo(() => {
    const next = searchParams.get("next")
    if (!next || !next.startsWith("/")) {
      return "/overview"
    }
    return next
  }, [searchParams])

  async function completeSignIn(nextUsername: string, nextPassword: string) {
    const response = await gateway.login(nextUsername, nextPassword)
    const nextSession = deriveSessionFromToken(response.accessToken, response.expiresAtUtc)
    const resolvedNext = resolveWorkbenchRoute(redirectPath)
    const destination = canAccessCanonicalRoute(nextSession.roles, resolvedNext.canonicalPath)
      ? redirectPath
      : getRoleDefaultRoute(nextSession.roles)
    signIn(response.accessToken, response.expiresAtUtc)
    router.replace(destination)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await completeSignIn(username, password)
    } catch (submitError) {
      setError(resolveAuthErrorMessage(submitError))
    } finally {
      setBusy(false)
    }
  }

  if (isMockMode) {
    const personas = listMockPersonas()

    return (
      <section className="w-full max-w-xl rounded-2xl border border-border/80 bg-card/90 p-6 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">IoC Manager</p>
            <h1 className="mt-2 text-2xl font-semibold">Open a sample workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use a guided workspace with representative roles and sample operational data.</p>
          </div>
          <Badge variant="outline" className="rounded-full border-primary/35 bg-primary/10 text-primary">
            Sample Data
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {personas.map((persona) => (
            <article
              key={persona.id}
              className="rounded-xl border border-border/70 bg-surface-2/70 p-3 transition-colors hover:border-primary/40 hover:bg-surface-2"
            >
              <p className="text-sm font-semibold tracking-tight">{persona.displayName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">@{persona.username}</p>
              <p className="mt-2 text-xs text-muted-foreground">{persona.focus}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {persona.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="rounded-full text-[10px] uppercase tracking-[0.08em]">
                    {roleLabel(role)}
                  </Badge>
                ))}
              </div>
              <Button
                className="mt-3 h-8 w-full text-xs"
                disabled={busyPersona !== null}
                onClick={async () => {
                  setBusyPersona(persona.id)
                  setError(null)
                  try {
                    await completeSignIn(persona.username, "mock")
                  } catch (submitError) {
                    setError(resolveAuthErrorMessage(submitError))
                  } finally {
                    setBusyPersona(null)
                  }
                }}
              >
                {busyPersona === persona.id ? "Opening..." : "Open workspace"}
              </Button>
            </article>
          ))}
        </div>

        {error ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-border/80 bg-card/85 p-6 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">IoC Manager</p>
      <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use your ASP.NET API credentials to access IoC Manager.</p>

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Username or email</span>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
        </label>

        {error ? (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </section>
  )
}
