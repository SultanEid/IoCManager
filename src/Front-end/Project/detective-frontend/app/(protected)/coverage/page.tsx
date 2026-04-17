"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useApiData } from "@/hooks/use-api-data"

type CoverageRow = {
  observableId: number
  type: string
  value: string
  confidence: number
  families: Record<string, string>
}

type CoverageGap = {
  observableId: number
  type: string
  value: string
  confidence: number
  missingFamilies: string
}

type SortKey = "confidence" | "type" | "value"
const COVERAGE_STORAGE_KEY = "detective.coverage.view.v1"
const GUARDRAILS_STORAGE_KEY = "detective.coverage.guardrails.v1"

type GuardrailState = {
  warningListEnabled: boolean
  safeListEnabled: boolean
  suppressionReason: string
}

function familyBadgeState(value: string | undefined) {
  const normalized = (value ?? "none").toLowerCase()
  if (normalized === "full") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
  }
  if (normalized === "partial") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-200"
  }
  return "border-red-500/35 bg-red-500/10 text-red-200"
}

export default function CoveragePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusId = Number(searchParams.get("focus") ?? "0")
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    if (typeof window === "undefined") {
      return "confidence"
    }
    try {
      const raw = window.localStorage.getItem(COVERAGE_STORAGE_KEY)
      if (!raw) {
        return "confidence"
      }
      const parsed = JSON.parse(raw) as { sortBy?: SortKey }
      return parsed.sortBy ?? "confidence"
    } catch {
      return "confidence"
    }
  })
  const [highOnly, setHighOnly] = useState(() => {
    if (typeof window === "undefined") {
      return true
    }
    try {
      const raw = window.localStorage.getItem(COVERAGE_STORAGE_KEY)
      if (!raw) {
        return true
      }
      const parsed = JSON.parse(raw) as { highOnly?: boolean }
      return typeof parsed.highOnly === "boolean" ? parsed.highOnly : true
    } catch {
      return true
    }
  })
  const [guardrails, setGuardrails] = useState<GuardrailState>(() => {
    if (typeof window === "undefined") {
      return {
        warningListEnabled: true,
        safeListEnabled: true,
        suppressionReason: "",
      }
    }
    try {
      const raw = window.localStorage.getItem(GUARDRAILS_STORAGE_KEY)
      if (!raw) {
        return {
          warningListEnabled: true,
          safeListEnabled: true,
          suppressionReason: "",
        }
      }
      const parsed = JSON.parse(raw) as GuardrailState
      return {
        warningListEnabled: parsed.warningListEnabled ?? true,
        safeListEnabled: parsed.safeListEnabled ?? true,
        suppressionReason: parsed.suppressionReason ?? "",
      }
    } catch {
      return {
        warningListEnabled: true,
        safeListEnabled: true,
        suppressionReason: "",
      }
    }
  })
  const { data, loading } = useApiData<{ rows: CoverageRow[]; gaps: CoverageGap[] }>("/api/detections/coverage", {
    rows: [],
    gaps: [],
  })

  useEffect(() => {
    window.localStorage.setItem(COVERAGE_STORAGE_KEY, JSON.stringify({ sortBy, highOnly }))
  }, [highOnly, sortBy])

  useEffect(() => {
    window.localStorage.setItem(GUARDRAILS_STORAGE_KEY, JSON.stringify(guardrails))
  }, [guardrails])

  const sortedRows = useMemo(() => {
    const source = highOnly ? data.rows.filter((row) => row.confidence >= 70) : data.rows
    const rows = [...source]
    rows.sort((a, b) => {
      if (sortBy === "confidence") {
        return b.confidence - a.confidence
      }
      return String(a[sortBy]).localeCompare(String(b[sortBy]))
    })
    return rows
  }, [data.rows, highOnly, sortBy])

  const priorityGaps = useMemo(() => {
    return [...data.gaps].sort((a, b) => b.confidence - a.confidence).slice(0, 12)
  }, [data.gaps])

  const groupedGaps = useMemo(() => {
    const map = new Map<string, CoverageGap[]>()
    for (const gap of priorityGaps) {
      const families = gap.missingFamilies
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
      for (const family of families) {
        const current = map.get(family) ?? []
        current.push(gap)
        map.set(family, current)
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([family, items]) => ({ family, items: items.slice(0, 6) }))
  }, [priorityGaps])

  return (
    <div className="space-y-4">
      <Card className="fade-up flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-base font-semibold">Detection Coverage Matrix</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Sigma, Yara, and Snort mapping status by observable.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select className="h-9 min-w-[12rem] w-auto" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
            <option value="confidence">Sort: Confidence</option>
            <option value="type">Sort: Type</option>
            <option value="value">Sort: Value</option>
          </Select>
          <Button
            className={`h-9 px-3 text-xs ${highOnly ? "border-[color-mix(in_srgb,var(--primary)_45%,transparent)]" : ""}`}
            type="button"
            onClick={() => setHighOnly((previous) => !previous)}
            variant="outline"
          >
            {highOnly ? "High confidence only" : "All confidence levels"}
          </Button>
        </div>
      </Card>

      <DataTable
        rows={sortedRows}
        loading={loading}
        emptyText="No coverage rows returned by backend."
        columns={[
          {
            key: "value",
            label: "Observable",
            render: (row) => (
              <button className="text-left hover:underline" type="button" onClick={() => router.push(`/ioc/${row.observableId}`)}>
                {row.value}
              </button>
            ),
          },
          { key: "type", label: "Type", render: (row) => String(row.type).toUpperCase() },
          { key: "confidence", label: "Confidence", className: "text-right", render: (row) => `${row.confidence}%` },
          {
            key: "sigma",
            label: "Sigma",
            render: (row) => (
              <span className={`badge-chip ${familyBadgeState(row.families?.sigma)}`}>
                {row.families?.sigma ?? "none"}
              </span>
            ),
          },
          {
            key: "yara",
            label: "Yara",
            render: (row) => (
              <span className={`badge-chip ${familyBadgeState(row.families?.yara)}`}>
                {row.families?.yara ?? "none"}
              </span>
            ),
          },
          {
            key: "snort",
            label: "Snort",
            render: (row) => (
              <span className={`badge-chip ${familyBadgeState(row.families?.snort)}`}>
                {row.families?.snort ?? "none"}
              </span>
            ),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/graph?seed=${row.observableId}`)}>
                  Pivot Graph
                </Button>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/investigate?seed=${row.observableId}`)}>
                  Open Story
                </Button>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/ioc/${row.observableId}`)}>
                  IOC Detail
                </Button>
              </div>
            ),
          },
        ]}
        rowClassName={(row) =>
          focusId > 0 && row.observableId === focusId
            ? "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
            : ""
        }
      />

      <Card className="fade-up fade-delay-2 p-5">
        <CardTitle className="mb-2 text-sm">High-confidence uncovered indicators</CardTitle>
        {loading ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="shimmer h-14 rounded-md" />
            ))}
          </div>
        ) : priorityGaps.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No unresolved high-confidence gaps returned by backend.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {priorityGaps.map((gap) => (
              <Button
                key={gap.observableId}
                type="button"
                className="h-auto justify-start rounded-lg border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-3 text-left transition-[border-color,background-color] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                onClick={() => router.push(`/ioc/${gap.observableId}`)}
                variant="ghost"
              >
                <p className="truncate text-sm font-semibold">{gap.value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {gap.type.toUpperCase()} | Missing: {gap.missingFamilies} | {gap.confidence}% confidence
                </p>
              </Button>
            ))}
          </div>
        )}
      </Card>

      <Card className="fade-up p-5">
        <CardTitle className="mb-3 text-sm">Coverage Operations Console</CardTitle>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="shimmer h-16 rounded-md" />
            ))}
          </div>
        ) : groupedGaps.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No grouped family gaps are currently returned by backend.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {groupedGaps.map((group) => (
              <article key={group.family} className="rounded-lg border border-[var(--input)] p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  {group.family}
                </h4>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <Button
                      key={`${group.family}-${item.observableId}`}
                      type="button"
                      className="h-auto w-full justify-start rounded-md border border-[var(--input)] px-2.5 py-2 text-left transition-[border-color,background-color] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                      onClick={() => router.push(`/ioc/${item.observableId}`)}
                      variant="ghost"
                    >
                      <p className="truncate text-xs font-semibold">{item.value}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{item.confidence}% confidence</p>
                    </Button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card className="fade-up p-5">
        <CardTitle className="mb-3 text-sm">False-Positive Guardrails</CardTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button
            type="button"
            className={`h-10 justify-start px-3 text-sm ${guardrails.warningListEnabled ? "border-[color-mix(in_srgb,var(--primary)_45%,transparent)]" : ""}`}
            onClick={() =>
              setGuardrails((previous) => ({
                ...previous,
                warningListEnabled: !previous.warningListEnabled,
              }))
            }
            variant="outline"
          >
            Warning List {guardrails.warningListEnabled ? "Enabled" : "Disabled"}
          </Button>
          <Button
            type="button"
            className={`h-10 justify-start px-3 text-sm ${guardrails.safeListEnabled ? "border-[color-mix(in_srgb,var(--primary)_45%,transparent)]" : ""}`}
            onClick={() =>
              setGuardrails((previous) => ({
                ...previous,
                safeListEnabled: !previous.safeListEnabled,
              }))
            }
            variant="outline"
          >
            Safe List {guardrails.safeListEnabled ? "Enabled" : "Disabled"}
          </Button>
        </div>
        <label className="mt-3 block text-sm">
          <span className="control-label">Suppression Reason</span>
          <Input
            className="w-full"
            placeholder="Document suppression rationale for analyst handoff."
            value={guardrails.suppressionReason}
            onChange={(event) =>
              setGuardrails((previous) => ({
                ...previous,
                suppressionReason: event.target.value,
              }))
            }
          />
        </label>
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          Awaiting backend endpoint: guardrail policy sync is unavailable, local analyst preferences are saved client-side only.
        </p>
        <CardDescription className="mt-2 text-xs">No synthetic records are generated in this console.</CardDescription>
      </Card>
    </div>
  )
}
