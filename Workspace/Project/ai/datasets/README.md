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

Operator workflow reference:
- `Workspace/Project/docs/ai-sidecar-operator-workflows.md`

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

IOC evaluation row schema:
- `ai/schemas/ioc-evaluation-row.schema.json`

Small source-controlled IOC evaluation fixtures:
- `ai/fixtures/ioc_evaluation/golden_ioc_rows.jsonl`

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

## Dataset Build Workflow

Build processed datasets only from explicit source manifests and keep generated
raw, staged, and processed outputs out of active runtime artifacts until they
are deliberately promoted.

```powershell
Push-Location Workspace/Project/ai
.\service\.venv\Scripts\python.exe .\jobs\build_decision_dataset.py `
  --manifest .\datasets\manifests\<manifest-file>.json `
  --output-root .\datasets\processed `
  --dataset-version <dataset-version>
Pop-Location
```

Inventory available processed datasets before choosing a training input:

```powershell
Push-Location Workspace/Project/ai
.\service\.venv\Scripts\python.exe .\jobs\inventory_datasets.py `
  --processed-root .\datasets\processed
Pop-Location
```

Before training, review the dataset `quality_report.json` and confirm the
snapshot manifest, label distribution, source distribution, provenance
coverage, partial-row rate, rejection reasons, parser diagnostics, and split
leakage assertions are appropriate for the intended model release.

## IOC Evaluation Dataset Workflow

Build masked IOC evaluation rows from source-controlled fixtures or an
operator-provided IOC export:

```powershell
Push-Location Workspace/Project/ai
.\service\.venv\Scripts\python.exe .\jobs\build_ioc_evaluation_dataset.py `
  --input-file .\fixtures\ioc_evaluation\golden_ioc_rows.jsonl `
  --output-file .\datasets\processed\ioc-eval\rows.jsonl `
  --report-file .\datasets\processed\ioc-eval\report.json
Pop-Location
```

The output is JSONL and keeps raw IOC values masked by default. Large generated
exports, shadow reports, and review CSVs should stay under generated dataset
paths and out of source control unless they are deliberately reduced to small
fixtures.

IOC label policy fields:

- `attribute_only`: table attributes only; useful insight allowed, confidence capped.
- `scan_correlated`: scan, enrichment, or sightings evidence is linked.
- `analyst_outcome`: analyst closure, override, or response outcome exists.
- `low_trust_conflicting_stale`: downgrade, suppress, allowlist, mark stale, or abstain.
- `label_provenance`: distinguishes analyst outcomes, trusted feeds, weak table labels, internal allowlists, synthetic fixtures, and shadow review.

## Retention And Provenance Policy

- `datasets/manifests/` contains source manifests and should be treated as durable source metadata.
- `datasets/raw/` contains local staged source snapshots. These may be large or refreshed, but each processed build should retain manifest references and provenance fields that identify the source, key, value, retrieval time, retriever, citation, and record locator.
- `datasets/processed/<dataset-version>/` contains derived build outputs. A complete processed build includes canonical rows, task rows, split files, `split_manifest.json`, `quality_report.json`, snapshot CSV files, and `manifest.json`.
- `quality_report.json` is the build-level promotion input for data quality. It must include source distribution, label distribution, partial-row rate, rejection reasons, provenance coverage, parser diagnostics, and split leakage assertions.
- `manifest.json` links any label-review artifacts through `labelReviewArtifacts`. Each linked artifact should validate against `ai/schemas/label-review-artifact.schema.json`.
- Runtime artifacts under `ai/service/artifacts/` are active sidecar inputs. Do not rewrite active registries or model artifacts as a side effect of dataset smoke tests.
- Generated reports and experimental staging outputs should stay out of active runtime artifacts until a later phase explicitly promotes them.
