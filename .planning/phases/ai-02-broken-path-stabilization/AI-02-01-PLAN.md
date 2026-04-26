---
phase: AI-2
plan: 1
title: "Runtime endpoint guards and support policy"
type: implementation
wave: 1
depends_on: []
files_modified:
  - Workspace/Project/ai/service/decision_service/api.py
  - Workspace/Project/ai/service/decision_service/config.py
  - Workspace/Project/ai/service/tests/test_api.py
  - Workspace/Project/ai/service/README.md
  - Workspace/Project/docs/ai-model-pipeline.md
autonomous: true
requirements_addressed: [AI-01, AI-04]
context_decisions: [D-AI2-01, D-AI2-02, D-AI2-03, D-AI2-04]
---

# Plan AI-02-01: Runtime Endpoint Guards and Support Policy

<objective>
Bound high-risk AI sidecar HTTP paths without removing compatibility routes. This plan adds request limits for `/score_batch`, gates `/evaluate_model` in production-like settings, surfaces runtime degradation safely, and documents route support status.
</objective>

<context>
- Phase context: `.planning/phases/ai-02-broken-path-stabilization/AI-02-CONTEXT.md`
- Research: `.planning/phases/ai-02-broken-path-stabilization/AI-02-RESEARCH.md`
- Roadmap: `.planning/AI_MODEL_ENHANCEMENT_ROADMAP.md`
- Codebase map: `.planning/codebase/AI_MODEL_MAP.md`
- Runtime API: `Workspace/Project/ai/service/decision_service/api.py`
- Settings: `Workspace/Project/ai/service/decision_service/config.py`
</context>

<must_haves>
<truths>
- Deprecated routes are compatibility surfaces, not the preferred future API.
- `/score_batch` is a workload-amplifying endpoint and must have hard limits.
- `/evaluate_model` can touch datasets and registries and must not be casually exposed in production.
- Runtime warnings must not include secret values, `.env` contents, or raw IOC payloads.
</truths>
<acceptance>
- `/score_batch` rejects oversized batches by item count with a deterministic HTTP error.
- Request body size is rejected before or at the route boundary using a config-backed limit.
- `/evaluate_model` is unavailable in production-like environments unless an explicit safe opt-in is configured.
- `/health` or equivalent readiness metadata shows non-secret warnings for degraded artifact/dataset startup paths.
- Sidecar docs include a support-status table for active, compatibility, deprecated, and gated endpoints.
</acceptance>
</must_haves>

<threat_model>
<threat id="T-AI2-01-01" severity="high">
Unbounded batch scoring can consume CPU and memory with a single request.
</threat>
<mitigation>
Add config-backed max item count and max request body bytes, with tests for limit defaults and overrides.
</mitigation>
<verification>
API tests submit oversized item lists and oversized request bodies and assert stable failure responses.
</verification>

<threat id="T-AI2-01-02" severity="high">
HTTP-triggered model evaluation can expose expensive or misleading operational behavior in production.
</threat>
<mitigation>
Gate `/evaluate_model` by environment and explicit opt-in. Default production-like environments to disabled.
</mitigation>
<verification>
API tests build apps with production-like settings and assert evaluation requests are rejected.
</verification>

<threat id="T-AI2-01-03" severity="medium">
Startup exception handling can hide missing or corrupt dataset artifacts.
</threat>
<mitigation>
Capture non-secret startup warnings and expose them in health/readiness metadata while preserving deterministic fallback behavior.
</mitigation>
<verification>
Tests simulate dataset load failure and assert health contains a sanitized warning without filesystem secrets or payload contents.
</verification>
</threat_model>

<tasks>
<task id="AI2-01-01" type="auto">
<title>Add runtime guard settings</title>
<files>
- `Workspace/Project/ai/service/decision_service/config.py`
- `Workspace/Project/ai/service/tests/test_api.py`
</files>
<action>
Add `ServiceSettings` fields for:
1. Maximum `/score_batch` items.
2. Maximum request body bytes for expensive JSON endpoints.
3. Whether HTTP model evaluation is enabled.
4. Optional production-like environment detection if the existing `environment` value is sufficient.

