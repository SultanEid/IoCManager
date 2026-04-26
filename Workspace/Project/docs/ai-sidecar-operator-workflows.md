# AI Sidecar Operator Workflows

**Last updated:** 2026-04-26

This guide covers day-to-day developer and operator workflows for the IOC
Manager AI sidecar under `Workspace/Project/ai/service`. The sidecar is a
decision-support service for IOC verdicts, confidence scores, evidence,
explanations, and analyst-facing recommendations. It does not execute response
actions and must not be treated as an autonomous remediation engine.

## Local Setup

Use Python 3.11 from the sidecar-local virtual environment:

```powershell
Push-Location Workspace/Project/ai/service
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e ".[dev]" -c requirements.lock.txt
Pop-Location
```

Run the fast sidecar test suite:

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest
Pop-Location
```

Start the sidecar locally:

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m uvicorn decision_service.main:app --host 127.0.0.1 --port 8100
Pop-Location
```

Check liveness and startup warnings:

```powershell
Invoke-RestMethod http://127.0.0.1:8100/health
```

## Inference Smoke

Run this from a second shell while the sidecar is running:

```powershell
$payload = @{
  caseId = "docs-smoke-1"
  asOfTime = (Get-Date).ToUniversalTime().ToString("o")
  sourceSystem = "docs-smoke"
  iocType = "domain"
  iocValue = "login-secure-update.test"
  hostContext = @{ criticality = 0.6; assetExposure = 0.5 }
  ruleContext = @{ severityScore = 0.8; scannerAgreement = 0.7 }
  detectionPackage = @{
    rule_family = "sigma"
    full_rule_text = "title: Suspicious Script Host"
    rule_metadata = @{ rule_id = "SIG-DOCS-1"; title = "Suspicious Script Host" }
    raw_hit_payload = @{ event_id = "evt-docs-1"; command_line = "wscript.exe launcher.js" }
    object_metadata = @{
      object_id = "obj-docs-1"
      object_type = "process_event"
      source_system = "siem"
    }
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod http://127.0.0.1:8100/score_case `
  -Method Post `
  -ContentType "application/json" `
  -Body $payload
```

Expected response shape:

- `modelVersion` and `datasetVersion` identify the active registry inputs.
- `maliciousnessScore` and `decisionState` expose calibrated score output.
- `groundedDecision.verdict` gives the operator-facing verdict.
- `groundedDecision.confidence` is a bounded decision-support confidence score.
- `groundedDecision.falsePositiveRisk` surfaces caution pressure.
- `groundedDecision.actionPlan.recommendedActions` remains manual-only.

## Confidence Interpretation

Treat confidence as an operational decision aid, not a probability of ground
truth. A higher confidence means the current evidence, model calibration,
family-specific adjudicator, and safety layer agree more strongly. It does not
remove the analyst review requirement.

Use confidence with these companion fields:

- `verdict`: canonical label such as `benign`, `suspicious`,
  `likely_malicious`, `malicious`, `false_positive`, `stale_or_revoked`, or
  `insufficient_evidence`.
- `falsePositiveRisk`: how much pressure exists to avoid promotion or
  suppression mistakes.
- `abstainReason`: why the sidecar refused a stronger verdict.
- `nextBestEvidence`: what evidence would most improve the decision.
- `safetyDiagnostics`: missing fields, contradiction, enrichment degradation,
  severity caps, and manual-action enforcement.

For analyst workflows:

- Low confidence plus high false-positive risk should favor manual review and
  evidence collection.
- `insufficient_evidence` is a valid safety outcome, not a service failure.
- Manual action recommendations require human approval even when confidence is
  high.
- Analyst override and final closure remain authoritative.

## Dataset Build

Supported dataset and staging jobs live under `Workspace/Project/ai/jobs`.
Treat unlisted feed, review, and experimental build scripts as local/operator
work until they have fixture-based smoke tests.

Build a fixture-sized or configured processed dataset:

```powershell
Push-Location Workspace/Project/ai
.\service\.venv\Scripts\python.exe .\jobs\build_decision_dataset.py `
  --manifest .\datasets\manifests\<manifest-file>.json `
  --output-root .\datasets\processed `
  --dataset-version <dataset-version>
Pop-Location
```

