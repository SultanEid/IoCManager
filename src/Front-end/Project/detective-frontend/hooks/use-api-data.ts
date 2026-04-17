"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

const DATA_CACHE = new Map<string, unknown>()
const INFLIGHT = new Map<string, Promise<unknown>>()

async function fetchWithCache<T>(path: string): Promise<T> {
  const existing = INFLIGHT.get(path)
  if (existing) {
    return (await existing) as T
  }

  const promise = apiFetch<T>(path)
  INFLIGHT.set(path, promise as Promise<unknown>)
  try {
    const response = await promise
    DATA_CACHE.set(path, response as unknown)
    return response
  } finally {
    INFLIGHT.delete(path)
  }
}

export async function prefetchApiData(paths: string[]) {
  await Promise.allSettled(
    paths.map(async (path) => {
      if (DATA_CACHE.has(path)) {
        return
      }
      await fetchWithCache(path)
    })
  )
}

export function useApiData<T>(path: string, initial: T) {
  const [data, setData] = useState<T>(() => {
    const cached = DATA_CACHE.get(path)
    return (cached as T | undefined) ?? initial
  })
  const [loading, setLoading] = useState(() => !DATA_CACHE.has(path))
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    async function load() {
      const cached = DATA_CACHE.get(path) as T | undefined
      if (cached !== undefined) {
        setData(cached)
        setLoading(false)
      } else {
        setLoading(true)
      }
      setError("")

      try {
        const response = await fetchWithCache<T>(path)
        if (mounted) {
          setData(response)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Request failed.")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [path])

  return { data, loading, error }
}
