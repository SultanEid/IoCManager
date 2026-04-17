# Detective API

ASP.NET Core API with Identity cookie authentication and PostgreSQL-first persistence.

## Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/visitors?range=7d|30d|90d`
- `GET /api/dashboard/sections`
- `GET /api/workspace/panels`
- `GET /api/customizer/state`
- `GET /api/system/health`
- `POST /api/intelligence/score_ioc`
- `POST /api/intelligence/score_batch`
- `POST /api/intelligence/feedback`
- `GET /api/intelligence/model_card`
- `POST /api/intelligence/open_case`
- `POST /api/intelligence/score_case`
- `POST /api/intelligence/recommend_action`
- `POST /api/intelligence/request_more_evidence`
- `GET /api/intelligence/problematic_queue`
- `GET /api/intelligence/evidence_bundle/{caseId}`
- `GET /api/intelligence/decision_trace/{caseId}`
- `POST /api/intelligence/simulate_rule`
- `POST /api/intelligence/canary_deployment`
- `POST /api/intelligence/promote_rule_proposal`
- `POST /api/intelligence/record_override`
- `POST /api/intelligence/ingest_report`
- `POST /api/intelligence/propose_rule`
- `POST /api/intelligence/recommend_deployment`
- `POST /api/intelligence/copilot/query`
- `POST /api/intelligence/graph/link_candidates`
- `GET /api/intelligence/reports`
- `GET /api/intelligence/proposals`
- `PATCH /api/intelligence/proposals/{proposalId}/status`
- `GET /api/intelligence/deployment-recommendations`
- `PATCH /api/intelligence/deployment-recommendations/{recommendationId}/status`
- `GET /api/graph/attack-gaps`

## Seeded Login
- Email: `admin@detective.local`
- Password: `Detective123!`

## Run
```bash
dotnet restore
dotnet run
```

Configure a PostgreSQL instance in `appsettings*.json` before first run.

## Intelligence Service Integration
Set the Python service URL in `appsettings*.json`:

```json
"IocIntelligence": {
  "BaseUrl": "http://127.0.0.1:8100",
  "TimeoutSeconds": 8,
  "EnableScoring": true
}
```

Run the intelligence service from `ioc-intelligence-service/`:

```bash
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8100
```
