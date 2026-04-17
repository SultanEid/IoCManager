"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiFetch, getApiBaseUrl } from "@/lib/api"
import { useToast } from "@/components/toast-provider"

type AuthEnvelope = {
  authenticated: boolean
  requiresTwoFactor?: boolean
  availableFactors?: string[]
  user?: {
    userId: string
    username: string
    email: string
    displayName: string
  }
}

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { notify } = useToast()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const nextPath = searchParams.get("next")
  const redirectTarget = nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard"

  useEffect(() => {
    let mounted = true

    async function check() {
      try {
        await apiFetch<AuthEnvelope>("/api/auth/me")
        if (mounted) {
          router.replace(redirectTarget)
        }
      } catch {
        // keep signed-out users here
      }
    }

    check()
    return () => {
      mounted = false
    }
  }, [redirectTarget, router])

  async function onPrimarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")

    try {
      const response = await apiFetch<AuthEnvelope>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          rememberMe: true,
        }),
      })

      if (response.requiresTwoFactor) {
        setRequiresTwoFactor(true)
        notify("Two-factor verification required.", "info")
        return
      }

      notify("Welcome back.", "success")
      router.push(redirectTarget)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.")
    } finally {
      setBusy(false)
    }
  }

  async function onTwoFactorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")

    try {
      await apiFetch<AuthEnvelope>("/api/auth/login/verify-2fa", {
        method: "POST",
        body: JSON.stringify({
          code,
          useRecoveryCode,
          rememberDevice: true,
        }),
      })

      notify("Signed in with 2FA.", "success")
      router.push(redirectTarget)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Two-factor verification failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell relative min-h-svh p-2 md:p-3">
      <div className="surface relative grid min-h-[calc(100svh-1rem)] overflow-hidden border-white/10 md:min-h-[calc(100svh-1.5rem)] md:grid-cols-2">
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 md:right-8 md:top-8">
          <span className="text-sm font-semibold">Login</span>
        </div>

        <aside className="auth-left relative hidden h-full flex-col border-r border-[var(--border)] p-10 text-[var(--foreground)] lg:flex">
          <div className="relative z-10 flex items-center gap-2 text-2xl font-semibold">
            <span className="inline-block text-3xl">[+]</span> Detective
          </div>
        </aside>

        <section className="auth-right fade-up flex items-center justify-center px-6 py-16 md:px-10">
          <div className="w-full max-w-md space-y-7">
            <header className="space-y-2 text-center">
              <h1 className="text-4xl font-semibold tracking-tight">
                {requiresTwoFactor ? "Two-factor verification" : "Welcome back"}
              </h1>
              {requiresTwoFactor ? (
                <p className="text-base text-[var(--muted-foreground)]">
                  Enter an authenticator code or a recovery code.
                </p>
              ) : null}
            </header>

            {!requiresTwoFactor ? (
              <form className="space-y-4" onSubmit={onPrimarySubmit}>
                <input
                  className="input-surface w-full"
                  placeholder="Username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
                <input
                  className="input-surface w-full"
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />

                {error ? (
                  <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                ) : null}

                <button disabled={busy} className="btn-primary h-12 w-full text-base" type="submit">
                  {busy ? "Please wait..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={onTwoFactorSubmit}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useRecoveryCode}
                    onChange={(event) => setUseRecoveryCode(event.target.checked)}
                  />
                  Use recovery code
                </label>
                <input
                  className="input-surface w-full"
                  placeholder={useRecoveryCode ? "Recovery code" : "Authenticator code"}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  required
                />
                {error ? (
                  <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={busy} className="btn-primary h-12 text-base" type="submit">
                    {busy ? "Verifying..." : "Verify"}
                  </button>
                  <button
                    disabled={busy}
                    className="btn-outline h-12 text-base"
                    type="button"
                    onClick={() => {
                      setRequiresTwoFactor(false)
                      setCode("")
                      setUseRecoveryCode(false)
                    }}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            <p className="text-center text-xs text-[var(--muted-foreground)]">
              API Endpoint: {getApiBaseUrl()}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
