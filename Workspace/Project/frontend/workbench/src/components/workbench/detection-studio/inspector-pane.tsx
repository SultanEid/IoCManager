"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusBadge } from "@/components/workbench/status-badge"
import type {
  DetectionCanaryRow,
  DetectionRuleItem,
  DetectionSimulationRow,
  ValidationCheck,
} from "@/shared/modules/types"
import { confidenceTone, getDuplicateRiskLabel, toPercent } from "./helpers"

function toAlertRef(value: string) {
  return value.replace(/^CA-/i, "AL-")
}
type IntelligenceInspectorProps = {
  selectedRule: DetectionRuleItem
  lintChecks: ValidationCheck[]
  selectedVersion: string
  onSelectVersion: (version: string) => void
  selectedSimulationRun: DetectionSimulationRow | null
  selectedCanaryRollout: DetectionCanaryRow | null
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
      <p className="wb-kicker">{title}</p>
      <div className="mt-2">{children}</div>
    </section>
  )
}

export function IntelligenceInspector({
  selectedRule,
  lintChecks,
  selectedVersion,
  onSelectVersion,
  selectedSimulationRun,
  selectedCanaryRollout,
}: IntelligenceInspectorProps) {
  const policyWarnings = lintChecks.filter((item) => item.status !== "pass")

  return (
    <aside className="rounded-xl border border-border/70 bg-surface-1/85">
      <ScrollArea className="h-[844px] px-4 py-3">
        <div className="space-y-3">
          <section className="rounded-lg border border-border/70 bg-surface-2/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold tracking-tight">{selectedRule.name}</p>
              <StatusBadge value={selectedRule.severity} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{selectedRule.id} | Alert {toAlertRef(selectedRule.linkedCase)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="border-border/70 bg-surface-1/80 text-[10px] uppercase tracking-[0.08em]">
                Duplicate Risk {getDuplicateRiskLabel(selectedRule)}
              </Badge>
              <Badge
                variant="outline"
                className={`border-border/70 bg-surface-1/80 text-[10px] uppercase tracking-[0.08em] ${confidenceTone(selectedRule.provenance.confidence)}`}
              >
                {selectedRule.provenance.confidence} confidence
              </Badge>
            </div>
          </section>

          <Section title="Linked Alert">
            <p className="text-xs font-medium">{toAlertRef(selectedRule.linkedCase)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{selectedRule.provenance.source}</p>
          </Section>

          <Section title="Provenance">
            <p className="text-xs">{selectedRule.provenance.source}</p>
            <p className={`text-[11px] ${confidenceTone(selectedRule.provenance.confidence)}`}>
              {selectedRule.provenance.analyst} | {selectedRule.provenance.confidence} confidence
            </p>
            <p className="text-[11px] text-muted-foreground">
              Imported {new Date(selectedRule.provenance.importedAtUtc).toLocaleString()}
            </p>
          </Section>

          <Section title="ATT&CK / Family / Cluster">
            <div className="flex flex-wrap gap-1.5">
              {selectedRule.tags.attack.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full border-border/70 bg-surface-1/80 text-[10px] uppercase tracking-[0.08em]">
                  {tag}
                </Badge>
              ))}
              {selectedRule.tags.family.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full border-border/70 bg-surface-1/80 text-[10px] uppercase tracking-[0.08em]">
                  {tag}
                </Badge>
              ))}
              {selectedRule.tags.campaign.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full border-border/70 bg-surface-1/80 text-[10px] uppercase tracking-[0.08em]">
                  {tag}
                </Badge>
              ))}
            </div>
          </Section>

          <Section title="Policy Gates">
            {policyWarnings.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">All lint and policy checks currently pass.</p>
            ) : (
              <div className="space-y-1.5">
                {policyWarnings.map((check) => (
                  <div key={check.key} className="rounded-md border border-border/70 px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{check.title}</p>
                      <StatusBadge value={check.status === "warn" ? "Warning" : "Failing"} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{check.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Duplicate Suggestions">
            <div className="space-y-1.5">
              {selectedRule.duplicateSuggestions.map((item) => (
                <div key={item.ruleId} className="rounded-md border border-border/70 px-2 py-1.5">
                  <p className="text-xs font-medium">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.ruleId} | {item.relation}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Confidence {toPercent(item.confidence)}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Overlap Analysis">
            <div className="space-y-1.5">
              {selectedRule.overlapAnalysis.map((item) => (
                <div key={`${item.withRuleId}-${item.domain}`} className="rounded-md border border-border/70 px-2 py-1.5">
                  <p className="text-xs font-medium">{item.domain}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.withRuleId} | {item.withRuleName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{item.overlapPercent}% overlap</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Previous Versions">
            <div className="space-y-1.5">
              {selectedRule.versions.map((item) => {
                const isSelected = selectedVersion === item.version
                return (
                  <button
                    key={item.version}
                    type="button"
                    className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                      isSelected
                        ? "border-primary/40 bg-primary/12"
                        : "border-border/70 bg-surface-1/40 hover:bg-surface-1/65"
                    }`}
                    onClick={() => onSelectVersion(item.version)}
                  >
                    <p className="text-xs font-medium">{item.version}</p>
                    <p className="text-[11px] text-muted-foreground">{item.summary}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.author} | {new Date(item.changedAtUtc).toLocaleString()}
                    </p>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section title="Review Notes">
            <div className="space-y-1.5">
              {selectedRule.reviewNotes.map((note) => (
                <div key={note.id} className="rounded-md border border-border/70 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{note.reviewer}</p>
                    <StatusBadge value={note.decision} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{note.note}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Simulation State">
            <div className="flex items-center justify-between">
              <StatusBadge value={selectedRule.simulationState.state} />
              <StatusBadge value={selectedRule.simulationState.result} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{selectedRule.simulationState.dataset}</p>
            <p className="text-[11px] text-muted-foreground">
              TP {toPercent(selectedRule.simulationState.truePositiveRate)} | FP {toPercent(selectedRule.simulationState.falsePositiveRate)}
            </p>
            {selectedSimulationRun ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Selected run {selectedSimulationRun.runId} | {selectedSimulationRun.dataset}
              </p>
            ) : null}
          </Section>

          <Section title="Rollout Status">
            <div className="flex items-center justify-between">
              <StatusBadge value={selectedRule.rolloutStatus.stage} />
              <StatusBadge value={selectedCanaryRollout?.status ?? selectedRule.rolloutStatus.stage} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{selectedRule.rolloutStatus.rollbackGuard}</p>
            <p className="text-[11px] text-muted-foreground">
              Owner {selectedRule.rolloutStatus.owner} | Canary {selectedRule.rolloutStatus.canaryPercent}%
            </p>
            {selectedCanaryRollout ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Selected rollout {selectedCanaryRollout.rolloutId} | Acceptance {toPercent(selectedCanaryRollout.acceptanceRate)}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" className="h-7 text-[11px]">
                Promote
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]">
                Rollback
              </Button>
            </div>
          </Section>
        </div>
      </ScrollArea>
    </aside>
  )
}

