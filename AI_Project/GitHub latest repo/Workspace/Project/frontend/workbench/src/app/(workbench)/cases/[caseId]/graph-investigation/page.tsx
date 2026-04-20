import { redirect } from "next/navigation"

export default function LegacyCaseGraphPage({ params }: { params: { caseId: string } }) {
  redirect(`/alerts/${params.caseId}`)
}
