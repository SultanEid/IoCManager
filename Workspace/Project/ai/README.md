# AI Governance And Decision Docs

This directory contains project-scoped AI governance artifacts for IoC Manager.

Primary policy set:
- [AI Decision Overview](../docs/ai-decision-overview.md)
- [Verdict Taxonomy](../docs/verdict-taxonomy.md)
- [Action Plan Policy](../docs/action-plan-policy.md)
- [Dataset Sources](../docs/dataset-sources.md)
- [AI Model Pipeline](../docs/ai-model-pipeline.md)
- [Labeling Guidelines Prompt](prompts/labeling-guidelines.md)

Purpose:
- Keep decision decisions grounded and auditable.
- Preserve explicit abstain pathways when evidence is insufficient.
- Ensure verdict/action language aligns with the sidecar contracts.
- Keep the current model, data, training, inference, and artifact flow explicit before changing scoring behavior.

Notes:
- This repository is an IoC Manager, not a CTI platform.
- Hooks under `.codex/hooks.json` are advisory and non-destructive by design.
- On Windows runtimes, hook execution may be skipped; policy files remain authoritative.


## Active AI Project Layout

- `service/` contains the FastAPI sidecar package, runtime scorer, model/dataset registries, artifacts, and pytest suite.
- `jobs/` contains offline dataset, evaluation, training, publishing, and probing scripts. Treat scripts as experimental unless the sidecar README marks them supported and smoke-tested.
- `datasets/` contains source manifests, raw staged inputs, processed snapshots, splits, and evaluation outputs.
- `fixtures/` contains local sample inputs for YARA, Sigma, Snort, behavior reports, and labels.
- `schemas/` contains JSON schema contracts for packages, labels, datasets, and evaluation reports.
- `prompts/` contains labeling guidance used for human-governed dataset work.

The current model pipeline is documented in [AI Model Pipeline](../docs/ai-model-pipeline.md).


