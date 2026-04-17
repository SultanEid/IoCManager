"use client"

import { DataTable } from "@/components/data-table"
import { useApiData } from "@/hooks/use-api-data"

type SigmaRow = {
  id: string
  title: string
  author: string
  tags: string[]
  level: string
  status: string
}

export default function SigmaPage() {
  const { data, loading } = useApiData<{ rows: SigmaRow[] }>("/api/sigma/rules", { rows: [] })

  return (
    <DataTable
      rows={data.rows}
      loading={loading}
      columns={[
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "author", label: "Author" },
        {
          key: "tags",
          label: "Tags",
          render: (row) => String((row.tags as string[]).join(", ")),
        },
        { key: "level", label: "Level" },
        { key: "status", label: "Status" },
      ]}
    />
  )
}
