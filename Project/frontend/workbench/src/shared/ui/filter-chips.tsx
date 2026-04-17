"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type FilterChip = {
  key: string
  label: string
}

type FilterChipsProps = {
  title?: string
  chips: FilterChip[]
  active: string
  onChange: (next: string) => void
}

export function FilterChips({ title, chips, active, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {title ? (
        <Badge variant="outline" className="h-7 rounded-full border-border/70 bg-surface-2/70 px-3 text-[11px] text-muted-foreground">
          {title}
        </Badge>
      ) : null}
      {chips.map((chip) => (
        <Button
          key={chip.key}
          size="xs"
          variant="ghost"
          className={cn(
            "h-7 rounded-full border px-3 text-[11px] font-medium transition-colors",
            active === chip.key
              ? "border-primary/45 bg-primary/12 text-foreground"
              : "border-border/70 bg-surface-2/55 text-muted-foreground hover:border-primary/35 hover:text-foreground",
          )}
          onClick={() => onChange(chip.key)}
        >
          {chip.label}
        </Button>
      ))}
    </div>
  )
}

