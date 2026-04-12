import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { requestJson } from "@/shared/api/client"
import { ApiError } from "@/shared/api/error"

const mockedSession = vi.hoisted(() => ({
  getSession: vi.fn(),
  clearSession: vi.fn(),
}))

vi.mock("@/shared/auth/session", () => ({
  getSession: mockedSession.getSession,
  clearSession: mockedSession.clearSession,
}))

describe("requestJson", () => {
  beforeEach(() => {
    mockedSession.getSession.mockReturnValue(null)
    mockedSession.clearSession.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("preserves structured Problem Details fields on ApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          title: "Dependency Temporarily Unavailable",
          detail: "AI sidecar is temporarily unavailable. Retry later.",
          status: 503,
          dependency: "ai_sidecar",
          condition: "temporarily_unavailable",
          dependencyType: "optional",
          retryable: true,
          traceId: "abc",
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    )

    let thrown: unknown = null
    try {
      await requestJson("/api/reports/ingestions", z.object({ ok: z.boolean() }))
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(ApiError)
    const apiError = thrown as ApiError
    expect(apiError.status).toBe(503)
    expect(apiError.title).toBe("Dependency Temporarily Unavailable")
    expect(apiError.detail).toBe("AI sidecar is temporarily unavailable. Retry later.")
    expect(apiError.dependency).toBe("ai_sidecar")
    expect(apiError.condition).toBe("temporarily_unavailable")
    expect(apiError.dependencyType).toBe("optional")
    expect(apiError.retryable).toBe(true)
    expect(apiError.message).toBe("AI sidecar is temporarily unavailable. Retry later.")
    expect(apiError.payload).toEqual(
      expect.objectContaining({
        dependency: "ai_sidecar",
        dependencyType: "optional",
      }),
    )
  })

  it("marks schema validation failure with an explicit marker", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    )

    let thrown: unknown = null
    try {
    await requestJson("/api/alerts", z.object({ id: z.string() }))
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(ApiError)
    const apiError = thrown as ApiError
    expect(apiError.status).toBe(500)
    expect(apiError.isSchemaValidationFailure).toBe(true)
    expect(apiError.message).toContain("Schema validation failed")
  })

  it("clears session when backend returns 401", async () => {
    mockedSession.getSession.mockReturnValue({
      token: "token",
      expiresAtUtc: "2099-01-01T00:00:00Z",
      userId: "u1",
      username: "u1",
      roles: ["Analyst"],
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          title: "Unauthorized",
          detail: "Token expired.",
          status: 401,
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    )

    await expect(
      requestJson("/api/v2/identity/users", z.array(z.object({ id: z.string() }))),
    ).rejects.toBeInstanceOf(ApiError)

    expect(mockedSession.clearSession).toHaveBeenCalledTimes(1)
  })

  it("does not clear session when backend returns 403", async () => {
    mockedSession.getSession.mockReturnValue({
      token: "token",
      expiresAtUtc: "2099-01-01T00:00:00Z",
      userId: "u1",
      username: "u1",
      roles: ["Analyst"],
    })

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          title: "Forbidden",
          detail: "Role not allowed.",
          status: 403,
        }),
        {
          status: 403,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    )

    await expect(
      requestJson("/api/v2/identity/users", z.array(z.object({ id: z.string() }))),
    ).rejects.toBeInstanceOf(ApiError)

    expect(mockedSession.clearSession).not.toHaveBeenCalled()
  })
})
