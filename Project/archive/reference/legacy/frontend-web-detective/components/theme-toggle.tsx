"use client"

import { usePreferences } from "@/components/preferences-provider"
import { BASE_COLOR_OPTIONS } from "@/lib/preferences"

const ORDER = ["dark", "light", "gray"] as const

export function ThemeToggle() {
  const { preferences, setPreferences, savePreferences } = usePreferences()
  const currentIndex = ORDER.findIndex((mode) => mode === preferences.themeMode)
  const nextMode = ORDER[(currentIndex + 1) % ORDER.length]

  async function cycleTheme() {
    const next = {
      ...preferences,
      themeMode: nextMode,
    }
    setPreferences(next)
    await savePreferences(next)
  }

  async function setAccentTheme(baseColor: string) {
    const next = {
      ...preferences,
      baseColor: baseColor as typeof preferences.baseColor,
    }
    setPreferences(next)
    await savePreferences(next)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="btn-outline h-9 px-3 text-sm"
        aria-label="Accent theme"
        value={preferences.baseColor}
        onChange={(event) => void setAccentTheme(event.target.value)}
      >
        {BASE_COLOR_OPTIONS.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>
      <button type="button" className="btn-outline h-9 px-3 text-sm" onClick={cycleTheme}>
        Mode: {preferences.themeMode}
      </button>
    </div>
  )
}
