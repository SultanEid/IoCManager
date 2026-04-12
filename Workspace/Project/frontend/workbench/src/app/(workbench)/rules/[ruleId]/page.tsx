import { RuleDetailPage } from "@/components/workbench/rule-detail-page"

type RuleDetailRouteProps = {
  params: {
    ruleId: string
  }
}

export default function RuleDetailRoute({ params }: RuleDetailRouteProps) {
  return <RuleDetailPage ruleId={params.ruleId} />
}
