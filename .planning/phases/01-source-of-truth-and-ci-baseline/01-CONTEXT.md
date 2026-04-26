# Phase 1: Source-of-Truth and CI Baseline - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 makes `Workspace/Project/` the unambiguous active application root and establishes repeatable validation entry points. It may update guidance, ignore/noise policy, onboarding docs, and CI/local validation wiring. It should not implement product features or hardening work from later phases.

</domain>

<decisions>
## Implementation Decisions

### Canonical-root enforcement
- **D-01:** `Workspace/Project/` is the only active application root for new product work.
- **D-02:** `src/IocManager.Web` is considered removed/decommissioned and should not be reintroduced as an active surface.
- **D-03:** Phase 1 should enforce the canonical-root boundary, not merely mention it. Enforcement can be through docs plus lightweight validation that warns or fails when active work is aimed at archive, backup, logs, result folders, screenshots, temp copies, or removed roots.
- **D-04:** Enforcement must preserve existing user material unless a later explicit cleanup task requests deletion.

### Validation gate shape
- **D-05:** Provide both a fast PR-oriented gate and a fuller local/CI validation path.
- **D-06:** The fast gate should cover high-signal checks that are reasonable on every PR, including backend tests, frontend lint/typecheck/unit tests, AI sidecar tests, and secret scanning where available.
- **D-07:** The full validation path may include slower checks such as frontend E2E and broader build/test combinations.
- **D-08:** Backend commands must respect the existing MSBuild workaround documented in `Workspace/Project/backend/README.md` unless planning/research proves it is no longer needed.

### Generated/noisy file policy
- **D-09:** Phase 1 should update ignore policy and document cleanup boundaries for logs, screenshots, scanner result folders, temp copies, backups, and generated output.
- **D-10:** The policy should distinguish "ignore going forward" from "delete existing material"; deletion is out of scope unless separately requested.
- **D-11:** The cleanup boundary should make code search, dependency review, and security scanning focus on active source by default.

### Developer onboarding surface
- **D-12:** Use a small combination of onboarding surfaces, each with a clear job.
- **D-13:** `AGENTS.md` should guide coding agents and future GSD work.
- **D-14:** `Workspace/README.md` should guide developers to the canonical stack and active application entry points.
- **D-15:** Root `README.md` should be concise and route humans to the canonical workspace and validation commands.

### the agent's Discretion
- Exact CI provider file structure, script names, and whether validation is implemented as GitHub Actions, local scripts, npm scripts, or documented commands are planner discretion, as long as both fast and full gates are represented.
- Exact wording and organization of documentation is planner discretion, as long as the responsibilities above stay clear.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/PROJECT.md` - Project purpose, core value, active constraints, and canonical-root decision.
- `.planning/REQUIREMENTS.md` - GOV-01, GOV-02, GOV-03 requirements and traceability.
- `.planning/ROADMAP.md` - Phase 1 goal, success criteria, likely areas, and fixed phase boundary.
- `.planning/STATE.md` - Current phase state and next-step routing.

### Codebase map
- `.planning/codebase/STACK.md` - Active backend, frontend, AI sidecar, runtime, and command context.
- `.planning/codebase/ARCHITECTURE.md` - Canonical `Workspace/Project` architecture and active-vs-archive guidance.
- `.planning/codebase/STRUCTURE.md` - Directory purposes, active roots, and where to add new code.
- `.planning/codebase/CONVENTIONS.md` - Existing naming, formatting, and module conventions.
- `.planning/codebase/TESTING.md` - Existing backend, frontend, E2E, and AI sidecar test commands.
- `.planning/codebase/CONCERNS.md` - Repository noise, missing CI, and source-of-truth ambiguity concerns.

### Existing docs and config
- `AGENTS.md` - Agent guidance already created during roadmap initialization.
- `Workspace/README.md` - Existing canonical stack note and active entry points.
- `Workspace/Project/backend/README.md` - Backend setup, test commands, and MSBuild workload resolver workaround.
- `.gitignore` - Current ignore policy baseline.
- `Workspace/Project/frontend/workbench/package.json` - Frontend lint, typecheck, test, E2E, and scope-check scripts.
- `Workspace/Project/ai/service/pyproject.toml` - AI sidecar package and pytest configuration.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Workspace/Project/backend/README.md`: Already documents backend restore/build/test commands and the MSBuild workaround that validation should preserve.
- `Workspace/Project/frontend/workbench/package.json`: Provides `lint`, `typecheck`, `test:run`, `test:coverage`, and `test:e2e` scripts suitable for validation gates.
- `Workspace/Project/ai/service/pyproject.toml`: Defines pytest discovery for the sidecar through `testpaths = ["tests"]`.
- `Workspace/README.md`: Already declares `Workspace/Project` as the current stack and can be tightened as the developer-facing orientation page.

### Established Patterns
- Planning docs are committed under `.planning/` and should continue to be used by downstream GSD workflows.
- Active work should default to `Workspace/Project/backend`, `Workspace/Project/frontend/workbench`, and `Workspace/Project/ai/service`.
- Archive/generated paths create noise and should be excluded from default code search, dependency review, and secret/security scanning where practical.

### Integration Points
- `AGENTS.md` should remain the agent-facing project guide.
- Root `README.md` can become a concise human entry point.
- `Workspace/README.md` can remain the canonical workspace orientation.
- `.gitignore` can encode forward-looking ignore rules for generated/noisy material.
- `.github/workflows/` or equivalent scripts can encode fast/full validation if the planner chooses CI implementation.

</code_context>

<specifics>
## Specific Ideas

- User selected canonical-root enforcement and specified `src/IocManager.Web` as removed.
- User selected both fast and full validation gate shapes.
- User wants cleanup boundaries documented for logs, screenshots, result folders, temp copies, and backups.
- User wants a small combination of onboarding surfaces where each document has a clear job.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 1-Source-of-Truth and CI Baseline*
*Context gathered: 2026-04-26*
