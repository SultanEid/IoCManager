# Dataset Sources

## Purpose
Define the approved source classes, provenance expectations, and evaluation inputs for the decision and action-plan subsystem.

Related documents:

- [AI Decision Overview](./ai-adjudication-overview.md)
- [Verdict Taxonomy](./verdict-taxonomy.md)
- [Action Plan Policy](./action-plan-policy.md)

## Approved Source Categories
- internal IoC ingestion pipelines
- internal detection telemetry and scanner outputs
- trusted partner or vendor feeds with documented reliability
- analyst-reviewed incident artifacts with traceable references
- backend decision feedback, overrides, and closures when the event history is explicit and attributable

Current manual external staging support:
- MalwareBazaar via `malwarebazaar_feed_parser_v1`
- YARAify via `yaraify_feed_parser_v1`
- ThreatFox via `threatfox_feed_parser_v1`
- URLhaus via `urlhaus_feed_parser_v1`

Deferred until parser support exists:
- VX-Underground

## Provenance Requirements
Every decision dataset row and runtime decision should preserve:

- source identity
- collection or observation timestamp
- enough context to understand how the evidence entered the system
- distinction between positive, negative, contradictory, and missing evidence
- stable references or IDs where available

Minimum provenance fields for decision output:

- `source`
- `key`
- `value`
- `evidence_id` when available
- `citation_ref` when available

## Source Handling Rules
- conflicting evidence must be retained, not collapsed away
- missing provenance should lower confidence and may force abstention
- duplicate source anchors should be deduplicated before scoring
- the runtime evidence-fusion semantics and offline dataset semantics should stay aligned
- feedback or override events should be preserved as historical signals, not rewritten into hidden labels

## Evaluation Pipeline Inputs
The offline evaluation pipeline currently draws from:

- decision datasets built by the dataset builder job in `ai/jobs`
- scored snapshots used by `ai/jobs/evaluate_model.py`
- canonical JSONL or dataset inputs consumed by `ai/jobs/run_evaluation_harness.py`

Evaluation artifacts should retain:

- dataset version
- model version when relevant
- input hashes or manifest hashes
- slice configuration
- threshold configuration

For decision scoring on built datasets, export scored rows from canonical JSONL with:

- `ai/jobs/export_scored_decision_rows.py`

## Change Control
- document any new source class before using it in runtime or dataset generation
- re-run evaluation when source distributions or labeling rules change
- update this document together with the decision overview and action-plan policy docs
- keep external-feed staging manual and local until connector and provenance controls are approved

## Exclusions
- do not treat raw LLM narration as an authoritative evidence source
- do not use fabricated production examples as trusted labels
- do not widen source policy into campaign/actor intelligence scope that is outside IoC Manager operations
