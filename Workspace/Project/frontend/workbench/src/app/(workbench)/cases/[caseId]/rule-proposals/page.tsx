import { redirect } from "next/navigation"

export default function LegacyCaseRuleProposalsPage({ params }: { params: { caseId: string } }) {
  redirect(`/alerts/${params.caseId}`)
}
