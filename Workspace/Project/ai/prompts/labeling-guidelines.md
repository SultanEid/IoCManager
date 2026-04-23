# Labeling Guidelines For IoC Decision

## Prompt Objective
Apply consistent, evidence-grounded labels for IoC Manager decision data.

Use with:
- [AI Decision Overview](../../docs/ai-decision-overview.md)
- [Verdict Taxonomy](../../docs/verdict-taxonomy.md)
- [Action Plan Policy](../../docs/action-plan-policy.md)
- [Dataset Sources](../../docs/dataset-sources.md)

## Labeling Rules
1. Choose one verdict only:
   - `confirmed_malicious`
   - `likely_malicious`
   - `likely_benign`
   - `insufficient_evidence`
2. Choose one action only:
   - `deploy`
   - `canary`
   - `monitor`
   - `hold`
   - `rollback`
   - `quarantine_for_review`
3. Set confidence in `[0.0, 1.0]` using evidence quality, conflict, and source trust.
4. Provide explicit provenance items; do not leave rationale source-free.
5. If verdict is `insufficient_evidence`, include:
   - `abstain_reason`
   - `next_best_evidence` (concrete collection requests)

## Evidence Rubric
- Prioritize corroborated, non-string-only evidence.
- Penalize high conflict and low-trust sources.
- Avoid speculative narrative leaps.
- Prefer abstention over overconfident labeling.

## Output Template
```json
{
  "verdict": "insufficient_evidence",
  "action": "hold",
  "confidence": 0.42,
  "provenance": [
    {
      "source": "scanner_feed",
      "key": "match_count",
      "value": "2",
      "evidence_id": "ev-123",
      "citation_ref": "scan://daily/2026-04-16/ev-123"
    }
  ],
  "reasons": [
    "Corroboration is limited and conflicts remain unresolved."
  ],
  "abstain_reason": "high_uncertainty",
  "next_best_evidence": [
    "Collect endpoint telemetry from affected subnet for 24h.",
    "Obtain second-source IOC confirmation from trusted feed."
  ]
}
```

## Scope Guardrail
- This prompt supports IoC Manager decision only.
- Do not introduce CTI campaign/actor graph reasoning labels.



