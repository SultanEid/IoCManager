import { ScannerFamilyBadge } from "@/components/workbench/scanner-family-mark"

const SCANNER_FAMILY_ORDER = ["yara", "sigma", "snort", "suricata"] as const

type AlertScannerFamilyBadgesProps = {
  scannerFamily: string
  scannerFamilies?: string[]
  size?: "sm" | "md"
}

export function resolveAlertScannerFamilies(scannerFamily: string, scannerFamilies?: string[]) {
  const families = (scannerFamilies && scannerFamilies.length > 0 ? scannerFamilies : [scannerFamily])
    .map((family) => family.trim().toLowerCase())
    .filter((family) => family.length > 0 && family !== "mixed")

  if (families.length === 0) {
    return [scannerFamily.trim().toLowerCase()].filter(Boolean)
  }

  return [...new Set(families)].sort((left, right) => {
    const leftIndex = SCANNER_FAMILY_ORDER.indexOf(left as (typeof SCANNER_FAMILY_ORDER)[number])
    const rightIndex = SCANNER_FAMILY_ORDER.indexOf(right as (typeof SCANNER_FAMILY_ORDER)[number])
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right)
    if (leftIndex === -1) return 1
    if (rightIndex === -1) return -1
    return leftIndex - rightIndex
  })
}

export function AlertScannerFamilyBadges({
  scannerFamily,
  scannerFamilies,
  size = "md",
}: AlertScannerFamilyBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {resolveAlertScannerFamilies(scannerFamily, scannerFamilies).map((family) => (
        <ScannerFamilyBadge key={family} family={family} size={size} />
      ))}
    </div>
  )
}
