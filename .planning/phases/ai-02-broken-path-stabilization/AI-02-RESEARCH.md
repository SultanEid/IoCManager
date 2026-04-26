# AI-2: Broken Path Stabilization - Research

**Researched:** 2026-04-26
**Status:** Complete

## Phase Summary

AI-2 should stabilize known fragile AI sidecar paths before changing model behavior. The highest-value work is to bound deprecated runtime endpoints, gate HTTP-triggered evaluation in production, make registry writes safer, make intentional runtime degradation visible, and make docs truthful about supported versus experimental job scripts.

## Existing Assets

### Runtime API

- `Workspace/Project/ai/service/decision_service/api.py` owns all FastAPI route definitions through `create_app()`.
- `GET /health` already returns service, model, dataset, and schema metadata and is the right place to surface non-secret readiness warnings.
- Deprecated compatibility endpoints remain live: `/score_case`, `/score_batch`, `/recommend_action`, `/request_more_evidence`, `/feedback`, `/evaluate_model`, `/graph_neighbors`, `/graph/link_candidates`, and `/explain_case`.
- `/score_batch` validates per item but has no hard limit on item count or request body size.
- `/evaluate_model` can load snapshots and upsert dataset registry metadata from an HTTP request.

### Settings and environment policy

- `Workspace/Project/ai/service/decision_service/config.py` provides `ServiceSettings` and `load_settings()`.
- The settings layer supports both generic and `IOC_MANAGER_` aliases for optional OpenAI configuration.
- Local `.env` loading is present; implementation and tests must not print `.env` contents or secret values.
- New runtime guard settings should live in `ServiceSettings` and have conservative defaults.

### Registry persistence

- `Workspace/Project/ai/service/decision_service/registry.py` stores model registry entries and active model state.
- `Workspace/Project/ai/service/decision_service/dataset_registry.py` stores dataset metadata.
- Both stores write complete JSON documents directly with `Path.write_text()`, which risks partial/truncated files if a write is interrupted.
- Registry tests currently cover roundtrip and promotion behavior, but not interrupted writes or atomic replacement.

### Feedback persistence

- `Workspace/Project/ai/service/decision_service/feedback_store.py` stores historical learning events in JSONL.
- `HistoricalLearningStore.append()` uses an instance-local lock, appends a single serialized line, and query reads the log under the same lock.
- The store does not provide cross-process locking. AI-2 can document this limitation and test same-process safety without introducing a heavier persistence layer.

### Job support

- AI-1 documentation describes dataset build, training, evaluation, publishing, and probe jobs.
- The roadmap calls for job smoke coverage or clear experimental labeling for job scripts referenced by docs.
- Some job scripts in `Workspace/Project/ai/jobs` may be uncommitted user work; execution should avoid destructive cleanup and stage only deliberate phase changes.

## Recommended Plan Shape

Use three executable plans:

1. **Runtime endpoint guards and support policy** - add config-backed request limits, `/evaluate_model` production gating, health warnings, and endpoint support docs.
2. **Registry and feedback write safety** - add atomic registry saves, focused registry durability tests, feedback append safety tests, and persistence limitation docs.
3. **Job support labeling and smoke coverage** - reconcile docs with job reality by adding smoke tests for supported jobs or labeling experimental jobs clearly.

## Validation Architecture

Focused AI validation for AI-2:

```powershell
Push-Location Workspace/Project/ai/service
pytest tests/test_api.py tests/test_registry.py tests/test_dataset_registry.py
Pop-Location
```

Additional validation when job docs/tests are changed:

```powershell
Push-Location Workspace/Project/ai/service
pytest tests/test_*job*.py tests/test_api.py tests/test_registry.py tests/test_dataset_registry.py
Pop-Location
```

Repository boundary validation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

## Risks and Constraints

- Do not log request bodies, IOC payloads, `.env` contents, API keys, or local secret values.
- Do not remove deprecated endpoints outright; compatibility behavior can remain while high-risk routes are bounded or gated.
- Do not implement full sidecar authentication in this phase unless it is already locally patterned and low-risk. AI-8 owns production access control.
- Do not rework scorer math, thresholds, calibration, or model registry path portability in this phase.
- Work around existing unrelated user edits in AI service files; do not revert or overwrite them.

## Source Audit

| Source | ID | Feature/Requirement | Plan | Status | Notes |
|--------|----|---------------------|------|--------|-------|
| ROADMAP | AI-2-SC1 | Deprecated/compat endpoints have explicit support policy and production restriction plan | AI-02-01 | COVERED | Docs plus runtime gate for high-risk evaluation endpoint |
| ROADMAP | AI-2-SC2 | `/score_batch` item-count and payload-size limits | AI-02-01 | COVERED | Config-backed tests required |
| ROADMAP | AI-2-SC3 | `/evaluate_model` disabled/authenticated/development-only in production settings | AI-02-01 | COVERED | Production default must reject predictably |
| ROADMAP | AI-2-SC4 | Registry and feedback writes use safe behavior | AI-02-02 | COVERED | Atomic registry writes; feedback safety and limitation docs |
| ROADMAP | AI-2-SC5 | Broad exception handling reviewed and surfaced safely | AI-02-01 | COVERED | Health warnings/logging for runtime degradation |
| ROADMAP | AI-2-SC6 | Referenced job scripts have smoke tests or experimental label | AI-02-03 | COVERED | Job support matrix and smoke tests |
| REQ | AI-01 | Sidecar workload limits | AI-02-01 | COVERED | Batch and payload limits |
| REQ | AI-03 | Auditable model/dataset registry | AI-02-02 | PARTIAL | Safe writes now; full artifact portability later |
| REQ | AI-04 | Optional OpenAI secret-safe config | AI-02-01 | COVERED | Logging and config tests must remain secret-safe |

## Research Result

## RESEARCH COMPLETE

AI-2 can be executed as three plans across two waves. Runtime guards and registry persistence safety can be implemented first. Job support labeling and smoke coverage should follow once the executor sees the final job-script state in the working tree.
