"use client"

import { usePathname, useRouter } from "next/navigation"

export function SessionControls() {
  const router = useRouter()
  const pathname = usePathname()
  const onSettings = pathname.startsWith("/settings")

  return (
    <button
      type="button"
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
        onSettings
          ? "border-[color-mix(in_srgb,var(--primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--primary)_24%,transparent)] text-[var(--foreground)]"
          : "border-[var(--input)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      }`}
      aria-label="Open settings"
      onClick={() => router.push("/settings")}
    >
      U
    </button>
  )
}
