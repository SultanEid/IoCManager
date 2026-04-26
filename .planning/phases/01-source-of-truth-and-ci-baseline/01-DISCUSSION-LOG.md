# Phase 1: Source-of-Truth and CI Baseline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 1-Source-of-Truth and CI Baseline
**Areas discussed:** Canonical-root enforcement, Validation gate shape, Generated/noisy file policy, Developer onboarding surface

---

## Canonical-root enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Document only | State that `Workspace/Project/` is canonical, but do not add checks. | |
| Enforce boundary | Add docs plus lightweight validation that warns/fails when work targets non-canonical roots or noisy paths. | yes |
| Agent discretion | Let the planner choose the enforcement level. | |

**User's choice:** Canonical-root enforcement; `src/IocManager.Web` is removed.
**Notes:** The working tree confirms `src/IocManager.Web` is absent. Context locks `Workspace/Project/` as the only active application root and treats `src/IocManager.Web` as decommissioned.

---

## Validation gate shape

| Option | Description | Selected |
|--------|-------------|----------|
| Fast PR gate | High-signal checks intended for every PR. | |
| Full gate | Broad local/CI validation including slower checks. | |
| Both | Provide both a fast PR gate and a fuller validation path. | yes |

**User's choice:** Both.
**Notes:** Backend validation should account for the documented MSBuild workaround. Frontend scripts and AI sidecar pytest config already provide candidate commands.

---

## Generated/noisy file policy

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore rules only | Update `.gitignore` for generated/noisy material. | |
| Document cleanup boundary | Update ignore rules and document how logs, screenshots, result folders, temp copies, and backups should be treated. | yes |
| Agent discretion | Let the planner decide policy depth. | |

**User's choice:** Also document a cleanup boundary for logs, screenshots, result folders, temp copies, and backups.
**Notes:** Deleting existing material is not part of Phase 1 unless separately requested. The boundary should make active source easier to search and scan.

---

## Developer onboarding surface

| Option | Description | Selected |
|--------|-------------|----------|
| `AGENTS.md` only | Keep agent guidance as the main source of truth. | |
| Root/Workspace docs only | Use human-facing README files as the main entry points. | |
| Small combination | Use a few surfaces, each with a clear responsibility. | yes |

**User's choice:** Small combination where each has a clear job.
**Notes:** `AGENTS.md` is agent-facing, `Workspace/README.md` is canonical workspace orientation, and root `README.md` should concisely route humans to the active stack and validation commands.

---

## the agent's Discretion

- Exact CI/workflow implementation mechanism.
- Exact script names and documentation wording.
- Exact split between fast and full validation, provided both are represented.

## Deferred Ideas

None.
