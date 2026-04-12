import { OperationsModulePage } from "@/components/workbench/operations/operations-module-page"
import { ScannerFleetPage } from "@/components/workbench/servers/scanner-fleet-page"
import { classifyUiError } from "@/shared/api/error-classification"
import { isMockMode, isModeConfigured } from "@/shared/gateway"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"

export default function ServersScannerFleetPage() {
  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Scanner fleet unavailable" />
  }

  if (isMockMode) {
    return <OperationsModulePage subpageKey="scanner-fleet" />
  }

  return <ScannerFleetPage />
}
