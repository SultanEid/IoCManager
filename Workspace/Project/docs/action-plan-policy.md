# Action Plan Policy

## Purpose
Define the manual-only response recommendation policy used after a decision in IoC Manager.

Related documents:

- [AI Decision Overview](./ai-decision-overview.md)
- [Verdict Taxonomy](./verdict-taxonomy.md)

## What The Action Plan Is
The action plan is a deterministic, policy-constrained recommendation bundle produced after a decision. It is intended to help operators decide what to do next with a detection.

It is not an execution plan. It does not apply controls automatically.

## Allowed Actions
- `isolate_host`
- `quarantine_file`
- `block_hash`
- `block_domain`
- `block_url`
- `block_ip`
- `search_fleet`
- `collect_memory`
- `collect_process_tree`
- `collect_persistence_artifacts`
- `collect_network_context`
- `tighten_rule`
- `suppress_rule_candidate`
- `open_review`
- `notify_admin`
- `notify_analyst`
- `notify_it_operator`
- `no_immediate_action`

## Output Format
`ActionPlanResponse` includes:

- `summary`
- `recommended_actions`
- `prerequisites`
- `cautions`
- `never_auto_executes`
- `policy_constrained`
- `evidence_based`
- `machine_readable`

Each `recommended_action` includes:

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

The `machine_readable` block preserves:

- `input_snapshot`
- `policy_checks`
- `action_scores`
- `selection`

## Non-Autonomous Rules
- `never_auto_executes` must always be `true`.
- `requires_human_approval` must always be `true`.
- `execution_mode` must always be `manual_only`.
- If no operational action survives eligibility and safety gates, the top recommendation must fall back to `no_immediate_action` with review or notification actions as needed.

## Policy Matrix
The recommender uses a deterministic policy matrix keyed by:

- `family`
- `verdict`
- `confidence_bucket`
- `false_positive_risk_bucket`
- `asset_criticality`
- `object_type`

The selected row returns:

- `allowed_actions`
- `escalation_target`
- `required_reviewer_role`

Matrix artifact:

- `ai/service/artifacts/action_policy_matrix.v1.json`

Optional override:

- `CTI_SIDECAR_ACTION_POLICY_MATRIX_PATH`

## Eligibility And Ranking
Actions must pass both:

1. matrix policy eligibility
2. runtime feasibility checks

Examples of runtime feasibility checks:

- `block_hash` requires hash-like IOC context
- `block_domain` requires domain IOC context
- `block_url` requires URL IOC context
- `block_ip` requires IP IOC context
- host-oriented actions require host/process-capable context
- `tighten_rule` requires a known detection family

Ranking then uses deterministic evidence and environment inputs such as:

- verdict
- confidence
- false-positive risk
- evidence quality
- contradiction ratio
- evidence missing count
- IOC type / object type
- asset criticality
- related detections
- environment context
- historical learning signals

## Safety Rules
Prompt 29 added explicit recommendation severity capping. Disruptive actions are removed when any of the following are true:

- verdict is `insufficient_evidence`
- confidence is below `0.50`
- false-positive risk is `0.55` or higher
- contradiction score is `0.30` or higher
- critical fields are missing

When the cap is applied:

- containment and blocking actions are removed
- recommendations stay within review, collection, retrieval, communication, rule-hygiene, or `no_immediate_action` surfaces
- the decision trace records `severity_cap_applied` and `max_recommendation_severity`

## Analyst Override And Closure
The action plan is advisory. Analysts may:

- accept the recommendation
- reject the recommendation
- override the recommendation
- close the detection with a different final outcome

These operator outcomes feed historical learning and offline evaluation. The action plan should therefore remain auditable and explicit rather than opaque or adaptive at runtime.

## Known Limitations
- The action catalog is fixed to the current IoC Manager operational scope.
- The current matrix does not authorize autonomous response.
- Recommendation quality depends on the detection package quality and available provenance.
- Safety caps are intentionally conservative and may reduce disruptive recommendations in borderline cases.

## Future Enhancements
- richer operator-facing explanation of why specific actions were blocked
- stronger backend and UI rendering of `machine_readable.selection`
- finer-grained safety-cap reasoning per action category
- broader family-specific policy tuning if IoC Manager adds new supported families

