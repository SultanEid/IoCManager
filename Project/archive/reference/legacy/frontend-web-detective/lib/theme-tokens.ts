import type { BaseColor, ThemePreset, ThemeStyle, UserPreferences } from "@/lib/preferences"

type ModeKey = "light" | "dark"

type CoreTokens = {
  background: string
  foreground: string
  card: string
  border: string
  muted: string
  "muted-foreground": string
  input: string
  ring: string
}

type AccentTokens = {
  primary: string
  "primary-foreground": string
  ring: string
  "chart-1": string
  "chart-2": string
  "chart-3": string
  "chart-4": string
  "chart-5": string
  "theme-tint": string
}

type TokenPair<T> = {
  light: T
  dark: T
}

const STYLE_PROFILE_VARS: Record<ThemeStyle, Record<string, string>> = {
  default: {
    "--radius": "14px",
    "--radius-sm": "10px",
    "--surface-mix": "89%",
    "--table-cell-py": "0.75rem",
    "--control-h": "2.75rem",
    "--shadow-card": "0 0 0 1px rgba(255,255,255,0.03), 0 12px 34px rgba(0,0,0,0.35)",
  },
  "new-york": {
    "--radius": "10px",
    "--radius-sm": "8px",
    "--surface-mix": "93%",
    "--table-cell-py": "0.72rem",
    "--control-h": "2.65rem",
    "--shadow-card": "0 0 0 1px rgba(255,255,255,0.022), 0 10px 24px rgba(0,0,0,0.28)",
  },
  vega: {
    "--radius": "8px",
    "--radius-sm": "7px",
    "--surface-mix": "90%",
    "--table-cell-py": "0.75rem",
    "--control-h": "2.75rem",
    "--shadow-card": "0 0 0 1px rgba(255,255,255,0.03), 0 10px 28px rgba(0,0,0,0.32)",
  },
  nova: {
    "--radius": "10px",
    "--radius-sm": "8px",
    "--surface-mix": "91%",
    "--table-cell-py": "0.62rem",
    "--control-h": "2.4rem",
    "--shadow-card": "0 0 0 1px rgba(255,255,255,0.024), 0 8px 20px rgba(0,0,0,0.3)",
  },
  maia: {
    "--radius": "22px",
    "--radius-sm": "999px",
    "--surface-mix": "88%",
    "--table-cell-py": "0.88rem",
    "--control-h": "2.85rem",
    "--shadow-card": "0 0 0 1px rgba(255,255,255,0.026), 0 14px 36px rgba(0,0,0,0.32)",
  },
  lyra: {
    "--radius": "0px",
    "--radius-sm": "0px",
    "--surface-mix": "94%",
    "--table-cell-py": "0.54rem",
    "--control-h": "2.25rem",
    "--shadow-card": "0 0 0 1px rgba(255,255,255,0.02), 0 6px 14px rgba(0,0,0,0.26)",
  },
  mira: {
    "--radius": "12px",
    "--radius-sm": "8px",
    "--surface-mix": "92%",
    "--table-cell-py": "0.58rem",
    "--control-h": "2.35rem",
    "--shadow-card": "0 0 0 1px rgba(255,255,255,0.022), 0 8px 18px rgba(0,0,0,0.3)",
  },
}

