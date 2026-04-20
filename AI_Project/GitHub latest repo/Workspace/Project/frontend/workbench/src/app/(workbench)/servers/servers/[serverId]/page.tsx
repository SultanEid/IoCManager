import { OperationsServerDetailPage } from "@/components/workbench/operations/operations-server-detail-page"
import { ManagedServerDetailPage } from "@/components/workbench/servers/managed-server-detail-page"
import { classifyUiError } from "@/shared/api/error-classification"
import { isMockMode, isModeConfigured } from "@/shared/gateway"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"

export default async function ServersDetailRoute({
  params,
}: {
  params: Promise<{ serverId: string }>
}) {
  const { serverId } = await params

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Server detail unavailable" />
  }

  if (isMockMode) {
    return <OperationsServerDetailPage serverId={serverId} />
  }

  return <ManagedServerDetailPage serverId={serverId} />
}
