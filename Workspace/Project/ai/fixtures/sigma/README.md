# Sigma Fixtures
<!-- scaffold:ai-v0 -->

Placeholder samples for Sigma rule parsing tests. Do not commit production detections here.

Scenario fixtures:
- Use `scenarios/sigma-<label>.example.json`.
- Required labels: benign, suspicious, malicious, false_positive, insufficient_evidence.

Alert fixtures:
- Use `alerts/sigma-alert-<label>.example.json`.
- These files model alert-shaped Sigma evidence for `fixture_sigma_alert_parser_v1`.

Safety:
- Rules and telemetry fields must remain synthetic and non-deployable.
