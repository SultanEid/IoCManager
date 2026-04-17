"use client"

import { DataTable } from "@/components/data-table"
import { useApiData } from "@/hooks/use-api-data"

type FeedRow = {
  name: string
  sourceUrl: string
  iocsReceived: number
  lastSync: string
  status: string
}

export default function FeedsPage() {
  const { data, loading } = useApiData<{ rows: FeedRow[] }>("/api/feeds/items", { rows: [] })

  return (
    <DataTable
      rows={data.rows}
      loading={loading}
      columns={[
        { key: "name", label: "Feed Name" },
        { key: "sourceUrl", label: "Source URL" },
        { key: "iocsReceived", label: "IoCs Received" },
        { key: "lastSync", label: "Last Sync" },
        { key: "status", label: "Status" },
      ]}
    />
  )
}
