# Thread 6 Contract Blockers (from Thread 3)

Date: 2026-03-25
Owner: Frontend Thread 3 handoff

## Missing Feature Support

- Matches graph/history workspace:
  - No normal-mode backend contract for graph relationships/history used by `/matches`.
- Assets & Fleet operations surfaces:
  - No normal-mode contracts for server inventory, subnet registry, asset groups, scanner fleet, or server detail.
- IoC Registry subpages:
  - No contract-backed equivalents for `/ioc-registry/telemetry` and `/ioc-registry/sources`.
- Feed Explorer:
  - No contract-backed feed-explorer workspace for `/ingestion-feeds/feed-explorer`.
- Reports:
  - No contract-backed report-list/report-bundle endpoint for `/reports`.
- Rules & Rollout page-level mutations:
  - Workspace-level write actions remain read-only in normal mode pending explicit contract-backed support.

## Contract Mismatch Class

- Any schema-parse failure (frontend schema validation error) is treated as `contract-mismatch`.
- UI behavior for this class in Thread 3:
  - Render dependency-down/unavailable state (never fabricate fallback data).
- Thread 6 required follow-up:
  - Reconcile backend payload shape and frontend schema.
  - Add or update compatibility tests to prevent regression.

## Thread 6 Partial Completion Blocker

- Thread 6 status is partial until `Thread 6B: CtiPolicy Grounded Decision Migration` lands.
- Deferred mismatch:
  - `CtiPolicy` backend contracts and persistence replay surfaces still expose legacy decision semantics (`NextBestEvidenceType`, `NextBestEvidenceRequest`, `NextBestEvidenceRationale`) rather than Thread 5 `grounded_decision`-authoritative shape.
- Required follow-up in Thread 6B:
  - Migrate `CtiPolicy` API contracts, adapters, and replay/query serializers to grounded decision semantics with aligned verdict/action/confidence/provenance/reasons/abstain_reason/next_best_evidence fields.
