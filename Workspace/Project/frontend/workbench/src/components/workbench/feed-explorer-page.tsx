"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { IngestionFeedsSubnav } from "@/components/workbench/ingestion-feeds-subnav"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { classifyUiError } from "@/shared/api/error-classification"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState, SearchEmptyState } from "@/shared/ui/state-panels"

type FeedExplorerFilters = {
  q: string
  sourceType: string
  feedSourceId: string
}

function parseFilters(searchParams: URLSearchParams): FeedExplorerFilters {
  return {
    q: searchParams.get("q") ?? "",
    sourceType: searchParams.get("sourceType") ?? "",
    feedSourceId: searchParams.get("feedSourceId") ?? "",
  }
}

function buildQuery(filters: FeedExplorerFilters) {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.sourceType) {
    params.set("sourceType", filters.sourceType)
  }
  if (filters.feedSourceId) {
    params.set("feedSourceId", filters.feedSourceId)
  }
  return params.toString()
}

export function FeedExplorerPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const feedSourcesQuery = useWorkbenchQuery(["feed-explorer", "feed-sources"], (signal) => gateway.listFeedSources(signal))

  const filteredFeedSources = useMemo(() => {
    const sources = feedSourcesQuery.data ?? []
    return sources.filter((item) => {
      const matchesQ =
        !parsedFilters.q ||
        [item.name, item.sourceType, item.endpoint].join(" ").toLowerCase().includes(parsedFilters.q.toLowerCase())
      const matchesSourceType = !parsedFilters.sourceType || item.sourceType === parsedFilters.sourceType
      return matchesQ && matchesSourceType
    })
  }, [feedSourcesQuery.data, parsedFilters.q, parsedFilters.sourceType])

  const selectedFeedSource =
    filteredFeedSources.find((item) => item.id === parsedFilters.feedSourceId) ??
    filteredFeedSources[0] ??
    null

  const iocsQuery = useWorkbenchQuery(
    ["feed-explorer", "iocs", selectedFeedSource?.id, parsedFilters.q],
    (signal) =>
      selectedFeedSource
        ? gateway.listIocs({ feedSourceId: selectedFeedSource.id, q: parsedFilters.q || undefined, page: 1, pageSize: 12 }, signal)
        : Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 12 }),
    { enabled: selectedFeedSource !== null },
  )

  if (feedSourcesQuery.isLoading) {
    return <LoadingState label="Loading feed explorer" />
  }

  if (feedSourcesQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(feedSourcesQuery.error)} fallbackTitle="Feed explorer unavailable" />
  }

  if (iocsQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(iocsQuery.error)} fallbackTitle="Feed explorer unavailable" />
  }

  const sourceTypeOptions = Array.from(new Set((feedSourcesQuery.data ?? []).map((item) => item.sourceType))).sort()
  const enabledCount = (feedSourcesQuery.data ?? []).filter((item) => item.isEnabled).length
  const matchingCount = filteredFeedSources.length

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared = {
      q: "",
      sourceType: "",
      feedSourceId: "",
    }
    setFilters(cleared)
    router.replace(pathname)
  }

  const selectFeed = (feedSourceId: string) => {
    const next = buildQuery({ ...parsedFilters, feedSourceId })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <IngestionFeedsSubnav current="feed-explorer" />

      <motion.header className="wb-page-header" variants={panelMotion}>
        <div>
          <p className="wb-kicker">Feed Explorer</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Source catalog and indexed indicator preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This route only shows persisted feed sources and indexed indicators. Missing configuration stays visible as empty state instead of a simulated feed.
          </p>
        </div>
      </motion.header>

      <motion.article className="grid gap-3 md:grid-cols-4" variants={panelMotion}>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Feed Sources</p>
          <p className="mt-1 text-lg font-semibold">{feedSourcesQuery.data?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-emerald-300/35 bg-emerald-500/10 p-3">
          <p className="wb-kicker text-emerald-100">Enabled</p>
          <p className="mt-1 text-lg font-semibold text-emerald-100">{enabledCount}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Matching Sources</p>
          <p className="mt-1 text-lg font-semibold">{matchingCount}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Selected Feed IoCs</p>
          <p className="mt-1 text-lg font-semibold">{iocsQuery.data?.totalCount ?? 0}</p>
        </div>
      </motion.article>

      <motion.article className="wb-panel space-y-3" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search feed, endpoint, or indicator"
          />
          <select
            value={filters.sourceType}
            onChange={(event) => setFilters((current) => ({ ...current, sourceType: event.target.value }))}
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
          >
            <option value="">All source types</option>
            {sourceTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 md:col-span-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </motion.article>

      {(feedSourcesQuery.data ?? []).length === 0 ? (
        <motion.article variants={panelMotion}>
          <EmptyState
            title="No feed sources configured"
            description="Register feed sources in the backend before using the feed explorer."
          />
        </motion.article>
      ) : filteredFeedSources.length === 0 ? (
        <motion.article variants={panelMotion}>
          <SearchEmptyState
            title="No feed sources matched the current filters"
            description="Clear the source-type filter or broaden the search text to reopen the full source catalog."
            action={
              <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                Reset feed filters
              </Button>
            }
          />
        </motion.article>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <motion.article className="wb-panel" variants={panelMotion}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Feed Sources</h3>
              <p className="text-xs text-muted-foreground">{filteredFeedSources.length} row(s)</p>
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border/75 bg-surface-1/90">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feed</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedSources.map((item) => (
                    <TableRow
                      key={item.id}
                      className={selectedFeedSource?.id === item.id ? "bg-surface-2/50" : ""}
                      onClick={() => selectFeed(item.id)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.endpoint}</p>
                      </TableCell>
                      <TableCell>{item.sourceType}</TableCell>
                      <TableCell><StatusBadge value={item.isEnabled ? "Enabled" : "Disabled"} /></TableCell>
                      <TableCell>{new Date(item.updatedAtUtc).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.article>

          <motion.article className="wb-panel" variants={panelMotion}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Selected Feed</h3>
              {selectedFeedSource ? <StatusBadge value={selectedFeedSource.isEnabled ? "Enabled" : "Disabled"} /> : null}
            </div>
            {!selectedFeedSource ? (
              <div className="mt-3">
                <EmptyState title="No feed selected" description="Choose a feed row to inspect indexed indicators." />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                  <p className="text-sm font-medium">{selectedFeedSource.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedFeedSource.sourceType} | {selectedFeedSource.endpoint}
                  </p>
                </div>

                {(iocsQuery.data?.items ?? []).length === 0 ? (
                  <EmptyState
                    title="No indexed indicators"
                    description="This feed is configured, but no matching indicators are currently indexed for the selected search."
                  />
                ) : (
                  <div className="space-y-2">
                    {(iocsQuery.data?.items ?? []).map((item) => (
                      <div key={item.id} className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium break-all">{item.value}</p>
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge value={item.type} />
                            <StatusBadge value={item.severity} />
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          First seen {new Date(item.firstSeenAtUtc).toLocaleString()} | Last seen {new Date(item.lastSeenAtUtc).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.article>
        </div>
      )}
    </motion.section>
  )
}
