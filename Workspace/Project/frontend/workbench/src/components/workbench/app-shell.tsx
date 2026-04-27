"use client"
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bell,
  ChevronRight,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  Star,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { WorkbenchCommandPalette } from "@/components/workbench/command-palette"
import {
  WorkbenchInspectorDrawer,
  useWorkbenchInspector,
} from "@/components/workbench/workbench-inspector"
import { ZiraStatusWidget } from "@/components/workbench/zira-status-widget"
import {
  getWorkbenchNavByModule,
  isWorkbenchNavActive,
  resolveWorkbenchRoute,
} from "@/components/workbench/workbench-route-meta"
import {
  type PinnedWorkbenchItem,
  readPinnedWorkbenchItems,
  togglePinnedAlert,
  writePinnedWorkbenchItems,
} from "@/components/workbench/workbench-shell-storage"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useAuth } from "@/shared/auth/auth-provider"
import { canAccessCanonicalRoute } from "@/shared/auth/role-access"
import type { UserRole } from "@/shared/auth/session"
import { roleLabels } from "@/shared/auth/session"
import { gateway, isMockMode } from "@/shared/gateway"
import { listLegacyJobs } from "@/shared/gateway/legacy-scan-pipeline"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { useThemeMode } from "@/shared/theme/theme-provider"
import { pageMotion } from "@/shared/ui/motion"
import { CompactEmptyState, CompactErrorState, CompactLoadingState } from "@/shared/ui/state-panels"

type NotificationItem = {
  id: string
  title: string
  description: string
  when: string
}

type SidebarNavProps = {
  collapsed: boolean
  pathname: string
  roles: readonly UserRole[]
  onNavigate?: () => void
}

type SidebarWorkAreaProps = {
  collapsed: boolean
  alertsEnabled: boolean
  pinned: PinnedWorkbenchItem[]
  onTogglePin: (alertId: string) => void
}

