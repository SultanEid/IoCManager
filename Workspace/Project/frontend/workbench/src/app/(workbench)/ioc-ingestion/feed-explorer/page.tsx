import { DetectionEngineeringStudio } from "@/components/workbench/detection-engineering-studio"
import { FeedExplorerPage } from "@/components/workbench/feed-explorer-page"
import { IngestionFeedsSubnav } from "@/components/workbench/ingestion-feeds-subnav"
import { classifyUiError } from "@/shared/api/error-classification"
import { isMockMode, isModeConfigured } from "@/shared/gateway"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"

export default function IocIngestionFeedExplorerPage() {
  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Feed explorer unavailable" />
  }

  if (isMockMode) {
    return (
      <div className="space-y-4">
        <IngestionFeedsSubnav current="feed-explorer" />
        <DetectionEngineeringStudio subpageKey="feed-explorer" />
      </div>
    )
  }

  return <FeedExplorerPage />
}
