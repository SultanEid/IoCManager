import Link from "next/link"
import { cn } from "@/lib/utils"

export function CaseSubnav({
  caseId,
  current,
}: {
  caseId: string
  current: "detail" | "evidence" | "trace" | "rules" | "simulation" | "graph"
}) {
  const links = [
    { key: "detail", href: `/alerts/${caseId}`, label: "Alert Detail" },
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

