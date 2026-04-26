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

## Retention And Provenance Policy

- `datasets/manifests/` contains source manifests and should be treated as durable source metadata.
- `datasets/raw/` contains local staged source snapshots. These may be large or refreshed, but each processed build should retain manifest references and provenance fields that identify the source, key, value, retrieval time, retriever, citation, and record locator.
- `datasets/processed/<dataset-version>/` contains derived build outputs. A complete processed build includes canonical rows, task rows, split files, `split_manifest.json`, `quality_report.json`, snapshot CSV files, and `manifest.json`.
- `quality_report.json` is the build-level promotion input for data quality. It must include source distribution, label distribution, partial-row rate, rejection reasons, provenance coverage, parser diagnostics, and split leakage assertions.
- `manifest.json` links any label-review artifacts through `labelReviewArtifacts`. Each linked artifact should validate against `ai/schemas/label-review-artifact.schema.json`.
- Runtime artifacts under `ai/service/artifacts/` are active sidecar inputs. Do not rewrite active registries or model artifacts as a side effect of dataset smoke tests.
- Generated reports and experimental staging outputs should stay out of active runtime artifacts until a later phase explicitly promotes them.
