# IoC Ingestion Sidecar (Deferred/Experimental)

FastAPI sidecar used by IoC Manager for report extraction and optional evaluation utilities.

This sidecar is **not** the core IoC Manager runtime. Advanced scoring and graph-oriented endpoints remain compatibility/deferred surfaces.

## Configuration

Environment variables are read directly via `os.getenv`. Copy `.env.example` and set only values you need.

Backend integration defaults:

- Backend `AiSidecar:BaseUrl` -> `http://localhost:8100`
- Backend `AiSidecar:ReportExtractionPath` -> `/extract_report`

If the sidecar runs on a different URL/path, set backend env overrides:

- `AISIDECAR__BASEURL`
- `AISIDECAR__REPORTEXTRACTIONPATH`
- `AISIDECAR__TIMEOUTSECONDS`

## Run

```bash
pip install -e .
uvicorn cti_service.main:app --host 0.0.0.0 --port 8100
```

## Active IoC Manager Endpoint

- `POST /extract_report`

Compatibility alias:

- `POST /ingest_report` -> `POST /extract_report`

## Deferred / Compatibility Endpoints

- `POST /score_case`
- `POST /score_batch`
- `POST /recommend_action`
- `POST /request_more_evidence`
- `POST /graph_neighbors`
- `POST /graph/link_candidates`
- `POST /explain_case` (deprecated)
- `POST /feedback`
- `POST /evaluate_model`

## Jobs

Offline jobs are in `../jobs`:

- `build_dataset.py`
- `train_baseline.py`
- `evaluate_model.py`
- `publish_model.py`
