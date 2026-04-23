# Training Row Format

Canonical dataset rows are written as JSONL by `ai/jobs/build_decision_dataset.py`.

## Canonical Fields
- `row_id`
- `dataset_version`
- `task_type`
- `rule_family`
- `package_payload`
- `target_payload`
- `provenance`
- `evidence_used`
- `evidence_missing`
- `raw_payload`
- `parser_diagnostics`
- `group_key`
- `event_time_utc`
- `source_file`
- `is_partial`
- `missing_fields`
- `eligible_tasks`

## Task Views
- `yara_package_decision`
- `sigma_package_decision`
- `snort_package_decision`
- `action_plan_recommendation`

## Partial Rows
Rows with missing task requirements are preserved in canonical output and marked using:
- `is_partial`
- `missing_fields`
- `parser_diagnostics`

Partial rows are excluded only from task split files where required labels/targets are missing.

## Split Guardrail
Task split files use Group+Time splitting:
- Groups are anchored by rule/object identity via `group_key`.
- Each group is assigned to a single split.
- Group order is chronological to reduce temporal leakage.


