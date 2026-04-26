---
phase: 1
slug: source-of-truth-and-ci-baseline
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-26
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PowerShell static checks, GitHub Actions YAML, dotnet test, npm scripts, pytest |
| **Config file** | `.github/workflows/validation.yml` after Plan 01-03 |
| **Quick run command** | `powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1` |
| **Full suite command** | Fast CI job plus documented full validation commands in `Workspace/Project/docs/validation.md` |
| **Estimated runtime** | Quick: <30 seconds; full: depends on package restore and E2E browser install |

---

## Sampling Rate

- **After every task commit:** Run boundary/static checks relevant to the changed files.
- **After every plan wave:** Run the new repository-boundary guard and review docs for canonical root consistency.
- **Before `$gsd-verify-work`:** Fast validation command set must be documented and executable.
- **Max feedback latency:** 60 seconds for static checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | GOV-01 | T-01-01 | No removed root is presented as active source | static | `Select-String -Path README.md,AGENTS.md,Workspace/README.md -Pattern 'Workspace/Project'` | yes | pending |
| 1-02-01 | 02 | 1 | GOV-02 | T-02-01 | Noisy paths are documented as non-active without deletion | static | `powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1` | W1 | pending |
| 1-03-01 | 03 | 2 | GOV-03 | T-03-01 | CI avoids secrets and validates active stack only | static | `Test-Path .github/workflows/validation.yml` | W2 | pending |

*Status: pending until execution updates this file or writes SUMMARY.md evidence.*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Root onboarding clarity | GOV-01 | Requires human readability judgement | Read `README.md`, `AGENTS.md`, and `Workspace/README.md`; confirm each has a clear, non-overlapping job. |
| Cleanup boundary clarity | GOV-02 | Requires judgement that wording does not imply deleting user files | Read `Workspace/Project/docs/repository-boundaries.md`; confirm it says ignore/document first, no deletion without explicit request. |

---

## Validation Sign-Off

- [x] All tasks have automated or static verification paths.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 60s for static checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-04-26
