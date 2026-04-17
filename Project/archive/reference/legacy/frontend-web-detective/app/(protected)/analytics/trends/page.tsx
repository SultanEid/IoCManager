"use client"

import { useMemo } from "react"
import { useApiData } from "@/hooks/use-api-data"

type TrendSeries = {
  name: string
  data: number[]
}

type TrendPayload = {
  labels: string[]
  series: TrendSeries[]
}

function buildPath(points: number[], width: number, height: number) {
  if (points.length === 0) {
    return ""
  }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = Math.max(1, max - min)
  const step = points.length === 1 ? width : width / (points.length - 1)

  return points
    .map((point, index) => {
      const x = index * step
      const y = height - ((point - min) / range) * height
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")
}

export default function AnalyticsTrendsPage() {
  const { data, loading } = useApiData<TrendPayload>("/api/analytics/trends", {
    labels: [],
    series: [],
  })

  const paths = useMemo(() => data.series.map((series) => buildPath(series.data, 880, 240)), [data.series])

  return (
    <section className="surface fade-up p-5">
      {loading ? (
        <div className="shimmer h-[280px] w-full rounded-xl" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 880 280" className="h-[280px] w-[880px]">
              {paths.map((path, index) => (
                <path
                  key={`${data.series[index]?.name ?? "series"}-${index}`}
                  d={path}
                  fill="none"
                  stroke={["#7dd3fc", "#60a5fa", "#818cf8", "#a78bfa"][index % 4]}
                  strokeWidth={2.4 - index * 0.25}
                />
              ))}
            </svg>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.series.map((series, index) => (
              <span key={series.name} className="rounded-full border border-[var(--input)] px-3 py-1 text-xs">
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: ["#7dd3fc", "#60a5fa", "#818cf8", "#a78bfa"][index % 4] }}
                />
                {series.name}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
