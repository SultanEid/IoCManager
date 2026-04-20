import Link from "next/link"
import { cn } from "@/lib/utils"

type IngestionFeedsSubnavProps = {
  current: "overview" | "feed-explorer"
}

export function IngestionFeedsSubnav({ current }: IngestionFeedsSubnavProps) {
  const links = [
    { key: "overview", href: "/ioc-ingestion", label: "Ingestion Overview" },
    { key: "feed-explorer", href: "/ioc-ingestion/feed-explorer", label: "Feed Explorer" },
  ] as const

  return (
    <nav className="rounded-xl border border-border/70 bg-surface-1/80 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {links.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              current === item.key
                ? "border-primary/45 bg-primary/12 text-foreground"
                : "border-border/70 bg-surface-2/55 text-muted-foreground hover:border-primary/35 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
