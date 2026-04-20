# Snort Fixtures
<!-- scaffold:ai-v0 -->

Placeholder samples for Snort rule parsing tests. Do not commit production IDS rules here.

Scenario fixtures:
- Use `scenarios/snort-<label>.example.json`.
- Required labels: benign, suspicious, malicious, false_positive, insufficient_evidence.

Alert fixtures:
- Use `alerts/snort-alert-<label>.example.json`.
- These files model alert-shaped Snort evidence for `fixture_snort_alert_parser_v1`.

Internal flow/PCAP fixtures:
- Use `flow_pcap/snort-flow-pcap-<label>.example.json`.
- These files model internal flow telemetry with PCAP metadata for `fixture_internal_flow_pcap_metadata_parser_v1`.

Internal environment context fixtures:
- Use `environment_context/snort-environment-context-<label>.example.json`.
- These files model internal context overlays for `fixture_internal_environment_context_parser_v1`.

Safety:
- Keep synthetic network indicators and avoid real attacker infrastructure.
