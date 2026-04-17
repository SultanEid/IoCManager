"use client"

import { useEffect, useState } from "react"
import { usePreferences } from "@/components/preferences-provider"
import { useToast } from "@/components/toast-provider"
import { apiFetch } from "@/lib/api"
import { type UserPreferences } from "@/lib/preferences"

type CustomizerState = {
  style: string
  base: string
  baseColor: string
  theme: string
  iconLibrary: string
  font: string
  radius: string
  menuColor: string
  menuAccent: string
}

export default function CustomizerPage() {
  const { preferences, setPreferences, savePreferences } = usePreferences()
  const { notify } = useToast()
  const [state, setState] = useState<CustomizerState>({
    style: "Mira",
    base: "Radix UI",
    baseColor: "Taupe",
    theme: "Blue",
    iconLibrary: "Tabler Icons",
    font: "Inter",
    radius: "Small",
    menuColor: "Default",
    menuAccent: "Subtle",
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const response = await apiFetch<CustomizerState>("/api/customizer/state")
        if (mounted) {
          setState(response)
        }
      } catch {
        // Keep seeded defaults in UI.
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const menuItems: Array<[string, string]> = [
    ["Base", state.base],
    ["Style", state.style],
    ["Base Color", state.baseColor],
    ["Theme", state.theme],
    ["Icon Library", state.iconLibrary],
    ["Font", state.font],
    ["Radius", state.radius],
    ["Menu Color", state.menuColor],
    ["Menu Accent", state.menuAccent],
  ]
  const styleLabel = `${preferences.themeStyle.charAt(0).toUpperCase()}${preferences.themeStyle.slice(1)}`

  async function applyProfile(
    profile: "neutral-default" | "rose-default" | "cyan-new-york" | "mira-teal" | "maia-orange"
  ) {
    const next: UserPreferences =
      profile === "neutral-default"
        ? { ...preferences, themeStyle: "default", baseColor: "neutral", themeMode: "dark", themePreset: "neutral" }
      : profile === "rose-default"
          ? { ...preferences, themeStyle: "default", baseColor: "rose", themeMode: "dark", themePreset: "neutral" }
          : profile === "cyan-new-york"
            ? { ...preferences, themeStyle: "new-york", baseColor: "cyan", themeMode: "dark", themePreset: "stone" }
            : profile === "mira-teal"
              ? { ...preferences, themeStyle: "mira", baseColor: "teal", themeMode: "dark", themePreset: "taupe" }
              : { ...preferences, themeStyle: "maia", baseColor: "orange", themeMode: "dark", themePreset: "olive" }

    setPreferences(next)
    await savePreferences(next)
    notify("Theme profile applied.", "success")
  }

  return (
    <div className="surface min-h-[calc(100svh-13rem)] overflow-hidden p-4 md:min-h-[calc(100svh-14rem)] md:p-6">
      <div className="grid min-h-full grid-cols-1 gap-4 md:grid-cols-[250px_1fr]">
            <aside className="surface fade-up flex flex-col gap-3 p-3 md:h-full">
              <div className="surface flex items-center justify-between px-4 py-3">
                <span className="font-semibold">Menu</span>
                <span className="text-lg">===</span>
              </div>
              {menuItems.map(([label, value], index) => (
                <div key={label} className={`surface px-4 py-3 ${index > 0 ? "fade-up fade-delay-1" : "fade-up"}`}>
                  <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
                  <p className="text-xl font-semibold">{value}</p>
                </div>
              ))}
              <button className="btn-outline mt-auto h-10 w-full">Shuffle</button>
            </aside>

            <main className="space-y-4">
              <header className="fade-up border-b border-[var(--border)] pb-4">
                <h1 className="text-2xl font-semibold">Detective UI Studio</h1>
              </header>

              <section className="surface-tint fade-up flex flex-wrap items-center gap-2 p-3">
                <button className="btn-outline h-9 px-3 text-sm" type="button" onClick={() => void applyProfile("neutral-default")}>
                  Default (Neutral)
                </button>
                <button className="btn-outline h-9 px-3 text-sm" type="button" onClick={() => void applyProfile("rose-default")}>
                  Accent (Rose)
                </button>
                <button className="btn-outline h-9 px-3 text-sm" type="button" onClick={() => void applyProfile("cyan-new-york")}>
                  Base Color (Cyan)
                </button>
                <button className="btn-outline h-9 px-3 text-sm" type="button" onClick={() => void applyProfile("mira-teal")}>
                  Mira + Teal
                </button>
                <button className="btn-outline h-9 px-3 text-sm" type="button" onClick={() => void applyProfile("maia-orange")}>
                  Maia + Orange
                </button>
              </section>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr_0.95fr]">
                <article className="surface fade-up space-y-4 p-5">
                  <h2 className="text-5xl font-semibold">{`${styleLabel} - Inter`}</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Designers love packing quirky glyphs into test phrases. This is a preview of
                    the typography and palette profile.
                  </p>
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      "#050505",
                      "#e8e8e8",
                      "#1d4ed8",
                      "#252730",
                      "#2d2623",
                      "#2a2422",
                      "#ff6b6b",
                      "var(--chart-1)",
                      "var(--chart-2)",
                      "var(--chart-3)",
                      "var(--chart-4)",
                      "var(--chart-5)",
                    ].map((color) => (
                      <span key={color} className="h-14 rounded-xl border border-[var(--border)]" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </article>

                <article className="surface fade-up fade-delay-1 space-y-4 p-5">
                  <div className="grid grid-cols-8 gap-2">
                    {Array.from({ length: 16 }).map((_, index) => (
                      <button key={`icon-${index}`} className="btn-outline h-10 px-0 text-center text-sm">
                        {index % 2 === 0 ? "+" : "o"}
                      </button>
                    ))}
                  </div>

                  <div className="surface p-4">
                    <div className="mb-3 flex gap-2">
                      <button className="btn-primary h-8 px-3 text-sm">Button</button>
                      <button className="btn-outline h-8 px-3 text-sm">Secondary</button>
                      <button className="btn-outline h-8 px-3 text-sm">Outline</button>
                      <button className="btn-outline h-8 px-3 text-sm text-red-400">Delete</button>
                    </div>
                    <input className="input-surface w-full" defaultValue="Two-factor authentication" />
                    <input type="range" defaultValue={52} className="mt-4 w-full" />
                    <input className="input-surface mt-4 w-full" defaultValue="Name" />
                    <textarea className="input-surface mt-3 min-h-24 w-full py-3" defaultValue="Message" />
                  </div>

                  <div className="surface overflow-hidden">
                    <div className="h-52 bg-[radial-gradient(circle_at_30%_30%,var(--theme-tint),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.15),transparent_35%),linear-gradient(135deg,#090b13,var(--chart-4),var(--chart-2))]" />
                    <div className="space-y-2 p-4">
                      <h3 className="text-2xl font-semibold">Observability Plus is replacing Monitoring</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Switch to the improved way to explore your data, with natural language.
                        Monitoring will no longer be available on the Pro plan in November, 2025.
                      </p>
                    </div>
                  </div>
                </article>

                <article className="space-y-4">
                  <section className="surface fade-up fade-delay-2 space-y-3 p-5">
                    <h3 className="text-3xl font-semibold">Environment Variables</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">Production - 8 variables</p>
                    {["DATABASE_URL", "NEXT_PUBLIC_API", "STRIPE_SECRET"].map((item) => (
                      <div key={item} className="input-surface flex items-center justify-between">
                        <span className="font-semibold">{item}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">*********</span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <button className="btn-outline h-9 px-3 text-sm">Edit</button>
                      <button className="btn-primary h-9 px-3 text-sm">Deploy</button>
                    </div>
                  </section>

                  <section className="surface fade-up fade-delay-2 space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-3xl font-semibold">Traffic Channels</h3>
                      <div className="rounded-lg border border-[var(--input)] px-2 py-1 text-xs">6M | 12M</div>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Desktop vs mobile over the last 6 months
                    </p>
                    <div className="mt-4 grid h-40 grid-cols-6 items-end gap-2">
                      {[44, 18, 70, 42, 56, 30, 48, 22, 40, 34, 50, 36].map((value, index) => (
                        <span
                          key={`bar-${index}`}
                          className="rounded-t-md"
                          style={{
                            height: `${value}%`,
                            backgroundColor: index % 2 === 0 ? "var(--chart-2)" : "var(--chart-3)",
                          }}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 border-t border-[var(--border)] pt-3 text-sm">
                      <p>
                        <span className="block text-[var(--muted-foreground)]">Desktop</span>
                        <span className="text-xl font-semibold">1,224</span>
                      </p>
                      <p>
                        <span className="block text-[var(--muted-foreground)]">Mobile</span>
                        <span className="text-xl font-semibold">860</span>
                      </p>
                      <p>
                        <span className="block text-[var(--muted-foreground)]">Mix Delta</span>
                        <span className="text-xl font-semibold">+42%</span>
                      </p>
                    </div>
                  </section>

                  <section className="surface fade-up fade-delay-3 space-y-3 p-5">
                    <h3 className="text-3xl font-semibold">Invite Team</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Add members to your workspace
                    </p>
                    <input className="input-surface w-full" defaultValue="alex@example.com" />
                    <input className="input-surface w-full" defaultValue="sam@example.com" />
                    <button className="btn-outline h-10 w-full">+ Add another</button>
                  </section>
                </article>
              </div>
            </main>
      </div>
    </div>
  )
}
