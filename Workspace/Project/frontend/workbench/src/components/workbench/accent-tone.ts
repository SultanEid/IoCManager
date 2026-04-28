type AccentTone = {
  rail: string
  icon: string
  chip: string
}

export const ACCENT_TONES = {
  primary: {
    rail: "bg-primary",
    icon: "border-primary/35 bg-primary/10 text-primary",
    chip: "border-primary/30 bg-primary/10 text-primary",
  },
  amber: {
    rail: "bg-amber-400",
    icon: "border-amber-300/35 bg-amber-400/10 text-amber-700 dark:text-amber-200",
    chip: "border-amber-300/35 bg-amber-400/10 text-amber-700 dark:text-amber-200",
  },
  emerald: {
    rail: "bg-emerald-400",
    icon: "border-emerald-300/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200",
    chip: "border-emerald-300/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200",
  },
  rose: {
    rail: "bg-rose-400",
    icon: "border-rose-300/35 bg-rose-400/10 text-rose-700 dark:text-rose-200",
    chip: "border-rose-300/35 bg-rose-400/10 text-rose-700 dark:text-rose-200",
  },
  violet: {
    rail: "bg-violet-400",
    icon: "border-violet-300/35 bg-violet-400/10 text-violet-700 dark:text-violet-200",
    chip: "border-violet-300/35 bg-violet-400/10 text-violet-700 dark:text-violet-200",
  },
  cyan: {
    rail: "bg-cyan-400",
    icon: "border-cyan-300/35 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200",
    chip: "border-cyan-300/35 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200",
  },
  slate: {
    rail: "bg-slate-500",
    icon: "border-slate-400/30 bg-slate-400/10 text-slate-700 dark:text-slate-200",
    chip: "border-slate-400/30 bg-slate-400/10 text-slate-700 dark:text-slate-200",
  },
} satisfies Record<string, AccentTone>

export function reportTypeAccent(reportType: string | null | undefined): AccentTone {
  switch (reportType) {
    case "DetailedIocReport":
      return ACCENT_TONES.amber
    case "TargetExposureSummary":
      return ACCENT_TONES.emerald
    case "ScanActivitySummary":
      return ACCENT_TONES.violet
    case "ExecutiveSummary":
    default:
      return ACCENT_TONES.primary
  }
}

export function severityAccent(severity: string | null | undefined): AccentTone {
  switch (severity?.toLowerCase()) {
    case "critical":
      return ACCENT_TONES.rose
    case "high":
      return ACCENT_TONES.amber
    case "medium":
      return ACCENT_TONES.cyan
    case "low":
      return ACCENT_TONES.violet
    default:
      return ACCENT_TONES.slate
  }
}