Defaults should be conservative and preserve local developer ergonomics. Malformed numeric env values should fail predictably without printing secret values.
</action>
<verify>
Add settings/API tests for default values and env override behavior.
</verify>
<acceptance_criteria>
The new settings are loaded through existing `load_settings()` patterns and do not require reading `.env` contents in tests.
</acceptance_criteria>
</task>

<task id="AI2-01-02" type="auto">
<title>Enforce `/score_batch` item and payload limits</title>
<files>
- `Workspace/Project/ai/service/decision_service/api.py`
- `Workspace/Project/ai/service/tests/test_api.py`
</files>
<action>
Implement request bounding for `/score_batch`:
1. Reject requests whose `Content-Length` exceeds the configured payload limit.
2. Reject parsed batch requests whose item count exceeds the configured item limit.
3. Keep existing per-item error behavior for valid-size batches.
4. Return deterministic error bodies suitable for backend/client handling.
</action>
<verify>
Add tests for valid batch, too many items, and too-large request body.
</verify>
<acceptance_criteria>
Oversized requests do not enter the scoring loop.
</acceptance_criteria>
</task>

<task id="AI2-01-03" type="auto">
<title>Gate `/evaluate_model` outside development</title>
<files>
- `Workspace/Project/ai/service/decision_service/api.py`
- `Workspace/Project/ai/service/decision_service/config.py`
- `Workspace/Project/ai/service/tests/test_api.py`
</files>
<action>
Add a route-level guard so `/evaluate_model` is enabled for local/development use and disabled for production-like environments unless explicitly enabled by config. Keep the route shape and existing development behavior intact.
</action>
<verify>
Add tests for development-enabled behavior and production-disabled behavior.
</verify>
<acceptance_criteria>
Production-like configuration rejects `/evaluate_model` before snapshot loading or registry mutation.
</acceptance_criteria>
</task>

<task id="AI2-01-04" type="auto">
<title>Surface sanitized runtime degradation warnings</title>
<files>
- `Workspace/Project/ai/service/decision_service/api.py`
- `Workspace/Project/ai/service/tests/test_api.py`
</files>
<action>
When runtime startup intentionally degrades, such as falling back after dataset snapshot load failure, record a sanitized warning on the runtime and expose it through `/health`. Do not include raw exception strings if they can include local paths, payloads, or secrets; prefer stable warning codes plus safe summaries.
</action>
<verify>
Add a test that forces dataset-load degradation and asserts a safe warning code is visible in health output.
</verify>
<acceptance_criteria>
Operators can distinguish healthy startup from degraded startup without leaking sensitive details.
</acceptance_criteria>
</task>

<task id="AI2-01-05" type="auto">
<title>Document endpoint support status</title>
<files>
- `Workspace/Project/ai/service/README.md`
- `Workspace/Project/docs/ai-model-pipeline.md`
</files>
<action>
Add a concise support table that identifies:
1. Active preferred endpoints.
2. Deprecated compatibility endpoints.
3. Gated development-only endpoints.
4. Expected production restrictions.
</action>
<verify>
Search docs for `/score_batch`, `/evaluate_model`, `deprecated`, and `development-only`.
</verify>
<acceptance_criteria>
Docs align with runtime behavior and do not claim deprecated routes are preferred production APIs.
</acceptance_criteria>
</task>
</tasks>

<verification>
```powershell
Push-Location Workspace/Project/ai/service
pytest tests/test_api.py
Pop-Location
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
</verification>

<success_criteria>
- AI-2 success criteria 1, 2, 3, and 5 are satisfied for runtime endpoints.
- `AI-01` workload-limit coverage is materially improved.
- Optional OpenAI and local `.env` behavior remain secret-safe.
</success_criteria>
