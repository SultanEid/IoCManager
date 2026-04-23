# AI Decision System Reference

## Plain-English Summary
This system is a human-governed security decision assistant.

In practice, it helps operators by:

- taking in detections, indicators, rule hits, and report context
- estimating risk, uncertainty, and false-positive pressure
- producing a decision label such as malicious, suspicious, benign, or insufficient evidence
- proposing manual-only next actions
- explaining why the result was produced
- attaching provenance and similar historical context where available

It is not designed as a black-box auto-remediation engine. Its job is to help an operator make a better decision faster, while keeping execution under human control.

## Purpose
This document is the current technical reference for the AI decision and action-plan subsystem inside IoC Manager.

It is intended to answer:

- what the AI subsystem does
- what data it uses
- how it is trained and evaluated
- what is currently live
- how it behaves in the app
- where the current limits still are

## Scope
The AI subsystem is decision support for IoC Manager. It is not autonomous response.

It currently covers:

- detection and IOC decision support
- explanation generation
- ranked action-plan generation
- evidence tracking
- similar-detection lookup
- operator override / closure support
- offline dataset building
- offline model training and evaluation

It does not currently provide:

- autonomous remediation
- direct containment or blocking
- broad CTI graph intelligence
- unsupervised internet ingestion in production

## Core Principles
- Human approval is required for operator actions.
- Low-evidence cases should stay conservative.
- Missing provenance lowers trust.
- Conflicting evidence lowers confidence and can force abstention.
- Confidence is directional, not certainty.
- Source provenance is first-class in both runtime and offline data.

## Current Live Runtime
As of `2026-04-22`, the live service state is:

- Active model version: `v1-reliable-mix-v3-20260422124041`
- Active dataset version: `reliable-mix-v3`
- Sidecar health endpoint: `http://127.0.0.1:8100/health`
- Backend readiness endpoint: `http://localhost:5127/health/ready`

### Active Model Metrics
- Precision: `0.8966`
- Recall: `0.8966`
- PR AUC: `0.9887`
- Calibration error: `0.0618`
- Abstain rate: `0.0`
- Coverage: `1.0`
- Validation sample size: `60`

### Active Thresholds
- Recommend: `0.5293`
- Escalate: `0.7093`
- Abstain: `0.3293`

### Active Calibration
- Method: `logistic`
- Slope: `5.0255`
- Intercept: `0.4932`

## Model Lineage
Current local model registry contains four recorded versions:

| Model version | Dataset | Status | Precision | Recall | Calibration error |
| --- | --- | --- | ---: | ---: | ---: |
| `v1-reliable-mix-v2-20260422115235` | `reliable-mix-v2` | archived | 1.0000 | 0.5714 | 0.1256 |
| `v1-reliable-mix-v3-20260422121843` | `reliable-mix-v3` | archived | 0.8966 | 0.8966 | 0.4358 |
| `v1-reliable-mix-v3-20260422124041` | `reliable-mix-v3` | active | 0.8966 | 0.8966 | 0.0618 |
| `v1-reliable-mix-v3-20260422131539` | `reliable-mix-v3` | candidate | 0.9000 | 0.9310 | 0.3800 |

### Promotion Notes
- The active model is not the highest-recall candidate ever trained.
- The current active version was chosen because it materially improved calibration while keeping precision and recall strong.
- The later candidate was not promoted because calibration degraded too much.

## System Architecture
The AI subsystem has four main layers:

1. Backend API and worker orchestration in the ASP.NET application
2. Python sidecar runtime for scoring, evidence fusion, explanation, and action plans
3. Offline dataset / training / evaluation jobs
4. Frontend workbench surfaces for decision review and IOC-level inspection

### Backend Responsibilities
- accepts decision requests
- stores request/result/explanation/action-plan records
- polls and exposes decision state
- supports IOC-native decision generation
- links decisions to detections and IOCs where possible
- exposes decision, explanation, action plan, similar-detection, and evidence-source reads

### Python Service Responsibilities
- evidence fusion
- family-specific deterministic reasoning
- trained-score inference and calibration
- confidence and false-positive risk shaping
- explanation generation
- action-plan generation
- safety enforcement

### Frontend Responsibilities
- detection-level decision page in `/scans/[detectionId]`
- IOC Explorer drawer with IOC-native decision generation
- explanation, evidence, action-plan, and status display
- honest empty / pending / degraded states

## Supported Families and IOC Types
### Supported rule families
- `sigma`
- `snort`
- `suricata`
- `yara`

### Supported IOC and evidence classes
- file and hash indicators
- process and log evidence for Sigma-like rows
- network indicators and flow evidence for Snort and Suricata
- sample and rule-linked evidence for YARA and YARAify-style rows
- internal allowlist and clean-baseline evidence
- historical analyst outcomes when available

