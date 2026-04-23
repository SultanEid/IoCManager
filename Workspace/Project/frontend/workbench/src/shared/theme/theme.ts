export const THEME_STORAGE_KEY = "ioc.manager.theme"

export const THEME_VALUES = ["dark", "light"] as const

export type ThemeMode = (typeof THEME_VALUES)[number]

export const DEFAULT_THEME_MODE: ThemeMode = "dark"

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "dark" || value === "light"
}

