---
phase: AI-9
plan: 3
title: "IOC-specific metrics and promotion gates"
type: implementation
wave: 3
depends_on: [AI-09-01, AI-09-02]
files_modified:
  - Workspace/Project/ai/service/decision_service/evaluation_metrics.py
  - Workspace/Project/ai/service/decision_service/evaluator.py
  - Workspace/Project/ai/service/decision_service/promotion_gates.py
  - Workspace/Project/ai/jobs/evaluate_model.py
  - Workspace/Project/ai/jobs/publish_model.py
  - Workspace/Project/ai/service/tests/test_evaluate_model_job.py
  - Workspace/Project/ai/service/tests/test_train_and_publish_jobs.py
autonomous: true
requirements_addressed: [AI-03]
context_decisions: [D-AI9-01, D-AI9-02, D-AI9-04, D-AI9-06]
---

# Plan AI-09-03: IOC-Specific Metrics and Promotion Gates

<objective>
Make IOC model quality measurable and enforceable through IOC-specific metrics, slices, confidence-band checks, and promotion gates.
</objective>

<must_haves>
<truths>
- No model, calibration, or threshold change should be promoted if it weakens IOC decision quality.
- `likely_malicious` requires a minimum precision gate.
- False-positive, allowlist, stale, and low-trust protected cases must not regress.
- Required slices must include IOC type, source, severity, confidence bucket, age bucket, evidence tier, and label provenance.
</truths>
<acceptance>
- Evaluation reports include IOC-specific precision, recall, F1, false-positive rate, false-negative rate, Brier score, calibration, confidence distribution, and abstain rate.
- Evaluation reports include slice metrics for all required IOC slices.
- Promotion gates fail when required IOC evaluation rows or slices are missing.
- Promotion gates fail when `likely_malicious` precision, false-positive protection, calibration, or abstain-rate thresholds fail.
- Evaluation bundle metadata records dataset hash, evaluation input hash, model version, gate version, and command metadata.
</acceptance>
</must_haves>

<threat_model>
<threat id="T-AI9-03-01" severity="high">
Promotion gates may pass on aggregate metrics while failing important IOC slices.
</threat>
<mitigation>
Require slice coverage and slice-level threshold checks for high-risk slices.
</mitigation>
<verification>
Tests construct reports that pass aggregate metrics but fail a protected slice and assert publish is refused.
</verification>

<threat id="T-AI9-03-02" severity="high">
Confidence can look useful but be poorly calibrated for analyst decisions.
</threat>
<mitigation>
Require Brier score and calibration-bin checks for IOC evaluation rows.
</mitigation>
<verification>
Tests include miscalibrated confidence examples that fail gates.
</verification>
</threat_model>

<tasks>
<task id="AI9-03-01" type="auto">
<title>Add IOC evaluation metrics</title>
<files>
- `Workspace/Project/ai/service/decision_service/evaluation_metrics.py`
- `Workspace/Project/ai/service/tests/test_evaluator.py`
</files>
<action>
Add metric helpers for malicious-like precision/recall/F1, `likely_malicious` precision, false-positive rate, false-negative rate, Brier score, calibration bins, confidence distribution, abstain rate, and weak-evidence rate for IOC evaluation rows.
</action>
<verify>
Unit tests cover exact metric values on small deterministic examples.
</verify>
</task>

<task id="AI9-03-02" type="auto">
<title>Add required IOC slices</title>
<files>
- `Workspace/Project/ai/service/decision_service/evaluator.py`
- `Workspace/Project/ai/jobs/evaluate_model.py`
- `Workspace/Project/ai/service/tests/test_evaluate_model_job.py`
</files>
<action>
Emit slice metrics by IOC type, source name/type, severity, table-confidence bucket, age bucket, evidence tier, label provenance, and scan evidence availability.
</action>
<verify>
Tests assert required slice keys are present in the evaluation report and bundle.
</verify>
</task>

<task id="AI9-03-03" type="auto">
<title>Extend promotion gates for IOC quality</title>
<files>
- `Workspace/Project/ai/service/decision_service/promotion_gates.py`
- `Workspace/Project/ai/jobs/publish_model.py`
- `Workspace/Project/ai/service/tests/test_train_and_publish_jobs.py`
</files>
<action>
Add gate checks for IOC evaluation availability, required slices, `likely_malicious` precision, protected false-positive/stale/allowlist cases, calibration/Brier thresholds, and excessive abstain rate for high-quality attribute-only rows.
</action>
<verify>
Publish tests cover passing IOC gates, missing IOC eval bundle, failed likely-malicious precision, failed false-positive protection, failed calibration, and missing required slices.
</verify>
</task>

<task id="AI9-03-04" type="auto">
<title>Document gate policy</title>
<files>
- `Workspace/Project/docs/ai-sidecar-operator-workflows.md`
- `Workspace/Project/docs/ai-decision-system-reference.md`
</files>
<action>
Document how to run IOC evaluation, interpret metrics, and understand why publish is blocked.
</action>
<verify>
Docs list the IOC-specific gates and include non-secret command examples.
</verify>
</task>
</tasks>

<verification>
```powershell
Push-Location Workspace/Project/ai/service
.\.venv\Scripts\python.exe -m pytest tests/test_evaluator.py tests/test_evaluate_model_job.py tests/test_train_and_publish_jobs.py
.\.venv\Scripts\python.exe -m pytest
Pop-Location
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```
</verification>
