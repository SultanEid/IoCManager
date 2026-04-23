# AI Decision Overview

## What It Is
The decision and action-plan subsystem is the IoC Manager component that turns a detection package plus supporting context into:

- a grounded decision verdict
- an operator-facing confidence and false-positive-risk estimate
- explicit abstention guidance when evidence is not sufficient
- a manual-only, policy-constrained action plan

The subsystem is implemented in the AI sidecar and supports IoC Manager operations. It is designed to help analysts review detections, not to widen the product into a general CTI platform.

Core runtime outputs are defined by the sidecar contracts in `ai/service/decision_service/contracts.py`, especially:

- `GroundedDecisionResponse`
- `SafetyDiagnosticsResponse`
- `ActionPlanResponse`

Related policy documents:

- [Verdict Taxonomy](./verdict-taxonomy.md)
- [Action Plan Policy](./action-plan-policy.md)
- [Dataset Sources](./dataset-sources.md)

## What It Is Not
This subsystem is not:

- autonomous response orchestration
- final proof of maliciousness based on generated text
- a campaign, actor, or graph-first CTI platform
- a replacement for analyst review, override, or closure workflow
- a license to auto-remediate endpoints, block infrastructure, or suppress detections without human approval

IoC Manager remains an operational IoC and detection-management product. The AI subsystem is a bounded decision aid inside that product.

## Supported Families
The current deterministic family-specific adjudicators are:

- `sigma`
- `snort`
- `yara`

There is also a generic fallback path for cases that do not map to one of those families, but the primary supported family-specific behavior is the three deterministic adjudicators above.

## Input Package Format
The sidecar consumes `ScoreCaseRequest`. The decision-specific payload is `detection_package`.

Minimum common fields:

| Field | Required | Notes |
|---|---|---|
| `detection_package.rule_family` | yes | `sigma`, `snort`, `yara`, or generic fallback |
| `detection_package.object_metadata.object_id` | yes | required for safe decisioning |
| `detection_package.object_metadata.object_type` | yes | affects evidence interpretation and action gating |
| `detection_package.object_metadata.source_system` | yes | required for provenance and confidence context |

Family-specific minimum fields enforced by Prompt 29 safety rails:

| Family | Required rule identity | Required hit evidence |
|---|---|---|
| `sigma` | `rule_metadata.rule_id` or `rule_metadata.title` | one of `raw_hit_payload.command_line`, `raw_hit_payload.image`, `raw_hit_payload.event_id` |
| `snort` | one of `rule_metadata.rule_id`, `rule_metadata.sid`, `rule_metadata.msg` | one of `raw_hit_payload.network.five_tuple`, `raw_hit_payload.message`, `raw_hit_payload.event_id` |
| `yara` | `rule_metadata.rule_id` or `rule_metadata.rule_name` | one of `raw_hit_payload.matched_strings`, `raw_hit_payload.match_count`, `raw_hit_payload.event_id` |

Common optional evidence channels:

- `full_rule_text`
- `asset_context`
- `time_prevalence_context`
- `allowlist_baseline_context`
- `linked_enrichment`
- `behavior_report_references`
- `prior_analyst_outcomes`
- `related_detections`
- `historical_learning_context`

If critical fields are missing, the safety layer forces `insufficient_evidence` and records the missing field names in `safetyDiagnostics.missingCriticalFields`.

## Output Shape
The decision response includes:

- `verdict`
- `action`
- `confidence`
- `false_positive_risk`
- `review_priority`
- `reasons`
- `abstain_reason` when the verdict is `insufficient_evidence`
- `next_best_evidence`
- `evidence_fusion`
- `historical_learning`
- `safety_diagnostics`
- `promotion_suppression_decision`
- `action_plan`

### Action-Plan Output
The action-plan block is intentionally manual-only and policy constrained. It includes:

- `summary`
- `recommended_actions`
- `prerequisites`
- `cautions`
- `never_auto_executes`
- `policy_constrained`
- `evidence_based`
- `machine_readable`

Each recommended action includes:

- `action`
- `rank`
- `score`
- `rationale`
- `prerequisites`
- `cautions`
- `escalation_target`
- `required_reviewer_role`
- `requires_human_approval`
- `execution_mode`

The `machine_readable` section preserves the deterministic selection trace:

