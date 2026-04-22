from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_job_module():
    path = Path(__file__).resolve().parents[2] / "jobs" / "stage_reliable_source_exports.py"
    spec = importlib.util.spec_from_file_location("stage_reliable_source_exports", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_parse_rule_line_extracts_core_fields() -> None:
    module = _load_job_module()
    parsed = module._parse_rule_line(
        'alert tcp any any -> any 443 (msg:"ET TROJAN Known Bad Traffic"; sid:2000001; rev:1; classtype:trojan-activity; reference:url,https://example.invalid/;)'
    )

    assert parsed is not None
    assert parsed["protocol"] == "tcp"
    assert parsed["sid"] == "2000001"
    assert parsed["classification"] == "trojan-activity"
    assert parsed["references"][0].startswith("url,")


def test_normalize_sigmahq_rule_builds_staged_row() -> None:
    module = _load_job_module()
    row = module._normalize_sigmahq_rule(
        payload={
            "id": "sig-001",
            "title": "Suspicious PowerShell",
            "status": "stable",
            "level": "high",
            "logsource": {"product": "windows", "service": "sysmon", "category": "process_creation"},
            "detection": {"selection": {"EventID": 1}, "condition": "selection"},
            "tags": ["attack.execution"],
        },
        archive_member="sigma-master/rules/windows/process_creation/test.yml",
        archive_url="https://github.com/SigmaHQ/sigma/archive/refs/heads/master.zip",
    )

    assert row is not None
    assert row["source"] == "sigmahq"
    assert row["object_metadata"]["source_system"] == "siem"
    assert row["raw_hit_payload"]["event_id"] == "sig-001"


def test_internal_negative_row_generation_covers_multiple_ioc_types() -> None:
    module = _load_job_module()
    clean_rows = module._build_internal_clean_baseline_rows()
    allowlist_rows = module._build_internal_allowlist_rows()
    object_types = {
        row["object_metadata"]["object_type"]
        for row in clean_rows + allowlist_rows
    }

    assert "log_event" in object_types
    assert "file" in object_types
    assert "url" in object_types or "domain" in object_types
    assert "network_flow" in object_types
    assert len(clean_rows) >= 12
    assert len(allowlist_rows) >= 12


def test_internal_reviewed_row_generation_covers_medium_trust_mix() -> None:
    module = _load_job_module()
    reviewed_rows = module._build_internal_reviewed_telemetry_rows()
    families = {row.get("rule_family", "sigma") for row in reviewed_rows}
    outcomes = {row["review_outcome"] for row in reviewed_rows}

    assert len(reviewed_rows) >= 18
    assert {"sigma", "snort", "suricata"}.issubset(families)
    assert {"suspicious", "likely_malicious", "false_positive", "likely_benign"}.issubset(outcomes)
