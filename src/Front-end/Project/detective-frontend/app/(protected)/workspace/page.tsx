"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type Panel = {
  id: number
  key: string
  title: string
  payload: Record<string, unknown>
}

export default function WorkspacePage() {
  const [panels, setPanels] = useState<Panel[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const response = await apiFetch<{ panels: Panel[] }>("/api/workspace/panels")
        if (mounted) {
          setPanels(response.panels)
        }
      } catch {
        if (mounted) {
          setPanels([])
        }
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const payment = panels.find((panel) => panel.key === "payment-method")?.payload ?? {}
  const appearance = panels.find((panel) => panel.key === "appearance-settings")?.payload ?? {}
  const survey = panels.find((panel) => panel.key === "survey")?.payload ?? {}
  const processing = panels.find((panel) => panel.key === "request-processing")?.payload ?? {}

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.08fr_1.12fr_1.02fr_0.96fr]">
            <section className="surface fade-up space-y-4 p-5">
              <h2 className="text-3xl font-semibold">Payment Method</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                All transactions are secure and encrypted
              </p>
              <div className="space-y-3">
                <label className="text-sm">Name on Card</label>
                <input className="input-surface w-full" defaultValue={String(payment.cardName ?? "John Doe")} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">Card Number</label>
                    <input
                      className="input-surface mt-1 w-full"
                      defaultValue={String(payment.cardNumber ?? "1234 5678 9012 3456")}
                    />
                  </div>
                  <div>
                    <label className="text-sm">CVV</label>
                    <input className="input-surface mt-1 w-full" defaultValue={String(payment.cvv ?? "123")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-surface w-full" defaultValue={String(payment.month ?? "MM")} />
                  <input className="input-surface w-full" defaultValue={String(payment.year ?? "YYYY")} />
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked />
                  Same as shipping address
                </label>
                <textarea
                  className="input-surface min-h-24 w-full py-3"
                  defaultValue="Add any additional comments"
                />
                <div className="flex gap-2">
                  <button className="btn-primary h-10 px-4">Submit</button>
                  <button className="btn-outline h-10 px-4">Cancel</button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <article className="surface fade-up fade-delay-1 flex min-h-[260px] flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex -space-x-2">
                  <span className="h-10 w-10 rounded-full bg-zinc-500/50" />
                  <span className="h-10 w-10 rounded-full bg-zinc-500/40" />
                  <span className="h-10 w-10 rounded-full bg-zinc-500/30" />
                </div>
                <h3 className="text-2xl font-semibold">No Team Members</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Invite your team to collaborate on this project.
                </p>
                <button className="btn-outline h-10 px-4">+ Invite Members</button>
              </article>

              <article className="surface fade-up fade-delay-2 space-y-4 p-5">
                <div className="flex gap-2 text-sm">
                  {["Syncing", "Updating", "Loading"].map((text) => (
                    <span key={text} className="rounded-full border border-[var(--input)] px-3 py-1">
                      {text}
                    </span>
                  ))}
                </div>
                <input className="input-surface w-full" defaultValue="Send a message..." />
                <div>
                  <h4 className="text-2xl font-semibold">Price Range</h4>
                  <p className="text-sm text-[var(--muted-foreground)]">Set your budget range ($200 - 800).</p>
                </div>
                <input type="range" min={200} max={800} defaultValue={500} className="w-full" />
                <input className="input-surface w-full" defaultValue="Search..." />
                <input className="input-surface w-full" defaultValue="https:// example.com" />
                <textarea className="input-surface min-h-24 w-full py-3" defaultValue="Ask, Search or Chat..." />
                <input className="input-surface w-full" defaultValue="@shadcn" />
              </article>
            </section>

            <section className="space-y-4">
              <article className="surface fade-up fade-delay-1 space-y-4 p-5">
                <input className="input-surface w-full" defaultValue="https://" />
                <div className="surface flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-semibold">Two-factor authentication</p>
                    <p className="text-sm text-[var(--muted-foreground)]">Verify via email or phone number.</p>
                  </div>
                  <button className="btn-outline h-9 px-3 text-sm">Enable</button>
                </div>
                <div className="surface px-4 py-3 text-sm font-semibold">Your profile has been verified.</div>
              </article>

              <article className="surface fade-up fade-delay-2 space-y-4 p-5">
                <h3 className="text-xl font-semibold">Appearance Settings</h3>
                <div>
                  <p className="text-2xl font-semibold">Compute Environment</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Select the compute environment for your cluster.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--ring)] bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] p-4">
                  <p className="text-lg font-semibold">{String(appearance.environment ?? "Kubernetes")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Run GPU workloads on a K8s configured cluster. This is the default.
                  </p>
                </div>
                <div className="surface p-4">
                  <p className="text-lg font-semibold">Virtual Machine</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Access a VM configured cluster to run workloads. (Coming soon)
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Number of GPUs</p>
                    <p className="text-sm text-[var(--muted-foreground)]">You can add more later.</p>
                  </div>
                  <div className="rounded-lg border border-[var(--input)] px-3 py-1 text-sm">
                    {String(appearance.gpus ?? 8)}
                  </div>
                </div>
              </article>
            </section>

            <section className="space-y-4">
              <article className="surface fade-up fade-delay-2 min-h-[280px] p-5">
                <textarea className="input-surface min-h-40 w-full py-3" defaultValue="Ask, search, or make anything..." />
              </article>
              <article className="surface fade-up fade-delay-2 space-y-4 p-5">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" defaultChecked /> I agree to the terms and conditions
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(survey.options) ? survey.options : ["Social Media", "Search Engine", "Referral", "Other"]).map(
                    (option) => (
                      <button key={String(option)} className="btn-outline h-10 px-4">
                        {String(option)}
                      </button>
                    )
                  )}
                </div>
              </article>
              <article className="surface fade-up fade-delay-3 flex min-h-[280px] flex-col items-center justify-center gap-4 p-5 text-center">
                <span className="pulse-dot h-9 w-9 rounded-full bg-white/50" />
                <h3 className="text-3xl font-semibold">Processing your request</h3>
                <p className="max-w-xs text-sm text-[var(--muted-foreground)]">
                  {String(
                    processing.status ??
                      "Please wait while we process your request. Do not refresh the page."
                  )}
                </p>
                <button className="btn-outline h-9 px-3">Cancel</button>
              </article>
            </section>
    </div>
  )
}
