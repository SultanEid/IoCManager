"use client"

import { DataTable } from "@/components/data-table"
import { useApiData } from "@/hooks/use-api-data"

type YaraRow = {
  name: string
  description: string
  tags: string[]
  matches: number
  status: string
}

export default function YaraPage() {
  const { data, loading } = useApiData<{ rows: YaraRow[] }>("/api/yara/rules", { rows: [] })

  return (
    <DataTable
      rows={data.rows}
      loading={loading}
      columns={[
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
        {
          key: "tags",
          label: "Tags",
          render: (row) => String((row.tags as string[]).join(", ")),
        },
        { key: "matches", label: "Matches" },
        { key: "status", label: "Status" },
      ]}
    />
  )
}