## Runtime Decision Flow
At a high level, the live decision flow is:

1. Build a normalized decision package from a detection or IOC
2. Preserve provenance and evidence atoms
3. Run family-specific reasoning and evidence fusion
4. Run trained scoring and calibration
5. Apply safety and confidence shaping
6. Persist result, explanation, and action plan
7. Expose the result back to the app

### End-To-End View
In broader system terms, the flow is:

1. input arrives from detections, reports, or IOC context
2. payloads are normalized into a stable internal structure
3. scoring computes model-driven and rule-driven signals
4. family-specific logic and evidence fusion add safeguards
5. safety logic converts those signals into a conservative operator-facing decision
6. action planning proposes policy-constrained manual next steps
7. explanation logic turns the result into human-readable rationale with provenance
8. historical context can add similar prior cases when available
9. backend orchestration stores results and serves them back to the workbench

### IOC-Native Flow
IOC Explorer supports a direct IOC-native decision path.

This path:

- resolves the IOC
- shapes a legacy IOC package when there is no normalized detection page
- submits the package to the decision service
- polls for completion
- shows the result inside the drawer

If there is no materialized detection record, the IOC still gets a decision result, but there may be no full detection page to open.

## API Surface
### Decision-oriented reads
- Latest decision by detection:
  - `/api/v2/ai/decisions/detections/{detectionId}/latest`
- Latest decision by IOC:
  - `/api/v2/ai/decisions/iocs/{iocId}/latest`
- Generate decision for IOC:
  - `/api/v2/ai/decisions/iocs/{iocId}/generate`

### Result lifecycle reads and writes
The backend still uses one older route family internally for result polling and related detail reads. That controller currently provides:

- submit decision request
- get result
- get explanation
- get action plan
- submit override / closure
- get similar detections
- get evidence sources

Reference controller:
- [AiDecisionsController.cs](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/backend/src/Backend.Api/Controllers/V2/AiDecisionsController.cs)

## Persistence Model
The system already persists decision data in dedicated tables. Core tables include:

- `ai_decision_requests`
- `ai_decision_results`
- `ai_decision_explanations`
- `ai_action_plan_recommendations`
- `ai_decision_overrides`
- `ai_decision_similar_detections`
- `ai_decision_evidence_sources`

The current design is normalized. The system does not rely on a second duplicate "AI decisions" table as a second source of truth.

Additional linkage hardening already exists:

- `DetectionRecordId` link from AI request rows to `scan_results`
- index support for detection-based lookups
- IOC-level latest-decision read model

## Dataset Stack
### Current registered datasets
| Dataset version | Created UTC | Manifest hash |
| --- | --- | --- |
| `external-seed-v1` | `2026-04-22T07:29:50Z` | `54037cd7038145c5eb8978a69fff3f7980b058dc1bab29c99a60a44b23f5a679` |
| `external-seed-v2` | `2026-04-22T08:10:42Z` | `370a4c9717e9bd9d967fbdcd31322d7261a7cf5fdda1bd055b6581925ed79081` |
| `reliable-mix-v1` | `2026-04-22T11:19:07Z` | `c914ce48dd121e62fe71d0b9fb9c0aa5198c75269e279d0e74fc7da2e61747fc` |
| `reliable-mix-v2` | `2026-04-22T11:37:10Z` | `bbab6c1a5bc2abc90ac0defb865bb7c68c0dd9ed0e2efbda7c90f12978ccb237` |
| `reliable-mix-v3` | `2026-04-22T12:15:29Z` | `83ee14509bb8a391721e6f02138750f7db1478a92b2ad09805c7e079d530d76a` |

### Current active dataset
`reliable-mix-v3`

Dataset manifest:
- [manifest.json](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/datasets/processed/reliable-mix-v3/manifest.json)

Dataset quality report:
- [quality_report.json](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/datasets/processed/reliable-mix-v3/quality_report.json)

Training-row format reference:
- [training_row_format.md](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/datasets/processed/reliable-mix-v3/training_row_format.md)

## Current Dataset Quality: `reliable-mix-v3`
### Size and family mix
- Total rows: `297`
- Sigma: `141`
- Snort: `66`
- Suricata: `69`
- YARA: `21`

### Source mix
- `sigmahq`: `96`
- `et-open-suricata`: `64`
- `snort-community`: `48`
- `internal-reviewed-telemetry`: `18`
- `internal-clean-baselines`: `12`
- `internal-allowlists`: `12`
- `malwarebazaar`: `7`
- `yaraify`: `7`
- `threatfox`: `6`
- `urlhaus`: `6`
- fixture rows across families and wrappers: `21`

### Label distribution
- `likely_malicious`: `164`
- `suspicious`: `49`
- `malicious`: `34`
- `benign`: `27`
- `false_positive`: `8`
- `insufficient_evidence`: `8`
- `likely_benign`: `7`

