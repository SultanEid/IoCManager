# AI-09-02 Summary: IOC Feature Extraction and Bounded Scoring Improvements

## Status

Complete - 2026-04-26

## What Changed

- Added IOC value feature handling for URL structure, risky TLDs, suspicious process flags, persistence paths, hash format checks, and documentation/private IP ranges.
- Added source, table, recency, correlation, sighting, target exposure, analyst outcome, and false-positive/stale downgrade signals to the scorer.
- Fixed sighting-count handling so counts above one are not clipped before normalization.
- Preserved bounded decision-support behavior: attribute-only rows can produce useful suspicious or likely-malicious insight, while weak evidence, stale, low-trust, false-positive, and conflicting signals still downgrade or abstain.
- Expanded scorer tests for IOC feature families, monotonic source/table behavior, and correlation/outcome effects.

## Files Changed

New phase work:

- `Workspace/Project/ai/service/decision_service/scorer.py`
- `Workspace/Project/ai/service/tests/test_scorer.py`

Pre-existing user work integrated:

- Existing dirty decision contract behavior in `Workspace/Project/ai/service/decision_service/decision_support.py` and `Workspace/Project/ai/service/tests/test_decision_contract_safety.py` was preserved and validated, but no blind revert or broad rewrite was performed.

Pre-existing user/generated work left untouched:

- Artifact registry changes under `Workspace/Project/ai/service/artifacts/`.
- Untracked external feed and dataset job scripts not required by this plan.

## Validation

- Focused AI-9 test run included `tests/test_scorer.py`, `tests/test_decision_contract_safety.py`, and `tests/test_validation_framework.py`.
- Full AI sidecar test suite passed: `333 passed`.
- Repository boundary check passed.

## Residual Risk

- Runtime scoring is now more useful for attribute-only IOC rows, but promotion still depends on the AI-09-03 gates and a stronger reviewed evaluation dataset.
