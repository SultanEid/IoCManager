"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataGridProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData>[]
  onRowClick?: (row: TData) => void
  rowClassName?: string
}

function SortIndicator({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") {
    return <ArrowUp className="h-3.5 w-3.5 text-foreground" />
  }

  if (direction === "desc") {
    return <ArrowDown className="h-3.5 w-3.5 text-foreground" />
  }

  return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/80" />
}

export function DataGrid<TData>({ data, columns, onRowClick, rowClassName }: DataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border/75 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-1)_92%,transparent),color-mix(in_srgb,var(--background)_88%,transparent))] shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-2)_90%,transparent),color-mix(in_srgb,var(--surface-1)_78%,transparent))] backdrop-blur supports-[backdrop-filter]:bg-surface-2/78">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()

                return (
                  <TableHead key={header.id} className="h-9">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        className={cn(
                          "inline-flex w-full items-center gap-1.5 text-left",
                          canSort ? "cursor-pointer" : "cursor-default",
                        )}
                      >
                        <span className="truncate">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {canSort ? <SortIndicator direction={header.column.getIsSorted()} /> : null}
                      </button>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-muted-foreground">
                No matching alert data.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "h-11",
                  onRowClick
                    ? "cursor-pointer focus-visible:bg-surface-2/85 focus-visible:outline-none"
                    : "",
                  rowClassName,
                )}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          onRowClick(row.original)
                        }
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

