"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export type WorkbenchInspectorField = {
  label: string
  value: string
}

export type WorkbenchInspectorItem = {
  title: string
  subtitle?: string
  meta?: string
}

export type WorkbenchInspectorSection = {
  id: string
  title: string
  description?: string
  fields?: WorkbenchInspectorField[]
  items?: WorkbenchInspectorItem[]
  emptyMessage?: string
}

export type WorkbenchInspectorPayload = {
  title: string
  subtitle?: string
  sections: WorkbenchInspectorSection[]
}

type WorkbenchInspectorContextValue = {
  payload: WorkbenchInspectorPayload | null
  openInspector: (payload: WorkbenchInspectorPayload) => void
  closeInspector: () => void
}

const WorkbenchInspectorContext = createContext<WorkbenchInspectorContextValue | undefined>(undefined)

export function WorkbenchInspectorProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<WorkbenchInspectorPayload | null>(null)

  const openInspector = useCallback((next: WorkbenchInspectorPayload) => {
    setPayload(next)
  }, [])

  const closeInspector = useCallback(() => {
    setPayload(null)
  }, [])

  const value = useMemo(
    () => ({
      payload,
      openInspector,
      closeInspector,
    }),
    [closeInspector, openInspector, payload],
  )

  return <WorkbenchInspectorContext.Provider value={value}>{children}</WorkbenchInspectorContext.Provider>
}

export function useWorkbenchInspector() {
  const context = useContext(WorkbenchInspectorContext)
  if (!context) {
    throw new Error("useWorkbenchInspector must be used inside WorkbenchInspectorProvider")
  }

  return context
}

function SectionBlock({ section }: { section: WorkbenchInspectorSection }) {
  const fields = section.fields ?? []
  const items = section.items ?? []

  return (
    <section className="wb-panel-muted p-3">
      <p className="wb-kicker">{section.title}</p>
      {section.description ? <p className="mt-1 text-xs text-muted-foreground">{section.description}</p> : null}

      {fields.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {fields.map((field) => (
            <div key={field.label} className="rounded-md border border-border/60 bg-surface-2/70 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">{field.label}</p>
              <p className="mt-1 break-words text-xs text-foreground">{field.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div key={`${item.title}:${item.subtitle ?? ""}:${item.meta ?? ""}`} className="rounded-md border border-border/60 bg-surface-2/70 px-2.5 py-2">
              <p className="text-xs font-medium">{item.title}</p>
              {item.subtitle ? <p className="mt-0.5 text-[11px] text-muted-foreground">{item.subtitle}</p> : null}
              {item.meta ? <p className="mt-0.5 text-[11px] text-muted-foreground">{item.meta}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {fields.length === 0 && items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{section.emptyMessage ?? "No details available."}</p>
      ) : null}
    </section>
  )
}

export function WorkbenchInspectorDrawer() {
  const { payload, closeInspector } = useWorkbenchInspector()
  const open = payload !== null

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeInspector()}>
      <SheetTrigger className="hidden" />
      <SheetContent side="right" className="w-full max-w-lg border-border bg-surface-1">
        <SheetHeader>
          <SheetTitle>{payload?.title ?? "Entity Inspector"}</SheetTitle>
          <SheetDescription>{payload?.subtitle ?? "Selected entity details"}</SheetDescription>
        </SheetHeader>
        {payload ? (
          <div className="space-y-3 px-4 pb-4 text-sm">
            {payload.sections.map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