const BASE_PRESET_TOKENS: Record<ThemePreset, TokenPair<CoreTokens>> = {
  neutral: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      card: "oklch(1 0 0)",
      border: "oklch(0.922 0 0)",
      muted: "oklch(0.97 0 0)",
      "muted-foreground": "oklch(0.556 0 0)",
      input: "oklch(0.922 0 0)",
      ring: "oklch(0.708 0 0)",
    },
    dark: {
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.205 0 0)",
      border: "oklch(1 0 0 / 10%)",
      muted: "oklch(0.269 0 0)",
      "muted-foreground": "oklch(0.708 0 0)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.556 0 0)",
    },
  },
  stone: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.147 0.004 49.25)",
      card: "oklch(1 0 0)",
      border: "oklch(0.923 0.003 48.717)",
      muted: "oklch(0.97 0.001 106.424)",
      "muted-foreground": "oklch(0.553 0.013 58.071)",
      input: "oklch(0.923 0.003 48.717)",
      ring: "oklch(0.709 0.01 56.259)",
    },
    dark: {
      background: "oklch(0.147 0.004 49.25)",
      foreground: "oklch(0.985 0.001 106.423)",
      card: "oklch(0.216 0.006 56.043)",
      border: "oklch(1 0 0 / 10%)",
      muted: "oklch(0.268 0.007 34.298)",
      "muted-foreground": "oklch(0.709 0.01 56.259)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.553 0.013 58.071)",
    },
  },
  zinc: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.141 0.005 285.823)",
      card: "oklch(1 0 0)",
      border: "oklch(0.92 0.004 286.32)",
      muted: "oklch(0.967 0.001 286.375)",
      "muted-foreground": "oklch(0.552 0.016 285.938)",
      input: "oklch(0.92 0.004 286.32)",
      ring: "oklch(0.705 0.015 286.067)",
    },
    dark: {
      background: "oklch(0.141 0.005 285.823)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.21 0.006 285.885)",
      border: "oklch(1 0 0 / 10%)",
      muted: "oklch(0.274 0.006 286.033)",
      "muted-foreground": "oklch(0.705 0.015 286.067)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.552 0.016 285.938)",
    },
  },
  mauve: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0.008 326)",
      card: "oklch(1 0 0)",
      border: "oklch(0.922 0.005 325.62)",
      muted: "oklch(0.96 0.003 325.6)",
      "muted-foreground": "oklch(0.542 0.034 322.5)",
      input: "oklch(0.922 0.005 325.62)",
      ring: "oklch(0.711 0.019 323.02)",
    },
    dark: {
      background: "oklch(0.145 0.008 326)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.212 0.019 322.12)",
      border: "oklch(1 0 0 / 10%)",
      muted: "oklch(0.263 0.024 320.12)",
      "muted-foreground": "oklch(0.711 0.019 323.02)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.542 0.034 322.5)",
    },
  },
  olive: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.153 0.006 107.1)",
      card: "oklch(1 0 0)",
      border: "oklch(0.93 0.007 106.5)",
      muted: "oklch(0.966 0.005 106.5)",
      "muted-foreground": "oklch(0.58 0.031 107.3)",
      input: "oklch(0.93 0.007 106.5)",
      ring: "oklch(0.737 0.021 106.9)",
    },
    dark: {
      background: "oklch(0.153 0.006 107.1)",
      foreground: "oklch(0.988 0.003 106.5)",
      card: "oklch(0.228 0.013 107.4)",
      border: "oklch(1 0 0 / 10%)",
      muted: "oklch(0.286 0.016 107.4)",
      "muted-foreground": "oklch(0.737 0.021 106.9)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.58 0.031 107.3)",
    },
  },
  mist: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.148 0.004 228.8)",
      card: "oklch(1 0 0)",
      border: "oklch(0.925 0.005 214.3)",
      muted: "oklch(0.963 0.002 197.1)",
      "muted-foreground": "oklch(0.56 0.021 213.5)",
      input: "oklch(0.925 0.005 214.3)",
      ring: "oklch(0.723 0.014 214.4)",
    },
    dark: {
      background: "oklch(0.148 0.004 228.8)",
      foreground: "oklch(0.987 0.002 197.1)",
      card: "oklch(0.218 0.008 223.9)",
      border: "oklch(1 0 0 / 10%)",
      muted: "oklch(0.275 0.011 216.9)",
      "muted-foreground": "oklch(0.723 0.014 214.4)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.56 0.021 213.5)",
    },
  },
  taupe: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.147 0.004 49.3)",
      card: "oklch(1 0 0)",
      border: "oklch(0.926 0.003 48.717)",
      muted: "oklch(0.96 0.002 17.2)",
      "muted-foreground": "oklch(0.547 0.021 43.1)",
      input: "oklch(0.926 0.003 48.717)",
      ring: "oklch(0.702 0.013 56.259)",
    },
    dark: {
      background: "oklch(0.147 0.004 49.3)",
      foreground: "oklch(0.986 0.002 67.8)",
      card: "oklch(0.214 0.009 43.1)",
      border: "oklch(1 0 0 / 10%)",
      muted: "oklch(0.27 0.01 43.1)",
      "muted-foreground": "oklch(0.702 0.013 56.259)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.547 0.021 43.1)",
    },
  },
  // Compatibility alias.
  slate: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.208 0.042 265.755)",
      card: "oklch(1 0 0)",
      border: "oklch(0.929 0.013 255.508)",
      muted: "oklch(0.968 0.007 247.896)",
      "muted-foreground": "oklch(0.554 0.046 257.417)",
      input: "oklch(0.929 0.013 255.508)",
      ring: "oklch(0.704 0.04 256.788)",
    },
    dark: {
      background: "oklch(0.208 0.042 265.755)",
      foreground: "oklch(0.984 0.003 247.858)",
      card: "oklch(0.279 0.041 260.031)",
      border: "oklch(1 0 0 / 10%)",
      muted: "oklch(0.279 0.041 260.031)",
      "muted-foreground": "oklch(0.704 0.04 256.788)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.551 0.027 264.364)",
    },
  },
}

