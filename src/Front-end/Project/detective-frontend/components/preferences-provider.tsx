"use client"

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useTheme } from "next-themes"
import { apiFetch } from "@/lib/api"
import { DEFAULT_PREFERENCES, type UserPreferences } from "@/lib/preferences"
import { applyThemeTokens } from "@/lib/theme-tokens"

const STORAGE_KEY = "detective.user.preferences"

type PreferencesContextValue = {
  preferences: UserPreferences
  setPreferences: Dispatch<SetStateAction<UserPreferences>>
  savePreferences: (next?: UserPreferences) => Promise<{ ok: boolean; error?: string }>
}

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  setPreferences: () => undefined,
  savePreferences: async () => ({ ok: false, error: "Not initialized." }),
})

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    let cancelled = false
    let localApplyTimeout: number | null = null

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as UserPreferences
        const localPreferences = {
          ...DEFAULT_PREFERENCES,
          ...parsed,
        }
        localApplyTimeout = window.setTimeout(() => {
          if (!cancelled) {
            setPreferences(localPreferences)
          }
        }, 0)
      }
    } catch {
      // Ignore malformed local storage values.
    }

    async function load() {
      try {
        const server = await apiFetch<UserPreferences>("/api/settings/preferences")
        if (!cancelled) {
          setPreferences((previous) => ({
            ...previous,
            ...server,
          }))
        }
      } catch {
        // Fallback to local storage/defaults for signed-out users.
      }
    }

    load()

    return () => {
      cancelled = true
      if (localApplyTimeout !== null) {
        window.clearTimeout(localApplyTimeout)
      }
    }
  }, [])

  useEffect(() => {
    setTheme(preferences.themeMode)
    const root = document.documentElement
    root.dataset.themeStyle = preferences.themeStyle
    root.dataset.baseColor = preferences.baseColor
    root.dataset.themePreset = preferences.themePreset
    root.dataset.buttonStyle = preferences.buttonStyle
    root.dataset.density = preferences.layoutDensity
    root.dataset.motion = preferences.motionPreference
    root.dataset.font = preferences.fontFamily
    applyThemeTokens(root, preferences)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences, setTheme])

  const savePreferences = useCallback(async (next?: UserPreferences) => {
    const payload = next ?? preferences
    try {
      await apiFetch<UserPreferences>("/api/settings/preferences", {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      return { ok: true as const }
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Unknown sync error.",
      }
    }
  }, [preferences])

  const value = useMemo<PreferencesContextValue>(() => {
    return {
      preferences,
      setPreferences,
      savePreferences,
    }
  }, [preferences, savePreferences])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  return useContext(PreferencesContext)
}
