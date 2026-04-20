"use client"

import { Button } from "@/components/ui/button"
import { ErrorState } from "@/shared/ui/state-panels"

export default function WorkbenchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <section className="wb-page">
      <ErrorState
        title="IoC Manager surface unavailable"
        description={error.message || "The IoC Manager shell failed to render. Retry to recover route state."}
      />
      <div className="mt-3">
        <Button variant="outline" onClick={reset}>
          Retry
        </Button>
      </div>
    </section>
  )
}