### Quality gates
- Partial row rate: `0.0`
- Missing critical field counts: none
- Provenance completeness rate: `1.0`
- Active-use eligibility: `passed`

### Duplicate pressure
Duplicate pressure is low. The only current duplicate key reported is:

- `domain:relay-check.example.internal` inside `internal-reviewed-telemetry`

Duplicate rate for that source:

- `0.0556`

## Approved and Supported Data Sources
### Currently supported external staging
- MalwareBazaar
- YARAify
- ThreatFox
- URLhaus

### Supported official rule sources
- SigmaHQ
- Snort community rules
- ET Open Suricata rules

### Supported internal sources
- internal clean baselines
- internal allowlists
- internal reviewed telemetry

### Deferred sources
- VX-Underground remains disabled
- other sources should remain manual and provenance-controlled until parser support and governance exist

For the current source policy, see:
- [dataset-sources.md](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/docs/dataset-sources.md)

## Training Data Format
Canonical JSONL rows produced by the dataset build carry:

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

Important semantics:

- `package_payload` is the normalized decision input
- `target_payload` stores decision and action-plan targets
- `raw_payload` keeps the pre-normalization source record
- `parser_diagnostics` keeps parse notes without dropping rows
- incomplete rows can remain visible and explicit rather than being fabricated

## Training and Evaluation Pipeline
### Core jobs
- build dataset:
  - `ai/jobs/build_decision_dataset.py`
- export scored decision rows:
  - `ai/jobs/export_scored_decision_rows.py`
- train baseline model:
  - `ai/jobs/train_baseline.py`
- evaluate snapshot:
  - `ai/jobs/evaluate_model.py`
- run offline evaluation harness:
  - `ai/jobs/run_evaluation_harness.py`
- benchmark shipped fixtures:
  - `ai/jobs/benchmark_fixture_decisions.py`
- inventory staged and processed datasets:
  - `ai/jobs/inventory_datasets.py`

### Offline evaluation outputs
The system currently supports:

- precision
- recall
- F1
- confusion matrix
- abstention rate
- false-positive rate
- false-negative rate
- calibration error
- Brier score
- family-level slices
- evidence-availability slices
- action-plan metrics

## Current Quality Story
### Shipped fixture benchmark
The shipped fixture benchmark is currently clean:

- exact accuracy: `1.0`
- coarse accuracy: `1.0`

This is useful as a regression gate, but it is not enough on its own to claim strong real-world performance.

### Built-dataset performance
The current active model on `reliable-mix-v3` has:

- precision `0.8966`
- recall `0.8966`
- strong ranking quality
- materially improved calibration compared with earlier `v3` candidates

### Calibration status
Calibration was a real problem earlier in the day. That was improved without promoting the looser weighted candidate.

Current state:

- active model calibration error: `0.0618`
- earlier `v3` version: `0.4358`
- later weighted candidate: `0.3800`

The current active model was chosen because calibration improved sharply while the main ranking behavior stayed strong.

## Product Positioning
### One-sentence description
This is a human-governed AI decision assistant for security operations that scores detections, explains its reasoning, and recommends safe manual next actions.

### What to emphasize
- It is not autonomous response.
- It is not intended to hide uncertainty.
- It is designed to make triage more consistent, faster, and easier to audit.

### What to show in demos
1. Input a real detection or IOC.
2. Show the decision label, confidence, and false-positive risk.
3. Show what evidence supported the outcome and what evidence was missing or contradictory.
4. Show that recommended actions stay manual and policy-constrained.
5. Show explanation and provenance rather than black-box output.
6. Show similar prior outcomes when the system has them.

### Main differentiators
- Traceable decisions with reasons and provenance
- Built-in abstention and evidence-aware caution
- Manual-only action planning with policy constraints
- Human-in-the-loop operation by default
- Real orchestration and persistence instead of a stateless demo-only model

## Live IOC Confidence Quality
### What changed
Live IOC rows were previously too flat. Many medium-signal network rows surfaced as the same very low confidence even when severity and source context differed.

That has now been improved by:

- richer IOC-native package shaping in the backend
- source-aware handling for legacy IOC Explorer rows in the scorer
- controlled confidence blending for sparse family-level results

### Before / after live probe
On an 8-row live IOC probe:

| Metric | Before | After |
| --- | ---: | ---: |
| Average confidence | `0.0730` | `0.2346` |
| Low-band rows | `8` | `0` |
| Medium-band rows | `0` | `8` |
| Medium-signal rows | `0` | `8` |

Family breakdown after the fix:

- Suricata average confidence: `0.2367`
- Snort average confidence: `0.2283`

Severity breakdown after the fix:

