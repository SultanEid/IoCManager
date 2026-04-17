# IoC Intelligence Service

Production-grade, non-notebook Python service for actionable IoC risk scoring.

## What it provides
- `POST /score_ioc`
- `POST /score_batch`
- `POST /score_case`
- `POST /recommend_action`
- `POST /request_more_evidence`
- `POST /simulate_rule`
- `POST /feedback`
- `GET /model_card`
- `POST /ingest_report`
- `POST /propose_rules`
- `POST /recommend_deployment`
- `POST /copilot/query`
- `POST /graph/link_candidates`
- gRPC contract definition in `grpc/ioc_intelligence.proto`

Each score response includes:
- `risk_score`
- `risk_tier`
- `confidence`
- `uncertainty_set`
- `top_evidence`
- `recommended_action`
- `ttl_hours`
- `model_version`

## Architecture
- Hybrid multi-view scoring: lexical + tabular + graph + temporal
- Calibrated stacked fusion (recall-first thresholds by IoC type)
- Conformal-style uncertainty band
- Analyst feedback ingestion loop
- Drift counters for feature, calibration, and score-distribution monitoring
- Deterministic policy engine with numeric thresholds from config
- Human-gated rule proposal and deployment recommendation
- Retrieval-grounded report extraction with explicit citations

## Real-data-only training
Training utilities in `app/training/` consume real pipeline exports:
- `observables.csv`
- `detections.csv`
- `outcomes.csv`
- optional `enrichment.csv`

No synthetic/mock data generation is included.

## Run
```bash
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8100
```

Policy thresholds are loaded from `artifacts/policy_config.json` (override with `IOC_INTEL_POLICY_CONFIG`).

## Train
```bash
python -m app.training.train --input-dir ./data --output-dir ./artifacts --horizon-hours 72
```

## Collect Real IoC Data Feeds
Use the PowerShell collector (no mock data generation):

```powershell
pwsh ./scripts/collect_real_ioc_data.ps1 -OutputDir ./data/latest -MaxPerFeed 50000
```

This writes:
- `data/latest/observables.csv`
- `data/latest/detections.csv`
- `data/latest/outcomes.csv`
- `data/latest/collection_manifest.json`

## Test
```bash
pytest
```

## MLOps cadence
- Daily: incremental refresh + drift checks
- Weekly: full retrain + recalibration
- Monthly: architecture review / ablation refresh