const PRESET_GRADIENTS: Record<ThemePreset, { a: string; b: string }> = {
  neutral: { a: "rgba(255,255,255,0.065)", b: "rgba(255,255,255,0.025)" },
  stone: { a: "rgba(206,182,155,0.1)", b: "rgba(206,182,155,0.04)" },
  zinc: { a: "rgba(181,181,181,0.1)", b: "rgba(181,181,181,0.045)" },
  mauve: { a: "rgba(198,164,215,0.1)", b: "rgba(198,164,215,0.045)" },
  olive: { a: "rgba(190,212,159,0.1)", b: "rgba(190,212,159,0.045)" },
  mist: { a: "rgba(167,197,220,0.1)", b: "rgba(167,197,220,0.045)" },
  taupe: { a: "rgba(197,176,154,0.1)", b: "rgba(197,176,154,0.045)" },
  slate: { a: "rgba(133,167,255,0.1)", b: "rgba(133,167,255,0.045)" },
}

const ACCENT_TOKENS: Record<Exclude<BaseColor, "custom">, TokenPair<AccentTokens>> = {
  neutral: {
    light: {
      primary: "oklch(0.205 0 0)",
      "primary-foreground": "oklch(0.985 0 0)",
      ring: "oklch(0.708 0 0)",
      "chart-1": "oklch(0.809 0.105 251.813)",
      "chart-2": "oklch(0.623 0.214 259.815)",
      "chart-3": "oklch(0.546 0.245 262.881)",
      "chart-4": "oklch(0.488 0.243 264.376)",
      "chart-5": "oklch(0.424 0.199 265.638)",
      "theme-tint": "rgba(255,255,255,0.034)",
    },
    dark: {
      primary: "oklch(0.87 0 0)",
      "primary-foreground": "oklch(0.205 0 0)",
      ring: "oklch(0.556 0 0)",
      "chart-1": "oklch(0.809 0.105 251.813)",
      "chart-2": "oklch(0.623 0.214 259.815)",
      "chart-3": "oklch(0.546 0.245 262.881)",
      "chart-4": "oklch(0.488 0.243 264.376)",
      "chart-5": "oklch(0.424 0.199 265.638)",
      "theme-tint": "rgba(255,255,255,0.034)",
    },
  },
  rose: {
    light: {
      primary: "oklch(0.514 0.222 16.935)",
      "primary-foreground": "oklch(0.969 0.015 12.422)",
      ring: "oklch(0.514 0.222 16.935)",
      "chart-1": "oklch(0.81 0.117 11.638)",
      "chart-2": "oklch(0.645 0.246 16.439)",
      "chart-3": "oklch(0.586 0.253 17.585)",
      "chart-4": "oklch(0.514 0.222 16.935)",
      "chart-5": "oklch(0.455 0.188 13.697)",
      "theme-tint": "rgba(255,47,109,0.13)",
    },
    dark: {
      primary: "oklch(0.455 0.188 13.697)",
      "primary-foreground": "oklch(0.969 0.015 12.422)",
      ring: "oklch(0.455 0.188 13.697)",
      "chart-1": "oklch(0.81 0.117 11.638)",
      "chart-2": "oklch(0.645 0.246 16.439)",
      "chart-3": "oklch(0.586 0.253 17.585)",
      "chart-4": "oklch(0.514 0.222 16.935)",
      "chart-5": "oklch(0.455 0.188 13.697)",
      "theme-tint": "rgba(255,47,109,0.13)",
    },
  },
  cyan: {
    light: {
      primary: "oklch(0.52 0.105 223.128)",
      "primary-foreground": "oklch(0.984 0.019 200.873)",
      ring: "oklch(0.52 0.105 223.128)",
      "chart-1": "oklch(0.865 0.127 207.078)",
      "chart-2": "oklch(0.715 0.143 215.221)",
      "chart-3": "oklch(0.609 0.126 221.723)",
      "chart-4": "oklch(0.52 0.105 223.128)",
      "chart-5": "oklch(0.45 0.085 224.283)",
      "theme-tint": "rgba(61,215,231,0.13)",
    },
    dark: {
      primary: "oklch(0.45 0.085 224.283)",
      "primary-foreground": "oklch(0.984 0.019 200.873)",
      ring: "oklch(0.45 0.085 224.283)",
      "chart-1": "oklch(0.865 0.127 207.078)",
      "chart-2": "oklch(0.715 0.143 215.221)",
      "chart-3": "oklch(0.609 0.126 221.723)",
      "chart-4": "oklch(0.52 0.105 223.128)",
      "chart-5": "oklch(0.45 0.085 224.283)",
      "theme-tint": "rgba(61,215,231,0.13)",
    },
  },
  blue: {
    light: {
      primary: "oklch(0.546 0.245 262.881)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      ring: "oklch(0.746 0.16 232.661)",
      "chart-1": "oklch(0.809 0.105 251.813)",
      "chart-2": "oklch(0.623 0.214 259.815)",
      "chart-3": "oklch(0.546 0.245 262.881)",
      "chart-4": "oklch(0.488 0.243 264.376)",
      "chart-5": "oklch(0.424 0.199 265.638)",
      "theme-tint": "rgba(47,116,255,0.12)",
    },
    dark: {
      primary: "oklch(0.707 0.165 254.624)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      ring: "oklch(0.707 0.165 254.624)",
      "chart-1": "oklch(0.809 0.105 251.813)",
      "chart-2": "oklch(0.623 0.214 259.815)",
      "chart-3": "oklch(0.546 0.245 262.881)",
      "chart-4": "oklch(0.488 0.243 264.376)",
      "chart-5": "oklch(0.424 0.199 265.638)",
      "theme-tint": "rgba(47,116,255,0.12)",
    },
  },
  violet: {
    light: {
      primary: "oklch(0.491 0.27 292.581)",
      "primary-foreground": "oklch(0.969 0.016 293.756)",
      ring: "oklch(0.491 0.27 292.581)",
      "chart-1": "oklch(0.811 0.111 293.571)",
      "chart-2": "oklch(0.606 0.25 292.717)",
      "chart-3": "oklch(0.541 0.281 293.009)",
      "chart-4": "oklch(0.491 0.27 292.581)",
      "chart-5": "oklch(0.432 0.232 292.759)",
      "theme-tint": "rgba(159,100,255,0.13)",
    },
    dark: {
      primary: "oklch(0.432 0.232 292.759)",
      "primary-foreground": "oklch(0.969 0.016 293.756)",
      ring: "oklch(0.432 0.232 292.759)",
      "chart-1": "oklch(0.811 0.111 293.571)",
      "chart-2": "oklch(0.606 0.25 292.717)",
      "chart-3": "oklch(0.541 0.281 293.009)",
      "chart-4": "oklch(0.491 0.27 292.581)",
      "chart-5": "oklch(0.432 0.232 292.759)",
      "theme-tint": "rgba(159,100,255,0.13)",
    },
  },
  amber: {
    light: {
      primary: "oklch(0.852 0.199 91.936)",
      "primary-foreground": "oklch(0.421 0.095 57.708)",
      ring: "oklch(0.852 0.199 91.936)",
      "chart-1": "oklch(0.905 0.182 98.111)",
      "chart-2": "oklch(0.795 0.184 86.047)",
      "chart-3": "oklch(0.681 0.162 75.834)",
      "chart-4": "oklch(0.554 0.135 66.442)",
      "chart-5": "oklch(0.476 0.114 61.907)",
      "theme-tint": "rgba(245,158,11,0.13)",
    },
    dark: {
      primary: "oklch(0.795 0.184 86.047)",
      "primary-foreground": "oklch(0.421 0.095 57.708)",
      ring: "oklch(0.795 0.184 86.047)",
      "chart-1": "oklch(0.905 0.182 98.111)",
      "chart-2": "oklch(0.795 0.184 86.047)",
      "chart-3": "oklch(0.681 0.162 75.834)",
      "chart-4": "oklch(0.554 0.135 66.442)",
      "chart-5": "oklch(0.476 0.114 61.907)",
      "theme-tint": "rgba(245,158,11,0.13)",
    },
  },
  emerald: {
    light: {
      primary: "oklch(0.508 0.118 165.612)",
      "primary-foreground": "oklch(0.979 0.021 166.113)",
      ring: "oklch(0.508 0.118 165.612)",
      "chart-1": "oklch(0.845 0.143 164.978)",
      "chart-2": "oklch(0.696 0.17 162.48)",
      "chart-3": "oklch(0.596 0.145 163.225)",
      "chart-4": "oklch(0.508 0.118 165.612)",
      "chart-5": "oklch(0.432 0.095 166.913)",
      "theme-tint": "rgba(40,199,144,0.13)",
    },
    dark: {
      primary: "oklch(0.432 0.095 166.913)",
      "primary-foreground": "oklch(0.979 0.021 166.113)",
      ring: "oklch(0.432 0.095 166.913)",
      "chart-1": "oklch(0.845 0.143 164.978)",
      "chart-2": "oklch(0.696 0.17 162.48)",
      "chart-3": "oklch(0.596 0.145 163.225)",
      "chart-4": "oklch(0.508 0.118 165.612)",
      "chart-5": "oklch(0.432 0.095 166.913)",
      "theme-tint": "rgba(40,199,144,0.13)",
    },
  },
  indigo: {
    light: {
      primary: "oklch(0.457 0.24 277.023)",
      "primary-foreground": "oklch(0.962 0.018 272.314)",
      ring: "oklch(0.457 0.24 277.023)",
      "chart-1": "oklch(0.785 0.115 274.713)",
      "chart-2": "oklch(0.585 0.233 277.117)",
      "chart-3": "oklch(0.511 0.262 276.966)",
      "chart-4": "oklch(0.457 0.24 277.023)",
      "chart-5": "oklch(0.398 0.195 277.366)",
      "theme-tint": "rgba(93,102,255,0.13)",
    },
    dark: {
      primary: "oklch(0.398 0.195 277.366)",
      "primary-foreground": "oklch(0.962 0.018 272.314)",
      ring: "oklch(0.398 0.195 277.366)",
      "chart-1": "oklch(0.785 0.115 274.713)",
      "chart-2": "oklch(0.585 0.233 277.117)",
      "chart-3": "oklch(0.511 0.262 276.966)",
      "chart-4": "oklch(0.457 0.24 277.023)",
      "chart-5": "oklch(0.398 0.195 277.366)",
      "theme-tint": "rgba(93,102,255,0.13)",
    },
  },
  orange: {
    light: {
      primary: "oklch(0.553 0.195 38.402)",
      "primary-foreground": "oklch(0.98 0.016 73.684)",
      ring: "oklch(0.553 0.195 38.402)",
      "chart-1": "oklch(0.837 0.128 66.29)",
      "chart-2": "oklch(0.705 0.213 47.604)",
      "chart-3": "oklch(0.646 0.222 41.116)",
      "chart-4": "oklch(0.553 0.195 38.402)",
      "chart-5": "oklch(0.47 0.157 37.304)",
      "theme-tint": "rgba(245,124,37,0.13)",
    },
    dark: {
      primary: "oklch(0.47 0.157 37.304)",
      "primary-foreground": "oklch(0.98 0.016 73.684)",
      ring: "oklch(0.47 0.157 37.304)",
      "chart-1": "oklch(0.837 0.128 66.29)",
      "chart-2": "oklch(0.705 0.213 47.604)",
      "chart-3": "oklch(0.646 0.222 41.116)",
      "chart-4": "oklch(0.553 0.195 38.402)",
      "chart-5": "oklch(0.47 0.157 37.304)",
      "theme-tint": "rgba(245,124,37,0.13)",
    },
  },
  teal: {
    light: {
      primary: "oklch(0.511 0.096 186.391)",
      "primary-foreground": "oklch(0.984 0.014 180.72)",
      ring: "oklch(0.511 0.096 186.391)",
      "chart-1": "oklch(0.855 0.138 181.071)",
      "chart-2": "oklch(0.704 0.14 182.503)",
      "chart-3": "oklch(0.6 0.118 184.704)",
      "chart-4": "oklch(0.511 0.096 186.391)",
      "chart-5": "oklch(0.437 0.078 188.216)",
      "theme-tint": "rgba(25,180,168,0.12)",
    },
    dark: {
      primary: "oklch(0.437 0.078 188.216)",
      "primary-foreground": "oklch(0.984 0.014 180.72)",
      ring: "oklch(0.437 0.078 188.216)",
      "chart-1": "oklch(0.855 0.138 181.071)",
      "chart-2": "oklch(0.704 0.14 182.503)",
      "chart-3": "oklch(0.6 0.118 184.704)",
      "chart-4": "oklch(0.511 0.096 186.391)",
      "chart-5": "oklch(0.437 0.078 188.216)",
      "theme-tint": "rgba(25,180,168,0.12)",
    },
  },
  red: {
    light: {
      primary: "oklch(0.505 0.213 27.518)",
      "primary-foreground": "oklch(0.971 0.013 17.38)",
      ring: "oklch(0.505 0.213 27.518)",
      "chart-1": "oklch(0.808 0.114 19.571)",
      "chart-2": "oklch(0.637 0.237 25.331)",
      "chart-3": "oklch(0.577 0.245 27.325)",
      "chart-4": "oklch(0.505 0.213 27.518)",
      "chart-5": "oklch(0.444 0.177 26.899)",
      "theme-tint": "rgba(237,68,68,0.13)",
    },
    dark: {
      primary: "oklch(0.444 0.177 26.899)",
      "primary-foreground": "oklch(0.971 0.013 17.38)",
      ring: "oklch(0.444 0.177 26.899)",
      "chart-1": "oklch(0.808 0.114 19.571)",
      "chart-2": "oklch(0.637 0.237 25.331)",
      "chart-3": "oklch(0.577 0.245 27.325)",
      "chart-4": "oklch(0.505 0.213 27.518)",
      "chart-5": "oklch(0.444 0.177 26.899)",
      "theme-tint": "rgba(237,68,68,0.13)",
    },
  },
  pink: {
    light: {
      primary: "oklch(0.525 0.223 3.958)",
      "primary-foreground": "oklch(0.971 0.014 343.198)",
      ring: "oklch(0.525 0.223 3.958)",
      "chart-1": "oklch(0.823 0.12 346.018)",
      "chart-2": "oklch(0.656 0.241 354.308)",
      "chart-3": "oklch(0.592 0.249 0.584)",
      "chart-4": "oklch(0.525 0.223 3.958)",
      "chart-5": "oklch(0.459 0.187 3.815)",
      "theme-tint": "rgba(236,72,153,0.13)",
    },
    dark: {
      primary: "oklch(0.459 0.187 3.815)",
      "primary-foreground": "oklch(0.971 0.014 343.198)",
      ring: "oklch(0.459 0.187 3.815)",
      "chart-1": "oklch(0.823 0.12 346.018)",
      "chart-2": "oklch(0.656 0.241 354.308)",
      "chart-3": "oklch(0.592 0.249 0.584)",
      "chart-4": "oklch(0.525 0.223 3.958)",
      "chart-5": "oklch(0.459 0.187 3.815)",
      "theme-tint": "rgba(236,72,153,0.13)",
    },
  },
  purple: {
    light: {
      primary: "oklch(0.496 0.265 301.924)",
      "primary-foreground": "oklch(0.977 0.014 308.299)",
      ring: "oklch(0.496 0.265 301.924)",
      "chart-1": "oklch(0.827 0.119 306.383)",
      "chart-2": "oklch(0.627 0.265 303.9)",
      "chart-3": "oklch(0.558 0.288 302.321)",
      "chart-4": "oklch(0.496 0.265 301.924)",
      "chart-5": "oklch(0.438 0.218 303.724)",
      "theme-tint": "rgba(168,85,247,0.13)",
    },
    dark: {
      primary: "oklch(0.438 0.218 303.724)",
      "primary-foreground": "oklch(0.977 0.014 308.299)",
      ring: "oklch(0.438 0.218 303.724)",
      "chart-1": "oklch(0.827 0.119 306.383)",
      "chart-2": "oklch(0.627 0.265 303.9)",
      "chart-3": "oklch(0.558 0.288 302.321)",
      "chart-4": "oklch(0.496 0.265 301.924)",
      "chart-5": "oklch(0.438 0.218 303.724)",
      "theme-tint": "rgba(168,85,247,0.13)",
    },
  },
  sky: {
    light: {
      primary: "oklch(0.5 0.134 242.749)",
      "primary-foreground": "oklch(0.977 0.013 236.62)",
      ring: "oklch(0.5 0.134 242.749)",
      "chart-1": "oklch(0.828 0.111 230.318)",
      "chart-2": "oklch(0.685 0.169 237.323)",
      "chart-3": "oklch(0.588 0.158 241.966)",
      "chart-4": "oklch(0.5 0.134 242.749)",
      "chart-5": "oklch(0.443 0.11 240.79)",
      "theme-tint": "rgba(56,189,248,0.13)",
    },
    dark: {
      primary: "oklch(0.443 0.11 240.79)",
      "primary-foreground": "oklch(0.977 0.013 236.62)",
      ring: "oklch(0.443 0.11 240.79)",
      "chart-1": "oklch(0.828 0.111 230.318)",
      "chart-2": "oklch(0.685 0.169 237.323)",
      "chart-3": "oklch(0.588 0.158 241.966)",
      "chart-4": "oklch(0.5 0.134 242.749)",
      "chart-5": "oklch(0.443 0.11 240.79)",
      "theme-tint": "rgba(56,189,248,0.13)",
    },
  },
  lime: {
    light: {
      primary: "oklch(0.532 0.157 131.589)",
      "primary-foreground": "oklch(0.986 0.031 120.757)",
      ring: "oklch(0.532 0.157 131.589)",
      "chart-1": "oklch(0.897 0.196 126.665)",
      "chart-2": "oklch(0.768 0.233 130.85)",
      "chart-3": "oklch(0.648 0.2 131.684)",
      "chart-4": "oklch(0.532 0.157 131.589)",
      "chart-5": "oklch(0.453 0.124 130.933)",
      "theme-tint": "rgba(132,204,22,0.13)",
    },
    dark: {
      primary: "oklch(0.453 0.124 130.933)",
      "primary-foreground": "oklch(0.986 0.031 120.757)",
      ring: "oklch(0.453 0.124 130.933)",
      "chart-1": "oklch(0.897 0.196 126.665)",
      "chart-2": "oklch(0.768 0.233 130.85)",
      "chart-3": "oklch(0.648 0.2 131.684)",
      "chart-4": "oklch(0.532 0.157 131.589)",
      "chart-5": "oklch(0.453 0.124 130.933)",
      "theme-tint": "rgba(132,204,22,0.13)",
    },
  },
  green: {
    light: {
      primary: "oklch(0.532 0.157 131.589)",
      "primary-foreground": "oklch(0.986 0.031 120.757)",
      ring: "oklch(0.532 0.157 131.589)",
      "chart-1": "oklch(0.871 0.15 154.449)",
      "chart-2": "oklch(0.723 0.219 149.579)",
      "chart-3": "oklch(0.627 0.194 149.214)",
      "chart-4": "oklch(0.527 0.154 150.069)",
      "chart-5": "oklch(0.448 0.119 151.328)",
      "theme-tint": "rgba(34,197,94,0.13)",
    },
    dark: {
      primary: "oklch(0.453 0.124 130.933)",
      "primary-foreground": "oklch(0.986 0.031 120.757)",
      ring: "oklch(0.453 0.124 130.933)",
      "chart-1": "oklch(0.871 0.15 154.449)",
      "chart-2": "oklch(0.723 0.219 149.579)",
      "chart-3": "oklch(0.627 0.194 149.214)",
      "chart-4": "oklch(0.527 0.154 150.069)",
      "chart-5": "oklch(0.448 0.119 151.328)",
      "theme-tint": "rgba(34,197,94,0.13)",
    },
  },
  yellow: {
    light: {
      primary: "oklch(0.852 0.199 91.936)",
      "primary-foreground": "oklch(0.421 0.095 57.708)",
      ring: "oklch(0.852 0.199 91.936)",
      "chart-1": "oklch(0.905 0.182 98.111)",
      "chart-2": "oklch(0.795 0.184 86.047)",
      "chart-3": "oklch(0.681 0.162 75.834)",
      "chart-4": "oklch(0.554 0.135 66.442)",
      "chart-5": "oklch(0.476 0.114 61.907)",
      "theme-tint": "rgba(234,179,8,0.13)",
    },
    dark: {
      primary: "oklch(0.795 0.184 86.047)",
      "primary-foreground": "oklch(0.421 0.095 57.708)",
      ring: "oklch(0.795 0.184 86.047)",
      "chart-1": "oklch(0.905 0.182 98.111)",
      "chart-2": "oklch(0.795 0.184 86.047)",
      "chart-3": "oklch(0.681 0.162 75.834)",
      "chart-4": "oklch(0.554 0.135 66.442)",
      "chart-5": "oklch(0.476 0.114 61.907)",
      "theme-tint": "rgba(234,179,8,0.13)",
    },
  },
}

