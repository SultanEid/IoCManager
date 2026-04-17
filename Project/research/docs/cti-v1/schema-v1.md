# Schema v1

This document is the implementation source of truth for CTI Reasoning Platform v1.

## Enums
- DecisionState: `recommend | abstain | escalate | defer`
- CaseState: `open | triage | evidence_pending | recommendation_ready | awaiting_approval | shadow | canary | promoted | monitoring | closed`
- ApprovalTier: `analyst | lead | admin`
- RolloutMode: `none | shadow | canary | promote | rollback`
- ActionType: `monitor | hunt | propose_rule | deploy_shadow | deploy_canary | promote | suppress_temporarily | suppress_permanently | block_candidate | escalate | abstain | request_more_evidence | expire_case`

## Core Case Entities
- InvestigationCase
  - case_id (uuid), title, case_type, priority, state, owner_user_id, sla_due_at, risk_budget_id, opened_at, updated_at, parent_case_id, merged_into_case_id
- CaseEvidenceBundle
  - bundle_id (uuid), case_id, as_of_time, source_ids (jsonb), detection_observations (jsonb), related_iocs (jsonb), graph_neighbors (jsonb), similar_cases (jsonb), missing_evidence_hints (jsonb), created_at
- CaseDecision
  - decision_id (uuid), case_id, decision_state, recommended_action, approval_tier_required, rollout_mode, reason_summary, policy_version, model_version, created_by, created_at
- DecisionBundle
  - bundle_id (uuid), case_id, score_vector (jsonb), policy_outcome (jsonb), top_evidence (jsonb), neighbor_context (jsonb), similar_case_refs (jsonb), next_best_evidence (jsonb), rollout_plan (jsonb), rollback_plan (jsonb), snapshot_refs (jsonb), generated_explanation, created_at

## Provenance and Lineage
- EvidenceAssertion
  - assertion_id (uuid), case_id, entity_type, entity_id, claim_type, claim_value, source_id, source_span_start, source_span_end, extraction_method, confidence, extracted_at
- TransformationLineage
  - lineage_id (uuid), source_entity_type, source_entity_id, target_entity_type, target_entity_id, method, method_version, created_at
- PointInTimeFeatureSnapshot
  - snapshot_id (uuid), case_id, as_of_time, dataset_version, feature_snapshot_hash, feature_values (jsonb), graph_version, policy_version_ref, created_at
- ModelDecisionTrace (extended)
  - as_of_time, dataset_version, feature_snapshot_hash, policy_version, decision_state, missing_evidence_hints, top_contributing_features, neighbor_context_refs, similar_case_refs

## Rule and Deployment
- RuleProposal
  - proposal_id (uuid), case_id, rule_type, rule_body, metadata_tags (jsonb), predicted_coverage, predicted_fp_risk, target_asset_classes (jsonb), status, created_at
- DeploymentRecommendation
  - deployment_id (uuid), case_id, rule_proposal_id, target_scope (jsonb), rollout_mode, expected_noise, expected_coverage_gain, cost_estimate, approval_required, status, created_at
- RolloutPlan
  - rollout_plan_id (uuid), case_id, shadow_window_hours, canary_scope_percent, promotion_thresholds (jsonb), expiry_at, success_criteria (jsonb)
- RollbackPlan
  - rollback_plan_id (uuid), case_id, rollback_conditions (jsonb), rollback_scope, restore_previous_version, notification_targets (jsonb)

## Trust and Feedback
- SourceReliabilityProfile
  - source_id, source_type, precision_estimate, novelty_yield, latency_profile, historical_fp_rate, trust_bucket, last_updated_at
- AnalystFeedbackEvent
  - feedback_id (uuid), case_id, verdict_type, label_strength, disposition_reason, operator_confidence, override_reason, review_latency_ms, team_id, created_at
