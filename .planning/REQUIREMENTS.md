# Requirements: IOC Manager

**Defined:** 2026-04-26
**Core Value:** Security operators can reliably run, review, and act on IOC and scanner intelligence without unsafe execution paths, misleading authorization behavior, or fragile deployment assumptions.

## v1 Requirements

### Governance

- [ ] **GOV-01**: Developer can identify `Workspace/Project/` as the canonical product root from project guidance and planning artifacts.
- [ ] **GOV-02**: Developer can distinguish active source from archive, backup, generated result, screenshot, log, and temporary folders during code search and review.
- [ ] **GOV-03**: Repository validation runs backend, frontend, AI sidecar, and secret checks from a documented CI entry point.

### Security

- [ ] **SEC-01**: Admin authentication cannot succeed through a hard-coded SQL-table credential path.
- [ ] **SEC-02**: SQL-table user authentication rejects pre-hashed password login and has a migration path toward salted password hashing.
- [ ] **SEC-03**: Configurable SQL-table names are validated or mapped before being used in raw SQL.
- [ ] **SEC-04**: AI sidecar write, feedback, scoring, and evaluation endpoints require a private network boundary or explicit service authentication.
- [ ] **SEC-05**: API rate limiting uses trusted client identity and bounded state instead of spoofable forwarded headers and unbounded dictionaries.

### Scanner Execution

- [ ] **SCAN-01**: Canceled scanner executions terminate child process trees and record a canceled execution state.
- [ ] **SCAN-02**: Scanner result-file metadata points to durable artifacts that still exist after cleanup.
- [ ] **SCAN-03**: Rule ZIP upload handling enforces decompressed-size, entry-count, extension, and nested-path limits.
- [ ] **SCAN-04**: Scanner script execution is restricted to known script paths and has explicit timeout, audit, and least-privilege expectations.

### Persistence and Operations

- [ ] **OPS-01**: Durable database schema changes are owned by migrations instead of runtime DDL initializers.
- [ ] **OPS-02**: Startup schema checks remain idempotent and do not require broad production DDL permissions.
- [ ] **OPS-03**: Background work queues apply backpressure, expose queue-depth visibility, and have a path toward durable retry semantics.
- [ ] **OPS-04**: Saved report PDF generation is concurrency-safe for repeated downloads of the same report.

### Frontend and Contracts

- [ ] **UI-01**: Frontend role gates for lead-level actions match backend authorization policies for Analyst, Lead, Admin, IT, and DEV users.
- [ ] **UI-02**: Frontend components continue to use the shared gateway abstraction rather than direct ad hoc API calls.
- [ ] **UI-03**: Mock gateway and ASP.NET gateway behavior are tested for parity on core operator workflows.
- [ ] **UI-04**: Frontend API schemas are organized or generated in a way that makes backend contract drift visible.

### AI Sidecar

- [ ] **AI-01**: AI sidecar batch endpoints enforce request-size, item-count, timeout, and memory-safety limits.
- [ ] **AI-02**: AI sidecar runtime dependencies are locked or constrained for reproducible installs.
- [ ] **AI-03**: Model and dataset registry updates are explicit, auditable, and covered by sidecar tests.
- [ ] **AI-04**: Optional OpenAI integration is configured through documented secret-backed environment variables without leaking values to logs or planning docs.

## v2 Requirements

### Product Expansion

- **PROD-01**: Operator can configure durable distributed workers or external queue providers for multi-instance deployments.
- **PROD-02**: Operator can deploy the backend, frontend, sidecar, and database through a documented production hosting package.
- **PROD-03**: Operator can view queue, sidecar, scanner, and rule-distribution metrics in a central observability surface.
- **PROD-04**: Developer can generate typed frontend API clients from backend OpenAPI contracts.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New scanner engines | Current risk is scanner execution safety, not adding more engines. |
| Large workbench redesign | Authorization, contracts, and reliability are higher priority than visual redesign. |
| Rewriting backend to a non-.NET stack | Existing domain, persistence, and tests are built around ASP.NET Core and EF Core. |
| Rewriting AI sidecar to another language | Current sidecar already has Python package structure and tests. |
| Active development in `Archive/` starter kits | Those paths are historical/reference material. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GOV-01 | Phase 1 | Pending |
| GOV-02 | Phase 1 | Pending |
| GOV-03 | Phase 1 | Pending |
| SEC-01 | Phase 2 | Pending |
| SEC-02 | Phase 2 | Pending |
| SEC-03 | Phase 2 | Pending |
| SEC-04 | Phase 2 | Pending |
| SEC-05 | Phase 2 | Pending |
| SCAN-01 | Phase 3 | Pending |
| SCAN-02 | Phase 3 | Pending |
| SCAN-03 | Phase 3 | Pending |
| SCAN-04 | Phase 3 | Pending |
| OPS-01 | Phase 4 | Pending |
| OPS-02 | Phase 4 | Pending |
| OPS-03 | Phase 4 | Pending |
| OPS-04 | Phase 4 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |
| AI-01 | Phase 6 | Pending |
| AI-02 | Phase 6 | Pending |
| AI-03 | Phase 6 | Pending |
| AI-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-04-26*
*Last updated: 2026-04-26 after roadmap creation*
