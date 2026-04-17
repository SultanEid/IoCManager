---
name: ai-grounded-decisioning
description: Use for AI sidecar scoring, enrichment fusion, evaluation, abstention logic, provenance, and removal of overclaimed CTI reasoning. Do not use for generic frontend work.
---

1. The AI must not infer maliciousness from strings alone.
2. Prefer deterministic normalization and evidence fusion first.
3. Final outputs must include:
   - verdict
   - action
   - confidence
   - provenance
   - abstain_reason
   - next_best_evidence
4. LLM use is limited to extraction and summarization, not final security decisions.
5. Favor calibrated, explainable models and explicit evaluation metrics.
6. Remove language or logic that implies deep CTI reasoning when the evidence does not support it.
