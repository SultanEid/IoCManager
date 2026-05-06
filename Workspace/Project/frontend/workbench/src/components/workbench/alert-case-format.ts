import type { V2AlertResponse } from "@/shared/api/schemas"

const SCANNER_FAMILY_ORDER = ["yara", "sigma", "snort", "suricata"] as const

export function formatAlertOwner(ownerUserId: string) {
  return ownerUserId === "unassigned" ? "Unassigned" : ownerUserId
}

export function formatAlertTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString()
}

export function formatScannerFamily(value: string) {
  return value ? value.toUpperCase() : "IOC"
}

function formatScannerFamilies(alert: V2AlertResponse) {
  const families = (alert.scannerFamilies?.length ? alert.scannerFamilies : [alert.scannerFamily])
    .map((family) => family.trim())
    .filter((family) => family.length > 0 && family.toLowerCase() !== "mixed")

  if (families.length === 0) {
    return formatScannerFamily(alert.scannerFamily)
  }

  return [...new Set(families)]
    .sort((left, right) => {
      const leftIndex = SCANNER_FAMILY_ORDER.indexOf(left.toLowerCase() as (typeof SCANNER_FAMILY_ORDER)[number])
      const rightIndex = SCANNER_FAMILY_ORDER.indexOf(right.toLowerCase() as (typeof SCANNER_FAMILY_ORDER)[number])
      if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right)
      if (leftIndex === -1) return 1
      if (rightIndex === -1) return -1
      return leftIndex - rightIndex
    })
    .map((family) => formatScannerFamily(family))
    .join(", ")
}

export function alertCaseTitle(alert: V2AlertResponse) {
  if (alert.scannerFamily.toLowerCase() === "mixed" && alert.scannerFamilies?.length > 0) {
    const target = alert.targetDisplay?.trim() || "Unscoped target"
    return `${formatScannerFamilies(alert)} findings on ${target}`
  }

  const ruleName = alert.ruleName?.trim()
  const normalizedRuleName = ruleName?.toLowerCase()
  if (ruleName && normalizedRuleName !== "unknown" && normalizedRuleName !== "multiple rules") {
    return ruleName
  }

  return alert.title
    .replace(/^case alert:\s*/i, "")
    .replace(/\s*\(scan\s+\d+\)\s*$/i, "")
    .replace(/\s*\(job\s+\d+,\s*result\s+\d+\)\s*$/i, "")
    .replace(/\s*\(result\s+\d+\)\s*$/i, "")
    .trim() || "IOC finding case"
}

export function alertCaseContext(alert: V2AlertResponse) {
  const scanner = formatScannerFamilies(alert)
  const target = alert.targetDisplay?.trim() || "Unscoped target"
  const noun = scanner.includes(",") ? "findings" : "finding"
  return `${scanner} ${noun} on ${target}`
}
