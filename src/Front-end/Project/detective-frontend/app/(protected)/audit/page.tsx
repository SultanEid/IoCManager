"use client"

import { DataTable } from "@/components/data-table"
import { useApiData } from "@/hooks/use-api-data"

type AuditRow = {
  id: number
  when: string
  actor: string
  action: string
  entity: string
  details: string
}

export default function AuditPage() {
  const { data, loading } = useApiData<{ rows: AuditRow[] }>("/api/audit/logs", { rows: [] })

  return (
    <DataTable
      rows={data.rows}
      loading={loading}
      columns={[
        { key: "when", label: "When" },
        { key: "actor", label: "Actor" },
        { key: "action", label: "Action" },
        { key: "entity", label: "Entity" },
        { key: "details", label: "Details" },
      ]}
    />
  )
}
