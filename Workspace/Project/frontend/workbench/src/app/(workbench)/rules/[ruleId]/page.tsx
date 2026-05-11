import { RuleDetailPage } from "@/components/workbench/rule-detail-page"

type RuleDetailRouteProps = {
  params: Promise<{
    ruleId: string
  }>
}

export default async function RuleDetailRoute({ params }: RuleDetailRouteProps) {
  const { ruleId } = await params

  return <RuleDetailPage ruleId={ruleId} />
}
