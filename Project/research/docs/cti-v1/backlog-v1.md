# Backlog v1

## Phase 0: Foundation
- Add schema objects and enums in .NET + sidecar contracts.
- Add PostgreSQL-first provider wiring and schema bootstrap.
- Add point-in-time snapshot hash pipeline.
- Add policy engine skeleton and config loader.
- Acceptance: same `as_of_time` input yields same decision bundle hash.

## Phase 1: Case core and policy
- Implement open_case, score_case, recommend_action, problematic_queue.
- Persist decision bundle and analyst overrides.
- Enforce hard guards in policy tests.
- Acceptance: unsafe actions blocked; queue reflects policy-aware priority.

## Phase 2: Graph-assisted reasoning
- Add graph feature refresh and neighborhood summaries.
- Use graph features in scoring and explanations.
- Acceptance: graph-on improves Precision@K or explanation utility vs graph-off.

## Phase 3: Rule/deployment safety lifecycle
- Implement simulate_rule, canary_deployment, promote_rule_proposal.
- Add rollback triggers and rollback action logging.
- Acceptance: state transitions shadow->canary->promoted are enforced; rollback works.

## Phase 4: Grounded report intelligence
- Deterministic extraction first; retrieval-grounded fallback with citations.
- Store evidence assertions linked to case bundles.
- Acceptance: citation completeness >= configured threshold; weak evidence abstains.

## Phase 5: Feedback learning and governance
- Separate hard labels vs weak labels.
- Add drift monitors and challenger evaluation.
- Gate promotion on policy thresholds and auto-rollback on failure.
- Acceptance: promotion requires all gates; failed gate reverts stable model/policy.
