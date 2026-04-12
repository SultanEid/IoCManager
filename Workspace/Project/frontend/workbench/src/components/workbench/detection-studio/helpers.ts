import type {
  DetectionFamily,
  DetectionRuleItem,
  ValidationCheck,
} from "@/shared/modules/types"

export function monacoLanguageForFamily(family: DetectionFamily) {
  if (family === "Sigma") {
    return "yaml"
  }

  return "cpp"
}

export function toPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function deriveLintChecks(rule: DetectionRuleItem, code: string) {
  const checks: ValidationCheck[] = [...rule.validationChecks]

  if (!code.trim()) {
    checks.push({
      key: "empty",
      title: "Rule body",
      status: "fail",
      detail: "Rule body is empty and cannot be promoted.",
    })
  }

  if (rule.family === "Sigma" && !code.includes("condition:")) {
    checks.push({
      key: "sigma-condition",
      title: "Sigma condition",
      status: "fail",
      detail: "Sigma rule is missing a detection condition block.",
    })
  }

  if ((rule.family === "Snort" || rule.family === "Suricata") && !code.includes("sid:")) {
    checks.push({
      key: "signature-id",
      title: "Signature ID",
      status: "fail",
      detail: "Network signatures require a stable sid for change traceability.",
    })
  }

  if (rule.family === "YARA" && !code.includes("condition:")) {
    checks.push({
      key: "yara-condition",
      title: "YARA condition",
      status: "fail",
      detail: "YARA rule is missing a condition section.",
    })
  }

  return checks
}

export function buildRuleSearchHaystack(rule: DetectionRuleItem) {
  return [
    rule.id,
    rule.name,
    rule.linkedCase.replace(/^CA-/i, "AL-"),
    rule.tags.attack.join(" "),
    rule.tags.family.join(" "),
    rule.tags.labels.join(" "),
    rule.provenance.source,
  ]
    .join(" ")
    .toLowerCase()
}

export function getDuplicateRiskLabel(rule: DetectionRuleItem): "Low" | "Medium" | "High" {
  const highestConfidence = Math.max(0, ...rule.duplicateSuggestions.map((item) => item.confidence))
  if (highestConfidence >= 0.86) {
    return "High"
  }

  if (highestConfidence >= 0.7) {
    return "Medium"
  }

  return "Low"
}

export function confidenceTone(confidence: "High" | "Medium" | "Low") {
  if (confidence === "High") {
    return "text-emerald-200"
  }

  if (confidence === "Medium") {
    return "text-amber-200"
  }

  return "text-rose-200"
}
