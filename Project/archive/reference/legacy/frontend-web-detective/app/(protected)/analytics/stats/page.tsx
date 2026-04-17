"use client"

import { useApiData } from "@/hooks/use-api-data"

type CategoryItem = {
  name: string
  value: number
}

export default function AnalyticsStatsPage() {
  const { data, loading } = useApiData<{ categories: CategoryItem[] }>("/api/analytics/stats", {
    categories: [],
  })
  const maxValue = Math.max(...data.categories.map((item) => item.value), 1)

  return (
    <section className="surface fade-up p-5">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="shimmer h-10 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {data.categories.map((category) => (
            <article key={category.name}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>{category.name}</span>
                <span className="text-[var(--muted-foreground)]">{category.value}%</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--muted)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#60a5fa,#818cf8)] transition-[width] duration-500"
                  style={{ width: `${(category.value / maxValue) * 100}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
