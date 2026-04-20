# AI Governance And Adjudication Docs

This directory contains project-scoped AI governance artifacts for IoC Manager.

Primary policy set:
- [AI Adjudication Overview](../docs/ai-adjudication-overview.md)
- [Verdict Taxonomy](../docs/verdict-taxonomy.md)
- [Action Plan Policy](../docs/action-plan-policy.md)
- [Dataset Sources](../docs/dataset-sources.md)
- [Labeling Guidelines Prompt](prompts/labeling-guidelines.md)

Purpose:
- Keep adjudication decisions grounded and auditable.
- Preserve explicit abstain pathways when evidence is insufficient.
- Ensure verdict/action language aligns with the sidecar contracts.

Notes:
- This repository is an IoC Manager, not a CTI platform.
- Hooks under `.codex/hooks.json` are advisory and non-destructive by design.
- On Windows runtimes, hook execution may be skipped; policy files remain authoritative.


## Scaffold Layout (v0)
<!-- scaffold:ai-v0-layout -->

This Phase 0 scaffold adds safe placeholders only.

- `ai/schemas/` for schema stubs
- `ai/fixtures/` for local sample inputs (`yara`, `sigma`, `snort`, `behavior`, `labels`)
- `ai/datasets/` for `manifests`, `raw`, `processed`, and `splits`
- `ai/scripts/`, `ai/tests/`, `ai/notebooks/` as starter work areas

No model architecture or training expansion is introduced in this phase.
