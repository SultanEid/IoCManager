# Verdict Taxonomy

## Purpose
Define the decision verdicts allowed by IoC Manager and the minimum evidence expectations behind them.

Related documents:

- [AI Decision Overview](./ai-decision-overview.md)
- [Action Plan Policy](./action-plan-policy.md)
- [Dataset Sources](./dataset-sources.md)

## Allowed Verdicts

The runtime verdict set is fixed to these eight values: `malicious`, `likely_malicious`, `suspicious`, `benign`, `likely_benign`, `false_positive`, `insufficient_evidence`, and `stale_or_revoked`.

### `malicious`
Use when strong corroborated evidence supports malicious interpretation and the residual contradiction and missing-evidence levels remain within policy.

Expected characteristics:

- strong positive evidence across multiple channels
- limited contradiction
- limited missing critical evidence
- operator review can justify containment-oriented manual actions

### `likely_malicious`
Use when the evidence supports malicious interpretation but the system should present more caution than the `malicious` label.

Expected characteristics:

- substantial positive evidence
- some residual uncertainty remains acceptable for controlled manual response
- evidence quality is below the strongest malicious threshold but still operationally meaningful

### `suspicious`
Use when risk is elevated and further validation is warranted, but the current package does not justify stronger malicious labeling.

Expected characteristics:

- some positive support exists
- uncertainty, contradiction, or missing evidence still matters
- action plans should emphasize review and evidence collection before disruptive controls unless safety gates allow more

### `benign`
Use when trusted benign explanation is strongly supported.

Expected characteristics:

- trusted benign or allowlist context is present
- contradiction is low
- confidence is sufficient to avoid escalation

### `likely_benign`
Use when benign interpretation is more plausible than malicious interpretation, but the evidence is not as strong as the full `benign` case.

Expected characteristics:

- benign pressure is meaningful
- some uncertainty remains
- rule-hygiene actions may still be appropriate

### `false_positive`
Use when the detection is better explained as a detection-quality issue than a true malicious finding.

Expected characteristics:

- allowlist, baseline, or prior analyst outcomes support the false-positive interpretation
- rule suppression or tuning may be appropriate

### `insufficient_evidence`
Use when the system cannot justify a stronger verdict safely.

Required conditions:

- `abstain_reason` must be present
- `next_best_evidence` must be concrete
- `safety_diagnostics` must explain the weak, contradictory, degraded, or missing-evidence state

Common causes:

- lexical-only evidence
- missing critical fields
- insufficient correlated evidence
- high contradiction
- unavailable enrichment with weak remaining corroboration

### `stale_or_revoked`
Use when the rule or detection context is stale, revoked, or otherwise no longer trustworthy as an active malicious signal.

Expected characteristics:

- freshness or revocation metadata is explicit
- the outcome supports suppression or hygiene actions rather than escalation

## Taxonomy Rules
- Do not invent extra runtime verdict labels.
- Do not map verdicts to actor, campaign, or strategic CTI claims.
- Do not use generated phrasing alone as verdict evidence.
- Keep verdict assignment reproducible from the underlying evidence and policy thresholds.
- Safety rails may downgrade or abstain after family-specific decisioning if the final evidence state is not safe enough.

