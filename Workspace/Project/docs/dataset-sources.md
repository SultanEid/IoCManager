# Dataset Sources

## Purpose
Define the approved source classes, provenance expectations, and evaluation inputs for the adjudication and action-plan subsystem.

Related documents:

- [AI Adjudication Overview](./ai-adjudication-overview.md)
- [Verdict Taxonomy](./verdict-taxonomy.md)
- [Action Plan Policy](./action-plan-policy.md)

## Approved Source Categories
- internal IoC ingestion pipelines
- internal detection telemetry and scanner outputs
- trusted partner or vendor feeds with documented reliability
- analyst-reviewed incident artifacts with traceable references
- backend adjudication feedback, overrides, and closures when the event history is explicit and attributable

## Provenance Requirements
Every adjudication dataset row and runtime decision should preserve:

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

- adjudication datasets built by `ai/jobs/build_adjudication_dataset.py`
- scored snapshots used by `ai/jobs/evaluate_model.py`
- canonical JSONL or dataset inputs consumed by `ai/jobs/run_evaluation_harness.py`

Evaluation artifacts should retain:

- dataset version
- model version when relevant
- input hashes or manifest hashes
- slice configuration
- threshold configuration

## Change Control
- document any new source class before using it in runtime or dataset generation
- re-run evaluation when source distributions or labeling rules change
- update this document together with the adjudication overview and action-plan policy docs

## Exclusions
- do not treat raw LLM narration as an authoritative evidence source
- do not use fabricated production examples as trusted labels
- do not widen source policy into campaign/actor intelligence scope that is outside IoC Manager operations
