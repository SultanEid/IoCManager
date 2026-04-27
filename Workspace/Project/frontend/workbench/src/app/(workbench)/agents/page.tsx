"use client"

import Link from "next/link"
import { Bot, ShieldCheck, Sparkles } from "lucide-react"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"

export default function AgentsPage() {
  const ziraStatus = useWorkbenchQuery(["agents", "zira-status"], (signal) => gateway.getScanAnalystStatus(signal))
  const aegisPlans = useWorkbenchQuery(["agents", "aegis-plans"], (signal) => gateway.listReportMitigationPlans(signal))

  return (
    <section className="space-y-6">
      <div className="wb-hero-panel overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <p className="wb-kicker">AI Agents</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Zira plans scans. Aegis plans mitigation.</h1>
          <p className="text-sm leading-6 text-muted-foreground md:text-base">
            This hub keeps both agents easy to reach while preserving their responsibilities: Zira owns scan planning, and Aegis reviews reports to create read-only mitigation recommendations.
          </p>
        </div>
        <div className="pointer-events-none absolute right-6 top-6 hidden h-32 w-32 rounded-full border border-primary/25 bg-primary/10 blur-2xl md:block" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="wb-panel space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/35 bg-cyan-400/10 text-cyan-200">
              <Bot className="h-5 w-5" />
            </div>
            <span className="wb-chip">{ziraStatus.data?.indicatorLabel ?? "Loading"}</span>
          </div>
          <div>
            <p className="wb-kicker">Zira</p>
            <h2 className="mt-2 text-2xl font-semibold">Scan planning agent</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Turns user requests, targets, rules, alerts, and discovery context into scan recommendations or controlled scan-plan execution.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface-2/45 p-4 text-sm text-muted-foreground">
            {ziraStatus.data?.latestActionSummary ?? ziraStatus.data?.currentActivity ?? "Zira status will appear here when the backend is available."}
          </div>
          <Link className="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80" href="/scan-analyst">
            Open Zira
          </Link>
        </article>

        <article className="wb-panel space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-400/35 bg-emerald-400/10 text-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="wb-chip">{aegisPlans.data?.totalCount ?? 0} plans</span>
          </div>
          <div>
            <p className="wb-kicker">Aegis</p>
            <h2 className="mt-2 text-2xl font-semibold">Mitigation planning agent</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Reviews saved reports, pasted report text, PDFs, and common IOC files, then produces mitigation recommendations without modifying systems.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface-2/45 p-4 text-sm text-muted-foreground">
            <Sparkles className="mr-2 inline h-4 w-4 text-primary" />
            Aegis can suggest when more scanning would help, but Zira remains responsible for creating or running scan plans.
          </div>
          <Link className="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80" href="/agents/aegis">
            Open Aegis
          </Link>
        </article>
      </div>
    </section>
  )
}
