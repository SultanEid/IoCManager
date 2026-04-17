"use client"

import { DataTable } from "@/components/data-table"
import { useApiData } from "@/hooks/use-api-data"

type SnortRow = {
  sid: number
  message: string
  protocol: string
  source: string
  destination: string
  port: string
  status: string
}

export default function SnortPage() {
  const { data, loading } = useApiData<{ rows: SnortRow[] }>("/api/snort/rules", { rows: [] })

  return (
    <DataTable
      rows={data.rows}
      loading={loading}
      columns={[
        { key: "sid", label: "SID" },
        { key: "message", label: "Message" },
        { key: "protocol", label: "Protocol" },
        {
          key: "sourceDestination",
          label: "Source -> Destination",
          render: (row) => `${String(row.source)} -> ${String(row.destination)}`,
        },
        { key: "port", label: "Port" },
        { key: "status", label: "Status" },
      ]}
    />
  )
}
