"use client"

import type { ReactNode } from "react"

type TableColumn<Row extends Record<string, unknown>> = {
  key: keyof Row | string
  label: string
  className?: string
  render?: (row: Row) => ReactNode
}

export function DataTable<Row extends Record<string, unknown>>({
  columns,
  rows,
  loading = false,
  emptyText = "No rows available.",
  onRowClick,
  rowClassName,
}: {
  columns: TableColumn<Row>[]
  rows: Row[]
  loading?: boolean
  emptyText?: string
  onRowClick?: (row: Row) => void
  rowClassName?: (row: Row) => string
}) {
  const skeletonRows = Math.max(5, Math.min(8, rows.length || 6))

  return (
    <div className="surface fade-up overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className={`table-cell px-4 py-3 ${column.className ?? ""}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="table-rows">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="border-t border-[var(--border)]">
                  {columns.map((column, cellIndex) => (
                    <td
                      key={`${String(column.key)}-${cellIndex}`}
                      className={`table-cell px-4 py-3 ${column.className ?? ""}`}
                    >
                      <div className="shimmer h-4 w-full rounded-md" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={index}
                  className={`border-t border-[var(--border)] ${onRowClick ? "cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]" : ""} ${rowClassName ? rowClassName(row) : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={String(column.key)} className={`table-cell px-4 py-3 ${column.className ?? ""}`}>
                      {column.render
                        ? column.render(row)
                        : String(row[column.key as keyof Row] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
