"use client"

import { type CSSProperties, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { apiFetch } from "@/lib/api"
import { usePreferences } from "@/components/preferences-provider"
import { useToast } from "@/components/toast-provider"
import { buildThemeTokenMap } from "@/lib/theme-tokens"
import {
  BASE_COLOR_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  DEFAULT_PREFERENCES,
  DENSITY_OPTIONS,
  FONT_FAMILY_OPTIONS,
  MOTION_OPTIONS,
  THEME_MODE_OPTIONS,
  THEME_PRESET_OPTIONS,
  THEME_STYLE_OPTIONS,
  type BaseColor,
  type ThemeStyle,
  type UserPreferences,
} from "@/lib/preferences"

const BASE_COLOR_HEX: Record<BaseColor, string> = {
  neutral: "#a8acb3",
  rose: "#d95a7b",
  cyan: "#39a8ba",
  blue: "#4f74cf",
  violet: "#8768cb",
  amber: "#c9973b",
  emerald: "#2d9f7f",
  indigo: "#6670c7",
  orange: "#c77742",
  teal: "#2e9ea0",
  red: "#c95c55",
  pink: "#cc5e96",
  purple: "#9163c6",
  sky: "#5aa5d8",
  lime: "#8faf49",
  green: "#4b9c68",
  yellow: "#c8ab43",
  custom: "#ff2f6d",
}

function readableTextColor(hexColor: string) {
  const raw = hexColor.replace("#", "")
  const expanded = raw.length === 3 ? raw.split("").map((char) => `${char}${char}`).join("") : raw
  const value = Number.parseInt(expanded, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000
  return brightness > 150 ? "#0b0c10" : "#f7f8fa"
}

function normalizeHex(input: string, fallback: string) {
  const candidate = input.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(candidate) ? candidate : fallback
}

function formatLabel(value: string) {
  if (value === "inter") {
    return "Inter (Default)"
  }
  if (value === "system") {
    return "System"
  }
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function SettingsPage() {
  const router = useRouter()
  const { notify } = useToast()
  const { preferences, setPreferences, savePreferences } = usePreferences()
  const [hydrated, setHydrated] = useState(false)
  const [baseline, setBaseline] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [draft, setDraft] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const previewVars = useMemo(() => buildThemeTokenMap(draft), [draft])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline])

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !dirty) {
      setDraft(preferences)
      setBaseline(preferences)
    }
  }, [preferences, dirty, hydrated])

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) {
        return
      }
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [dirty])

  function updateDraft(mutator: (previous: UserPreferences) => UserPreferences) {
    setDraft((previous) => mutator(previous))
  }

  async function saveAll() {
    setSaving(true)
    const result = await savePreferences(draft)
    setSaving(false)
    if (result.ok) {
      setPreferences(draft)
      setBaseline(draft)
      notify("Preferences saved.", "success")
    } else {
      const reason = result.error?.trim() ? ` (${result.error})` : ""
      notify(`Could not sync preferences to backend. Local settings still applied.${reason}`, "error")
    }
  }

  async function logoutFromSettings() {
    setLoggingOut(true)
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Best effort logout.
    } finally {
      notify("Signed out.", "info")
      router.push("/auth")
      setLoggingOut(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="form-stack p-6">
            <CardHeader>
              <CardTitle>Theme</CardTitle>
            </CardHeader>

            <div className="space-y-3 text-sm">
              <p className="control-label mb-0 pl-0 font-medium">Mode</p>
              <div className="grid grid-cols-3 gap-3">
                {THEME_MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`h-11 rounded-[var(--radius-sm)] border px-3 text-sm capitalize transition ${
                      draft.themeMode === mode
                        ? "border-[color-mix(in_srgb,var(--primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] font-semibold"
                        : "border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                    onClick={() => updateDraft((previous) => ({ ...previous, themeMode: mode }))}
                  >
                    {formatLabel(mode)}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-2.5 text-sm">
              <span className="control-label">Component Style</span>
              <Select
                value={draft.themeStyle}
                onChange={(event) => updateDraft((previous) => ({ ...previous, themeStyle: event.target.value as ThemeStyle }))}
              >
                {THEME_STYLE_OPTIONS.map((style) => (
                  <option key={style} value={style}>
                    {formatLabel(style)}
                  </option>
                ))}
              </Select>
            </label>

            <div className="space-y-3 text-sm">
              <span className="control-label mb-0">Base Color</span>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {BASE_COLOR_OPTIONS.map((color) => {
                  const selected = draft.baseColor === color
                  const primaryHex = color === "custom" ? normalizeHex(draft.customPrimaryColor, "#ff2f6d") : BASE_COLOR_HEX[color]
                  const secondaryHex = color === "custom" ? normalizeHex(draft.customSecondaryColor, "#3b82f6") : primaryHex
                  const selectedText = readableTextColor(primaryHex)
                  const isCustom = color === "custom"

                  return (
                    <button
                      key={color}
                      className={`h-11 overflow-hidden rounded-[var(--radius-sm)] border px-3 text-left text-sm font-semibold transition-[border-color,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] ${
                        selected
                          ? "border-[color-mix(in_srgb,var(--ring)_72%,transparent)]"
                          : "border-[var(--input)] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                      }`}
                      type="button"
                      style={{
                        backgroundColor: selected
                          ? (isCustom ? undefined : primaryHex)
                          : "color-mix(in srgb, var(--card) 94%, transparent)",
                        backgroundImage: selected && isCustom
                          ? `linear-gradient(90deg, ${primaryHex} 0%, ${secondaryHex} 100%)`
                          : undefined,
                        color: selected ? selectedText : "var(--foreground)",
                      }}
                      onClick={() => updateDraft((previous) => ({ ...previous, baseColor: color }))}
                    >
                      <span className="flex items-center gap-2">
                        {!selected ? (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: isCustom ? undefined : primaryHex,
                              backgroundImage: isCustom
                                ? `linear-gradient(90deg, ${primaryHex} 0%, ${secondaryHex} 100%)`
                                : undefined,
                            }}
                          />
                        ) : null}
                        <span>{formatLabel(color)}</span>
                        {color === "custom" && !selected ? (
                          <span
                            aria-hidden
                            className="ml-auto h-2 w-7 rounded-full overflow-hidden"
                            style={{
                              backgroundColor: primaryHex,
                              backgroundImage: `linear-gradient(90deg, ${primaryHex} 0%, ${secondaryHex} 100%)`,
                            }}
                          />
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--input)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Accent Pair (Primary + Secondary)</p>
                {draft.baseColor !== "custom" ? (
                  <Button
                    className="h-8 px-2.5 text-xs"
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => updateDraft((previous) => ({ ...previous, baseColor: "custom" }))}
                  >
                    Use Custom
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="pl-0.5">Primary Hex</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="color-full h-10 w-14 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--input)] bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                      value={normalizeHex(draft.customPrimaryColor, "#ff2f6d")}
                      onChange={(event) =>
                        updateDraft((previous) => ({
                          ...previous,
                          baseColor: "custom",
                          customPrimaryColor: normalizeHex(event.target.value, "#ff2f6d"),
                        }))
                      }
                    />
                    <Input
                      className="w-full font-mono text-sm uppercase"
                      value={draft.customPrimaryColor}
                      onChange={(event) =>
                        updateDraft((previous) => ({ ...previous, baseColor: "custom", customPrimaryColor: event.target.value }))
                      }
                      onBlur={() =>
                        updateDraft((previous) => ({
                          ...previous,
                          customPrimaryColor: normalizeHex(previous.customPrimaryColor, "#ff2f6d"),
                        }))
                      }
                    />
                  </div>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="pl-0.5">Secondary Hex</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="color-full h-10 w-14 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--input)] bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
                      value={normalizeHex(draft.customSecondaryColor, "#3b82f6")}
                      onChange={(event) =>
                        updateDraft((previous) => ({
                          ...previous,
                          baseColor: "custom",
                          customSecondaryColor: normalizeHex(event.target.value, "#3b82f6"),
                        }))
                      }
                    />
                    <Input
                      className="w-full font-mono text-sm uppercase"
                      value={draft.customSecondaryColor}
                      onChange={(event) =>
                        updateDraft((previous) => ({ ...previous, baseColor: "custom", customSecondaryColor: event.target.value }))
                      }
                      onBlur={() =>
                        updateDraft((previous) => ({
                          ...previous,
                          customSecondaryColor: normalizeHex(previous.customSecondaryColor, "#3b82f6"),
                        }))
                      }
                    />
                  </div>
                </label>
              </div>
            </div>

            <label className="space-y-2.5 text-sm">
              <span className="control-label">UI Preset</span>
              <Select
                value={draft.themePreset}
                onChange={(event) => updateDraft((previous) => ({ ...previous, themePreset: event.target.value as UserPreferences["themePreset"] }))}
              >
                {THEME_PRESET_OPTIONS.map((preset) => (
                  <option key={preset} value={preset}>
                    {formatLabel(preset)}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-2.5 text-sm">
              <span className="control-label">Button Style</span>
              <Select
                value={draft.buttonStyle}
                onChange={(event) => updateDraft((previous) => ({ ...previous, buttonStyle: event.target.value as UserPreferences["buttonStyle"] }))}
              >
                {BUTTON_STYLE_OPTIONS.map((style) => (
                  <option key={style} value={style}>
                    {formatLabel(style)}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-2.5 text-sm">
              <span className="control-label">Font</span>
              <Select
                value={draft.fontFamily}
                onChange={(event) => updateDraft((previous) => ({ ...previous, fontFamily: event.target.value as UserPreferences["fontFamily"] }))}
              >
                {FONT_FAMILY_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {formatLabel(font)}
                  </option>
                ))}
              </Select>
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-2.5 text-sm">
                <span className="control-label">Motion</span>
                <Select
                  value={draft.motionPreference}
                  onChange={(event) => updateDraft((previous) => ({ ...previous, motionPreference: event.target.value as UserPreferences["motionPreference"] }))}
                >
                {MOTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
                </Select>
              </label>
              <label className="space-y-2.5 text-sm">
                <span className="control-label">Layout Density</span>
                <Select
                  value={draft.layoutDensity}
                  onChange={(event) => updateDraft((previous) => ({ ...previous, layoutDensity: event.target.value as UserPreferences["layoutDensity"] }))}
                >
                {DENSITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
                </Select>
              </label>
            </div>

            <div
              className="settings-preview surface-tint overflow-hidden rounded-[var(--radius)] border border-[var(--input)] p-4 text-[var(--foreground)]"
              style={previewVars as CSSProperties}
              data-button-style={draft.buttonStyle}
            >
              <p className="text-sm font-semibold">Live Theme Preview</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Live example for {formatLabel(draft.themeStyle)} style, {formatLabel(draft.themePreset)} preset, and {formatLabel(draft.baseColor)} accent.
              </p>
              <div className="mt-3 overflow-hidden rounded-xl border border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_95%,transparent)]">
                <div className="h-32 w-full bg-[radial-gradient(circle_at_18%_18%,var(--theme-tint),transparent_48%),radial-gradient(circle_at_82%_18%,var(--theme-tint-secondary),transparent_48%),radial-gradient(circle_at_88%_10%,rgba(255,255,255,0.1),transparent_35%),linear-gradient(140deg,color-mix(in_srgb,var(--primary)_40%,#0f0f12),color-mix(in_srgb,var(--accent-secondary)_34%,#0f0f12),color-mix(in_srgb,var(--card)_92%,#070709))] md:h-36" />
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Detective Console</p>
                    <span className="rounded-full border border-[var(--input)] px-2 py-1 text-[10px] uppercase tracking-[0.14em]">Live</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">IOC command actions and analyst controls preview.</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="btn-primary inline-flex h-8 items-center px-3 text-xs">Primary Action</span>
                    <span className="btn-outline inline-flex h-8 items-center px-3 text-xs">Secondary</span>
                    <span className="btn-outline inline-flex h-8 items-center px-3 text-xs">Outline</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`sticky bottom-3 z-10 rounded-xl border transition-[opacity,transform,padding,height] duration-200 ${
                dirty
                  ? "border-[color-mix(in_srgb,var(--primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--primary)_15%,var(--card))] opacity-100 translate-y-0 p-3"
                  : "pointer-events-none h-0 overflow-hidden border-transparent bg-transparent opacity-0 translate-y-2 p-0"
              }`}
            >
              <p className="text-sm font-semibold">Save theme changes?</p>
              <p className="text-xs text-[var(--muted-foreground)]">Your live preview is unsaved. Apply to update the full workspace.</p>
              <div className="mt-3 flex items-center gap-2">
                <Button className="h-9 px-3 text-sm" onClick={saveAll} disabled={saving} size="sm" type="button">
                  {saving ? "Applying..." : "Save Changes"}
                </Button>
                <Button
                  className="h-9 px-3 text-sm"
                  type="button"
                  disabled={saving}
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft(baseline)}
                >
                  Discard
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="space-y-3 p-6">
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your active session from this page. Two-factor authentication is managed from Profile.
              </CardDescription>
              <Button className="h-10 px-4 text-sm" type="button" variant="outline" onClick={logoutFromSettings} disabled={loggingOut}>
                Logout
              </Button>
            </Card>
          </div>
    </div>
  )
}
