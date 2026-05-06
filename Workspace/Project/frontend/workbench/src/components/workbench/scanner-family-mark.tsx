import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Bug } from "lucide-react"

type KnownScannerFamily = "yara" | "sigma" | "snort" | "suricata" | "mixed"

type ScannerMarkProps = {
  family: string
  size?: "sm" | "md" | "lg"
  className?: string
}

type ScannerBadgeProps = {
  family: string
  className?: string
  size?: "sm" | "md"
}

const SIZE_CLASSES = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const

const GLYPH_SIZE_CLASSES = {
  sm: "h-3.5 w-3.5",
  md: "h-4.5 w-4.5",
  lg: "h-5 w-5",
} as const

const FAMILY_META: Record<
  KnownScannerFamily,
  {
    label: string
    frameClassName: string
    badgeClassName: string
    glyphClassName: string
  }
> = {
  yara: {
    label: "YARA",
    frameClassName: "border-violet-300/25 bg-[linear-gradient(145deg,rgba(168,85,247,0.32),rgba(99,102,241,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    badgeClassName: "border-violet-300/25 bg-violet-500/10 text-violet-100",
    glyphClassName: "text-violet-100",
  },
  sigma: {
    label: "Sigma",
    frameClassName: "border-blue-300/25 bg-[linear-gradient(145deg,rgba(59,130,246,0.28),rgba(14,165,233,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    badgeClassName: "border-blue-300/25 bg-blue-500/10 text-blue-100",
    glyphClassName: "text-blue-100",
  },
  snort: {
    label: "Snort",
    frameClassName: "border-rose-300/25 bg-[linear-gradient(145deg,rgba(251,113,133,0.3),rgba(245,158,11,0.12))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    badgeClassName: "border-rose-300/25 bg-rose-500/10 text-rose-100",
    glyphClassName: "text-rose-50",
  },
  suricata: {
    label: "Suricata",
    frameClassName: "border-orange-300/25 bg-[linear-gradient(145deg,rgba(251,146,60,0.32),rgba(239,68,68,0.12))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    badgeClassName: "border-orange-300/25 bg-orange-500/10 text-orange-100",
    glyphClassName: "text-orange-50",
  },
  mixed: {
    label: "Mixed",
    frameClassName: "border-cyan-300/25 bg-[linear-gradient(145deg,rgba(34,211,238,0.28),rgba(168,85,247,0.12))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    badgeClassName: "border-cyan-300/25 bg-cyan-500/10 text-cyan-100",
    glyphClassName: "text-cyan-50",
  },
}

function normalizeScannerFamily(family: string): KnownScannerFamily | null {
  const normalized = family.trim().toLowerCase()
  if (normalized === "yara" || normalized === "sigma" || normalized === "snort" || normalized === "suricata" || normalized === "mixed") {
    return normalized
  }

  return null
}

function formatScannerFamilyLabel(family: string) {
  const normalized = normalizeScannerFamily(family)
  if (normalized) {
    return FAMILY_META[normalized].label
  }

  if (!family) {
    return "Unknown"
  }

  return family
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function YaraGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6H4v12h2" opacity="0.65" />
      <path d="M18 6h2v12h-2" opacity="0.65" />
      <path d="M8.5 7.5 12 12l3.5-4.5" />
      <path d="M12 12v5" />
    </svg>
  )
}

function SigmaGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.5 6H8l6 6-6 6h9.5" />
      <path d="M17.5 6h-2.5" opacity="0.55" />
      <path d="M17.5 18H15" opacity="0.55" />
    </svg>
  )
}

function SnortGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M3.4 14.2c.2-1.9 1.2-3.6 2.7-4.8-.2-.9 0-1.8.4-2.6 1.1 0 2 .4 2.8 1.2 1.1-.6 2.2-.9 3.5-.9 1.9 0 3.8.7 5.3 2-.7.9-1.4 1.8-2.5 2.5 1.7.3 3.1.7 4.3 1.4-1.4 1-2.7 2.2-4 3.8l-.9 4.2-2.6-2.5-1.2-2.8-.4 3H8.7l-1.6-1.6-1.6-.6.9-.8-1.1-.3Z"
        fill="rgba(255,250,250,0.97)"
      />
      <path
        d="M9.2 8.4c.2 1-.1 1.8-.8 2.5-.4.4-.8.6-1.2.6-.7 0-1.2-.4-1.4-1.1"
        stroke="rgba(17,24,39,0.7)"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.7 13.4 19 10h2.2v4.3l-1.4 2.2-3 1.7-2.1-2.1.9-2.7Z"
        fill="none"
        stroke="rgba(17,24,39,0.76)"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path d="M17.2 13.4 16.6 15.1l.4 1.3 1 .2 1.1-1.7.1-1.3-.4-.9-1.2-.1Z" fill="rgba(17,24,39,0.78)" />
      <path d="M19.1 13.8 18.4 15.5l.4 1.2 1 .2.8-1.8v-1.3l-.4-.8-.8-.1Z" fill="rgba(17,24,39,0.78)" />
      <circle cx="11.5" cy="11.4" r="0.75" fill="rgba(17,24,39,0.78)" />
      <path
        d="M6.1 17.5c.1.7-.1 1.4-.5 2 .5.2 1 .6 1.3 1.2"
        stroke="rgba(255,250,250,0.72)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SuricataGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4.8 18.7c1.8-.5 3.7-.8 5.7-.8 2.4 0 4.9.3 7.3 1 .8.2 1.4.5 1.9.8H4.8Z"
        fill="rgba(255,248,240,0.92)"
      />
      <path
        d="M8.8 10.1c.3 0 .7.1 1 .3.4.3.6.7.7 1.3v4.6c0 .5.2 1 .6 1.3l.5.4H8.3l.5-.4c.4-.3.6-.8.6-1.3v-4.4c0-.8-.2-1.4-.6-1.8Z"
        fill="rgba(255,248,240,0.92)"
      />
      <path
        d="M13.3 6.8c.4 0 .8.1 1.2.3.7.4 1.1 1.2 1.2 2.3v6.9c0 .5.2 1 .7 1.3l.6.4h-3.9l.6-.4c.4-.3.7-.8.7-1.3V9.6c0-.9-.1-1.7-.4-2.3Z"
        fill="rgba(255,248,240,0.97)"
      />
      <path
        d="M5.7 12.2c.3 0 .6.1.8.3.3.2.5.6.5 1.1v2.8c0 .5.2.9.6 1.2l.4.3H5.4l.4-.3c.4-.3.6-.7.6-1.2v-2.7c0-.6-.2-1.1-.5-1.5Z"
        fill="rgba(255,248,240,0.86)"
      />
      <path d="M6 11.8c.2-.8.6-1.3 1.2-1.7.4.5.6 1 .7 1.5" stroke="rgba(255,248,240,0.86)" strokeWidth="0.95" strokeLinecap="round" />
      <path d="M9 9.8c.2-1 .7-1.7 1.4-2.2.5.6.8 1.2.9 1.9" stroke="rgba(255,248,240,0.92)" strokeWidth="0.95" strokeLinecap="round" />
      <path d="M13.8 6.4c.3-1.2.9-2.1 1.9-2.8.7.8 1.1 1.6 1.2 2.6" stroke="rgba(255,248,240,0.97)" strokeWidth="0.95" strokeLinecap="round" />
    </svg>
  )
}

function MixedGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h4v4H7z" opacity="0.95" />
      <path d="M13 7h4v4h-4z" opacity="0.7" />
      <path d="M7 13h4v4H7z" opacity="0.7" />
      <path d="M13 13h4v4h-4z" opacity="0.95" />
    </svg>
  )
}

function ScannerGlyph({ family }: { family: KnownScannerFamily }) {
  const glyphClassName = "h-full w-full"
  switch (family) {
    case "yara":
      return <YaraGlyph className={glyphClassName} />
    case "sigma":
      return <SigmaGlyph className={glyphClassName} />
    case "snort":
      return <SnortGlyph className={glyphClassName} />
    case "suricata":
      return <SuricataGlyph className={glyphClassName} />
    case "mixed":
      return <MixedGlyph className={glyphClassName} />
  }
}

export function getScannerFamilyLabel(family: string) {
  return formatScannerFamilyLabel(family)
}

export function ScannerFamilyMark({ family, size = "md", className }: ScannerMarkProps) {
  const normalized = normalizeScannerFamily(family)
  if (!normalized) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[1rem] border border-border/70 bg-surface-1 text-muted-foreground",
          SIZE_CLASSES[size],
          className,
        )}
        aria-hidden="true"
      >
        <Bug className={GLYPH_SIZE_CLASSES[size]} />
      </span>
    )
  }

  const meta = FAMILY_META[normalized]

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[1rem] border backdrop-blur-sm",
        SIZE_CLASSES[size],
        meta.frameClassName,
        meta.glyphClassName,
        className,
      )}
      aria-hidden="true"
    >
      <span className={cn("relative inline-flex items-center justify-center", GLYPH_SIZE_CLASSES[size])}>
        <ScannerGlyph family={normalized} />
      </span>
    </span>
  )
}

export function ScannerFamilyBadge({ family, className, size = "md" }: ScannerBadgeProps) {
  const normalized = normalizeScannerFamily(family)
  const label = formatScannerFamilyLabel(family)
  const meta = normalized ? FAMILY_META[normalized] : null

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 text-[10px] font-semibold tracking-[0.08em]",
        size === "sm" ? "h-6 py-0.5" : "h-7 py-1",
        meta ? meta.badgeClassName : "border-border/70 bg-surface-2/70 text-muted-foreground",
        className,
      )}
    >
      <ScannerFamilyMark family={family} size="sm" className="h-5 w-5 rounded-[0.85rem] border-white/10 shadow-none" />
      <span>{label}</span>
    </Badge>
  )
}
