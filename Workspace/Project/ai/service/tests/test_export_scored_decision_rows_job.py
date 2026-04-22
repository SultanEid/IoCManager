from __future__ import annotations

import importlib.util
import json
from pathlib import Path


def _load_job_module():
    path = Path(__file__).resolve().parents[2] / "jobs" / "export_scored_decision_rows.py"
    spec = importlib.util.spec_from_file_location("export_scored_decision_rows", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_export_job_writes_scored_rows_and_skips_neutral_targets(tmp_path: Path) -> None:
    module = _load_job_module()
    input_file = tmp_path / "canonical_rows.jsonl"
    output_file = tmp_path / "scored_decision_rows.jsonl"

    rows = [
        {
            "dataset_version": "unit-v1",
            "event_time_utc": "2026-04-22T00:00:00Z",
            "rule_family": "sigma",
            "package_payload": {
                "rule_family": "sigma",
                "full_rule_text": "title: Suspicious Connection",
                "rule_metadata": {
                    "source": "threatfox",
                    "rule_id": "SIG-1",
                    "title": "Suspicious Connection",
                    "id": "sig-1",
                    "status": "stable",
                    "logsource": {"category": "threat_intel", "product": "threatfox"},
                },
                "raw_hit_payload": {
                    "event_id": "evt-1",
                    "domain": "botnet-updater.example",
                },
                "object_metadata": {
                    "object_id": "botnet-updater.example",
                    "object_type": "domain",
                    "source_system": "threatfox",
                },
                "linked_enrichment": {"enrichments": [{"kind": "threat_intel", "source": "threatfox"}]},
            },
            "target_payload": {
                "adjudication": {
                    "verdict": "likely_malicious",
                }
            },
            "source_file": {"source_name": "threatfox"},
            "evidence_used": [{"summary": "source evidence"}],
            "evidence_missing": [],
        },
        {
            "dataset_version": "unit-v1",
            "event_time_utc": "2026-04-22T00:05:00Z",
            "rule_family": "yara",
            "package_payload": {
                "rule_family": "yara",
                "full_rule_text": "rule Unknown { condition: true }",
                "rule_metadata": {"source": "yaraify", "rule_id": "Y-1", "rule_name": "Unknown"},
                "raw_hit_payload": {"event_id": "evt-2"},
                "object_metadata": {"object_id": "a" * 64, "object_type": "file", "source_system": "yaraify"},
            },
            "target_payload": {
                "adjudication": {
                    "verdict": "insufficient_evidence",
                }
            },
            "source_file": {"source_name": "yaraify"},
            "evidence_used": [],
            "evidence_missing": [{"gap_id": "missing"}],
        },
    ]

    with input_file.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row))
            handle.write("\n")

    result = module.export_scored_rows(input_file=input_file, output_file=output_file)

    exported_rows = [
        json.loads(line)
        for line in output_file.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert result["exportedRowCount"] == 1
    assert result["skipped"]["neutral_target_verdict"] == 1
    assert exported_rows[0]["label"] == 1
    assert exported_rows[0]["ruleFamily"] == "sigma"
    assert "score" in exported_rows[0]
    assert exported_rows[0]["predictedVerdict"]


def test_rule_context_includes_source_aware_signals_for_external_rows() -> None:
    module = _load_job_module()
    row = {
        "rule_family": "snort",
        "package_payload": {
            "rule_metadata": {
                "source": "urlhaus",
                "rule_id": "URLHAUS-1",
                "title": "Malware download",
            },
            "raw_hit_payload": {
                "url_status": "online",
                "payloads": [{"sha256": "a" * 64}],
                "threat": "malware_download",
                "url": "https://bad.example/dropper.exe",
            },
            "object_metadata": {
                "object_id": "https://bad.example/dropper.exe",
                "object_type": "url",
                "source_system": "urlhaus",
            },
            "linked_enrichment": {"enrichments": [{"kind": "threat_intel", "source": "urlhaus"}]},
        },
        "source_file": {"source_name": "urlhaus"},
    }

    context = module._build_rule_context(row)
    assert context["providerConfidence"] >= 0.80
    assert context["externalSourceSignal"] >= 0.69
    assert context["indicatorStrength"] >= 0.75
    assert context["sightingsCount"] >= 2.0
