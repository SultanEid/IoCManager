"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { CommandCenter, type CommandRoute } from "@/components/command-center"
import { PerformanceGuard } from "@/components/performance-guard"
import { RouteContentTransition } from "@/components/route-content-transition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { prefetchApiData } from "@/hooks/use-api-data"
import { apiFetch } from "@/lib/api"

type NavGroup = {
  label: string
  items: CommandRoute[]
}

type RouteMeta = {
  title: string
  subtitle?: string
}

type MeEnvelope = {
  authenticated: boolean
  user?: {
    userId: string
    username: string
    email: string
    displayName: string
  }
}

type TwoFactorStatus = {
  enabled: boolean
  hasAuthenticatorKey: boolean
  recoveryCodesLeft: number
}

type TwoFactorSetupStart = {
  sharedKey: string
  otpauthUri: string
  qrCodePayload: string
}

type TwoFactorSetupConfirm = {
  enabled: boolean
  recoveryCodes: string[]
}

const NAV: NavGroup[] = [
  {
    label: "Dashboard",
    items: [{ href: "/dashboard", label: "Overview", group: "Dashboard" }],
  },
  {
    label: "Management",
    items: [
      { href: "/activity", label: "Activity", group: "Management" },
      { href: "/snort", label: "Snort Rules", group: "Management" },
      { href: "/sigma", label: "Sigma Rules", group: "Management" },
      { href: "/yara", label: "Yara Rules", group: "Management" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/feeds", label: "Threat Feeds", group: "Operations" },
      { href: "/servers", label: "Servers", group: "Operations" },
      { href: "/distribution", label: "Distribution", group: "Operations" },
      { href: "/reports", label: "Reports", group: "Operations" },
    ],
  },
  {
    label: "Analysis",
    items: [
      { href: "/investigate", label: "Investigation Workspace", group: "Analysis" },
      { href: "/graph", label: "Graph Explorer", group: "Analysis" },
      { href: "/correlation", label: "Correlation Clusters", group: "Analysis" },
      { href: "/coverage", label: "Coverage Studio", group: "Analysis" },
      { href: "/analytics/trends", label: "Trend Analysis", group: "Analysis" },
      { href: "/analytics/stats", label: "Category Stats", group: "Analysis" },
    ],
  },
  {
    label: "Administration",
    items: [{ href: "/audit", label: "Audit Log", group: "Administration" }],
  },
]

const CREDITS_ITEM: CommandRoute = {
  href: "/credits",
  label: "Credits",
  group: "Administration",
}

const UTILITY_ROUTES: CommandRoute[] = [{ href: "/settings", label: "Settings", group: "Utilities" }]

const ROUTE_DATA_PREFETCH: Record<string, string[]> = {
  "/dashboard": ["/api/dashboard/summary", "/api/dashboard/sections", "/api/dashboard/visitors?range=90d"],
  "/activity": ["/api/activity/items"],
  "/snort": ["/api/snort/rules"],
  "/sigma": ["/api/sigma/rules"],
  "/yara": ["/api/yara/rules"],
  "/feeds": ["/api/feeds/items"],
  "/servers": ["/api/servers/items"],
  "/distribution": ["/api/distribution/items"],
  "/reports": ["/api/reports/items"],
  "/analytics/trends": ["/api/analytics/trends"],
  "/analytics/stats": ["/api/analytics/stats"],
  "/graph": ["/api/graph/explore?seedId=1&depth=2&limit=180", "/api/correlation/stories/1"],
  "/investigate": ["/api/graph/explore?seedId=1&depth=2&limit=180", "/api/correlation/stories/1", "/api/correlation/clusters"],
  "/correlation": ["/api/correlation/clusters", "/api/detections/coverage"],
  "/coverage": ["/api/detections/coverage", "/api/iocs?pageSize=200"],
  "/audit": ["/api/audit/logs"],
  "/settings": ["/api/settings/preferences"],
  "/workspace": ["/api/workspace/panels"],
  "/customizer": ["/api/customizer/state"],
}

const META_BY_ROUTE: Array<{ prefix: string; meta: RouteMeta }> = [
  {
    prefix: "/dashboard",
    meta: {
      title: "Dashboard",
      subtitle: "Operational overview for IOC activity and posture.",
    },
  },
  {
    prefix: "/activity",
    meta: {
      title: "Activity",
      subtitle: "Indicator inventory and triage status.",
    },
  },
  {
    prefix: "/reports",
    meta: {
      title: "Reports",
      subtitle: "Generate and download operational outputs.",
    },
  },
  {
    prefix: "/feeds",
    meta: {
      title: "Threat Feeds",
      subtitle: "Managed ingestion sources and synchronization state.",
    },
  },
  {
    prefix: "/servers",
    meta: {
      title: "Servers",
      subtitle: "Managed infrastructure and monitoring posture.",
    },
  },
  {
    prefix: "/distribution",
    meta: {
      title: "Distribution",
      subtitle: "Rule deployment and rollout tracking.",
    },
  },
  {
    prefix: "/snort",
    meta: {
      title: "Snort Rules",
      subtitle: "Network detection signatures and status.",
    },
  },
  {
    prefix: "/sigma",
    meta: {
      title: "Sigma Rules",
      subtitle: "Behavior analytics signatures for endpoint telemetry.",
    },
  },
  {
    prefix: "/yara",
    meta: {
      title: "Yara Rules",
      subtitle: "Binary pattern detections and match volume.",
    },
  },
  {
    prefix: "/investigate",
    meta: {
      title: "Investigation Workspace",
      subtitle: "Unified pivoting, cluster context, and explainable threat story.",
    },
  },
  {
    prefix: "/graph",
    meta: {
      title: "Graph Explorer",
      subtitle: "Pivot through linked observables and relationship evidence.",
    },
  },
  {
    prefix: "/coverage",
    meta: {
      title: "Coverage Studio",
      subtitle: "Detection family coverage and priority IOC gap management.",
    },
  },
  {
    prefix: "/correlation",
    meta: {
      title: "Correlation Clusters",
      subtitle: "Explainable IOC clusters and case promotion workflow.",
    },
  },
  {
    prefix: "/ioc/",
    meta: {
      title: "IOC Detail",
      subtitle: "Indicator confidence, lifecycle, and correlation context.",
    },
  },
  {
    prefix: "/analytics/trends",
    meta: {
      title: "Trend Analysis",
      subtitle: "IOC type distribution over time.",
    },
  },
  {
    prefix: "/analytics/stats",
    meta: {
      title: "Category Stats",
      subtitle: "Threat category distribution snapshot.",
    },
  },
  {
    prefix: "/audit",
    meta: {
      title: "Audit Log",
      subtitle: "Security-relevant events and system changes.",
    },
  },
  {
    prefix: "/settings",
    meta: {
      title: "Settings",
      subtitle: "Theme, interaction, and account security configuration.",
    },
  },
  {
    prefix: "/workspace",
    meta: {
      title: "Workspace",
      subtitle: "Component-rich controls and operations playground.",
    },
  },
  {
    prefix: "/customizer",
    meta: {
      title: "Customizer",
      subtitle: "Tune styles, color profiles, and interface behavior.",
    },
  },
  {
    prefix: "/credits",
    meta: {
      title: "Credits",
      subtitle: "Secret contributors page unlocked.",
    },
  },
]

function isActive(pathname: string, href: string) {
  if (pathname === href) {
    return true
  }

  return pathname.startsWith(`${href}/`)
}

function resolveMeta(pathname: string): RouteMeta {
  const match = META_BY_ROUTE.find((item) => pathname.startsWith(item.prefix))
  return (
    match?.meta ?? {
      title: "Detective",
      subtitle: "IOC Classification & Management",
    }
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [creditsUnlocked, setCreditsUnlocked] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profile, setProfile] = useState<MeEnvelope["user"] | null>(null)
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus>({
    enabled: false,
    hasAuthenticatorKey: false,
    recoveryCodesLeft: 0,
  })
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupStart | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[]>([])
  const [twoFactorWorking, setTwoFactorWorking] = useState(false)
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)

  const routeMeta = useMemo(() => resolveMeta(pathname), [pathname])

  useEffect(() => {
    function sync() {
      const cookieUnlocked = document.cookie.includes("detective-credits-unlocked=1")
      const localUnlocked = window.localStorage.getItem("detective-credits-unlocked") === "1"
      if (localUnlocked && !cookieUnlocked) {
        document.cookie = "detective-credits-unlocked=1; path=/; max-age=31536000; samesite=lax"
      }
      setCreditsUnlocked(cookieUnlocked || localUnlocked)
    }

    sync()
    window.addEventListener("storage", sync)
    window.addEventListener("detective:credits-unlocked", sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("detective:credits-unlocked", sync)
    }
  }, [])

  useEffect(() => {
    setProfileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!profileOpen) {
      return
    }
    let mounted = true
    setProfileLoading(true)
    setTwoFactorError(null)
    void Promise.allSettled([apiFetch<MeEnvelope>("/api/auth/me"), apiFetch<TwoFactorStatus>("/api/auth/2fa/status")])
      .then((results) => {
        if (!mounted) {
          return
        }
        const [meResult, twoFactorResult] = results
        if (meResult.status === "fulfilled") {
          setProfile(meResult.value.user ?? null)
        } else {
          setProfile(null)
        }
        if (twoFactorResult.status === "fulfilled") {
          setTwoFactorStatus(twoFactorResult.value)
        } else {
          setTwoFactorStatus({
            enabled: false,
            hasAuthenticatorKey: false,
            recoveryCodesLeft: 0,
          })
        }
      })
      .finally(() => {
        if (mounted) {
          setProfileLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [profileOpen])

  const navigation = useMemo(() => {
    if (!creditsUnlocked) {
      return NAV
    }

    return [...NAV, { label: "Contributors", items: [CREDITS_ITEM] }]
  }, [creditsUnlocked])

  const commandRoutes = navigation.flatMap((group) => group.items)

  useEffect(() => {
    const hrefs = [...navigation.flatMap((group) => group.items.map((item) => item.href)), ...UTILITY_ROUTES.map((item) => item.href)]
    const apiPaths = hrefs.flatMap((href) => ROUTE_DATA_PREFETCH[href] ?? [])

    let timeoutId: number | null = null
    let idleId: number | null = null

    const runPrefetch = () => {
      for (const href of hrefs) {
        router.prefetch(href)
      }
      void prefetchApiData(apiPaths)
    }

    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (typeof win.requestIdleCallback === "function") {
      idleId = win.requestIdleCallback(runPrefetch, { timeout: 1200 })
    } else {
      timeoutId = window.setTimeout(runPrefetch, 180)
    }

    return () => {
      if (idleId !== null && typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(idleId)
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [navigation, router])

  async function handleLogout() {
    setProfileMenuOpen(false)
    setProfileOpen(false)
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } catch {
      // best effort
    } finally {
      router.push("/auth")
    }
  }

  async function startTwoFactorSetup() {
    setTwoFactorWorking(true)
    setTwoFactorError(null)
    try {
      const setup = await apiFetch<TwoFactorSetupStart>("/api/auth/2fa/setup/start", {
        method: "POST",
      })
      setTwoFactorSetup(setup)
      setTwoFactorRecoveryCodes([])
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : "Could not start two-factor setup.")
    } finally {
      setTwoFactorWorking(false)
    }
  }

  async function confirmTwoFactorSetup() {
    const code = twoFactorCode.trim()
    if (!code) {
      setTwoFactorError("Enter the authenticator code first.")
      return
    }

    setTwoFactorWorking(true)
    setTwoFactorError(null)
    try {
      const response = await apiFetch<TwoFactorSetupConfirm>("/api/auth/2fa/setup/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      })
      setTwoFactorStatus((previous) => ({
        ...previous,
        enabled: response.enabled,
        recoveryCodesLeft: response.recoveryCodes.length,
        hasAuthenticatorKey: true,
      }))
      setTwoFactorRecoveryCodes(response.recoveryCodes)
      setTwoFactorSetup(null)
      setTwoFactorCode("")
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : "Could not verify authenticator code.")
    } finally {
      setTwoFactorWorking(false)
    }
  }

  async function regenerateRecoveryCodes() {
    setTwoFactorWorking(true)
    setTwoFactorError(null)
    try {
      const response = await apiFetch<{ recoveryCodes: string[] }>("/api/auth/2fa/recovery-codes/regenerate", {
        method: "POST",
      })
      setTwoFactorRecoveryCodes(response.recoveryCodes)
      setTwoFactorStatus((previous) => ({
        ...previous,
        recoveryCodesLeft: response.recoveryCodes.length,
      }))
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : "Could not regenerate recovery codes.")
    } finally {
      setTwoFactorWorking(false)
    }
  }

  async function disableTwoFactor() {
    setTwoFactorWorking(true)
    setTwoFactorError(null)
    try {
      await apiFetch("/api/auth/2fa/disable", {
        method: "POST",
      })
      setTwoFactorStatus({
        enabled: false,
        hasAuthenticatorKey: false,
        recoveryCodesLeft: 0,
      })
      setTwoFactorSetup(null)
      setTwoFactorCode("")
      setTwoFactorRecoveryCodes([])
    } catch (error) {
      setTwoFactorError(error instanceof Error ? error.message : "Could not disable two-factor authentication.")
    } finally {
      setTwoFactorWorking(false)
    }
  }

  function openProfile() {
    setProfileMenuOpen(false)
    setProfileOpen(true)
  }

  return (
    <div className="app-shell min-h-svh p-2 md:p-3">
      <PerformanceGuard />
      <CommandCenter routes={commandRoutes} />
      <div className="surface min-h-[calc(100svh-1rem)] overflow-hidden md:min-h-[calc(100svh-1.5rem)]">
        <div className="grid min-h-full grid-cols-1 md:grid-cols-[280px_1fr]">
          <aside className="hidden border-r border-[var(--border)] md:flex md:flex-col">
            <div className="shell-header-block flex flex-col justify-center px-6">
              <p className="text-xl font-semibold">Detective</p>
              <p className="text-xs text-[var(--muted-foreground)]">IOC Classification & Management</p>
            </div>

            <nav className="min-h-0 flex-1 overflow-auto px-4 py-5">
              {navigation.map((group) => (
                <section key={group.label} className="mb-6">
                  <h2 className="mb-2 px-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {group.label}
                  </h2>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} prefetch className={navLinkClass(pathname, item.href)}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </nav>

            <div className="border-t border-[var(--border)] px-4 py-4">
              <div className="space-y-2.5">
                <Link href="/settings" prefetch className={footerActionClass(pathname, "/settings")}>
                  <span aria-hidden className="utility-icon">
                    S
                  </span>
                  <span>Settings</span>
                </Link>
                <button
                  type="button"
                  className={footerActionClass(pathname, "/help")}
                  onClick={() => window.dispatchEvent(new CustomEvent("detective:open-shortcuts"))}
                >
                  <span aria-hidden className="utility-icon">
                    ?
                  </span>
                  <span>Shortcuts</span>
                </button>
                <button
                  type="button"
                  className={footerActionClass(pathname, "/search")}
                  onClick={() => window.dispatchEvent(new CustomEvent("detective:open-command-center"))}
                >
                  <span aria-hidden className="utility-icon">
                    K
                  </span>
                  <span>Search</span>
                </button>
              </div>

              <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_95%,transparent)] p-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_14%,transparent)] text-xs font-semibold">
                  AD
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{profile?.displayName ?? "Detective Admin"}</p>
                  <p className="truncate text-[10px] text-[var(--muted-foreground)]">{profile?.email ?? "admin@detective.local"}</p>
                </div>
                <div className="relative">
                  <Button
                    className="h-7 w-7 px-0 text-xs"
                    size="icon"
                    type="button"
                    variant="outline"
                    aria-label="Profile options"
                    onClick={() => setProfileMenuOpen((previous) => !previous)}
                  >
                    ...
                  </Button>
                  {profileMenuOpen ? (
                    <div className="absolute bottom-9 right-0 z-20 w-44 overflow-hidden rounded-lg border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_98%,transparent)] shadow-[var(--shadow-card)]">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-xs text-[var(--muted-foreground)] transition-[background-color,color] hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] hover:text-[var(--foreground)]"
                        onClick={openProfile}
                      >
                        Profile
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 p-4 md:p-6">
            <header className="shell-header-block mb-5 flex flex-wrap items-center gap-3 md:flex-nowrap">
              <div>
                <h1 className="text-xl font-semibold">{routeMeta.title}</h1>
                {routeMeta.subtitle ? <p className="text-sm text-[var(--muted-foreground)]">{routeMeta.subtitle}</p> : null}
              </div>
            </header>
            <RouteContentTransition>{children}</RouteContentTransition>
          </main>
        </div>
      </div>

      {profileOpen ? (
        <div className="fixed inset-0 z-[120] bg-black/55 p-4 backdrop-blur-sm">
          <div className="ml-auto h-full w-full max-w-sm overflow-hidden rounded-[var(--radius)] border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold">User Profile</h3>
              <Button className="h-8 px-3 text-xs" size="sm" type="button" variant="outline" onClick={() => setProfileOpen(false)}>
                Close
              </Button>
            </div>
            <div className="space-y-4 p-4">
              {profileLoading ? (
                <div className="space-y-2">
                  <div className="shimmer h-6 rounded-md" />
                  <div className="shimmer h-10 rounded-md" />
                  <div className="shimmer h-10 rounded-md" />
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_98%,transparent)] p-4">
                  <p className="text-sm font-semibold">{profile?.displayName ?? "Detective Admin"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">@{profile?.username ?? "admin"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{profile?.email ?? "admin@detective.local"}</p>
                </div>
              )}
              <section className="space-y-3 rounded-xl border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_98%,transparent)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Two-factor Authentication</h4>
                  <span className="text-xs text-[var(--muted-foreground)]">{twoFactorStatus.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <div className="grid gap-1 text-xs text-[var(--muted-foreground)]">
                  <p>Authenticator key: {twoFactorStatus.hasAuthenticatorKey ? "Ready" : "Not configured"}</p>
                  <p>Recovery codes left: {twoFactorStatus.recoveryCodesLeft}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="h-8 px-3 text-xs" size="sm" type="button" variant="outline" disabled={twoFactorWorking} onClick={startTwoFactorSetup}>
                    {twoFactorStatus.enabled ? "Rotate App" : "Set Up App"}
                  </Button>
                  <Button
                    className="h-8 px-3 text-xs"
                    size="sm"
                    type="button"
                    variant="outline"
                    disabled={twoFactorWorking || !twoFactorStatus.enabled}
                    onClick={regenerateRecoveryCodes}
                  >
                    Recovery Codes
                  </Button>
                  <Button
                    className="h-8 px-3 text-xs"
                    size="sm"
                    type="button"
                    variant="outline"
                    disabled={twoFactorWorking || !twoFactorStatus.enabled}
                    onClick={disableTwoFactor}
                  >
                    Disable
                  </Button>
                </div>
                {twoFactorSetup ? (
                  <div className="space-y-2 rounded-lg border border-[var(--input)] p-3">
                    <p className="text-xs text-[var(--muted-foreground)]">Scan with any TOTP app, then enter one code to confirm.</p>
                    <div className="flex items-end gap-3">
                      <Image
                        alt="2FA QR code"
                        className="h-24 w-24 rounded-md border border-[var(--input)] bg-white p-1"
                        height={96}
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(twoFactorSetup.qrCodePayload)}`}
                        unoptimized
                        width={96}
                      />
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <div className="rounded-md border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_98%,transparent)] p-2">
                          <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted-foreground)]">Key</p>
                          <code className="mt-1 block break-all text-[11px] leading-relaxed text-[var(--foreground)]">
                            {twoFactorSetup.sharedKey}
                          </code>
                        </div>
                        <Input
                          className="h-9 text-sm"
                          placeholder="Verification code"
                          value={twoFactorCode}
                          onChange={(event) => setTwoFactorCode(event.target.value)}
                        />
                        <Button
                          className="h-8 w-full px-3 text-xs"
                          size="sm"
                          type="button"
                          disabled={twoFactorWorking}
                          onClick={confirmTwoFactorSetup}
                        >
                          Confirm Setup
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {twoFactorRecoveryCodes.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-[var(--input)] p-2">
                    {twoFactorRecoveryCodes.map((code) => (
                      <code key={code} className="rounded bg-[var(--muted)] px-1.5 py-1 text-[10px]">
                        {code}
                      </code>
                    ))}
                  </div>
                ) : null}
                {twoFactorError ? <p className="text-xs text-[var(--destructive)]">{twoFactorError}</p> : null}
              </section>
              <div className="space-y-2">
                <Button className="h-10 w-full text-sm" type="button" variant="outline" onClick={() => router.push("/settings")}>
                  Open Settings
                </Button>
                <Button className="h-10 w-full text-sm" type="button" variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function navLinkClass(pathname: string, href: string) {
  const active = isActive(pathname, href)

  if (href === "/credits") {
    return `block overflow-visible rounded-lg border px-3 py-2.5 text-sm leading-6 font-semibold transition-colors border-[color-mix(in_srgb,var(--primary)_56%,transparent)] bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] text-[var(--foreground)] ${active ? "shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_28%,transparent)_inset]" : ""}`
  }

  if (active) {
    return "block rounded-lg bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)] px-3 py-2 text-sm font-semibold transition-colors"
  }

  return "block rounded-lg px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] hover:text-[var(--foreground)]"
}

function footerActionClass(pathname: string, href: string) {
  const active = isActive(pathname, href)
  if (active) {
    return "flex h-9 w-full items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)] px-3 text-left text-sm font-semibold transition-colors"
  }

  return "flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] hover:text-[var(--foreground)]"
}
