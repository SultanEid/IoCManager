"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

export type CommandRoute = {
  href: string
  label: string
  group: string
}

type CommandCenterProps = {
  routes: CommandRoute[]
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function CommandCenter({ routes }: CommandCenterProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    function onOpenPalette() {
      setOpen(true)
    }

    function onOpenShortcuts() {
      setHelpOpen(true)
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((previous) => !previous)
        return
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "?") {
        if (isTypingTarget(event.target)) {
          return
        }
        event.preventDefault()
        setHelpOpen((previous) => !previous)
      }

      if (event.key === "Escape") {
        setOpen(false)
        setHelpOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("detective:open-command-center", onOpenPalette)
    window.addEventListener("detective:open-shortcuts", onOpenShortcuts)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("detective:open-command-center", onOpenPalette)
      window.removeEventListener("detective:open-shortcuts", onOpenShortcuts)
    }
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return routes
    }

    return routes.filter((route) =>
      `${route.label} ${route.group}`.toLowerCase().includes(normalized)
    )
  }, [query, routes])

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[110] bg-black/55 p-4 backdrop-blur-sm">
          <div className="surface fade-up mx-auto mt-[12vh] w-full max-w-2xl overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Search</p>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-surface w-full"
                placeholder="Jump to route, page, or workflow..."
              />
            </div>
            <div className="max-h-[55svh] overflow-auto px-3 py-2">
              {filtered.map((route) => (
                <button
                  key={route.href}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]"
                  onClick={() => {
                    setOpen(false)
                    router.push(route.href)
                  }}
                >
                  <span>{route.label}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{route.group}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted-foreground)]">
              <span className="mr-3">
                <kbd className="rounded border border-[var(--input)] px-1.5 py-0.5">Ctrl/Cmd + K</kbd> Search
              </span>
              <span>
                <kbd className="rounded border border-[var(--input)] px-1.5 py-0.5">?</kbd> Shortcuts
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div className="fixed inset-0 z-[110] bg-black/55 p-4 backdrop-blur-sm">
          <div className="surface fade-up mx-auto mt-[20vh] w-full max-w-md p-5">
            <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <kbd className="rounded border border-[var(--input)] px-2 py-1">Ctrl/Cmd + K</kbd>{" "}
                Open command palette
              </p>
              <p>
                <kbd className="rounded border border-[var(--input)] px-2 py-1">?</kbd> Toggle this
                help
              </p>
              <p>
                <kbd className="rounded border border-[var(--input)] px-2 py-1">D</kbd> Cycle
                theme mode
              </p>
              <p>
                <kbd className="rounded border border-[var(--input)] px-2 py-1">I + O + C (hold)</kbd>{" "}
                Open hidden page
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
