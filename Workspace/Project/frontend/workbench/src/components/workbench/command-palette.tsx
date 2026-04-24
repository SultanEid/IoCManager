"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Compass, Filter, Search, SearchCode } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { QUEUE_FOCUS_ITEMS } from "@/components/workbench/nav"
import { resolveWorkbenchRoute, WORKBENCH_ROUTES } from "@/components/workbench/workbench-route-meta"
import { canAccessCanonicalRoute } from "@/shared/auth/role-access"
import type { UserRole } from "@/shared/auth/session"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"

const alertIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type WorkbenchCommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: readonly UserRole[]
}

export function WorkbenchCommandPalette({ open, onOpenChange, roles }: WorkbenchCommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const canOpenAlerts = canAccessCanonicalRoute(roles, "/alerts")
  const alertsQuery = useWorkbenchQuery(["shell", "command-palette", "alerts"], (signal) => gateway.listAlerts(signal), {
    enabled: canOpenAlerts,
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onOpenChange(!open)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onOpenChange, open])

  const normalizedQuery = query.trim()
  const commandLabel = useMemo(() => {
    if (!alertIdPattern.test(normalizedQuery)) {
      return null
    }

    return `${normalizedQuery.slice(0, 8)}...${normalizedQuery.slice(-4)}`
  }, [normalizedQuery])

  const routeItems = useMemo(() => {
    const search = normalizedQuery.toLowerCase()
    return WORKBENCH_ROUTES.filter((item) => {
      if (!canAccessCanonicalRoute(roles, item.href)) {
        return false
      }

      if (!search) {
        return true
      }

      return [item.label, ...item.commandAliases, ...item.aliases].some((token) => token.toLowerCase().includes(search))
    })
  }, [normalizedQuery, roles])

  const queueItems = useMemo(
    () =>
      QUEUE_FOCUS_ITEMS.filter((item) => {
        const canonicalPath = resolveWorkbenchRoute(item.href).canonicalPath
        return canAccessCanonicalRoute(roles, canonicalPath)
      }),
    [roles],
  )

  const alertItems = useMemo(() => {
    if (!alertsQuery.data || normalizedQuery.length === 0) {
      return []
    }

    const search = normalizedQuery.toLowerCase()
    return [...alertsQuery.data]
      .sort((left, right) => Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))
      .filter((item) => {
        const haystack = [item.id, item.title, item.priority].join(" ").toLowerCase()
        return haystack.includes(search)
      })
      .slice(0, 6)
  }, [alertsQuery.data, normalizedQuery])

  function navigate(href: string) {
    onOpenChange(false)
    setQuery("")
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setQuery("")
        }
      }}
      title="IoC Manager Command Palette"
      description="Navigate IoC Manager views and operational shortcuts."
    >
      <Command>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search workspace..."
        />
        <CommandList>
          <CommandEmpty>
            <div className="space-y-1">
              <p className="text-sm font-medium">No matching command</p>
              <p className="text-xs text-muted-foreground">Try route names, queue states, alert ids, or free text.</p>
            </div>
          </CommandEmpty>

          <CommandGroup heading="Navigate">
            {routeItems.map((item) => (
              <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                <item.icon className="h-4 w-4" />
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.commandAliases.join(" · ")}</p>
                </div>
                <CommandShortcut>
                  <Compass className="h-3.5 w-3.5" />
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          {queueItems.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Queue Focus">
                {queueItems.map((item) => (
                  <CommandItem key={item.key} onSelect={() => navigate(item.href)}>
                    <Filter className="h-4 w-4" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {canOpenAlerts && alertItems.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Alerts">
                {alertItems.map((item) => (
                  <CommandItem key={item.id} onSelect={() => navigate(`/alerts/${item.id}`)}>
                    <SearchCode className="h-4 w-4" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.id.slice(0, 8)} · {item.priority}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {canOpenAlerts && commandLabel ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Open Alert">
                <CommandItem onSelect={() => navigate(`/alerts/${normalizedQuery}`)}>
                  <SearchCode className="h-4 w-4" />
                  <div>
                    <p className="text-sm">Open alert {commandLabel}</p>
                    <p className="text-[11px] text-muted-foreground">Direct jump to alert detail</p>
                  </div>
                </CommandItem>
              </CommandGroup>
            </>
          ) : null}

          {canOpenAlerts && normalizedQuery.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Search Queue">
                <CommandItem onSelect={() => navigate(`/queue?q=${encodeURIComponent(normalizedQuery)}`)}>
                  <Search className="h-4 w-4" />
                  <div>
                    <p className="text-sm">Search queue for &quot;{normalizedQuery}&quot;</p>
                    <p className="text-[11px] text-muted-foreground">Full-text filter in triage queue</p>
                  </div>
                </CommandItem>
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