- `input_snapshot`
- `policy_checks`
- `action_scores`
- `selection`

## Source And Provenance Handling
The subsystem is evidence-first. Provenance is not optional bookkeeping; it is part of the decision contract.

Runtime provenance may include:

- rule context values
- host context values
- score outputs
- top evidence features
- evidence fusion counts
- family decision bucket scores
- family interpretable features
- historical learning features and quality summary

Evidence fusion keeps these categories distinct:

- positive evidence
- negative evidence
- contradictory evidence
- missing evidence

Duplicate evidence is deduplicated before scoring. Contradictions are preserved rather than flattened away. Missing evidence is surfaced explicitly to support abstention and next-step collection.

## Abstention Rules
The subsystem must abstain when confidence is not justified. Current hard abstention cases include:

- lexical-only evidence with no non-lexical corroboration
- missing critical fields
- family missing-evidence score at or above the abstention threshold
- contradiction score at or above the hard safety threshold
- enrichment unavailable with no non-lexical corroboration

Abstentions return:

- `verdict = insufficient_evidence`
- a required `abstain_reason`
- explicit `false_positive_risk`
- concrete `next_best_evidence`
- `safety_diagnostics` describing why the decision was constrained

## Safety Rules
Prompt 29 added an explicit final safety layer. The subsystem now enforces:

- never auto-remediate
- all recommended actions remain `manual_only`
- all recommended actions require human approval
- contradictory evidence lowers confidence and raises false-positive risk
- missing critical fields force abstention
- enrichment failure degrades gracefully instead of raising a hard runtime failure
- disruptive actions are capped out when confidence is low, false-positive risk is high, contradiction is elevated, or critical fields are missing

The `safety_diagnostics` block currently includes:

- `autoRemediationAllowed`
- `weakEvidence`
- `contradictoryEvidence`
- `contradictionScore`
- `missingCriticalFields`
- `partialEvidence`
- `enrichmentStatus`
- `falsePositiveRisk`
- `severityCapApplied`
- `maxRecommendationSeverity`
- `degradationReasons`

## Analyst Override Flow
The decision output is advisory inside the operator workflow.

Expected control flow:

1. IoC Manager submits a detection package and receives a grounded decision plus an action plan.
2. An analyst reviews the evidence, safety diagnostics, and policy-constrained actions.
3. The analyst may accept, reject, or override the recommendation in the backend decision flow.
4. Final closure and override events feed back into historical learning and offline evaluation datasets.

The subsystem is designed to support override, not to resist it. Analyst closure remains the authoritative operational outcome.

## Evaluation Pipeline
Offline evaluation is part of the subsystem, not an afterthought.

Primary jobs:

- dataset builder job in `ai/jobs`
- `ai/jobs/evaluate_model.py`
- `ai/jobs/run_evaluation_harness.py`

Current evaluation coverage includes:

- decision precision, recall, F1, confusion matrix
- abstention rate
- false-positive and false-negative rates
- calibration quality, including calibration bins and Brier score
- family-specific slices
- evidence-availability bucket slices
- action-plan exact match, top-k usefulness, acceptance, unsafe recommendation rate, and escalation errors where labels are available

Report bundles are emitted as reproducible offline artifacts with machine-readable output plus Markdown summary.

## Known Limitations
- Only `sigma`, `snort`, and `yara` have deterministic family-specific adjudicators.
- The generic fallback path is less expressive than the family-specific paths.
- Action plans remain bounded to the current action catalog and policy matrix.
- Quality depends on source coverage and provenance quality; sparse packages should be expected to abstain.
- Enrichment degradation is handled safely, but still reduces usefulness.
- The subsystem does not infer actor, campaign, or strategic CTI conclusions.
- Frontend presentation of the new safety diagnostics may lag the backend/sidecar contract.

## Future Enhancements
- Better family-specific evidence extraction for additional detection families, if IoC Manager scope requires them
- richer operator-facing rendering for `safetyDiagnostics`
- more complete backend pass-through and auditing of sidecar safety events
- stronger dataset coverage for partial-evidence and contradiction-heavy cases
- expanded offline evaluation reporting and release gating

## Change Control
When the contracts, thresholds, or policy rules change:

- update this document
- update linked verdict/action/source docs
- keep terminology aligned to IoC Manager operations
- do not market the subsystem as autonomous security AI

