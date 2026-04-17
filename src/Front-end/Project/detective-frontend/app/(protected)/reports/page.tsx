"use client"

import { useState } from "react"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { useApiData } from "@/hooks/use-api-data"
import { useToast } from "@/components/toast-provider"

type ReportRow = {
  name: string
  type: string
  generatedAt: string
  size: string
  downloadUrl?: string
}

export default function ReportsPage() {
  const { notify } = useToast()
  const [reportType, setReportType] = useState("Executive Summary")
  const [reportFormat, setReportFormat] = useState("PDF")
  const { data, loading } = useApiData<{ rows: ReportRow[] }>("/api/reports/items", { rows: [] })

  return (
    <>
      <section className="surface fade-up mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
        <Select value={reportType} onChange={(event) => setReportType(event.target.value)}>
          <option>Executive Summary</option>
          <option>IOC Detailed</option>
          <option>Threat Intelligence</option>
          <option>Compliance</option>
        </Select>
        <Select value={reportFormat} onChange={(event) => setReportFormat(event.target.value)}>
          <option>PDF</option>
          <option>CSV</option>
          <option>JSON</option>
          <option>TXT</option>
        </Select>
        <Button
          className="h-11 px-5"
          onClick={() => notify(`Awaiting backend endpoint: report generation for ${reportType} (${reportFormat}).`, "info")}
          type="button"
        >
          Generate
        </Button>
      </section>

      <DataTable
        rows={data.rows}
        loading={loading}
        columns={[
          { key: "name", label: "Name" },
          { key: "type", label: "Type" },
          { key: "generatedAt", label: "Generated At" },
          { key: "size", label: "Size" },
          {
            key: "download",
            label: "Action",
            render: (row) => (
              <Button
                className="h-8 px-3 text-xs"
                onClick={() => {
                  if (row.downloadUrl) {
                    window.open(row.downloadUrl, "_blank", "noopener,noreferrer")
                    return
                  }
                  notify(`Awaiting backend field: download URL for ${String(row.name)}.`, "info")
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Download
              </Button>
            ),
          },
        ]}
      />
    </>
  )
}
