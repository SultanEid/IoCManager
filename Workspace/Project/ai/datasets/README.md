# AI Datasets

Dataset staging and processed bundle workspace for IoC Manager decision support.

Current scope:
- fixture-backed canonical dataset builds
- manual local staging for supported external feeds
- processed dataset versions under `ai/datasets/processed/<dataset-version>/`
- snapshot exports for the offline evaluation stack
- scored decision-row exports via `ai/jobs/export_scored_decision_rows.py`

Model pipeline reference:
- `Workspace/Project/docs/ai-model-pipeline.md`

Phase 1 supported external feeds:
- `malwarebazaar`
- `yaraify`
- `threatfox`
- `urlhaus`

Reliable official rule repositories:
- `sigmahq`
- `snort-community`
- `et-open-suricata`

Trusted internal negative sources:
- `internal-clean-baselines`
- `internal-allowlists`

Deferred until parser support exists:
- `vx-underground`

Training row schema reference:
- `ai/datasets/training-row-format.md`

Reliable-source staging job:
- `ai/jobs/stage_reliable_source_exports.py`

## Current Processed Snapshot Contract

Processed snapshots used by the sidecar and training jobs should contain:

- `manifest.json`
- `observables.csv`
- `detections.csv`
- `outcomes.csv`
- `source_trust.csv`

`ai/service/decision_service/snapshots.py` loads these files and converts them into training examples for evaluation and calibration.

The current active dataset version is `unified-supervised-v1`.
