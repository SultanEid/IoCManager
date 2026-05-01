import type { UiErrorClassification } from "@/shared/api/error-classification"
import { DependencyDownState, PermissionRestrictedState, UnavailableState } from "@/shared/ui/state-panels"

export function ClassifiedFailureState({
  failure,
  fallbackTitle,
}: {
  failure: UiErrorClassification
  fallbackTitle: string
}) {
  if (failure.kind === "permission-restricted") {
    return (
      <PermissionRestrictedState
        title="Permission restricted"
        description="Your role cannot access this backend surface."
      />
    )
  }

  if (failure.kind === "rate-limited") {
    return (
      <UnavailableState
        title="Temporarily rate limited"
        description="The backend read budget was exhausted. Cached sections may still be usable; wait a moment or retry the section."
      />
    )
  }

  if (failure.kind === "dependency-down") {
    return (
      <DependencyDownState
        title="Dependency down"
        description={
          failure.isContractMismatch
            ? "This section is temporarily unavailable because the backend response does not match the expected contract."
            : "A required backend dependency is currently unavailable."
        }
      />
    )
  }

  if (failure.kind === "unavailable-configuration") {
    return <UnavailableState title="Configuration unavailable" description={failure.message} />
  }

  if (failure.kind === "unavailable-missing-feature") {
    return (
      <UnavailableState
        title={fallbackTitle}
        description="Backend feature support is not available for this surface yet."
      />
    )
  }

  return <UnavailableState title={fallbackTitle} description={failure.message} />
}
