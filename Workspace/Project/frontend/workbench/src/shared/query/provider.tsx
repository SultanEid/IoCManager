"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { ApiError } from "@/shared/api/error"

function shouldRetryQuery(failureCount: number, error: Error) {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 429)) {
    return false
  }

  return failureCount < 1
}

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: shouldRetryQuery,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
