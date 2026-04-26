---
phase: AI-2
plan: 1
title: "Runtime endpoint guards and support policy"
status: complete
completed: 2026-04-26
requirements-completed: [AI-01, AI-04]
key-files:
  modified:
    - Workspace/Project/ai/service/decision_service/api.py
    - Workspace/Project/ai/service/decision_service/config.py
    - Workspace/Project/ai/service/tests/test_api_runtime_guards.py
    - Workspace/Project/ai/service/README.md
    - Workspace/Project/docs/ai-model-pipeline.md
---

# AI-2 Plan 1 Summary: Runtime Endpoint Guards and Support Policy

## What Changed

- Added config-backed runtime guards for `/score_batch` item count and expensive request body size.
- Added production-safe gating for the deprecated `/evaluate_model` HTTP endpoint.
- Added sanitized startup warning codes to `/health` for degraded dataset snapshot loading.
- Documented endpoint status as active, compatibility/deprecated, or development-only gated.

## Validation

- `PYTHONPATH=$PWD pytest tests/test_api.py tests/test_registry.py tests/test_dataset_registry.py tests/test_historical_learning.py` - passed as part of the focused AI-2 run.
- Full focused AI-2 run after job dependency alignment: `57 passed`.
- Repository boundary check passed.

## Deviations from Plan

- The first warning test asserted that health should not include the configured dataset version. That was too strict because health already exposes dataset version metadata. The test was corrected to assert that warning codes do not include exception traces or local path details.

## Next

Plan AI-02-02 is complete; phase verification can evaluate all AI-2 must-haves together.
