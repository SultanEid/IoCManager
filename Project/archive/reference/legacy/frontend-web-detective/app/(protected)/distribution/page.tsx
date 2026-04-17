"use client"

import { DataTable } from "@/components/data-table"
import { useApiData } from "@/hooks/use-api-data"

type DistributionRow = {
  ruleType: string
  targetServer: string
  count: number
  status: string
  time: string
}

export default function DistributionPage() {
  const { data, loading } = useApiData<{ rows: DistributionRow[] }>("/api/distribution/items", {
    rows: [],
  })

  return (
    <DataTable
      rows={data.rows}
      loading={loading}
      columns={[
        { key: "ruleType", label: "Rule Type" },
        { key: "targetServer", label: "Target Server" },
        { key: "count", label: "Count" },
        { key: "status", label: "Status" },
        { key: "time", label: "Time" },
      ]}
    />
  )
}
