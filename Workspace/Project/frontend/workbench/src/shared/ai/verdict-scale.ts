export type AiVerdictScaleLevel =
  | "benign"
  | "likely_benign"
  | "suspicious"
  | "likely_malicious"
  | "malicious"

export type AiVerdictDisplay = {
  level: AiVerdictScaleLevel
  label: string
  scalePosition: 1 | 2 | 3 | 4 | 5
  backendVerdict: string
}

const FIVE_LEVEL_LABELS: Record<AiVerdictScaleLevel, string> = {
  benign: "Benign",
  likely_benign: "Likely Benign",
  suspicious: "Suspicious",
  likely_malicious: "Likely Malicious",
  malicious: "Malicious",
}

const FIVE_LEVEL_POSITIONS: Record<AiVerdictScaleLevel, 1 | 2 | 3 | 4 | 5> = {
  benign: 1,
  likely_benign: 2,
  suspicious: 3,
  likely_malicious: 4,
  malicious: 5,
}

const VERDICT_TO_LEVEL: Record<string, AiVerdictScaleLevel> = {
  benign: "benign",
  likely_benign: "likely_benign",
  false_positive: "likely_benign",
  stale_or_revoked: "likely_benign",
  insufficient_evidence: "suspicious",
  suspicious: "suspicious",
  likely_malicious: "likely_malicious",
  malicious: "malicious",
}

export const AI_VERDICT_SCALE_OPTIONS: AiVerdictDisplay[] = [
  toAiVerdictDisplay("benign"),
  toAiVerdictDisplay("likely_benign"),
  toAiVerdictDisplay("suspicious"),
  toAiVerdictDisplay("likely_malicious"),
  toAiVerdictDisplay("malicious"),
]

export function toAiVerdictDisplay(verdict: string | null | undefined): AiVerdictDisplay {
  const backendVerdict = (verdict ?? "suspicious").trim().toLowerCase()
  const level = VERDICT_TO_LEVEL[backendVerdict] ?? "suspicious"
  return {
    level,
    label: FIVE_LEVEL_LABELS[level],
    scalePosition: FIVE_LEVEL_POSITIONS[level],
    backendVerdict,
  }
}

export function aiVerdictSentenceLabel(verdict: string | null | undefined) {
  const label = toAiVerdictDisplay(verdict).label
  return label.charAt(0).toLowerCase() + label.slice(1)
}

export function summarizeAiVerdict(verdict: string | null | undefined, subject = "IOC") {
  const display = toAiVerdictDisplay(verdict)
  switch (display.level) {
    case "benign":
      return `The model places this ${subject} in the benign band.`
    case "likely_benign":
      return `The model leans benign for this ${subject}, but analyst context can still matter.`
    case "suspicious":
      return `The model places this ${subject} in the middle suspicious band because the evidence is not strong enough for a cleaner benign or malicious call.`
    case "likely_malicious":
      return `The model leans malicious for this ${subject}, but some uncertainty remains.`
    case "malicious":
      return `The model sees enough corroboration to place this ${subject} in the malicious band.`
  }
}
