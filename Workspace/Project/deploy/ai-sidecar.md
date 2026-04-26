# AI Sidecar Deployment

**Last updated:** 2026-04-26

This deployment note covers the active IOC Manager AI sidecar under
`Workspace/Project/ai/service`. The service is decision support for IOC
verdicts, confidence scores, evidence, explanations, and manual-only
recommendations. It must run beside the backend as a private dependency, not as
an internet-facing autonomous response service.

## Runtime Contract

- Python: 3.11
- Package root: `Workspace/Project/ai/service`
- Install command: `python -m pip install -e . -c requirements.lock.txt`
- Runtime command:

  ```powershell
  python -m uvicorn decision_service.main:app --host 0.0.0.0 --port 8100 --proxy-headers
  ```

- Port: `8100`
- Liveness: `GET /livez`
- Readiness: `GET /readyz`
- Compatibility health: `GET /health`
- Safe metrics: `GET /metrics`

`/livez` only proves the process can answer HTTP. `/readyz` validates model
registry readability, dataset registry readability, action-policy matrix
availability, feedback path availability, active model configuration, and active
dataset loading. Use `/readyz` for backend dependency checks and deployment
readiness.

## Packaging

Build the sidecar image from the service root:

```powershell
Push-Location Workspace/Project/ai/service
docker build -t ioc-manager-ai-sidecar:local .
Pop-Location
```

Run locally with private loopback binding:

```powershell
docker run --rm `
  -p 127.0.0.1:8100:8100 `
  --env-file Workspace/Project/deploy/ai-sidecar.env.local `
  ioc-manager-ai-sidecar:local
```

For production, mount or bake a reviewed artifact bundle containing:

- `model_registry.json`
- `dataset_registry.json`
- active model artifact directory
- processed dataset snapshots mounted at `IOC_MANAGER_AI_SNAPSHOT_ROOT`
- `action_policy_matrix.v1.json`
- writable feedback-event path or durable feedback-store replacement

Do not mount raw dataset staging folders as runtime inputs unless a deployment
spec explicitly requires them.

## Access Control

The preferred deployment boundary is private ingress: bind the sidecar to an
internal network reachable only by the backend and deployment health probes.

For explicit backend-to-sidecar authentication, set the same token in both
services:

- sidecar: `IOC_MANAGER_AI_SERVICE_TOKEN`
- backend: `AiSidecar:ServiceToken`

When the sidecar token is configured, all routes except `/livez` require either:

- `X-IOC-Manager-Sidecar-Token: <token>`
- `Authorization: Bearer <token>`

The backend sends `X-IOC-Manager-Sidecar-Token` when `AiSidecar:ServiceToken` is
configured. Token values must come from the deployment secret store and must not
be committed or printed.

## Request Limits And Timeouts

Sidecar limits:

- `IOC_MANAGER_AI_MAX_SCORE_BATCH_ITEMS`
- `IOC_MANAGER_AI_MAX_EXPENSIVE_REQUEST_BODY_BYTES`
- `IOC_MANAGER_AI_ENABLE_HTTP_MODEL_EVALUATION`

Backend timeout:

- `AiSidecar:TimeoutSeconds`

Recommended production posture:

- keep `/evaluate_model` disabled in production-like environments
- keep batch item and request-size limits below available memory capacity
- prefer one sidecar worker per artifact mount unless the feedback store is
  moved to a durable concurrent store
- run expensive training/evaluation as offline jobs, not through HTTP

## Safe Logging And Metrics

The sidecar logs request path, status code, and duration only. It does not log
request bodies, IOC values, tokens, or `.env` contents.

`GET /metrics` returns sanitized in-process counters:

- total request count
- error count
- route counts
- last request timestamp
- current readiness status

Use infrastructure-level metrics for CPU, memory, process restarts, and network
timeouts.

## Startup And Failure Modes

On startup, the sidecar loads model and dataset registry metadata and validates
known artifact hashes. Startup warning codes are sanitized and surfaced through
`/health` and `/readyz`.

Expected safe failure behavior:

- missing or invalid model artifacts make `/readyz` return `503`
- missing dataset snapshots make `/readyz` return `503`
- malformed requests return validation errors
- oversized expensive requests return `413`
- unavailable optional OpenAI paths degrade to deterministic fallback behavior
- backend sidecar failures are handled as optional dependency degradation

## Backend Integration

Backend sidecar settings:

- `AiSidecar:BaseUrl`
- `AiSidecar:ScanAnalystPath`
- `AiSidecar:ReportExtractionPath`
- `AiSidecar:ScoreCasePath`
- `AiSidecar:ExplainCasePath`
- `AiSidecar:RecommendActionPath`
- `AiSidecar:HistoricalLearningPath`
- `AiSidecar:TimeoutSeconds`
- `AiSidecar:ServiceToken`

The backend health probe calls `/readyz`. A `503` sidecar readiness response
degrades the optional AI component without making the whole backend readiness
endpoint fail.

## Deployment Validation

Run before release:

```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pip install -e ".[dev]" -c requirements.lock.txt
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m uvicorn decision_service.main:app --host 127.0.0.1 --port 8100
Pop-Location
```

From a second shell:

```powershell
Invoke-RestMethod http://127.0.0.1:8100/livez
Invoke-RestMethod http://127.0.0.1:8100/readyz
Invoke-RestMethod http://127.0.0.1:8100/metrics
```

Then run the full active-stack validation from
`Workspace/Project/docs/validation.md`.
