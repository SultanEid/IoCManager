"use client"

import { type UseQueryOptions, useQuery } from "@tanstack/react-query"

export function useWorkbenchQuery<TData>(
  key: readonly unknown[],
  query: (signal?: AbortSignal) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, Error, TData, readonly unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => query(signal),
    ...options,
  })
}
