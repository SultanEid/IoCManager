import { cn } from "@/lib/utils"

export type TimelineEvent = {
  id: string
  title: string
  subtitle: string
  when: string
  tone?: "default" | "success" | "warning"
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="space-y-2.5">
      {events.map((event) => (
        <li key={event.id} className="relative rounded-xl border border-border/70 bg-surface-2/70 p-3.5 pl-8">
          <span
            className={cn(
              "absolute left-3 top-5 h-2 w-2 rounded-full",
              event.tone === "success"
                ? "bg-emerald-300"
                : event.tone === "warning"
                  ? "bg-amber-300"
                  : "bg-primary/80",
            )}
          />
          <p className="text-[13px] font-semibold tracking-tight">{event.title}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{event.subtitle}</p>
          <p className="mt-1 text-[11px] text-muted-foreground/90">{new Date(event.when).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  )
}

