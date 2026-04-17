import { OperationsModulePage } from "@/components/workbench/operations/operations-module-page"
import { ServerDiscoveryPage } from "@/components/workbench/servers/server-discovery-page"
import { classifyUiError } from "@/shared/api/error-classification"
import { isMockMode, isModeConfigured } from "@/shared/gateway"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"

export default function ServersSubnetsPage() {
  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Subnet operations unavailable" />
  }

  if (isMockMode) {
    return <OperationsModulePage subpageKey="subnets" />
  }

  return <ServerDiscoveryPage surface="subnets" />
}
