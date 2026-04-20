import { redirect } from "next/navigation"

export default function LegacyCaseDecisionTracePage({ params }: { params: { caseId: string } }) {
  redirect(`/alerts/${params.caseId}`)
}