function sanitizeHex(input: string, fallback: string) {
  const value = input.trim()
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

function readableOn(hex: string) {
  const parsed = Number.parseInt(hex.slice(1), 16)
  const red = (parsed >> 16) & 255
  const green = (parsed >> 8) & 255
  const blue = parsed & 255
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000
  return brightness > 150 ? "#111214" : "#f5f6f9"
}

function buildCustomAccent(preferences: UserPreferences): TokenPair<AccentTokens> {
  const primary = sanitizeHex(preferences.customPrimaryColor, "#ff2f6d")
  const secondary = sanitizeHex(preferences.customSecondaryColor, "#3b82f6")
  return {
    light: {
      primary,
      "primary-foreground": readableOn(primary),
      ring: `color-mix(in srgb, ${primary} 74%, #ffffff)`,
      "chart-1": `color-mix(in srgb, ${primary} 72%, #ffffff)`,
      "chart-2": `color-mix(in srgb, ${secondary} 72%, #ffffff)`,
      "chart-3": primary,
      "chart-4": secondary,
      "chart-5": `color-mix(in srgb, ${secondary} 65%, #000000)`,
      "theme-tint": `color-mix(in srgb, ${primary} 18%, transparent)`,
    },
    dark: {
      primary,
      "primary-foreground": readableOn(primary),
      ring: `color-mix(in srgb, ${primary} 72%, #ffffff)`,
      "chart-1": `color-mix(in srgb, ${primary} 70%, #ffffff)`,
      "chart-2": `color-mix(in srgb, ${secondary} 70%, #ffffff)`,
      "chart-3": primary,
      "chart-4": secondary,
      "chart-5": `color-mix(in srgb, ${secondary} 68%, #000000)`,
      "theme-tint": `color-mix(in srgb, ${primary} 16%, transparent)`,
    },
  }
}

function buildTint(color: string, mode: ModeKey) {
  const strength = mode === "light" ? 16 : 13
  return `color-mix(in srgb, ${color} ${strength}%, transparent)`
}

export function buildThemeTokenMap(preferences: UserPreferences): Record<string, string> {
  const tone: ModeKey = preferences.themeMode === "light" ? "light" : "dark"
  const styleVars = STYLE_PROFILE_VARS[preferences.themeStyle] ?? STYLE_PROFILE_VARS.default
  const preset = BASE_PRESET_TOKENS[preferences.themePreset] ?? BASE_PRESET_TOKENS.neutral
  const accent =
    preferences.baseColor === "custom"
      ? buildCustomAccent(preferences)
      : ACCENT_TOKENS[preferences.baseColor] ?? ACCENT_TOKENS.neutral
  const gradients = PRESET_GRADIENTS[preferences.themePreset] ?? PRESET_GRADIENTS.neutral
  const map: Record<string, string> = {}

  for (const [key, value] of Object.entries(styleVars)) {
    map[key] = value
  }

  for (const [key, value] of Object.entries(preset[tone])) {
    map[`--${key}`] = value
  }

  for (const [key, value] of Object.entries(accent[tone])) {
    map[`--${key}`] = value
  }

  const primaryAccent =
    preferences.baseColor === "custom"
      ? sanitizeHex(preferences.customPrimaryColor, "#ff2f6d")
      : accent[tone].primary

  const secondaryAccent =
    preferences.baseColor === "custom"
      ? sanitizeHex(preferences.customSecondaryColor, "#3b82f6")
      : accent[tone].primary

  map["--accent-secondary"] = secondaryAccent
  map["--theme-tint"] = buildTint(primaryAccent, tone)
  map["--theme-tint-secondary"] = buildTint(secondaryAccent, tone)

  map["--app-gradient-a"] = gradients.a
  map["--app-gradient-b"] = gradients.b

  if (preferences.themeMode === "gray") {
    map["--background"] = `color-mix(in oklab, ${preset.dark.background} 28%, #17181d)`
    map["--card"] = `color-mix(in oklab, ${preset.dark.card} 30%, #1f2025)`
    map["--muted"] = `color-mix(in oklab, ${preset.dark.muted} 34%, #2a2c34)`
    map["--muted-foreground"] = `color-mix(in oklab, ${preset.dark["muted-foreground"]} 75%, #b1b3ba)`
    map["--border"] = `color-mix(in oklab, ${preset.dark.border} 70%, rgba(255,255,255,0.14))`
    map["--input"] = `color-mix(in oklab, ${preset.dark.input} 70%, rgba(255,255,255,0.2))`
    map["--foreground"] = `color-mix(in oklab, ${preset.dark.foreground} 88%, #ececef)`
  }

  return map
}

export function applyThemeTokens(root: HTMLElement, preferences: UserPreferences) {
  const tokens = buildThemeTokenMap(preferences)
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value)
  }
}