Inventory processed datasets:

```powershell
Push-Location Workspace/Project/ai
.\service\.venv\Scripts\python.exe .\jobs\inventory_datasets.py `
  --processed-root .\datasets\processed
Pop-Location
```

Before a dataset is used for training, inspect its `quality_report.json` for
label distribution, source distribution, partial rows, rejection reasons,
provenance coverage, parser diagnostics, and split leakage assertions.

## Training, Evaluation, And Publishing

Train a deterministic candidate model from a named processed snapshot:

```powershell
Push-Location Workspace/Project/ai
.\service\.venv\Scripts\python.exe .\jobs\train_baseline_cv.py `
  --snapshot-root .\datasets\processed `
  --dataset-version unified-supervised-v1 `
  --registry-path .\service\artifacts\model_registry.json `
  --dataset-registry-path .\service\artifacts\dataset_registry.json `
  --artifacts-dir .\service\artifacts
Pop-Location
```

Evaluate the candidate before promotion:

```powershell
Push-Location Workspace/Project/ai
.\service\.venv\Scripts\python.exe .\jobs\evaluate_model.py `
  --snapshot-root .\datasets\processed `
  --dataset-version unified-supervised-v1 `
  --registry-path .\service\artifacts\model_registry.json `
  --model-version <candidate-model-version> `
  --output-file .\datasets\processed\evaluations\<candidate-model-version>.json
Pop-Location
```

Publish only after the evaluation bundle passes promotion gates:

```powershell
Push-Location Workspace/Project/ai
.\service\.venv\Scripts\python.exe .\jobs\publish_model.py `
  --registry-path .\service\artifacts\model_registry.json `
  --model-version <candidate-model-version> `
  --evaluation-report .\datasets\processed\evaluations\<candidate-model-version>.json
Pop-Location
```

Promotion gates require machine-readable evaluation evidence and validated
artifact hashes. They cover quality metrics, calibration, false-positive and
false-negative pressure, unsafe recommendations, coverage, and required slices
for IOC type, source system, scanner family, recency, trust, and evidence
availability.

## Rollback

Rollback is a registry operation. Do not delete model artifacts during rollback.

1. Inspect `Workspace/Project/ai/service/artifacts/model_registry.json`.
2. Identify the last known-good model version with valid artifact hashes and a
   passing evaluation bundle.
3. Promote that version with `publish_model.py` and its original evaluation
   report.
4. Restart the sidecar so runtime state reloads the active registry entry.
5. Run `/health`, the inference smoke request, and `.\.venv\Scripts\python.exe -m pytest`.

If a registry or artifact hash is invalid, stop and repair from source-controlled
artifacts or a known-good release bundle. Do not hand-edit active hashes to make
promotion pass.

## Troubleshooting

Missing virtual environment:

- Recreate `.venv` with Python 3.11.
- Reinstall with `.\.venv\Scripts\python.exe -m pip install -e ".[dev]" -c requirements.lock.txt`.

Dependency install failure:

- Confirm `.\.venv\Scripts\python.exe --version` reports Python 3.11.
- Upgrade pip inside `.venv`.
- Keep the `-c requirements.lock.txt` constraint file on local and CI installs.

Sidecar startup failure:

- Run from `Workspace/Project/ai/service`.
- Check that `artifacts/model_registry.json`,
  `artifacts/dataset_registry.json`, and the active model artifact directory
  are present.
- Use `/health` for sanitized warning codes. Do not paste local secret values
  into logs or tickets.

Missing or invalid artifacts:

- Verify the active registry entry points to artifact-root-relative paths.
- Rebuild or restore the candidate model rather than editing generated model
  files by hand.
- Re-run `publish_model.py` with the matching evaluation report.

Dataset registry mismatch:

- Confirm the model entry dataset version matches the intended processed
  snapshot.
