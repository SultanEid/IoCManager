import { redirect } from "next/navigation"

export default function LegacyCaseSimulationPage({ params }: { params: { caseId: string } }) {
  redirect(`/alerts/${params.caseId}`)
}
