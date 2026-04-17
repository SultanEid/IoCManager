"use client"

import { DataTable } from "@/components/data-table"
import { useApiData } from "@/hooks/use-api-data"

type ServerRow = {
  hostName: string
  ip: string
  os: string
  services: string[]
  lastSeen: string
  status: string
}

export default function ServersPage() {
  const { data, loading } = useApiData<{ rows: ServerRow[] }>("/api/servers/items", { rows: [] })

  return (
    <DataTable
      rows={data.rows}
      loading={loading}
      columns={[
        { key: "hostName", label: "Host Name" },
        { key: "ip", label: "IP Address" },
        { key: "os", label: "Operating System" },
        {
          key: "services",
          label: "Services",
          render: (row) => String((row.services as string[]).join(", ")),
        },
        { key: "lastSeen", label: "Last Seen" },
        { key: "status", label: "Status" },
      ]}
    />
  )
}
