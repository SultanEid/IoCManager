# AI-2: Broken Path Stabilization - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

AI-2 stabilizes fragile AI sidecar runtime and artifact paths before deeper data, training, evaluation, or deployment work. The active implementation scope is `Workspace/Project/ai/service` plus AI documentation under `Workspace/Project/ai` and `Workspace/Project/docs`.

This phase should not change scorer math, train a new model, restructure the data pipeline, introduce deployment packaging, or touch the legacy/decommissioned `src/IocManager.Web` surface.
</domain>

<decisions>
## Implementation Decisions

### Runtime safety
- **D-AI2-01:** Keep deprecated compatibility routes available during this phase, but document their support status and add production-safe restrictions where risk is high.
- **D-AI2-02:** `/score_batch` needs hard item-count and request-size limits before model or API expansion.
- **D-AI2-03:** `/evaluate_model` must be gated so production deployments do not expose ad hoc dataset evaluation through the HTTP API.
- **D-AI2-04:** Runtime degradation paths may stay deterministic, but silent broad exception handling should become visible through logs, readiness metadata, or explicit warnings without leaking secrets or IOC payload details.

### Filesystem safety
- **D-AI2-05:** Model and dataset registry saves should use same-directory temporary files plus atomic replace semantics.
- **D-AI2-06:** Feedback append behavior can remain JSONL append in this phase, but it needs documented durability/concurrency limits and focused tests for in-process safety.
- **D-AI2-07:** Registry paths should not be made portable in this phase unless required by the stabilization changes; portable artifact path semantics are assigned to AI-4.

### Job support policy
- **D-AI2-08:** Job scripts referenced by docs must either have smoke coverage or be clearly labeled experimental.
- **D-AI2-09:** Existing uncommitted job scripts, if present during execution, must be treated as user work. Executors should work with them if needed and must not remove or overwrite them.

### the agent's Discretion
- Exact config variable names are implementation discretion as long as names are documented and tests cover production defaults.
- Exact HTTP status codes for gated/deprecated endpoints are implementation discretion, but oversized batch requests and disabled evaluation requests must fail predictably.
- Exact log implementation is implementation discretion, but emitted messages must avoid secrets and sensitive payload contents.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before implementing AI-2.**

### Phase scope and roadmap
- `.planning/AI_MODEL_ENHANCEMENT_ROADMAP.md` - AI model roadmap, AI-2 success criteria, and cross-phase constraints.
- `.planning/codebase/AI_MODEL_MAP.md` - Current architecture, training/inference flow, data pipeline, model files, evaluation scripts, dependencies, and weak points.
- `.planning/phases/ai-02-broken-path-stabilization/AI-02-RESEARCH.md` - Focused implementation research for this phase.

### Active AI sidecar files
- `Workspace/Project/ai/service/decision_service/api.py` - FastAPI routes, runtime construction, deprecated endpoints, batch scoring, model evaluation.
- `Workspace/Project/ai/service/decision_service/config.py` - environment-backed settings and local `.env` loading behavior.
- `Workspace/Project/ai/service/decision_service/registry.py` - model registry persistence.
- `Workspace/Project/ai/service/decision_service/dataset_registry.py` - dataset registry persistence.
- `Workspace/Project/ai/service/decision_service/feedback_store.py` - JSONL feedback and historical-learning persistence.
- `Workspace/Project/ai/service/tests/test_api.py` - API tests; may already contain unrelated user edits.
- `Workspace/Project/ai/service/tests/test_registry.py` - model registry tests.
- `Workspace/Project/ai/service/tests/test_dataset_registry.py` - dataset registry tests.

### Documentation and validation
- `Workspace/Project/docs/ai-model-pipeline.md` - AI-1 pipeline baseline.
- `Workspace/Project/ai/README.md` - AI root orientation.
- `Workspace/Project/ai/service/README.md` - sidecar usage and runtime docs.
- `Workspace/Project/docs/validation.md` - validation command source of truth.
</canonical_refs>

<code_context>
## Existing Code Insights

### API runtime
- `create_app()` builds a `ServiceRuntime` once and closes over it in route functions.
- `/score_batch` loops over request items and returns per-item success or error, but currently has no explicit item-count, payload-size, runtime, or memory limit.
- `/evaluate_model` is deprecated but callable and can load dataset snapshots and persist dataset registry entries.
- `_build_runtime()` catches dataset snapshot load failures broadly and falls back to an empty source trust map, which keeps scoring available but hides a readiness-quality issue.

### Settings
- `ServiceSettings` already centralizes artifact paths, dataset version, historical-learning bounds, and optional OpenAI values.
- Settings currently parse several numeric environment variables directly; malformed values may fail startup.
- Local `.env` loading exists for development convenience. This phase must not read or print secret values.

### Registries and feedback
- `ModelRegistryStore.save()` writes registry JSON directly with `Path.write_text()`.
- `DatasetRegistryStore.save()` writes registry JSON directly with `Path.write_text()`.
- `HistoricalLearningStore.append()` writes one JSONL row under a per-instance `threading.Lock`; it does not provide cross-process locking.

### Jobs and docs
- AI-1 docs reference multiple job scripts as part of the model/data/evaluation flow.
- Some job scripts may exist as uncommitted user work. AI-2 planning should preserve those edits and require smoke coverage or explicit experimental labeling rather than assuming they are stable.
</code_context>

<specifics>
## Specific Ideas

- Add settings for maximum batch items, maximum request body bytes, and evaluation endpoint enablement.
- Enforce request size before body parsing with FastAPI middleware or an equivalent pre-route guard.
- Enforce batch item count in `/score_batch` with a focused API test.
- Disable or restrict `/evaluate_model` when `environment` is production-like unless an explicit opt-in is set.
- Surface runtime artifact/dataset degradation in `/health` without including secrets or raw IOC payload data.
- Add a tiny shared atomic-write helper only if it meaningfully reduces duplicated file-safety logic.
- Extend registry tests to prove failed writes do not leave truncated registry files.
- Add feedback-store tests around append validity and in-process concurrent appends; document cross-process limits.
- Add a support-status table for deprecated and experimental AI routes/jobs.
</specifics>

<deferred>
## Deferred Ideas

- Full sidecar authentication and private-ingress design belongs to AI-8.
- Registry artifact path portability belongs to AI-4.
- Dataset quality reports, leakage checks, and split governance belong to AI-3 and AI-5.
- Full job test expansion belongs to AI-6, except for smoke coverage needed to make AI-2 docs truthful.
</deferred>

---

*Phase: AI-2 Broken Path Stabilization*
*Context gathered: 2026-04-26*
