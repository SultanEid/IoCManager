import { ApiError } from "@/shared/api/error"

export type UiErrorKind =
  | "permission-restricted"
  | "rate-limited"
  | "unavailable-missing-feature"
  | "dependency-down"
  | "unavailable-configuration"
  | "unavailable"

export type UiErrorClassification = {
  kind: UiErrorKind
  isContractMismatch: boolean
  status: number | null
  message: string
}

type ClassifyOptions = {
  treat404AsMissingFeature?: boolean
  modeMisconfigured?: boolean
}

function fallbackMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return "Unexpected client or network failure."
}

function apiErrorMessage(error: ApiError) {
  if (error.detail && error.detail.trim()) {
    return error.detail
  }

  if (error.title && error.title.trim()) {
    return error.title
  }

  return error.message
}

export function classifyUiError(error: unknown, options: ClassifyOptions = {}): UiErrorClassification {
  if (options.modeMisconfigured) {
    return {
      kind: "unavailable-configuration",
      isContractMismatch: false,
      status: null,
      message: "Runtime gateway mode is not configured. Set NEXT_PUBLIC_USE_ASPNET_GATEWAY to 0 or 1.",
    }
  }

  if (error instanceof ApiError) {
    const isSchemaMismatch = error.isSchemaValidationFailure
    const hasDependencySignal =
      Boolean(error.dependency) ||
      Boolean(error.condition) ||
      Boolean(error.dependencyType) ||
      error.retryable === true

    if (error.status === 401 || error.status === 403) {
      return {
        kind: "permission-restricted",
        isContractMismatch: isSchemaMismatch,
        status: error.status,
        message: apiErrorMessage(error),
      }
    }

    if (error.status === 429) {
      return {
        kind: "rate-limited",
        isContractMismatch: isSchemaMismatch,
        status: error.status,
        message: apiErrorMessage(error),
      }
    }

    if (error.status === 404 && options.treat404AsMissingFeature) {
      return {
        kind: "unavailable-missing-feature",
        isContractMismatch: isSchemaMismatch,
        status: error.status,
        message: apiErrorMessage(error),
      }
    }

    if (isSchemaMismatch || hasDependencySignal || error.status >= 500) {
      return {
        kind: "dependency-down",
        isContractMismatch: isSchemaMismatch,
        status: error.status,
        message: apiErrorMessage(error),
      }
    }

    return {
      kind: "unavailable",
      isContractMismatch: isSchemaMismatch,
      status: error.status,
      message: apiErrorMessage(error),
    }
  }

  return {
    kind: "dependency-down",
    isContractMismatch: false,
    status: null,
    message: fallbackMessage(error),
  }
}