function SidebarNav({ collapsed, pathname, roles, onNavigate }: SidebarNavProps) {
  const sections = useMemo(
    () =>
      getWorkbenchNavByModule()
        .map((section) => ({
          ...section,
          routes: section.routes.filter((route) => canAccessCanonicalRoute(roles, route.href)),
        }))
        .filter((section) => section.routes.length > 0),
    [roles],
  )

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.module}>
          {!collapsed && section.module !== "Core" ? <p className="wb-kicker mb-2 px-2">{section.module}</p> : null}
          <div className="space-y-1.5">
            {section.routes.map((item) => {
              const active = isWorkbenchNavActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "group flex h-10 items-center gap-2.5 rounded-lg border px-2.5 text-[13px] transition-colors",
                    active
                      ? "border-primary/45 bg-primary/14 text-foreground shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--foreground)_7%,transparent)]"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground",
                    collapsed ? "justify-center px-0" : "justify-start",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function SidebarWorkArea({ collapsed, alertsEnabled, pinned, onTogglePin }: SidebarWorkAreaProps) {
  const alertsQuery = useWorkbenchQuery(["shell", "sidebar", "alerts"], (signal) => gateway.listAlerts(signal), {
    enabled: alertsEnabled,
  })

  const pinnedRows = useMemo(() => {
    const alerts = alertsQuery.data ?? []
    return pinned.map((item) => {
      const match = alerts.find((entry) => entry.id === item.alertId)
      return {
        alertId: item.alertId,
        href: `/alerts/${item.alertId}`,
        title: match?.title ?? `Alert ${item.alertId.slice(0, 8)}`,
        subtitle: match ? `${match.priority} priority` : "Pinned alert",
      }
    })
  }, [alertsQuery.data, pinned])

  if (!alertsEnabled || collapsed || pinned.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 border-t border-border/65 pt-4">
      <section>
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="wb-kicker inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" /> Pinned
          </p>
        </div>

        {alertsQuery.isLoading && pinned.length > 0 ? <CompactLoadingState label="Loading pinned alerts" /> : null}
        {alertsQuery.isError ? <CompactErrorState label="Pinned alerts unavailable" /> : null}

        {pinnedRows.length > 0 ? (
          <div className="space-y-1.5">
            {pinnedRows.slice(0, 4).map((item) => (
              <div key={item.alertId} className="flex items-center gap-1.5 rounded-md border border-border/70 bg-surface-2/55 px-2 py-1.5">
                <Link href={item.href} className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{item.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{item.subtitle}</p>
                </Link>
                <button
                  type="button"
                  onClick={() => onTogglePin(item.alertId)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/70 bg-surface-1/80 text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
                  aria-label={`Unpin alert ${item.alertId.slice(0, 8)}`}
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}

function SidebarContent({
  collapsed,
  pathname,
  roles,
  onNavigate,
  alertsEnabled,
  pinned,
  onTogglePin,
}: SidebarNavProps & SidebarWorkAreaProps) {
  return (
    <ScrollArea className="h-full px-2 pb-4 pt-3">
      <SidebarNav collapsed={collapsed} pathname={pathname} roles={roles} onNavigate={onNavigate} />
      <SidebarWorkArea collapsed={collapsed} alertsEnabled={alertsEnabled} pinned={pinned} onTogglePin={onTogglePin} />
    </ScrollArea>
  )
}

function ShellNotifications({
  items,
  isLoading,
  hasPartialError,
  reducedCapability,
}: {
  items: NotificationItem[]
  isLoading: boolean
  hasPartialError: boolean
  reducedCapability: boolean
}) {
  if (isLoading) {
    return <CompactLoadingState label="Loading notifications" />
  }

  return (
    <div className="space-y-2 px-4 pb-4">
      {hasPartialError ? <CompactErrorState label="Some feeds unavailable. Showing partial notifications." /> : null}
      {reducedCapability ? (
        <div className="rounded-md border border-border/70 bg-surface-2/55 px-2 py-2 text-[11px] text-muted-foreground">
          Notification coverage is currently limited to job activity returned by the backend.
        </div>
      ) : null}
      {items.length === 0 ? (
        <CompactEmptyState
          label={reducedCapability ? "No recent job activity returned." : "No notifications available."}
        />
      ) : null}
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2">
          <p className="text-xs font-semibold tracking-tight">{item.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.description}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{item.when}</p>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">
        Additional notification sources will appear automatically as backend contracts are enabled.
      </p>
    </div>
  )
}

export function WorkbenchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, signOut } = useAuth()
  const { mode: themeMode, toggleMode } = useThemeMode()
  const { closeInspector } = useWorkbenchInspector()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [pinned, setPinned] = useState<PinnedWorkbenchItem[]>([])

  const resolvedRoute = useMemo(() => resolveWorkbenchRoute(pathname), [pathname])
  const roleSet = session?.roles ?? []
  const canOpenAlerts = canAccessCanonicalRoute(roleSet, "/alerts")
  const canOpenScans = canAccessCanonicalRoute(roleSet, "/scans")

  const notificationsQuery = useWorkbenchQuery(["shell", "notifications"], async (signal) => {
    const jobsResult = await Promise.allSettled([listLegacyJobs(signal)])

    const items: NotificationItem[] = []
    const reducedCapability = true

    if (jobsResult[0].status === "fulfilled") {
      for (const job of jobsResult[0].value.slice(0, 3)) {
        const when = job.finishedAtUtc ?? job.startedAtUtc ?? job.queuedAtUtc
        items.push({
          id: `job-${job.id}`,
          title: `${job.scannerFamily} ${job.status.toLowerCase()}`,
          description: job.summary || "No additional details.",
          when: new Date(when).toLocaleString(),
        })
      }
    }

    return {
      items,
      hasPartialError: jobsResult[0].status === "rejected",
      reducedCapability,
    }
  }, {
    enabled: canOpenScans,
  })

  useEffect(() => {
    setPinned(readPinnedWorkbenchItems())
  }, [])

  useEffect(() => {
    closeInspector()
  }, [closeInspector, pathname])

  function handleTogglePin(alertId: string) {
    setPinned((previous) => {
      const next = togglePinnedAlert(previous, alertId)
      writePinnedWorkbenchItems(next)
      return next
    })
  }

  const notificationItems = notificationsQuery.data?.items ?? []
  const hasPartialNotificationError = canOpenScans ? (notificationsQuery.data?.hasPartialError ?? false) : false
  const reducedNotificationCapability = canOpenScans
    ? (notificationsQuery.data?.reducedCapability ?? !isMockMode)
    : true
  const RouteIcon = resolvedRoute.route?.icon

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[auto_1fr]">
        <motion.aside
          animate={{ width: collapsed ? 96 : 292 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="hidden border-r border-border/70 bg-shell-sidebar shadow-[inset_-1px_0_0_0_color-mix(in_srgb,var(--foreground)_6%,transparent)] lg:flex lg:flex-col"
        >
          <div className={cn("px-3", collapsed ? "flex flex-col items-center gap-2 py-3" : "flex h-16 items-center justify-between")}>
            <div className={cn("flex items-center gap-2", collapsed && "w-full justify-center")}>
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-primary/35 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--primary)_18%,transparent),color-mix(in_srgb,var(--surface-2)_74%,transparent))] text-primary shadow-[var(--shadow-soft)]">
                <span className="text-[11px] font-semibold tracking-[0.14em]">IOC</span>
              </div>
              {!collapsed ? (
                <div>
                  <p className="text-sm font-semibold tracking-tight">IoC Manager</p>
                  <p className="text-[11px] text-muted-foreground">Operational IOC management</p>
                </div>
              ) : null}
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              className={cn(collapsed && "h-8 w-8 shrink-0")}
              onClick={() => setCollapsed((previous) => !previous)}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          <Separator />
          <SidebarContent
            collapsed={collapsed}
            pathname={pathname}
            roles={roleSet}
            alertsEnabled={canOpenAlerts}
            pinned={pinned}
            onTogglePin={handleTogglePin}
          />
        </motion.aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-border/70 bg-shell-header shadow-[0_1px_0_0_color-mix(in_srgb,var(--foreground)_6%,transparent)] backdrop-blur-xl">
            <div className="flex min-h-16 items-center gap-2 px-3 py-2 sm:px-4 md:px-6">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground lg:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-4 w-4" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[304px] border-border bg-shell-sidebar p-0">
                  <div className="px-4 pb-3 pt-5">
                    <p className="text-sm font-semibold">IoC Manager</p>
                    <p className="text-xs text-muted-foreground">Operational navigation</p>
                  </div>
                  <Separator />
                  <SidebarContent
                    collapsed={false}
                    pathname={pathname}
                    roles={roleSet}
                    alertsEnabled={canOpenAlerts}
                    onNavigate={() => setMobileOpen(false)}
                    pinned={pinned}
                    onTogglePin={handleTogglePin}
                  />
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-2)_90%,transparent),color-mix(in_srgb,var(--surface-1)_76%,transparent))] text-foreground shadow-[var(--shadow-soft)]">
                      {RouteIcon ? <RouteIcon className="h-4.5 w-4.5" /> : <Search className="h-4.5 w-4.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-tight">{resolvedRoute.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{resolvedRoute.subtitle}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="global-search-trigger"
                onClick={() => setCommandOpen(true)}
                className="hidden h-8 min-w-64 items-center gap-2 rounded-lg border border-border/70 bg-surface-2/70 px-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground lg:inline-flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1">Search workspace</span>
                <kbd className="rounded border border-border/80 bg-surface-1/80 px-1.5 py-0.5 text-[10px]">Ctrl+K</kbd>
              </button>

              <Button
                size="icon-sm"
                variant="outline"
                className="lg:hidden"
                onClick={() => setCommandOpen(true)}
                aria-label="Open global search"
              >
                <Search className="h-4 w-4" />
              </Button>

              <ZiraStatusWidget />

              <Sheet open={notificationOpen} onOpenChange={setNotificationOpen}>
                <SheetTrigger
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground transition-colors hover:border-primary/35"
                  aria-label="Open notifications"
                  data-testid="notifications-trigger"
                >
                  <Bell className="h-4 w-4" />
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-md border-border bg-surface-1 p-0">
                  <div className="border-b border-border/70 px-4 py-3">
                    <p className="text-sm font-semibold tracking-tight">Notification Center</p>
                    <p className="text-xs text-muted-foreground">Recent activity and queue pressure</p>
                  </div>
                  <ShellNotifications
                    items={notificationItems}
                    isLoading={notificationsQuery.isLoading}
                    hasPartialError={hasPartialNotificationError}
                    reducedCapability={reducedNotificationCapability}
                  />
                </SheetContent>
              </Sheet>

              <Button
                size="icon-sm"
                variant="outline"
                onClick={toggleMode}
                aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                data-testid="theme-toggle"
              >
                {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  signOut()
                  router.replace("/auth")
                }}
              >
                Sign out
              </Button>
            </div>

            <div className="border-t border-border/70 px-3 py-2 sm:px-4 md:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <nav className="flex items-center gap-1 text-[11px] text-muted-foreground" data-testid="shell-breadcrumbs">
                  {resolvedRoute.breadcrumbs.map((item, index) => (
                    <span key={`${item.label}:${index}`} className="inline-flex items-center gap-1">
                      {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                      {item.href ? (
                        <Link href={item.href} className="hover:text-foreground">
                          {item.label}
                        </Link>
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={pathname}
              variants={pageMotion}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="wb-shell-main"
            >
              {children}
            </motion.main>
          </AnimatePresence>

          <footer className="border-t border-border/70 px-3 py-3 text-[11px] text-muted-foreground sm:px-4 md:px-6">
            Signed in as {session?.username ?? "unknown"} | Roles: {session?.roles.length ? roleLabels(session.roles) : "none"}
          </footer>
        </div>
      </div>

      <WorkbenchCommandPalette open={commandOpen} onOpenChange={setCommandOpen} roles={roleSet} />
      <WorkbenchInspectorDrawer />
    </div>
  )
}

