import { LoadingState } from "@/shared/ui/state-panels"

export default function WorkbenchLoading() {
  return (
    <section className="wb-page">
      <LoadingState
        label="Loading IoC Manager"
        description="Hydrating ingestion, rule, server, scan, and alert management surfaces."
      />
    </section>
  )
}
