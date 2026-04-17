import { ScanPlanManagementPage } from "@/components/workbench/servers/scan-plan-management-page"
import { classifyUiError } from "@/shared/api/error-classification"
import { isMockMode, isModeConfigured } from "@/shared/gateway"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { UnavailableState } from "@/shared/ui/state-panels"

export default function ScanPlanPage() {
  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Scan plan unavailable" />
  }

  if (isMockMode) {
    return (
      <UnavailableState
        title="Scan-plan execution unavailable"
        description="Design/demo mode does not execute scheduled plans. Switch to normal mode for real scan-plan workflows."
      />
    )
  }

  return <ScanPlanManagementPage />
}
