# AI-09 Research: IOC Decision Quality Foundation

**Date:** 2026-04-26
**Status:** Complete

## Research Summary

The current sidecar already has a strong operational scaffold: deterministic
feature extraction, calibrated scoring, grounded decisions, safety diagnostics,
evaluation bundles, promotion gates, and pytest coverage. The weakness is not
missing infrastructure. The weakness is that IOC-table quality is not governed
by an IOC-specific labeled evaluation set.

Recent live IOC-table probing showed that sparse IOC rows can now receive
bounded analyst-facing verdicts, but the behavior was created through heuristic
tuning. The next improvement should make that behavior measurable and
promotable through explicit tiers, labels, metrics, and shadow-mode review.

## Existing Implementation Hooks

| Need | Existing Hook |
| --- | --- |
| Score IOC/case payloads | `decision_service.scorer.BaselineScorer` |
| Convert score to operator verdict | `decision_service.decision_support.build_grounded_decision` |
| Evaluate model snapshots | `decision_service.evaluator`, `ai/jobs/evaluate_model.py` |
| Metrics and calibration | `decision_service.evaluation_metrics` |
| Promotion gates | `decision_service.promotion_gates`, `ai/jobs/publish_model.py` |
| Export scored rows | `ai/jobs/export_scored_decision_rows.py` |
| Live IOC probing | `ai/jobs/probe_live_ioc_decisions.py` |
| Backend IOC data | `iocs`, `feed_sources`, `scan_results`, `ai_decision_*` tables |

## Key Planning Findings

1. **Tier policy must be explicit.**
   The model should distinguish attribute-only IOC insight from correlated scan
   evidence and analyst-outcome evidence. The same verdict label can carry very
   different confidence semantics depending on evidence tier.

2. **The table is a useful signal, not enough by itself.**
   `iocs.Type`, `Severity`, `Confidence`, source name/type, first/last seen,
   value shape, and linked scan count are legitimate decision inputs. They
   should produce insight, but with confidence caps and weak-evidence flags.

3. **Evaluation needs label provenance.**
   Analyst-reviewed labels, response outcomes, allowlists, trusted feed labels,
   synthetic fixtures, and heuristic weak labels should not be mixed without
   provenance. Promotion gates should weight or slice them separately.

4. **False positives are the highest-risk failure mode.**
   `likely_malicious` should require a precision gate, and known benign,
   allowlist, false-positive, stale, or revoked rows must not regress.

5. **Shadow mode is the right operational loop.**
   Scoring current IOC rows without writing decision records gives analysts a
   review queue for model calibration without changing production behavior.

## Proposed Evidence Tiers

| Tier | Description | Allowed Verdicts | Confidence Policy |
| --- | --- | --- | --- |
| `attribute_only` | IOC table fields and value-derived features only | `benign`, `likely_benign`, `suspicious`, `likely_malicious`, `insufficient_evidence`, stale/false-positive variants | cap confidence; always mark weak evidence unless label/outcome exists |
| `scan_correlated` | IOC linked to scan result, scanner family, target, rule, or evidence fusion | stronger suspicious/malicious decisions when corroborated | higher cap, require conflict checks |
| `analyst_outcome` | analyst closure, override, response outcome, or accepted action | highest confidence if recent and consistent | strongest gate, still manual-only actions |
| `downgrade_guarded` | stale, revoked, false-positive, allowlist, low-trust, or conflicting | downgrade, suppress, allowlist, or abstain | protect false-positive and stale slices |

## Data and Label Strategy

Recommended output:

- `Workspace/Project/ai/schemas/ioc-evaluation-row.schema.json`
- small fixtures under `Workspace/Project/ai/fixtures/ioc_evaluation/`
- generated larger exports under `Workspace/Project/ai/datasets/generated/` or `Workspace/Project/ai/datasets/processed/` with retention rules
- a job such as `Workspace/Project/ai/jobs/build_ioc_evaluation_dataset.py`

Each row should include:

- stable example id
- IOC id when sourced from the app database
- IOC type/value or redacted value hash, depending on export mode
- severity, confidence, source name/type, first/last seen, age bucket
- linked scan counts and scanner family distribution
- historical decision/override/closure signals where available
- expected verdict
- expected confidence band
- evidence tier
- label provenance
- reviewer notes or review status

## Metric and Gate Strategy

Metrics:

- precision, recall, F1 for malicious-like verdicts
- `likely_malicious` precision
- false-positive rate
- false-negative rate
- Brier score
- calibration bins
- confidence distribution
- abstain rate and abstain-by-tier
- weak-evidence verdict rate

Required slices:

- IOC type
- source name/type
- severity bucket
- table confidence bucket
- age bucket
- evidence tier
- label provenance
- scan evidence availability

Promotion gates:

- fail if `likely_malicious` precision drops below threshold
- fail if false-positive protected cases regress
- fail if Brier/calibration exceeds threshold
- fail if high-quality attribute-only rows over-abstain
- fail if required slices are missing or too small without explicit waiver metadata

## Validation Architecture

The phase should validate in layers:

1. Schema and fixture tests for evaluation rows.
2. Dataset-builder tests using temp directories and fixture IOC rows.
3. Feature extraction/scorer tests for IOC value and source features.
4. Evaluation metric tests for IOC slices and confidence bands.
5. Promotion gate tests for pass/fail behavior.
6. Shadow-mode job tests that use fixture data and never require production DB access.
7. Full sidecar pytest plus repository boundary guard.

## Risks

- Live database access can expose operational IOC values; reporting should mask or hash values by default.
- Weak labels can make metrics look better than they are; label provenance must be preserved.
- Tuning attribute-only rows too aggressively can increase false positives; confidence caps and false-positive gates are required.
- Generated datasets can create noisy git churn; keep large exports untracked.

## Coverage Matrix

| Requirement / Decision | Plan |
| --- | --- |
| D-AI9-01 IOC decision tiers | AI-09-01, AI-09-03 |
| D-AI9-02 evaluation dataset | AI-09-01 |
| D-AI9-03 feature improvements | AI-09-02 |
| D-AI9-04 metrics and gates | AI-09-03 |
| D-AI9-05 shadow mode | AI-09-04 |
| D-AI9-06 active app context | all plans |
