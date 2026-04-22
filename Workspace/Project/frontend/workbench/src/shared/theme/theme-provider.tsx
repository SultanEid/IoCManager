"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { DEFAULT_THEME_MODE, isThemeMode, THEME_STORAGE_KEY, type ThemeMode } from "@/shared/theme/theme"

type ThemeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return
  }

  const root = document.documentElement
  root.classList.remove("dark", "light")
  root.classList.add(mode)
}

function resolveStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_MODE
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => resolveStoredMode())

  useEffect(() => {
    applyThemeToDocument(mode)
  }, [mode])

  const value = useMemo<ThemeContextValue>(() => {
    return {
      mode,
      setMode(nextMode) {
        setModeState(nextMode)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(THEME_STORAGE_KEY, nextMode)
        }
        applyThemeToDocument(nextMode)
      },
      toggleMode() {
        const nextMode: ThemeMode = mode === "dark" ? "light" : "dark"
        setModeState(nextMode)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(THEME_STORAGE_KEY, nextMode)
        }
        applyThemeToDocument(nextMode)
      },
    }
  }, [mode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeMode() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useThemeMode must be used inside ThemeProvider")
  }

  return context
}
