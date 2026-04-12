# IoC Manager Surface Inventory

## Renamed (Primary Surface)

- Product/frame: `IoC Workbench` -> `IoC Manager`
- Routes:
  - `/cases` -> `/alerts`
  - `/cases/[id]` -> `/alerts/[alertId]`
  - `/operations` -> `/servers`
  - `/deployments` -> `/distribution`
  - `/detection-studio` and `/rules-studio` -> `/rules`
  - `/ingestion-feeds` and `/threat-intel` -> `/ioc-ingestion`
  - `/reports-ingestion` -> `/results-ingestion`
  - `/coverage*`, `/ioc-registry*`, `/reports` -> `/reporting`
  - `/settings-admin` and `/admin` -> `/settings`
- API surface:
  - `/api/alerts` is primary (compatibility `/api/cases` retained and deprecated).
  - Alert aliases added for case-scoped controllers (`/api/*/alert/{alertId}`).
  - `/api/rule-workflow/alerts/{alertId}` is primary (compatibility `/api/rule-workflow/cases/{caseId}` retained and deprecated).
- Frontend contracts:
  - `AlertResponse` / `AlertRuleWorkflowResponse` are primary aliases.
  - `CaseResponse` / `CaseRuleWorkflowResponse` remain compatibility aliases.
- Navigation and page framing:
  - `Cases` -> `Alerts`
  - `Operations` -> `Servers`
  - `Deployments` -> `Rule Distribution`
  - `Detection Studio` -> `Rule Repository`
  - `Ingestion Feeds` / `Threat Intel` -> `IoC Ingestion`
  - `Reports Ingestion` -> `Normalized Result Ingestion`
  - `Settings Admin` -> `Settings`

## Hidden / Deprecated From Active UX

- Legacy case deep-flow pages now redirect to alert detail:
  - `decision-trace`, `evidence-bundle`, `graph-investigation`, `rule-proposals`, `simulation-results`.
- Graph and investigation legacy pages now redirect to `/alerts`:
  - `/matches`, `/investigations`, `/graph-relationships`.
- Legacy operations and studio slugs now redirect to canonical IoC Manager routes.
- AI sidecar reasoning/graph endpoints are explicitly marked deferred/deprecated in sidecar API metadata.
- CTI policy evaluation endpoint (`/api/cti/policy/evaluate`) is hidden from active API explorer and marked deferred compatibility.

## Deferred (Not In IoC Manager v1 Scope)

- Physical DB/table namespace migration (`cti_*` -> `ioc_*`).
- Removal of all compatibility aliases after one release cycle.
- Full redesign/reintegration of non-core AI reasoning endpoints.
- Rewrite of archived historical CTI research material in `archive/` and `research/`.

## Guardrail

- Scope lint script added: `scripts/check-ioc-scope.ps1`
- Frontend command added: `npm run scope:check`
- Current allowlist: `archive/` and `research/` paths are excluded from guardrail term checks.
