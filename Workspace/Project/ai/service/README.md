# IoC Manager AI Sidecar

FastAPI sidecar used by IoC Manager as a human-governed security decision assistant.

It is responsible for:

- report extraction
- decision support
- manual-only action-plan recommendation
- offline evaluation utilities

This sidecar is part of the IoC Manager decision workflow. It is not an autonomous response engine and it is not the product's core backend.

In practice, it helps the app:

- score detections and IOC context
- explain why a decision was produced
- surface uncertainty and false-positive pressure directly
- recommend safe, policy-constrained next actions
- add similar historical context where available

## Documentation
Subsystem documentation lives under `docs`:

- [AI Decision Overview](../../docs/ai-decision-overview.md)
- [AI Decision System Reference](../../docs/ai-decision-system-reference.md)
- [Verdict Taxonomy](../../docs/verdict-taxonomy.md)
- [Action Plan Policy](../../docs/action-plan-policy.md)
- [Dataset Sources](../../docs/dataset-sources.md)

## Active Endpoints
- `POST /extract_report`
- `POST /ingest_report` as an alias for `POST /extract_report`

## Decision And Evaluation Endpoints
These endpoints support decision, explanation, feedback, and offline evaluation flows:

- `POST /score_case`
- `POST /score_batch`
- `POST /recommend_action`
- `POST /request_more_evidence`
- `POST /feedback`
- `POST /historical_learning/query`
- `POST /evaluate_model`

Compatibility or legacy-support endpoints remain available where still required by the merged app:

- `POST /graph_neighbors`
- `POST /graph/link_candidates`
- `POST /explain_case`

## Safety Model
- runtime decisions may abstain
- action plans are always manual-only
- disruptive actions are capped when confidence is low or evidence is weak
- enrichment degradation should not crash the service
- analyst override remains authoritative

## Configuration
Environment variables are read directly via `os.getenv`. Copy `.env.example` and set only values you need.

Backend integration defaults:

- Backend `AiSidecar:BaseUrl` -> `http://localhost:8100`
- Backend `AiSidecar:ReportExtractionPath` -> `/extract_report`

If the sidecar runs on a different URL/path, set backend env overrides:

- `AISIDECAR__BASEURL`
- `AISIDECAR__REPORTEXTRACTIONPATH`
- `AISIDECAR__TIMEOUTSECONDS`

Action-policy matrix configuration:

- `CTI_SIDECAR_ACTION_POLICY_MATRIX_PATH` with default `ai/service/artifacts/action_policy_matrix.v1.json`

Optional phrasing assist remains bounded by deterministic outputs:

- `CTI_ENABLE_LLM_ASSIST`
- `CTI_LLM_ASSIST_PROVIDER`
- `CTI_LLM_ASSIST_MODEL`
- `CTI_LLM_ASSIST_TIMEOUT_MS`

## Run
```bash
pip install -e .
uvicorn decision_service.main:app --host 0.0.0.0 --port 8100
```

## Offline Jobs
Offline jobs live under `ai/jobs`:

- `build_decision_dataset.py`
- `evaluate_model.py`
- `run_evaluation_harness.py`
- `train_baseline.py`
- `publish_model.py`

