"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/workbench/status-badge"
import { classifyUiError } from "@/shared/api/error-classification"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

export function PowerBiVisualAnalyticsPanel() {
  const catalogQuery = useWorkbenchQuery(["dashboard", "power-bi"], (signal) => gateway.getPowerBiVisualizationCatalog(signal))
  const [selectedViewKey, setSelectedViewKey] = useState<string>("")

  const catalog = catalogQuery.data
  const allVisualizations = catalog?.visualizations ?? []

  const activeVisualization =
    allVisualizations.find((item) => item.key === selectedViewKey)
    ?? allVisualizations.find((item) => item.key === catalog?.defaultVisualizationKey)
    ?? allVisualizations[0]
    ?? null

  const embedHeight = Math.max(activeVisualization?.embedHeightPx ?? 760, 840)

  if (catalogQuery.isLoading) {
    return <LoadingState label="Loading visual analytics" />
  }

  if (catalogQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(catalogQuery.error)} fallbackTitle="Visual analytics unavailable" />
  }

  return (
    <motion.article className="wb-panel space-y-4" variants={panelMotion}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Executive charts</h3>
          <p className="mt-1 text-sm text-muted-foreground">Focused operational view.</p>
        </div>
        <StatusBadge value={catalog?.status ?? "unconfigured"} />
      </div>

      {allVisualizations.length === 0 ? (
        <EmptyState
          title="No Power BI visualizations are available"
          description={catalog?.message || "No authorized embed metadata was returned by the backend."}
        />
      ) : activeVisualization ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium tracking-tight text-foreground/90">{activeVisualization.title}</p>
            <div className="flex flex-wrap items-center gap-2">
              {allVisualizations.length > 1 ? (
                <select
                  className="h-9 min-w-56 rounded-lg border border-border/70 bg-surface-1 px-3 text-sm"
                  value={activeVisualization.key}
                  onChange={(event) => setSelectedViewKey(event.target.value)}
                >
                  {allVisualizations.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.title}
                    </option>
                  ))}
                </select>
              ) : null}
              {activeVisualization.requiresUserSignIn ? (
                <Badge variant="secondary" className="border-border/70 bg-surface-2/85 text-foreground">
                  Microsoft sign-in required
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-surface-2/40">
            {activeVisualization.isConfigured && activeVisualization.embedUrl ? (
              <iframe
                title={activeVisualization.title}
                src={activeVisualization.embedUrl}
                className="block w-full bg-surface-3"
                style={{ height: `${embedHeight}px` }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <div
                className="grid place-items-center border-t border-dashed border-border/70 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_4%,transparent),transparent)] px-6 py-12 text-center"
                style={{ height: `${embedHeight}px` }}
              >
                <div className="max-w-xl space-y-3">
                  <p className="text-base font-semibold tracking-tight">Power BI view is not configured yet</p>
                  <p className="text-sm text-muted-foreground">Add workspace id, report id, and embed URL in backend config.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No visualization selected"
          description="Choose a configured Power BI view once metadata is available."
        />
      )}
    </motion.article>
  )
}
