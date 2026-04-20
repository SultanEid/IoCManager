import { AlertTriangle, FileSearch, Inbox, Loader2, Lock, ServerCrash, Wrench } from "lucide-react"
import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function LoadingState({
  label = "Loading",
  description,
}: {
  label?: string
  description?: string
}) {
  return (
    <div className="wb-panel flex min-h-56 flex-col justify-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4.5 w-4.5 animate-spin" />
        <p>{label}...</p>
      </div>
      {description ? <p className="wb-subtle">{description}</p> : null}
      <div className="space-y-2">
        <Skeleton className="h-8 w-full rounded-lg bg-surface-2" />
        <Skeleton className="h-8 w-11/12 rounded-lg bg-surface-2" />
        <Skeleton className="h-8 w-3/4 rounded-lg bg-surface-2" />
      </div>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="wb-panel-muted flex min-h-52 flex-col items-center justify-center gap-2 border-dashed px-6 text-center">
      <div className="grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-surface-1/80">
        <Inbox className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold tracking-tight">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function SearchEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="wb-panel-muted flex min-h-56 flex-col items-center justify-center gap-3 border-dashed px-6 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-surface-1/85 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
        <FileSearch className="h-4.5 w-4.5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        <p className="max-w-lg text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="wb-panel min-h-52 border-destructive/35 bg-destructive/10 px-6 text-center">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-destructive/40 bg-destructive/15">
        <AlertTriangle className="h-4 w-4 text-destructive" />
      </div>
      <p className="mt-3 text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function UnavailableState({ title, description }: { title: string; description: string }) {
  return (
    <div className="wb-panel min-h-52 border-border/65 bg-surface-2/50 px-6 text-center">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-surface-1/85">
        <Wrench className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function DependencyDownState({
  title = "Dependency down",
  description = "A required backend dependency is unavailable for this workflow.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="wb-panel min-h-52 border-amber-300/35 bg-amber-500/10 px-6 text-center">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-amber-300/35 bg-amber-500/15">
        <ServerCrash className="h-4 w-4 text-amber-200" />
      </div>
      <p className="mt-3 text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-amber-100/90">{description}</p>
    </div>
  )
}

export function PermissionRestrictedState({
  title = "Permission restricted",
  description = "Your role does not have access to this surface.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="wb-panel min-h-52 border-sky-300/35 bg-sky-500/10 px-6 text-center">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-sky-300/35 bg-sky-500/15">
        <Lock className="h-4 w-4 text-sky-200" />
      </div>
      <p className="mt-3 text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-sky-100/90">{description}</p>
    </div>
  )
}

export function CompactLoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/65 bg-surface-2/65 px-2 py-1.5 text-[11px] text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{label}</span>
    </div>
  )
}

export function CompactEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/70 bg-surface-2/45 px-2 py-2 text-[11px] text-muted-foreground">
      {label}
    </div>
  )
}

export function CompactErrorState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-destructive/35 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
      <AlertTriangle className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  )
}

export function SimulatedBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
      Design / Demo Mode
    </span>
  )
}

export function FrontendPhaseLockNotice({
  label = "Frontend-only phase lock",
  description = "Mutation actions are disabled in normal mode for this phase. Use design/demo mode only for isolated UX review.",
}: {
  label?: string
  description?: string
}) {
  return (
    <div className="rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
      <p className="font-semibold tracking-tight">{label}</p>
      <p className="mt-1">{description}</p>
    </div>
  )
}