- Medium: `0.2313`
- High: `0.2338`
- Critical: `0.2420`

Important note:

- The live verdict for many sparse IOC-native rows can still correctly remain `insufficient_evidence`.
- The improvement here is confidence differentiation and calibration quality, not forcing aggressive verdict promotion.

## Safety Model
The AI subsystem is explicitly constrained.

### Safety rules
- never auto-remediate
- abstain when evidence is weak
- lower confidence when evidence conflicts
- surface false-positive risk explicitly
- cap recommendation severity when confidence is low
- degrade gracefully when enrichment is unavailable
- log failures, abstentions, and partial-evidence cases

### Safety diagnostics currently tracked
- weak evidence
- contradictory evidence
- contradiction score
- missing critical fields
- partial evidence
- enrichment status
- false-positive risk
- severity cap applied
- maximum recommendation severity
- degradation reasons

## Action Plans
Action plans are produced as ranked manual-only recommendations.

Expected characteristics:

- manual execution only
- no autonomous follow-through
- human approval where required
- evidence-linked rationale
- prerequisites and cautions
- severity-constrained recommendations

Related policy:
- [action-plan-policy.md](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/docs/action-plan-policy.md)

## Verdict Taxonomy
Current decision labels in use include:

- `benign`
- `likely_benign`
- `false_positive`
- `insufficient_evidence`
- `suspicious`
- `likely_malicious`
- `malicious`
- `stale_or_revoked`

Related taxonomy reference:
- [verdict-taxonomy.md](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/docs/verdict-taxonomy.md)

## Key Implementation Files
### Backend
- [AiDecisionsController.cs](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/backend/src/Backend.Api/Controllers/V2/AiDecisionsController.cs)
- [ServiceCollectionExtensions.cs](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/backend/src/Backend.Application/DependencyInjection/ServiceCollectionExtensions.cs)

### Python service
- [api.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/service/decision_service/api.py)
- [decision_support.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/service/decision_service/decision_support.py)
- [scorer.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/service/decision_service/scorer.py)
- [evidence_fusion.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/service/decision_service/evidence_fusion.py)
- [sigma_decision.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/service/decision_service/sigma_decision.py)
- [snort_decision.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/service/decision_service/snort_decision.py)
- [yara_decision.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/service/decision_service/yara_decision.py)
- [action_plan_recommender.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/service/decision_service/action_plan_recommender.py)

### Dataset and evaluation jobs
- [build_decision_dataset.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/jobs/build_decision_dataset.py)
- [export_scored_decision_rows.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/jobs/export_scored_decision_rows.py)
- [train_baseline.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/jobs/train_baseline.py)
- [evaluate_model.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/jobs/evaluate_model.py)
- [run_evaluation_harness.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/jobs/run_evaluation_harness.py)
- [benchmark_fixture_decisions.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/jobs/benchmark_fixture_decisions.py)
- [inventory_datasets.py](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/ai/jobs/inventory_datasets.py)

## Known Gaps
### Data and runtime gaps
- live IOC sampling is still richer for network rows than for Sigma and YARA rows
- many IOC-native rows still carry sparse evidence and will continue to land in `insufficient_evidence`
- medium-trust internal rows have improved, but that slice still needs broader long-tail coverage

### Operational gaps
- some older internal file and route names still use older vocabulary
- local staged raw data and processed bundles are intentionally not committed
- authenticated larger abuse.ch pulls are not wired in by default and still need local keys if broader imports are desired

### Quality gaps
- fixture performance is perfect, but that is still a limited benchmark
- broader live-row evaluation should keep expanding beyond the current sample mixes
- confidence quality is improved, but live verdict richness still depends on better IOC-native package detail

## Recommended Next Steps
1. Expand realistic live Sigma and YARA IOC samples so live confidence quality is measured across all families.
2. Continue growing medium-trust internal telemetry rows with provenance intact.
3. Add broader negative and routine-known-good rows so false-positive control stays honest as recall improves.
4. Keep the active model unless a future candidate improves both calibration and live-row behavior.
5. Continue treating manual, provenance-controlled staging as the only approved external data path.

## Priority Engineering Themes
The best next engineering themes remain:

1. trustworthy runtime behavior when data or model loading degrades
2. strict consistency between score math and explanation math
3. stronger long-tail internal data quality, especially medium-trust rows
4. continued modular cleanup in the largest Python AI modules
5. broader operational observability for latency, abstention, and contradiction patterns

## Related Documents
- [AI Decision Overview](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/docs/ai-decision-overview.md)
- [Dataset Sources](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/docs/dataset-sources.md)
- [Verdict Taxonomy](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/docs/verdict-taxonomy.md)
- [Action Plan Policy](C:/Users/xsspe/Desktop/IOC_Manager/Workspace/Project/docs/action-plan-policy.md)