- Re-run evaluation against the exact dataset version before promotion.

Optional OpenAI provider unavailable:

- Leave optional LLM features disabled unless explicitly needed.
- The sidecar should preserve deterministic fallback behavior when provider
  calls fail or are not configured.

Oversized or malformed request:

- Expect `422` for malformed required fields.
- Expect bounded rejection for oversized expensive requests or excessive
  `/score_batch` item counts.

## Environment Variables

These names may affect sidecar behavior. Document names only; do not read,
print, or commit secret values.

Runtime paths and environment:

- `IOC_MANAGER_AI_ENV`
- `CTI_SIDECAR_ENV`
- `IOC_MANAGER_AI_SERVICE_NAME`
- `CTI_SIDECAR_SERVICE_NAME`
- `IOC_MANAGER_AI_ARTIFACTS_ROOT`
- `CTI_SIDECAR_ARTIFACTS_ROOT`
- `IOC_MANAGER_AI_ACTION_POLICY_MATRIX_PATH`
- `CTI_SIDECAR_ACTION_POLICY_MATRIX_PATH`
- `IOC_MANAGER_AI_SNAPSHOT_ROOT`
- `CTI_SIDECAR_SNAPSHOT_ROOT`
- `IOC_MANAGER_AI_REGISTRY_PATH`
- `CTI_SIDECAR_REGISTRY_PATH`
- `IOC_MANAGER_AI_DATASET_REGISTRY_PATH`
- `CTI_SIDECAR_DATASET_REGISTRY_PATH`
- `IOC_MANAGER_AI_DATASET_VERSION`
- `CTI_SIDECAR_DATASET_VERSION`
- `IOC_MANAGER_AI_FEEDBACK_PATH`
- `CTI_SIDECAR_FEEDBACK_PATH`

Limits and gated routes:

- `IOC_MANAGER_AI_MAX_SCORE_BATCH_ITEMS`
- `CTI_SIDECAR_MAX_SCORE_BATCH_ITEMS`
- `IOC_MANAGER_AI_MAX_EXPENSIVE_REQUEST_BODY_BYTES`
- `CTI_SIDECAR_MAX_EXPENSIVE_REQUEST_BODY_BYTES`
- `IOC_MANAGER_AI_ENABLE_HTTP_MODEL_EVALUATION`
- `CTI_SIDECAR_ENABLE_HTTP_MODEL_EVALUATION`

Historical learning:

- `IOC_MANAGER_AI_HISTORICAL_DEFAULT_TOP_K`
- `CTI_SIDECAR_HISTORICAL_DEFAULT_TOP_K`
- `IOC_MANAGER_AI_HISTORICAL_LOOKBACK_DAYS`
- `CTI_SIDECAR_HISTORICAL_LOOKBACK_DAYS`
- `IOC_MANAGER_AI_HISTORICAL_DECAY_HALF_LIFE_DAYS`
- `CTI_SIDECAR_HISTORICAL_DECAY_HALF_LIFE_DAYS`

Optional OpenAI and LLM-assisted paths:

- `OPENAI_API_KEY`
- `IOC_MANAGER_OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `IOC_MANAGER_OPENAI_BASE_URL`
- `IOC_MANAGER_AI_SCAN_ANALYST_MODEL`
- `IOC_MANAGER_OPENAI_MODEL`
- `IOC_MANAGER_OPENAI_TIMEOUT_SECONDS`
- `OPENAI_TIMEOUT_SECONDS`
- `CTI_ENABLE_LLM_ASSIST`
- `CTI_LLM_ASSIST_PROVIDER`
- `CTI_LLM_ASSIST_MODEL`
- `CTI_LLM_ASSIST_TIMEOUT_MS`
- `CTI_ENABLE_LLM_FALLBACK`
- `CTI_LLM_FALLBACK_PROVIDER`

Backend integration names:

- `AISIDECAR__BASEURL`
- `AISIDECAR__REPORTEXTRACTIONPATH`
- `AISIDECAR__TIMEOUTSECONDS`
