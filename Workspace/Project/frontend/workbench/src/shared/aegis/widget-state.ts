export type AegisWidgetPhase =
  | "idle"
  | "reviewing"
  | "drafting"
  | "saving"
  | "completed"
  | "blocked"

export type AegisWidgetState = {
  phase: AegisWidgetPhase
  title: string
  sourceName: string | null
  detail?: string | null
  reviewPath: string | null
  source: "status" | "user_action" | "autonomous"
  updatedAtUtc: string
}

export const AEGIS_WIDGET_STATE_STORAGE_KEY = "aegis.widget.state"
export const AEGIS_WIDGET_STATE_EVENT = "aegis:widget-state"
export const AEGIS_WIDGET_DISMISSED_KEY_STORAGE_KEY = "aegis.widget.dismissed"
export const AEGIS_WIDGET_DISMISSED_KEY_EVENT = "aegis:widget-dismissed"

function isWidgetState(value: unknown): value is AegisWidgetState {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<AegisWidgetState>
  return (
    typeof candidate.phase === "string"
    && typeof candidate.title === "string"
    && typeof candidate.updatedAtUtc === "string"
  )
}

export function readAegisWidgetState(): AegisWidgetState | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(AEGIS_WIDGET_STATE_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    return isWidgetState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeAegisWidgetState(state: AegisWidgetState) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(AEGIS_WIDGET_STATE_STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent<AegisWidgetState>(AEGIS_WIDGET_STATE_EVENT, { detail: state }))
}

export function readAegisWidgetDismissedKey(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(AEGIS_WIDGET_DISMISSED_KEY_STORAGE_KEY)
  return raw?.trim() ? raw : null
}

export function writeAegisWidgetDismissedKey(value: string | null) {
  if (typeof window === "undefined") {
    return
  }

  if (!value) {
    window.localStorage.removeItem(AEGIS_WIDGET_DISMISSED_KEY_STORAGE_KEY)
  } else {
    window.localStorage.setItem(AEGIS_WIDGET_DISMISSED_KEY_STORAGE_KEY, value)
  }

  window.dispatchEvent(new CustomEvent<string | null>(AEGIS_WIDGET_DISMISSED_KEY_EVENT, { detail: value }))
}
