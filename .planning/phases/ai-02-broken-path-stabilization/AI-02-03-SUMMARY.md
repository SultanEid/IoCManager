---
phase: AI-2
plan: 3
title: "Job support labeling and smoke coverage"
status: complete
completed: 2026-04-26
requirements-completed: [AI-03]
key-files:
  modified:
    - Workspace/Project/ai/README.md
    - Workspace/Project/ai/service/README.md
    - Workspace/Project/docs/ai-model-pipeline.md
---

# AI-2 Plan 3 Summary: Job Support Labeling and Smoke Coverage

## What Changed

- Added AI job support matrices to the sidecar README and model-pipeline document.
- Marked smoke-tested jobs as supported and untested training/evaluation/publish/feed-review jobs as experimental.
- Clarified that scripts under `ai/jobs` should be treated as experimental unless the support matrix marks them supported.
- Kept untracked/user-draft job scripts untouched.

## Validation

- `rg "/score_batch|/evaluate_model|development-only|deprecated compatibility|experimental|supported" Workspace/Project/ai/service/README.md Workspace/Project/docs/ai-model-pipeline.md Workspace/Project/ai/README.md` - passed.
- Full focused AI-2 run after installing `PyYAML` into the pytest interpreter: `57 passed`.
- Repository boundary check passed.

## Deviations from Plan

- The documented editable install command failed in this shell because `python` pointed at Python 3.10 with an old pip that cannot editable-install this `pyproject.toml` package. The actual pytest entry point used Python 3.13, so `PyYAML` was installed into that interpreter to run the existing job smoke tests.

## Next

AI-2 is ready for phase verification and should stop before AI-3 planning or execution.
