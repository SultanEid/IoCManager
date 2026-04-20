import { describe, expect, it } from "vitest"
import { ApiError } from "@/shared/api/error"
import { classifyUiError } from "@/shared/api/error-classification"

describe("classifyUiError", () => {
  it("classifies dependency-down from structured Problem Details fields", () => {
    const error = new ApiError("Request failed", 400, {
      detail: "AI sidecar temporarily unavailable.",
      dependency: "ai_sidecar",
      dependencyType: "optional",
      condition: "temporarily_unavailable",
      retryable: true,
    }, {
      detail: "AI sidecar temporarily unavailable.",
      dependency: "ai_sidecar",
      dependencyType: "optional",
      condition: "temporarily_unavailable",
      retryable: true,
    })

    const classification = classifyUiError(error)
    expect(classification.kind).toBe("dependency-down")
    expect(classification.message).toBe("AI sidecar temporarily unavailable.")
    expect(classification.isContractMismatch).toBe(false)
  })

  it("classifies schema mismatch via explicit marker, not message text", () => {
    const error = new ApiError("Unexpected response", 500, null, {
      isSchemaValidationFailure: true,
    })

    const classification = classifyUiError(error)
    expect(classification.kind).toBe("dependency-down")
    expect(classification.isContractMismatch).toBe(true)
  })

  it("classifies permission-restricted and missing-feature paths", () => {
    const forbidden = classifyUiError(new ApiError("Forbidden", 403))
    expect(forbidden.kind).toBe("permission-restricted")

    const missing = classifyUiError(new ApiError("Not Found", 404), {
      treat404AsMissingFeature: true,
    })
    expect(missing.kind).toBe("unavailable-missing-feature")
  })
})
