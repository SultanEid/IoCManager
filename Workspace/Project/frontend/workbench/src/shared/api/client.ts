import { type ZodType } from "zod"
import { ApiError } from "@/shared/api/error"
import { clearSession, getSession } from "@/shared/auth/session"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ?? "http://localhost:5127"

type RequestOptions<TBody> = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: TBody
  signal?: AbortSignal
  auth?: boolean
}

type FormRequestOptions = {
  method?: "POST" | "PATCH" | "PUT"
  formData: FormData
  signal?: AbortSignal
  auth?: boolean
}

type BlobRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  signal?: AbortSignal
  auth?: boolean
}

type ProblemDetailsFields = {
  title: string | null
  detail: string | null
  status: number | null
  dependency: string | null
  condition: string | null
  dependencyType: string | null
  retryable: boolean | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(value: Record<string, unknown>, key: string) {
  const raw = value[key]
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null
}

function readNumber(value: Record<string, unknown>, key: string) {
  const raw = value[key]
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null
}

function readBoolean(value: Record<string, unknown>, key: string) {
  const raw = value[key]
  return typeof raw === "boolean" ? raw : null
}

function parseProblemDetails(payload: unknown): ProblemDetailsFields | null {
  if (!isRecord(payload)) {
    return null
  }

  const details: ProblemDetailsFields = {
    title: readString(payload, "title"),
    detail: readString(payload, "detail"),
    status: readNumber(payload, "status"),
    dependency: readString(payload, "dependency"),
    condition: readString(payload, "condition"),
    dependencyType: readString(payload, "dependencyType"),
    retryable: readBoolean(payload, "retryable"),
  }

  const hasAnyStructuredField =
    details.title !== null ||
    details.detail !== null ||
    details.status !== null ||
    details.dependency !== null ||
    details.condition !== null ||
    details.dependencyType !== null ||
    details.retryable !== null

  return hasAnyStructuredField ? details : null
}

function deriveErrorMessage(payload: unknown, status: number, problemDetails: ProblemDetailsFields | null) {
  if (problemDetails?.detail) {
    return problemDetails.detail
  }

  if (problemDetails?.title) {
    return problemDetails.title
  }

  if (typeof payload === "string" && payload.length > 0) {
    const trimmedPayload = payload.trim()
    if (trimmedPayload.startsWith("{") && trimmedPayload.endsWith("}")) {
      try {
        const parsedPayload = JSON.parse(trimmedPayload)
        const parsedDetails = parseProblemDetails(parsedPayload)
        if (parsedDetails?.detail) {
          return parsedDetails.detail
        }
        if (parsedDetails?.title) {
          return parsedDetails.title
        }
      } catch {
        // Keep the original payload message fallback.
      }
    }
    return payload
  }

  return `Request failed with status ${status}`
}

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  if (typeof window !== "undefined") {
    return `${API_BASE_URL}${normalizedPath}`
  }

  return `${API_BASE_URL}${normalizedPath}`
}

export async function requestJson<TSchema, TBody = undefined>(
  path: string,
  schema: ZodType<TSchema>,
  options: RequestOptions<TBody> = {},
): Promise<TSchema> {
  const headers = new Headers({
    Accept: "application/json",
  })

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  if (options.auth !== false) {
    const session = getSession()
    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`)
    }
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    credentials: "omit",
    signal: options.signal,
  })

  let payload: unknown = null
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    payload = await response.json()
  } else {
    const text = await response.text()
    payload = text || null
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
    }

    const problemDetails = parseProblemDetails(payload)
    const message = deriveErrorMessage(payload, response.status, problemDetails)

    throw new ApiError(message, response.status, payload, {
      title: problemDetails?.title,
      detail: problemDetails?.detail,
      dependency: problemDetails?.dependency,
      condition: problemDetails?.condition,
      dependencyType: problemDetails?.dependencyType,
      retryable: problemDetails?.retryable,
    })
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiError(`Schema validation failed for ${path}`, 500, parsed.error.flatten(), {
      isSchemaValidationFailure: true,
    })
  }

  return parsed.data
}

export async function requestForm<TSchema>(
  path: string,
  schema: ZodType<TSchema>,
  options: FormRequestOptions,
): Promise<TSchema> {
  const headers = new Headers({
    Accept: "application/json",
  })

  if (options.auth !== false) {
    const session = getSession()
    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`)
    }
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "POST",
    headers,
    body: options.formData,
    cache: "no-store",
    credentials: "omit",
    signal: options.signal,
  })

  let payload: unknown = null
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    payload = await response.json()
  } else {
    const text = await response.text()
    payload = text || null
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
    }

    const problemDetails = parseProblemDetails(payload)
    const message = deriveErrorMessage(payload, response.status, problemDetails)

    throw new ApiError(message, response.status, payload, {
      title: problemDetails?.title,
      detail: problemDetails?.detail,
      dependency: problemDetails?.dependency,
      condition: problemDetails?.condition,
      dependencyType: problemDetails?.dependencyType,
      retryable: problemDetails?.retryable,
    })
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiError(`Schema validation failed for ${path}`, 500, parsed.error.flatten(), {
      isSchemaValidationFailure: true,
    })
  }

  return parsed.data
}

function parseFileNameFromDisposition(value: string | null) {
  if (!value) {
    return null
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const simpleMatch = /filename="?([^"]+)"?/i.exec(value)
  return simpleMatch?.[1] ?? null
}

export async function requestBlob(
  path: string,
  options: BlobRequestOptions = {},
): Promise<{ blob: Blob; fileName: string | null; contentType: string | null }> {
  const headers = new Headers()

  if (options.auth !== false) {
    const session = getSession()
    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`)
    }
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    cache: "no-store",
    credentials: "omit",
    signal: options.signal,
  })

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
    }

    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text()
    const problemDetails = parseProblemDetails(payload)
    const message = deriveErrorMessage(payload, response.status, problemDetails)

    throw new ApiError(message, response.status, payload, {
      title: problemDetails?.title,
      detail: problemDetails?.detail,
      dependency: problemDetails?.dependency,
      condition: problemDetails?.condition,
      dependencyType: problemDetails?.dependencyType,
      retryable: problemDetails?.retryable,
    })
  }

  return {
    blob: await response.blob(),
    fileName: parseFileNameFromDisposition(response.headers.get("content-disposition")),
    contentType: response.headers.get("content-type"),
  }
}

export function getApiBaseForDisplay() {
  return "/api (rewritten)"
}
