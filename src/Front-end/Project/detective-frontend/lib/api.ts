const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:5238"

type CsrfEnvelope = {
  csrfToken?: string
}

let csrfTokenCache: string | null = null
let csrfTokenPromise: Promise<string> | null = null

function isStateChangingMethod(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE"
}

async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    csrfTokenCache = null
  }

  if (csrfTokenCache) {
    return csrfTokenCache
  }

  if (csrfTokenPromise) {
    return csrfTokenPromise
  }

  const endpoint = resolveRequestUrl("/api/auth/csrf")
  csrfTokenPromise = fetch(endpoint, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to initialize CSRF token.")
      }
      const payload = (await response.json()) as CsrfEnvelope
      const token = payload.csrfToken?.trim()
      if (!token) {
        throw new Error("Missing CSRF token.")
      }
      csrfTokenCache = token
      return token
    })
    .finally(() => {
      csrfTokenPromise = null
    })

  return csrfTokenPromise
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase()
  const stateChanging = isStateChangingMethod(method)
  const isBrowser = typeof window !== "undefined"
  const shouldAttachCsrf = isBrowser && stateChanging && path !== "/api/auth/csrf"
  const headers = new Headers(init.headers)

  if (shouldAttachCsrf) {
    headers.set("X-CSRF-TOKEN", await getCsrfToken())
  }

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json")
  }

  const requestUrl = resolveRequestUrl(path)

  async function execute(currentHeaders: Headers) {
    return fetch(requestUrl, {
      ...init,
      method,
      headers: currentHeaders,
      credentials: "include",
      cache: "no-store",
    })
  }

  let response = await execute(headers)

  if (shouldAttachCsrf && response.status === 400) {
    const refreshedToken = await getCsrfToken(true)
    const retryHeaders = new Headers(headers)
    retryHeaders.set("X-CSRF-TOKEN", refreshedToken)
    response = await execute(retryHeaders)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api (proxied)"
  }
  return API_BASE_URL || "/api"
}

function resolveRequestUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  // In browser we always hit Next.js same-origin API rewrite to keep cookies/CSRF stable.
  if (typeof window !== "undefined") {
    return path
  }

  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}
