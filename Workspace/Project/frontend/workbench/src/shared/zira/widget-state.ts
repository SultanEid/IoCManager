export type ZiraWidgetPhase =
  | "idle"
  | "analyzing"
  | "drafting"
  | "creating"
  | "running"
  | "summarizing"
  | "completed"
  | "blocked"

export type ZiraWidgetState = {
  phase: ZiraWidgetPhase
  title: string
  scannerCapability: string | null
  operatingMode: "LiveData" | "MockFallback" | null
  source: "status" | "user_action" | "autonomous"
  updatedAtUtc: string
}

export const ZIRA_WIDGET_STATE_STORAGE_KEY = "zira.widget.state"
export const ZIRA_WIDGET_STATE_EVENT = "zira:widget-state"

export function normalizeZiraOperatingMode(value: string | null | undefined): ZiraWidgetState["operatingMode"] {
  return value === "LiveData" || value === "MockFallback" ? value : null
}

function isWidgetState(value: unknown): value is ZiraWidgetState {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<ZiraWidgetState>
  return (
    typeof candidate.phase === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.updatedAtUtc === "string"
  )
}

export function readZiraWidgetState(): ZiraWidgetState | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(ZIRA_WIDGET_STATE_STORAGE_KEY)
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

export function writeZiraWidgetState(state: ZiraWidgetState) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(ZIRA_WIDGET_STATE_STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent<ZiraWidgetState>(ZIRA_WIDGET_STATE_EVENT, { detail: state }))
}
