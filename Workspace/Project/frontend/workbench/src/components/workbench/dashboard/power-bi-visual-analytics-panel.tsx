"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/workbench/status-badge"
import { classifyUiError } from "@/shared/api/error-classification"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState } from "@/shared/ui/state-panels"

const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000
const MIN_TOKEN_REFRESH_DELAY_MS = 30 * 1000
const POWER_BI_GUTTER_CROP_PX = 44

export function PowerBiVisualAnalyticsPanel() {
  const catalogQuery = useWorkbenchQuery(["dashboard", "power-bi"], (signal) => gateway.getPowerBiVisualizationCatalog(signal))
  const [selectedViewKey, setSelectedViewKey] = useState<string>("")
  const [embedError, setEmbedError] = useState<string | null>(null)
  const [embedLoading, setEmbedLoading] = useState(false)
  const embedContainerRef = useRef<HTMLDivElement | null>(null)

  const catalog = catalogQuery.data
  const allVisualizations = useMemo(() => catalog?.visualizations ?? [], [catalog?.visualizations])

  const activeVisualization =
    allVisualizations.find((item) => item.key === selectedViewKey)
    ?? allVisualizations.find((item) => item.key === catalog?.defaultVisualizationKey)
    ?? allVisualizations[0]
    ?? null

  const embedHeight = Math.max(activeVisualization?.embedHeightPx ?? 760, 840)
  const hasConfiguredEmbed = Boolean(activeVisualization?.isConfigured && activeVisualization.embedUrl)
  const tokenRefreshAt = useMemo(() => {
    const expirations = allVisualizations
      .map((item) => item.embedTokenExpiresAtUtc ? new Date(item.embedTokenExpiresAtUtc).getTime() : Number.NaN)
      .filter((value) => Number.isFinite(value))

    return expirations.length > 0 ? Math.min(...expirations) : null
  }, [allVisualizations])

  useEffect(() => {
    if (!tokenRefreshAt) {
      return
    }

    const delay = Math.max(tokenRefreshAt - Date.now() - TOKEN_REFRESH_SKEW_MS, MIN_TOKEN_REFRESH_DELAY_MS)
    const timeoutId = window.setTimeout(() => {
      void catalogQuery.refetch()
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [catalogQuery, tokenRefreshAt])

  useEffect(() => {
    setEmbedError(null)
    setEmbedLoading(hasConfiguredEmbed)
  }, [activeVisualization?.embedToken, activeVisualization?.embedUrl, activeVisualization?.key, hasConfiguredEmbed])

  useEffect(() => {
    const container = embedContainerRef.current
    if (!container || !activeVisualization?.embedToken || !activeVisualization.embedUrl) {
      return
    }

    let disposed = false
    let powerBiService: import("powerbi-client").service.Service | null = null
    void import("powerbi-client")
      .then((powerbi) => {
        if (disposed) {
          return
        }

        powerBiService = new powerbi.service.Service(
          powerbi.factories.hpmFactory,
          powerbi.factories.wpmpFactory,
          powerbi.factories.routerFactory,
        )
        powerBiService.reset(container)
        const report = powerBiService.embed(container, {
          type: "report",
          id: activeVisualization.reportId,
          embedUrl: activeVisualization.embedUrl,
          accessToken: activeVisualization.embedToken ?? undefined,
          tokenType: powerbi.models.TokenType.Embed,
          permissions: powerbi.models.Permissions.Read,
          settings: {
            panes: {
              filters: {
                expanded: false,
                visible: false,
              },
              pageNavigation: {
                visible: false,
              },
            },
            background: powerbi.models.BackgroundType.Transparent,
          },
        })
        report.on("loaded", () => {
          if (!disposed) {
            setEmbedLoading(false)
          }
        })
        report.on("rendered", () => {
          if (!disposed) {
            setEmbedLoading(false)
          }
        })
        report.on("error", (event) => {
          const detail = event.detail as { message?: string } | undefined
          setEmbedError(detail?.message ?? "Power BI reported an embed error.")
          setEmbedLoading(false)
        })
      })
      .catch((error: unknown) => {
        setEmbedError(error instanceof Error ? error.message : "Power BI embed client failed to load.")
        setEmbedLoading(false)
      })

    return () => {
      disposed = true
      powerBiService?.reset(container)
    }
  }, [activeVisualization?.embedToken, activeVisualization?.embedUrl, activeVisualization?.key, activeVisualization?.reportId])

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

          <div className="relative overflow-hidden rounded-[1.25rem] border border-border/70 bg-surface-2/40">
            {embedLoading ? (
              <div
                className="absolute inset-0 z-10 grid place-items-center bg-surface-3/88 px-6 text-center backdrop-blur-sm"
                aria-live="polite"
                aria-label="Loading Power BI report"
              >
                <div className="rounded-xl border border-border/70 bg-surface-1/90 px-5 py-4 shadow-[var(--shadow-panel-muted)]">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-medium">Loading Power BI report</p>
                  <p className="mt-1 text-xs text-muted-foreground">Waiting for the embedded visual to finish rendering.</p>
                </div>
              </div>
            ) : null}
            {activeVisualization.embedToken && activeVisualization.embedUrl ? (
              <div
                className="overflow-hidden bg-surface-3"
                style={{ height: `${embedHeight}px` }}
                aria-label={activeVisualization.title}
              >
                <div
                  ref={embedContainerRef}
                  className="h-full bg-surface-3"
                  style={{
                    marginLeft: `-${POWER_BI_GUTTER_CROP_PX}px`,
                    width: `calc(100% + ${POWER_BI_GUTTER_CROP_PX * 2}px)`,
                  }}
                />
              </div>
            ) : activeVisualization.isConfigured && activeVisualization.embedUrl ? (
              <iframe
                title={activeVisualization.title}
                src={activeVisualization.embedUrl}
                className="block bg-surface-3"
                style={{
                  height: `${embedHeight}px`,
                  marginLeft: `-${POWER_BI_GUTTER_CROP_PX}px`,
                  width: `calc(100% + ${POWER_BI_GUTTER_CROP_PX * 2}px)`,
                }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setEmbedLoading(false)}
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
          {embedError ? (
            <p className="text-sm text-destructive">{embedError}</p>
          ) : null}
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
