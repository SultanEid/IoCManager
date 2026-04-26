# AI-4 Execution: Reproducible Training and Inference

**Date:** 2026-04-26
**Status:** Complete

## Changed

- Added a Python 3.11 lock snapshot at `Workspace/Project/ai/service/requirements.lock.txt`.
- Updated training jobs to write artifact-root-relative registry paths instead of local absolute paths when artifacts live under the registry artifact root.
- Added registry artifact resolution and SHA-256 validation helpers.
- Updated `publish_model.py` to validate registered artifact hashes before promotion by default.
- Added sidecar startup artifact validation warnings for active registry entries.
- Added train/publish regression tests that verify relative artifact paths, successful hash validation, and publish refusal on hash mismatch.
- Updated AI sidecar and validation docs with Python 3.11 `.venv`, locked install, training, evaluation, publish, and inference probe commands.

## Integrated Pre-existing Work

- The existing local registry updates were not blindly staged as runtime model artifacts. The implementation supports those local registries through artifact-root-relative paths and validation, but generated model/dataset outputs remain local unless explicitly committed as fixtures.
- Existing uncommitted scanner-evidence enrichment changes were left for later roadmap phases because they are behavior/API-contract work, not AI-4 reproducibility work.

## Validation

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest tests/test_registry.py tests/test_train_and_publish_jobs.py tests/test_build_decision_dataset_job.py tests/test_evaluation_harness_job.py tests/test_probe_live_ioc_decisions_job.py
.\.venv\Scripts\python.exe -m pytest
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

Results:

- Focused AI-4 pytest: 15 passed.
- Full AI sidecar pytest: 304 passed.
- Repository boundary guard: passed.
