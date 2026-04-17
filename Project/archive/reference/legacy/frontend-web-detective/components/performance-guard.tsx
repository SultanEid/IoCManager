"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function PerformanceGuard() {
  const pathname = usePathname()

  useEffect(() => {
    const start = performance.now()
    let rafA = 0
    let rafB = 0

    rafA = window.requestAnimationFrame(() => {
      rafB = window.requestAnimationFrame(() => {
        const duration = performance.now() - start
        if (duration > 220) {
          console.warn(`[perf] Route transition exceeded budget (${Math.round(duration)}ms) for ${pathname}`)
        }
      })
    })

    return () => {
      if (rafA) {
        window.cancelAnimationFrame(rafA)
      }
      if (rafB) {
        window.cancelAnimationFrame(rafB)
      }
    }
  }, [pathname])

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") {
      return
    }

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration > 50) {
          console.warn(`[perf] Long task ${Math.round(entry.duration)}ms during UI interaction`)
        }
      }
    })

    try {
      observer.observe({ entryTypes: ["longtask"] })
    } catch {
      // Long task API is browser-dependent.
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
