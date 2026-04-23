"use client"

import { useMemo, useState } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { FileSearch, Undo2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/workbench/status-badge"
import { cn } from "@/lib/utils"
import type {
  DetectionFamily,
  DetectionQueuePosture,
  DetectionRuleItem,
  DetectionSavedView,
  LifecycleState,
} from "@/shared/modules/types"
import { getDuplicateRiskLabel } from "./helpers"

function toAlertRef(value: string) {
  return value.replace(/^CA-/i, "AL-")
}
type CatalogPaneProps = {
  rules: DetectionRuleItem[]
  selectedRuleId: string
  families: DetectionFamily[]
  lifecycleOptions: Array<LifecycleState | "All">
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  familyFilter: DetectionFamily | "All"
  onFamilyFilterChange: (family: DetectionFamily | "All") => void
  lifecycleFilter: LifecycleState | "All"
  onLifecycleFilterChange: (state: LifecycleState | "All") => void
  onSelectRule: (ruleId: string) => void
  savedViews: DetectionSavedView[]
  activeSavedViewId: string | null
  onSavedViewSelect: (savedViewId: string) => void
  queuePosture: DetectionQueuePosture
  onResetFilters: () => void
}

function EmptyCatalogState({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <div className="mx-3 mt-3 rounded-lg border border-dashed border-border/70 bg-surface-2/55 p-3">
      <p className="text-sm font-semibold">No rules match this filter slice.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Current constraints produced an empty result set. Clear saved slices or broaden lifecycle filters to recover catalog coverage.
      </p>
      <Button size="sm" variant="secondary" className="mt-3 h-7 text-[11px]" onClick={onResetFilters}>
        <Undo2 className="mr-1.5 h-3 w-3" />
        Reset filters
      </Button>
    </div>
  )
}

export function CatalogPane({
  rules,
  selectedRuleId,
  families,
  lifecycleOptions,
  searchQuery,
  onSearchQueryChange,
  familyFilter,
  onFamilyFilterChange,
  lifecycleFilter,
  onLifecycleFilterChange,
  onSelectRule,
  savedViews,
  activeSavedViewId,
  onSavedViewSelect,
  queuePosture,
  onResetFilters,
}: CatalogPaneProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }])

  const columns = useMemo<ColumnDef<DetectionRuleItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Rule",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-sm font-semibold tracking-tight">{row.original.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.original.id} | Alert {toAlertRef(row.original.linkedCase)}
            </p>
          </div>
        ),
      },
      { accessorKey: "family", header: "Family", cell: ({ row }) => <StatusBadge value={row.original.family} /> },
      { accessorKey: "lifecycle", header: "Lifecycle", cell: ({ row }) => <StatusBadge value={row.original.lifecycle} /> },
      { accessorKey: "validation", header: "Validation", cell: ({ row }) => <StatusBadge value={row.original.validation} /> },
      { accessorKey: "duplicate-risk", header: "Dup Risk", cell: ({ row }) => <StatusBadge value={getDuplicateRiskLabel(row.original)} /> },
      { accessorKey: "updatedAt", header: "Updated" },
    ],
    [],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rules,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <section className="rounded-xl border border-border/70 bg-surface-1/85">
      <div className="space-y-3 border-b border-border/70 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="wb-kicker">Rule Catalog</p>
          <Badge variant="outline" className="rounded-full border-border/70 text-[10px] uppercase tracking-[0.09em]">
            {rules.length} rules
          </Badge>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-4">
          <div className="rounded-md border border-border/70 bg-surface-2/70 px-2 py-1.5">
            <p className="wb-kicker">Needs Review</p>
            <p className="mt-1 text-sm font-semibold">{queuePosture.needsReview}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-surface-2/70 px-2 py-1.5">
            <p className="wb-kicker">Canary Watch</p>
            <p className="mt-1 text-sm font-semibold">{queuePosture.canaryWatch}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-surface-2/70 px-2 py-1.5">
            <p className="wb-kicker">High Dup Risk</p>
            <p className="mt-1 text-sm font-semibold">{queuePosture.highDuplicateRisk}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-surface-2/70 px-2 py-1.5">
            <p className="wb-kicker">Blocked</p>
            <p className="mt-1 text-sm font-semibold">{queuePosture.blockedRollouts}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="wb-kicker">Workflow Slices</p>
          <div className="flex flex-wrap gap-1.5">
            {savedViews.map((view) => (
              <Button
                key={view.id}
                size="sm"
                variant={activeSavedViewId === view.id ? "secondary" : "ghost"}
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => onSavedViewSelect(view.id)}
                title={view.description}
              >
                {view.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="relative">
          <FileSearch className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search ID, alert, rule, family, lifecycle..."
            className="h-8 border-border/70 bg-surface-2/85 pl-8 text-xs"
          />
        </div>

        <div className="space-y-2">
          <p className="wb-kicker">Families</p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={familyFilter === "All" ? "secondary" : "ghost"}
              className="h-7 rounded-full px-2.5 text-[11px]"
              onClick={() => onFamilyFilterChange("All")}
            >
              All
            </Button>
            {families.map((family) => (
              <Button
                key={family}
                size="sm"
                variant={familyFilter === family ? "secondary" : "ghost"}
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => onFamilyFilterChange(family)}
              >
                {family}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="wb-kicker">Lifecycle</p>
          <div className="flex flex-wrap gap-1.5">
            {lifecycleOptions.map((state) => (
              <Button
                key={state}
                size="sm"
                variant={lifecycleFilter === state ? "secondary" : "ghost"}
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => onLifecycleFilterChange(state)}
              >
                {state}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="h-[758px]">
        {table.getRowModel().rows.length === 0 ? (
          <EmptyCatalogState onResetFilters={onResetFilters} />
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-surface-2/90">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-9 py-1 text-xs">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => {
                const isSelected = row.original.id === selectedRuleId
                return (
                  <TableRow
                    key={row.id}
                    className={cn("cursor-pointer transition-colors", isSelected ? "bg-primary/12" : "")}
                    onClick={() => onSelectRule(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 align-top text-xs">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </section>
  )
}


