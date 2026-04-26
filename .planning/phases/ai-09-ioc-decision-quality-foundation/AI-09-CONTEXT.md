# AI-09: IOC Decision Quality Foundation - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning
**Source:** User request after live IOC-table model assessment

<domain>
## Phase Boundary

This phase improves the AI sidecar's IOC decision quality for the active IOC
Manager application. The sidecar must give analysts useful IOC-level insight
from the IOC table itself, while preserving human-in-the-loop decision support
and never becoming an autonomous response engine.

The work starts from the current state where sparse IOC-table rows can now
produce bounded `suspicious` or `likely_malicious` outputs, but the behavior is
still too heuristic and lacks an IOC-specific labeled evaluation foundation.

</domain>

<decisions>
## Implementation Decisions

### D-AI9-01: IOC Decision Tiers
- Attribute-only IOC rows may return `suspicious` or `likely_malicious`, but confidence must be capped and weak evidence must remain visible.
- IOC rows with linked scan evidence may return stronger verdicts when correlated evidence supports them.
- IOC rows with analyst closure, override, or response outcome evidence should receive the highest confidence when the outcome is consistent and recent.
- Low-trust, conflicting, stale, revoked, allowlisted, or false-positive IOC rows must abstain, downgrade, suppress, or allowlist as appropriate.

### D-AI9-02: Evaluation Dataset Comes First
- Build an IOC evaluation dataset from real `iocs` table rows, not only external synthetic/source snapshots.
- Sample by IOC type, severity, source, confidence, age, evidence availability, and prior analyst outcome where present.
- Include benign, malicious, suspicious, stale, false-positive, and weak-evidence examples.
- Each example must include expected verdict and expected confidence band.
- Generated datasets and reports must stay out of source unless they are small fixtures or schemas.

### D-AI9-03: Feature Improvements Are Bounded
- Improve IOC type strength for IP, domain, URL, hash, process, and artifact.
- Improve IOC value features for suspicious paths, PowerShell flags, public documentation/test ranges, risky TLDs, URL shape, and hash format.
- Improve source features from feed source type/name/trust.
- Improve table features from severity, confidence, first/last seen, and recency.
- Improve correlation features from linked scan count, sightings, target exposure, historical decisions, overrides, and response outcomes.

### D-AI9-04: Model Quality Gates
- Evaluate precision, recall, F1, false-positive rate, false-negative rate, PR-AUC where applicable, Brier score, calibration, confidence distribution, and abstain rate.
- Slice metrics by IOC type, source, severity, confidence bucket, age bucket, evidence tier, and label provenance.
- No model or threshold change can be promoted unless it improves or preserves IOC evaluation gates.
- `likely_malicious` must have a minimum precision gate.
- False-positive and allowlist cases must remain protected.

### D-AI9-05: Shadow Mode
- Add a shadow-mode live IOC scoring report that scores current IOC rows without writing decision records or changing analyst workflows.
- Report verdict distribution, confidence bands, weak spots, likely false positives, abstain/downgrade reasons, and slices.
- Use analyst review of shadow output to create or refine labels.

### D-AI9-06: Active App Context
- Work only under `Workspace/Project/`.
- Do not reintroduce legacy `src/IocManager.Web`.
- Do not read or print `.env` files or secrets.
- Do not print raw connection strings or secret-backed config values.
- Keep action plans manual-only.

</decisions>

<canonical_refs>
## Canonical References

### AI Model Map
- `.planning/codebase/AI_MODEL_MAP.md` - Current architecture, active model, training flow, data pipeline, evaluation scripts, and weak points.
- `.planning/AI_MODEL_ENHANCEMENT_ROADMAP.md` - Completed AI-1 through AI-8 roadmap and cross-phase constraints.

### Active AI Runtime
- `Workspace/Project/ai/service/decision_service/scorer.py` - Feature extraction and calibrated scoring.
- `Workspace/Project/ai/service/decision_service/decision_support.py` - Grounded verdict, safety rails, and action-plan orchestration.
- `Workspace/Project/ai/service/decision_service/evaluation_metrics.py` - Existing metric and slice infrastructure.
- `Workspace/Project/ai/service/decision_service/promotion_gates.py` - Existing promotion-gate evaluation.
- `Workspace/Project/ai/jobs/evaluate_model.py` - Offline model evaluation report generation.
- `Workspace/Project/ai/jobs/publish_model.py` - Promotion gate enforcement before model activation.
- `Workspace/Project/ai/jobs/probe_live_ioc_decisions.py` - Existing live backend IOC probing utility.

### Backend IOC Context
- `Workspace/Project/backend/src/Backend.Domain/IocManager/IocEntities.cs` - Feed source, IOC file, and IOC domain entities.
- `Workspace/Project/backend/src/Backend.Infrastructure/Persistence/Configurations/IocManagerConfiguration.cs` - `iocs`, `feed_sources`, `scan_results`, and related mapping.
- `Workspace/Project/backend/src/Backend.Api/Controllers/V2/AiDecisionsController.cs` - Backend IOC decision generation and sidecar payload shaping.
- `Workspace/Project/backend/src/Backend.Api/Controllers/V2/IocsController.cs` - IOC table API shape.

### Docs and Tests
- `Workspace/Project/docs/ai-decision-system-reference.md` - Current AI decision system reference.
- `Workspace/Project/docs/ai-sidecar-operator-workflows.md` - Operator commands for setup, scoring, training, evaluation, publish, and rollback.
- `Workspace/Project/ai/service/tests/test_decision_contract_safety.py` - Current IOC-table fallback and decision safety regression tests.
- `Workspace/Project/ai/service/tests/test_evaluate_model_job.py` - Evaluation job behavior.
- `Workspace/Project/ai/service/tests/test_train_and_publish_jobs.py` - Publish gate behavior.

</canonical_refs>

<specifics>
## Specific Ideas

- Create an IOC decision tier taxonomy used by both runtime and evaluation.
- Add a small fixture-backed IOC evaluation set to source control and keep large live exports generated.
- Add a job that exports sampled IOC rows into reviewable JSONL/CSV without writing model decisions.
- Add a label schema for expected verdict, confidence band, label provenance, evidence tier, and reviewer notes.
- Add feature tests for suspicious process command lines, registry persistence artifacts, URL payload paths, documentation/test IP ranges, hash formats, and trusted/low-trust sources.
- Extend promotion gates with IOC-specific thresholds and required slices.
- Add shadow-mode reporting as an operator workflow.

</specifics>

<deferred>
## Deferred Ideas

- Fully autonomous remediation remains out of scope.
- Large-scale production CTI feed ingestion beyond the existing supported sources remains out of scope.
- Replacing the deterministic scorer with a different model family is out of scope until the IOC evaluation dataset and gates are in place.
- Writing shadow-mode scores back to production decision tables is out of scope for this phase.

</deferred>

---

*Phase: AI-09-ioc-decision-quality-foundation*
*Context gathered: 2026-04-26*
