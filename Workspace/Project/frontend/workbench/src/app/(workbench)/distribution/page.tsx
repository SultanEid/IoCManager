import { RuleDistributionPage } from "@/components/workbench/distribution/rule-distribution-page"
import { classifyUiError } from "@/shared/api/error-classification"
import { isMockMode, isModeConfigured } from "@/shared/gateway"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { UnavailableState } from "@/shared/ui/state-panels"

export default function DistributionPage() {
  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Rule distribution unavailable" />
  }

  if (isMockMode) {
    return (
      <UnavailableState
        title="Rule distribution unavailable"
        description="Distribution telemetry is real-data only and is intentionally not simulated in demo mode."
      />
    )
  }

  return <RuleDistributionPage />
}
