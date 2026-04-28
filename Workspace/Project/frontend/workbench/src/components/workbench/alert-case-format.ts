import type { V2AlertResponse } from "@/shared/api/schemas"

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

export function alertCaseTitle(alert: V2AlertResponse) {
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
  const scanner = formatScannerFamily(alert.scannerFamily)
  const target = alert.targetDisplay?.trim() || "Unscoped target"
  return `${scanner} finding on ${target}`
}
