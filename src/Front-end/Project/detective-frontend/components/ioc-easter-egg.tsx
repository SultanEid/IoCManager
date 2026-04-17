"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

const REQUIRED_KEYS = ["i", "o", "c"] as const
const HOLD_MS = 900

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export function IocEasterEgg() {
  const router = useRouter()
  const pressed = useRef(new Set<string>())
  const timerRef = useRef<number | null>(null)
  const unlockedRef = useRef(false)
  const [revealing, setRevealing] = useState(false)

  useEffect(() => {
    unlockedRef.current = window.localStorage.getItem("detective-credits-unlocked") === "1"

    function clearTimer() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    function startIfReady() {
      const isReady = REQUIRED_KEYS.every((key) => pressed.current.has(key))
      if (!isReady || timerRef.current !== null) {
        return
      }

      setRevealing(true)
      timerRef.current = window.setTimeout(() => {
        if (unlockedRef.current) {
          setRevealing(false)
          return
        }

        unlockedRef.current = true
        window.localStorage.setItem("detective-credits-unlocked", "1")
        document.cookie = "detective-credits-unlocked=1; path=/; max-age=31536000; samesite=lax"
        window.dispatchEvent(new CustomEvent("detective:credits-unlocked"))
        setRevealing(false)
        router.push("/credits")
      }, HOLD_MS)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()
      if (!REQUIRED_KEYS.includes(key as (typeof REQUIRED_KEYS)[number])) {
        return
      }

      pressed.current.add(key)
      startIfReady()
    }

    function onKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      pressed.current.delete(key)
      clearTimer()
      if (!unlockedRef.current) {
        setRevealing(false)
      }
    }

    function onBlur() {
      pressed.current.clear()
      clearTimer()
      if (!unlockedRef.current) {
        setRevealing(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)

    return () => {
      clearTimer()
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [router])

  if (!revealing) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[120] -translate-x-1/2">
      <div className="surface fade-in rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--primary)_16%,var(--card))] px-5 py-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Contributors</p>
        <p className="text-sm font-semibold">Credits</p>
      </div>
    </div>
  )
}
