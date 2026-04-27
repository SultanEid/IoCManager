import { Badge } from "@/components/ui/badge"

export const STATUS_TONE_BY_KEY: Record<string, string> = {
  passing: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  pass: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  approved: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  accepted: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  deployed: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  promoted: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  promote: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  healthy: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  open: "border-blue-300/35 bg-blue-400/12 text-blue-200",
  proposed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
  parsed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
  validated: "border-blue-300/35 bg-blue-400/12 text-blue-200",
  completed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
  queued: "border-blue-300/35 bg-blue-400/12 text-blue-200",
  running: "border-blue-300/35 bg-blue-400/12 text-blue-200",
  canary: "border-sky-300/35 bg-sky-400/12 text-sky-200",
  shadow: "border-sky-300/35 bg-sky-400/12 text-sky-200",
  watch: "border-sky-300/35 bg-sky-400/12 text-sky-200",
  awaitingapproval: "border-amber-300/35 bg-amber-400/12 text-amber-200",
  needsreview: "border-amber-300/35 bg-amber-400/12 text-amber-200",
  requestchanges: "border-amber-300/35 bg-amber-400/12 text-amber-200",
  warning: "border-amber-300/35 bg-amber-400/12 text-amber-200",
  error: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  note: "border-border/80 bg-surface-2/80 text-muted-foreground",
  fullengine: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
  heuristic: "border-amber-300/35 bg-amber-400/12 text-amber-200",
  notavailable: "border-border/80 bg-surface-2/80 text-muted-foreground",
  high: "border-amber-300/35 bg-amber-400/12 text-amber-200",
  medium: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
  low: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  critical: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  malicious: "border-red-300/45 bg-red-500/15 text-red-100",
  likelymalicious: "border-red-300/45 bg-red-500/15 text-red-100",
  suspicious: "border-orange-300/45 bg-orange-500/15 text-orange-100",
  benign: "border-blue-300/45 bg-blue-500/15 text-blue-100",
  likelybenign: "border-blue-300/45 bg-blue-500/15 text-blue-100",
  falsepositive: "border-violet-300/45 bg-violet-500/15 text-violet-100",
  insufficientevidence: "border-slate-300/35 bg-slate-400/12 text-slate-100",
  staleorrevoked: "border-slate-300/35 bg-slate-400/12 text-slate-100",
  failing: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  fail: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  rejected: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  rollback: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  rolledback: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  rollbackready: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  blocked: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  disabled: "border-border/80 bg-surface-2/80 text-muted-foreground",
  retired: "border-border/80 bg-surface-2/80 text-muted-foreground",
  notrun: "border-border/80 bg-surface-2/80 text-muted-foreground",
  needstuning: "border-amber-300/35 bg-amber-400/12 text-amber-200",
  ready: "border-amber-300/35 bg-amber-400/12 text-amber-200",
  notready: "border-rose-300/40 bg-rose-400/12 text-rose-200",
  monitoring: "border-border/80 bg-surface-2/80 text-muted-foreground",
  notscheduled: "border-border/80 bg-surface-2/80 text-muted-foreground",
  yara: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  sigma: "border-blue-300/35 bg-blue-400/12 text-blue-200",
  snort: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
  suricata: "border-sky-300/35 bg-sky-400/12 text-sky-200",
}

const DISPLAY_LABEL_BY_KEY: Record<string, string> = {
  yara: "YARA",
  sigma: "Sigma",
  snort: "Snort",
  suricata: "Suricata",
  benign: "Non-malicious",
  likelybenign: "Likely Non-malicious",
  falsepositive: "False Positive",
  insufficientevidence: "Insufficient Evidence",
  staleorrevoked: "Stale or Revoked",
}

function normalize(value: string) {
  return value.replace(/\s|_|-/g, "").toLowerCase()
}

function formatStatusLabel(value: string) {
  const normalized = normalize(value);
  const mapped = DISPLAY_LABEL_BY_KEY[normalized];
  if (mapped) {
    return mapped;
  }

  if (value.includes(" ")) {
    return value
  }

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export function StatusBadge({ value }: { value: string }) {
  const normalized = normalize(value)
  const tone = STATUS_TONE_BY_KEY[normalized] ?? "border-border/80 bg-surface-2/80 text-muted-foreground"

  return (
    <Badge
      variant="outline"
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] ${tone}`}
    >
      {formatStatusLabel(value)}
    </Badge>
  )
}
