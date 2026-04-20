import { redirect } from "next/navigation"

export default function LegacyCaseEvidenceBundlePage({ params }: { params: { caseId: string } }) {
  redirect(`/alerts/${params.caseId}`)
}
