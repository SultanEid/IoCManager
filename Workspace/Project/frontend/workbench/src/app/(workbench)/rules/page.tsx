import { RuleDistributionPage } from "@/components/workbench/distribution/rule-distribution-page"
import { RuleRepositoryPage } from "@/components/workbench/rule-repository-page"

export default function RulesPage() {
  return (
    <>
      <RuleRepositoryPage />
      <RuleDistributionPage embedded />
    </>
  )
}
