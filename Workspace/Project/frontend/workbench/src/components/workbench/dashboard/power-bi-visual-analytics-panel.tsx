"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusBadge } from "@/components/workbench/status-badge"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { roleLabels } from "@/shared/auth/session"
import { gateway, isMockMode } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState, SearchEmptyState, SimulatedBadge } from "@/shared/ui/state-panels"

type VisualizationFiltersState = {
  q: string
  workspace: string
  mode: string
}

const EMPTY_FILTERS: VisualizationFiltersState = {
  q: "",
  workspace: "",
  mode: "",
}

export function PowerBiVisualAnalyticsPanel() {
  const { session } = useAuth()
  const catalogQuery = useWorkbenchQuery(["dashboard", "power-bi"], (signal) => gateway.getPowerBiVisualizationCatalog(signal))
  const [draftFilters, setDraftFilters] = useState<VisualizationFiltersState>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<VisualizationFiltersState>(EMPTY_FILTERS)
  const [selectedViewKey, setSelectedViewKey] = useState<string>("")

  const catalog = catalogQuery.data
  const allVisualizations = catalog?.visualizations ?? []
  const workspaces = catalog?.workspaces ?? []

  const filteredVisualizations = useMemo(() => {
    return allVisualizations.filter((item) => {
      const matchesQ =
        !appliedFilters.q
        || [item.title, item.description, item.workspaceName, ...item.tags]
          .some((value) => value.toLowerCase().includes(appliedFilters.q.toLowerCase()))
      const matchesWorkspace = !appliedFilters.workspace || item.workspaceKey === appliedFilters.workspace
      const matchesMode =
        !appliedFilters.mode
        || (appliedFilters.mode === "ready" && item.isConfigured)
        || (appliedFilters.mode === "placeholder" && !item.isConfigured)

      return matchesQ && matchesWorkspace && matchesMode
    })
  }, [allVisualizations, appliedFilters])

  const activeVisualization =
    filteredVisualizations.find((item) => item.key === selectedViewKey)
    ?? filteredVisualizations.find((item) => item.key === catalog?.defaultVisualizationKey)
    ?? filteredVisualizations[0]
    ?? null

  const configuredCount = allVisualizations.filter((item) => item.isConfigured).length
  const placeholderCount = allVisualizations.length - configuredCount
  const filteredOut = allVisualizations.length > 0 && filteredVisualizations.length === 0 && (
    appliedFilters.q.length > 0 || appliedFilters.workspace.length > 0 || appliedFilters.mode.length > 0
  )

  const applyFilters = () => {
    setAppliedFilters(draftFilters)
    setSelectedViewKey("")
  }

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setSelectedViewKey("")
  }

  if (catalogQuery.isLoading) {
    return <LoadingState label="Loading visual analytics" />
  }

  if (catalogQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(catalogQuery.error)} fallbackTitle="Visual analytics unavailable" />
  }

  return (
    <motion.article className="wb-panel space-y-4" variants={panelMotion}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="wb-kicker">Dashboard Visual Analytics</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">Executive visualizations</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Authorized Power BI embedded views live on the Dashboard so operational charts stay beside the posture summary.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session ? (
            <Badge variant="secondary" className="border-border/70 bg-surface-2/85 text-foreground">
              Roles: {roleLabels(session.roles)}
            </Badge>
          ) : null}
          {isMockMode ? <SimulatedBadge /> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Authorized Views</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{allVisualizations.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-300/25 bg-emerald-500/10 p-3">
          <p className="wb-kicker text-emerald-100">Configured Embeds</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-emerald-100">{configuredCount}</p>
        </div>
        <div className="rounded-lg border border-amber-300/25 bg-amber-500/10 p-3">
          <p className="wb-kicker text-amber-100">Placeholders</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-amber-100">{placeholderCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StatusBadge value={catalog?.status ?? "unconfigured"} />
        <span className="text-muted-foreground">{catalog?.message}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input
          value={draftFilters.q}
          onChange={(event) => setDraftFilters((current) => ({ ...current, q: event.target.value }))}
          placeholder="Search visualization, workspace, or tag"
        />
        <select
          className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
          value={draftFilters.workspace}
          onChange={(event) => setDraftFilters((current) => ({ ...current, workspace: event.target.value }))}
        >
          <option value="">All workspaces</option>
          {workspaces.map((workspace) => (
            <option key={workspace.key} value={workspace.key}>
              {workspace.displayName}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
          value={draftFilters.mode}
          onChange={(event) => setDraftFilters((current) => ({ ...current, mode: event.target.value }))}
        >
          <option value="">All modes</option>
          <option value="ready">Configured embeds</option>
          <option value="placeholder">Placeholders</option>
        </select>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={applyFilters}>
            Apply
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </div>

      {allVisualizations.length === 0 ? (
        <EmptyState
          title="No Power BI visualizations are available"
          description={catalog?.message || "No authorized embed metadata was returned by the backend."}
        />
      ) : filteredOut ? (
        <SearchEmptyState
          title="No visualizations matched the current search"
          description="Broaden the workspace or mode filter, or clear the query to return to the authorized visualization catalog."
          action={
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              Reset visualization filters
            </Button>
          }
        />
      ) : activeVisualization ? (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="wb-kicker">Catalog</p>
                <h4 className="mt-1 text-sm font-semibold tracking-tight">Authorized views</h4>
              </div>
              <Badge variant="secondary" className="border-border/70 bg-surface-2/75 text-foreground">
                {filteredVisualizations.length} visible
              </Badge>
            </div>

            <ScrollArea className="max-h-[720px] pr-2">
              <div className="space-y-2">
                {filteredVisualizations.map((item) => {
                  const isActive = item.key === activeVisualization.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedViewKey(item.key)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-primary/45 bg-primary/10 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
                          : "border-border/65 bg-surface-2/55 hover:border-border/85 hover:bg-surface-2/8"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold tracking-tight">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.workspaceName}</p>
                        </div>
                        <StatusBadge value={item.status} />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag) => (
                          <Badge key={`${item.key}-${tag}`} variant="secondary" className="border-border/70 bg-surface-1/80 text-[10px] text-foreground">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="wb-kicker">Selected View</p>
                <h4 className="mt-1 text-base font-semibold tracking-tight">{activeVisualization.title}</h4>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{activeVisualization.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={activeVisualization.status} />
                {activeVisualization.requiresUserSignIn ? (
                  <Badge variant="secondary" className="border-border/70 bg-surface-2/85 text-foreground">
                    Microsoft sign-in may be required
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Workspace</p>
                <p className="mt-1 text-sm font-medium">{activeVisualization.workspaceName}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Embed Mode</p>
                <p className="mt-1 text-sm font-medium">{activeVisualization.isConfigured ? "Live iframe" : "Placeholder shell"}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
                <p className="wb-kicker">Tags</p>
                <p className="mt-1 text-sm font-medium">{activeVisualization.tags.join(", ") || "No tags"}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between border-b border-border/70 bg-surface-2/75 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold tracking-tight">{activeVisualization.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeVisualization.isConfigured
                      ? "Embedded Power BI surface"
                      : "Planned embed slot waiting for workspace/report metadata"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeVisualization.workspaceId ? (
                    <Badge variant="secondary" className="border-border/70 bg-surface-1/80 text-foreground">
                      Workspace {activeVisualization.workspaceId.slice(0, 8)}
                    </Badge>
                  ) : null}
                  {activeVisualization.reportId ? (
                    <Badge variant="secondary" className="border-border/70 bg-surface-1/80 text-foreground">
                      Report {activeVisualization.reportId.slice(0, 8)}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {activeVisualization.isConfigured && activeVisualization.embedUrl ? (
                <div className="bg-black/20 p-3">
                  <iframe
                    title={activeVisualization.title}
                    src={activeVisualization.embedUrl}
                    className="w-full rounded-xl border border-border/70 bg-surface-3"
                    style={{ minHeight: `${activeVisualization.embedHeightPx}px` }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <div
                  className="grid place-items-center border-t border-dashed border-border/70 bg-[radial-gradient(circle_at_top,rgba(71,165,255,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0))] px-6 py-12 text-center"
                  style={{ minHeight: `${activeVisualization.embedHeightPx}px` }}
                >
                  <div className="max-w-xl space-y-4">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/30 bg-amber-500/10 shadow-[0_14px_44px_rgba(0,0,0,0.24)]">
                      <span className="text-lg font-semibold text-amber-100">BI</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold tracking-tight">Power BI embed is not configured for this view</p>
                      <p className="text-sm text-muted-foreground">
                        The Dashboard shell is live, but the backend still needs a complete workspace id, report id, and embed URL for this visualization.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-surface-2/65 p-4 text-left">
                      <p className="wb-kicker">Expected Backend Config</p>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <p>Workspace key: <span className="text-foreground">{activeVisualization.workspaceKey}</span></p>
                        <p>View key: <span className="text-foreground">{activeVisualization.key}</span></p>
                        <p>Workspace id: <span className="text-foreground">{activeVisualization.workspaceId || "missing"}</span></p>
                        <p>Report id: <span className="text-foreground">{activeVisualization.reportId || "missing"}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No visualization selected"
          description="Choose an authorized Power BI view from the catalog once dashboard embed metadata is available."
        />
      )}
    </motion.article>
  )
}
