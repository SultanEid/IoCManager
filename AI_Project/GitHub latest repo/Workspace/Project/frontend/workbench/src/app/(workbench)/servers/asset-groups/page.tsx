import { OperationsModulePage } from "@/components/workbench/operations/operations-module-page"
import { AssetGroupsPage } from "@/components/workbench/servers/asset-groups-page"
import { classifyUiError } from "@/shared/api/error-classification"
import { isMockMode, isModeConfigured } from "@/shared/gateway"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"

export default function ServersAssetGroupsPage() {
  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Asset groups unavailable" />
  }

  if (isMockMode) {
    return <OperationsModulePage subpageKey="asset-groups" />
  }

  return <AssetGroupsPage />
}
