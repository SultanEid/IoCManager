"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useApiData } from "@/hooks/use-api-data"

type ActivityRow = {
  id: number
  type: string
  value: string
  status: string
  confidence: number
  sourceCount: number
  lastSeenUtc: string
}

type IocListResponse = {
  items: ActivityRow[]
  pagination: { total: number; page: number; pageSize: number }
}

const FILTER_STORAGE_KEY = "detective.activity.filters.v1"

function confidenceRisk(confidence: number) {
  if (confidence >= 85) {
    return "Critical"
  }
  if (confidence >= 70) {
    return "High"
  }
  if (confidence >= 55) {
    return "Medium"
  }
  return "Low"
}

export default function ActivityPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window === "undefined") {
      return "all"
    }
    try {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
      if (!raw) {
        return "all"
      }
      const parsed = JSON.parse(raw) as { statusFilter?: string }
      return parsed.statusFilter ?? "all"
    } catch {
      return "all"
    }
  })
  const [confidenceMin, setConfidenceMin] = useState(() => {
    if (typeof window === "undefined") {
      return 0
    }
    try {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
      if (!raw) {
        return 0
      }
      const parsed = JSON.parse(raw) as { confidenceMin?: number }
      return parsed.confidenceMin ?? 0
    } catch {
      return 0
    }
  })
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") {
      return ""
    }
    try {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
      if (!raw) {
        return ""
      }
      const parsed = JSON.parse(raw) as { query?: string }
      return parsed.query ?? ""
    } catch {
      return ""
    }
  })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { data, loading } = useApiData<IocListResponse>("/api/iocs?pageSize=200", { items: [], pagination: { total: 0, page: 1, pageSize: 200 } })

  useEffect(() => {
    window.localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        statusFilter,
        confidenceMin,
        query,
      })
    )
  }, [statusFilter, confidenceMin, query])

  const filteredRows = useMemo(() => {
    return data.items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false
      }
      if (item.confidence < confidenceMin) {
        return false
      }
      if (query.trim()) {
        const normalized = query.trim().toLowerCase()
        if (!`${item.value} ${item.type} ${item.status}`.toLowerCase().includes(normalized)) {
          return false
        }
      }
      return true
    })
  }, [confidenceMin, data.items, query, statusFilter])
  const visibleSelectedIds = useMemo(
    () => selectedIds.filter((id) => filteredRows.some((row) => row.id === id)),
    [filteredRows, selectedIds]
  )

  function toggleSelection(id: number) {
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id)
      }
      return [...previous, id]
    })
  }

  function runBulkAction(action: "investigate" | "coverage") {
    const first = visibleSelectedIds[0]
    if (!first) {
      return
    }
    if (action === "investigate") {
      router.push(`/investigate?seed=${first}`)
      return
    }
    router.push("/coverage")
  }

  return (
    <section className="space-y-4">
      <Card className="form-stack fade-up p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Total IOCs</p>
            <p className="text-2xl font-semibold">{data.pagination.total}</p>
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">Selected: {visibleSelectedIds.length}</div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <Input
            className="w-full"
            placeholder="Search IOC value, type, or status..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted-foreground)]">Status</span>
            <Select className="h-9 min-w-[10.5rem] w-auto" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="validated">Validated</option>
              <option value="active">Active</option>
              <option value="suppressed">Suppressed</option>
              <option value="deprecated">Deprecated</option>
              <option value="revoked">Revoked</option>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted-foreground)]">Min confidence</span>
            <Select
              className="h-9 min-w-[8.5rem] w-auto"
              value={confidenceMin}
              onChange={(event) => setConfidenceMin(Number(event.target.value))}
            >
              <option value={0}>0%</option>
              <option value={50}>50%</option>
              <option value={70}>70%</option>
              <option value={85}>85%</option>
            </Select>
          </label>
          <Button className="h-9 px-3 text-sm" type="button" variant="outline" onClick={() => {
            setStatusFilter("all")
            setConfidenceMin(0)
            setQuery("")
          }}>
            Reset Filters
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="h-8 px-3 text-xs"
            size="sm"
            type="button"
            onClick={() => runBulkAction("investigate")}
            disabled={visibleSelectedIds.length === 0}
            variant="outline"
          >
            Open Story
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            size="sm"
            type="button"
            onClick={() => runBulkAction("coverage")}
            disabled={visibleSelectedIds.length === 0}
            variant="outline"
          >
            Coverage Impact
          </Button>
        </div>
      </Card>

      <DataTable
        rows={filteredRows}
        loading={loading}
        onRowClick={(row) => router.push(`/ioc/${row.id}`)}
        columns={[
          {
            key: "select",
            label: "",
            render: (row) => (
              <input
                type="checkbox"
                checked={selectedIds.includes(row.id)}
                onChange={() => toggleSelection(row.id)}
                onClick={(event) => event.stopPropagation()}
              />
            ),
          },
          { key: "id", label: "ID" },
          {
            key: "type",
            label: "Type",
            render: (row) => <span className="uppercase">{String(row.type)}</span>,
          },
          { key: "value", label: "Observable" },
          {
            key: "confidence",
            label: "Confidence",
            className: "text-right",
            render: (row) => `${row.confidence}%`,
          },
          {
            key: "risk",
            label: "Risk",
            render: (row) => <span className="badge-chip">{confidenceRisk(row.confidence)}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <span className="badge-chip capitalize">{String(row.status)}</span>,
          },
          { key: "sourceCount", label: "Sources", className: "text-right" },
          {
            key: "lastSeenUtc",
            label: "Last Seen",
            render: (row) => new Date(row.lastSeenUtc).toLocaleString(),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/graph?seed=${row.id}`)}>
                  Pivot Graph
                </Button>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/investigate?seed=${row.id}`)}>
                  Open Story
                </Button>
                <Button className="h-8 px-2.5 text-xs" size="sm" type="button" variant="outline" onClick={() => router.push(`/coverage?focus=${row.id}`)}>
                  Coverage Impact
                </Button>
              </div>
            ),
          },
        ]}
      />
    </section>
  )
}
