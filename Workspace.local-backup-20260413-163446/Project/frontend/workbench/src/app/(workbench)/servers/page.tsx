import { OperationsModulePage } from "@/components/workbench/operations/operations-module-page"
import { ManagedServerInventoryPage } from "@/components/workbench/servers/managed-server-inventory-page"
import { classifyUiError } from "@/shared/api/error-classification"
import { isMockMode, isModeConfigured } from "@/shared/gateway"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"

export default function ServersPage() {
  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Server management unavailable" />
  }

  if (isMockMode) {
    return <OperationsModulePage subpageKey="inventory" />
  }

  return <ManagedServerInventoryPage />
}
