import { redirect } from "next/navigation"

export default function CaseDetailCompatibilityPage({ params }: { params: { caseId: string } }) {
  redirect(`/alerts/${params.caseId}`)
}
