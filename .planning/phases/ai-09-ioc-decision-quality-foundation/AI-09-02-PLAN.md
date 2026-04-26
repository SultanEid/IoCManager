---
phase: AI-9
plan: 2
title: "IOC feature extraction and bounded scoring improvements"
type: implementation
wave: 2
depends_on: [AI-09-01]
files_modified:
  - Workspace/Project/ai/service/decision_service/scorer.py
  - Workspace/Project/ai/service/decision_service/decision_support.py
  - Workspace/Project/ai/service/tests/test_scorer.py
  - Workspace/Project/ai/service/tests/test_decision_contract_safety.py
  - Workspace/Project/ai/service/tests/test_validation_framework.py
autonomous: true
requirements_addressed: [AI-03]
context_decisions: [D-AI9-01, D-AI9-03, D-AI9-06]
---

# Plan AI-09-02: IOC Feature Extraction and Bounded Scoring Improvements

<objective>
Improve IOC-specific runtime features so analyst-facing verdicts use IOC attributes, value shape, source context, table context, and correlation signals with explicit safety caps.
</objective>

<must_haves>
<truths>
- Do not replace the model with arbitrary thresholds unless the new behavior is evaluated in AI-09-03.
- Attribute-only decisions may produce `suspicious` or `likely_malicious`, not unbounded `malicious`.
- Low-trust, conflicting, stale, revoked, allowlisted, or false-positive signals must still downgrade or abstain.
- Action plans remain manual-only.
</truths>
<acceptance>
- IOC type strength distinguishes IP, domain, URL, hash, process, and artifact.
- IOC value features detect suspicious process flags, persistence paths, URL payload patterns, risky TLDs, documentation/test IP ranges, and hash formats.
- Source features incorporate feed source type/name/trust without hard-coding secrets or local config values.
- Table features incorporate severity, confidence, first/last seen, recency, and age buckets.
- Correlation features incorporate linked scan count, sightings, target exposure, historical decisions, overrides, and response outcomes where provided.
</acceptance>
</must_haves>

<threat_model>
<threat id="T-AI9-02-01" severity="high">
Overweighting lexical IOC strings can create false positives for benign but suspicious-looking indicators.
</threat>
<mitigation>
Keep confidence caps for attribute-only decisions, preserve false-positive and stale gates, and require tests for benign suspicious-looking values.
</mitigation>
<verification>
Regression tests include benign URL/path/process examples that must not become `likely_malicious`.
</verification>

<threat id="T-AI9-02-02" severity="medium">
Source-name handling can become brittle or biased toward one local dataset.
</threat>
<mitigation>
Use normalized source categories and configurable/source-provenance fields rather than local-only names where possible.
</mitigation>
<verification>
Tests cover unknown, manual, API pull, file upload, trusted, and low-trust source cases.
</verification>
</threat_model>

<tasks>
<task id="AI9-02-01" type="auto">
<title>Extract IOC value feature helpers</title>
<files>
- `Workspace/Project/ai/service/decision_service/scorer.py`
- `Workspace/Project/ai/service/tests/test_scorer.py`
</files>
<action>
Add focused helper functions for IOC value features: URL structure, domain/TLD risk, IP address class including documentation/test ranges, hash format, Windows/Linux path indicators, PowerShell and shell execution flags, registry persistence paths, and common benign/noise patterns.
</action>
<verify>
Add unit tests for each feature family with positive and benign/control examples.
</verify>
</task>

<task id="AI9-02-02" type="auto">
<title>Integrate table and source features</title>
<files>
- `Workspace/Project/ai/service/decision_service/scorer.py`
- `Workspace/Project/ai/service/tests/test_scorer.py`
</files>
<action>
Use IOC table severity, confidence, first/last seen recency, feed source type/name, and source trust to shape provider, external source, temporal, indicator strength, and uncertainty signals.
</action>
<verify>
Tests show monotonic behavior for table confidence, source trust, and recency while low-trust rows remain cautious.
</verify>
</task>

<task id="AI9-02-03" type="auto">
<title>Integrate correlation and historical outcome features</title>
<files>
- `Workspace/Project/ai/service/decision_service/scorer.py`
- `Workspace/Project/ai/service/decision_service/decision_support.py`
- `Workspace/Project/ai/service/tests/test_validation_framework.py`
</files>
<action>
Use supplied linked scan counts, sightings, target exposure, historical decisions, analyst override, and response outcome features when present. Higher tiers may increase confidence; conflicting analyst or outcome signals must downgrade.
</action>
<verify>
Tests cover attribute-only, scan-correlated, analyst-outcome, stale, false-positive, and conflict cases.
</verify>
</task>

<task id="AI9-02-04" type="auto">
<title>Protect bounded decision semantics</title>
<files>
- `Workspace/Project/ai/service/decision_service/decision_support.py`
- `Workspace/Project/ai/service/tests/test_decision_contract_safety.py`
</files>
<action>
Keep attribute-only confidence caps, weak-evidence diagnostics, and manual-only action plans. Ensure scan-correlated and analyst-outcome tiers can raise confidence only when guardrails pass.
</action>
<verify>
Contract tests assert attribute-only verdicts are capped, low-trust rows abstain, false positives are protected, and action plans never auto-execute.
</verify>
</task>
</tasks>

<verification>
```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest tests/test_scorer.py tests/test_decision_contract_safety.py tests/test_validation_framework.py
.\.venv\Scripts\python.exe -m pytest
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
</verification>
