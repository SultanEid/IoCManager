from __future__ import annotations

from decision_service.decision_dataset_builder import _normalize_row
from decision_service.source_adapters import adapt_source_record


def test_fixture_yara_parser_preserves_raw_payload_and_behavior_refs() -> None:
    payload = {
        "rule_family": "yara",
        "full_rule_text": "rule TestFixture { condition: true }",
        "rule_metadata": {"source": "fixture", "rule_id": "Y-FIX-1", "rule_name": "TestFixture"},
        "raw_hit_payload": {"event_id": "evt-1"},
        "object_metadata": {"object_id": "obj-1", "object_type": "file"},
        "behavior_report_references": {
            "reports": [
                {
                    "report_id": "vt-rep-1",
                    "source": "virustotal",
                    "reference": "internal://behavior-reports/vt-rep-1",
                    "summary": "VT behavior summary",
                }
            ]
        },
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "fixture_yara_parser_v1", "source_path": "fixture.json", "record_locator": "file"},
    )

    assert result.package_payload["rule_family"] == "yara"
    assert result.raw_payload["rule_metadata"]["rule_id"] == "Y-FIX-1"
    assert result.package_payload["behavior_report_references"]["reports"][0]["report_id"] == "vt-rep-1"
    assert result.evidence_used_patch[0]["evidence_id"] == "vt-rep-1"
    assert all(item["severity"] != "error" for item in result.parser_diagnostics)


def test_yaraify_parser_handles_missing_fields_with_diagnostics() -> None:
    payload = {
        "id": "yaraify-1",
        "metadata": {},
        "scan_result": {"status": "match"},
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "yaraify_feed_parser_v1"},
    )

    assert result.package_payload["rule_family"] == "yara"
    assert result.package_payload["rule_metadata"]["source"] == "yaraify"
    codes = {item["code"] for item in result.parser_diagnostics}
    assert "yaraify.rule_text.missing" in codes
    assert "yaraify.rule_name.missing" in codes
    assert result.raw_payload["id"] == "yaraify-1"


def test_malwarebazaar_parser_adds_enrichment_and_row_remains_partial_when_rule_text_missing() -> None:
    payload = {
        "sha256_hash": "a" * 64,
        "file_name": "sample.bin",
        "signature": "family-x",
        "first_seen": "2026-04-16T00:00:00Z",
        "tags": ["loader", "stealer"],
        "event_time": "2026-04-16T00:00:00Z",
        "decision_result": {"verdict": "likely_malicious"},
    }

    row = _normalize_row(
        raw={
            "raw": payload,
            "scenario_label": None,
            "source_file": {
                "manifest_name": "malwarebazaar.manifest.json",
                "source_name": "malwarebazaar",
                "source_type": "external_feed",
                "source_path": "C:/tmp/malwarebazaar.jsonl",
                "record_locator": "row:1",
                "loader": "import_jsonl",
                "parser_name": "malwarebazaar_feed_parser_v1",
            },
        },
        dataset_version="unit-v1",
    )

    enrichments = row["package_payload"]["linked_enrichment"]["enrichments"]
    assert enrichments[0]["source"] == "malwarebazaar"
    assert row["is_partial"] is True
    assert "package_payload.full_rule_text" in row["missing_fields"]


def test_vt_style_behavior_summary_is_normalized_into_references_and_evidence() -> None:
    payload = {
        "rule_name": "InternalTest",
        "rule_text": "rule InternalTest { condition: true }",
        "rule_id": "INT-1",
        "sha256": "b" * 64,
        "virustotal_summary": {
            "report_id": "vt-rep-2",
            "report_style": "virustotal_style_summary",
            "behavioral_summary": {
                "high_level": "Observed outbound command-and-control behavior.",
                "observed_capabilities": ["CreateRemoteThread", "periodic_network_polling"],
                "persistence_observed": True,
            },
            "network_summary": {
                "domains": ["control.sync-queue.example"],
                "ip_contacts": ["198.51.100.88"],
            },
            "process_summary": {
                "tree": [
                    {
                        "image": "powershell.exe",
                        "command_line": "powershell.exe -enc SQBFAFgA",
                        "children": ["rundll32.exe C:\\Windows\\Temp\\helper.dll,Run"],
                    }
                ]
            },
        },
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "internal_yara_hit_json_parser_v1"},
    )

    reports = result.package_payload["behavior_report_references"]["reports"]
    assert reports[0]["source"] == "virustotal"
    features = reports[0]["extracted_behavior_features"]
    assert "memory_injection_api" in features["suspicious_api_system_call_families"]
    assert "persistence_observed" in features["persistence_indicators"]
    assert features["network_destinations"][0]["type"] in {"domain", "ip", "url", "http_path"}
    assert result.evidence_used_patch[0]["evidence_id"] == "vt-rep-2"


def test_behavior_report_bundle_parser_extracts_cape_features_and_promotes_snippets() -> None:
    payload = {
        "provider": "CAPE",
        "report_id": "cape-rep-test",
        "report_style": "cape_summary",
        "generated_at": "2026-04-15T19:04:00Z",
        "behavioral_summary": {
            "high_level": "Sample launched helper processes and used suspicious API patterns.",
            "observed_capabilities": ["credential_access_primitives", "CreateRemoteThread", "scripted_tasking"],
            "persistence_observed": True,
            "evasion_observed": True,
        },
        "network_summary": {
            "domains": ["control.sync-queue.example"],
            "ip_contacts": ["198.51.100.88"],
            "http_requests": [{"method": "POST", "uri_path": "/tasking/v2"}],
        },
        "process_summary": {
            "tree": [
                {
                    "image": "invoice_viewer_stub.exe",
                    "command_line": "invoice_viewer_stub.exe /quiet",
                    "children": [
                        "rundll32.exe C:\\ProgramData\\diag-helper.dll,Run",
                        "powershell.exe -NoProfile -Command Start-Sleep 5",
                        "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v updater /d C:\\temp\\updater.exe",
                    ],
                }
            ],
            "dropped_files": ["C:\\ProgramData\\SystemHealth\\svc-host.dat"],
        },
        "sample": {
            "is_signed": False,
            "signer": "Microsoft Windows",
        },
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "behavior_report_bundle_parser_v1"},
    )

    reports = result.package_payload["behavior_report_references"]["reports"]
    report = reports[0]
    features = report["extracted_behavior_features"]
    assert features["process_tree_shape"]["max_depth"] >= 2
    assert "persistence_observed" in features["persistence_indicators"]
    assert "registry_modifications" in features
    assert "dropped_files" in features
    assert "anti_analysis_markers" in features
    assert "signer_publisher_contradictions" in features
    assert report["behavior_evidence_snippets"]
    assert any(item["evidence_id"].startswith("cape-rep-test#snippet-") for item in result.evidence_used_patch)
    assert all(item["severity"] != "error" for item in result.parser_diagnostics)


def test_behavior_report_bundle_parser_extracts_cuckoo_script_usage_and_emits_snippet_evidence() -> None:
    payload = {
        "provider": "Cuckoo",
        "report_id": "cuckoo-rep-test",
        "report_style": "cuckoo_summary",
        "behavioral_summary": {
            "high_level": "Archive expanded script files and spawned script-host execution.",
            "observed_capabilities": ["obfuscated_script_execution", "periodic_network_polling"],
            "evasion_observed": True,
        },
        "network_summary": {
            "domains": ["api.telemetry-check.example"],
            "ip_contacts": ["198.51.100.44"],
        },
        "process_summary": {
            "tree": [
                {
                    "image": "wscript.exe",
                    "command_line": "wscript.exe //E:jscript launcher.js -enc U0FNUExFX0RBVEE=",
                    "children": ["cmd.exe /c timeout /t 5"],
                }
            ],
            "dropped_files": ["C:\\Users\\Public\\scripts\\sync-helper.ps1"],
        },
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "behavior_report_bundle_parser_v1"},
    )

    report = result.package_payload["behavior_report_references"]["reports"][0]
    features = report["extracted_behavior_features"]
    assert "wscript.exe" in features["suspicious_script_interpreter_usage"]
    assert "evasion_observed" in features["anti_analysis_markers"]
    snippet_summaries = [item["summary"] for item in result.evidence_used_patch if "#snippet-" in str(item.get("evidence_id"))]
    assert any("script/interpreter" in summary.lower() for summary in snippet_summaries)
    assert all(item["severity"] != "error" for item in result.parser_diagnostics)


def test_behavior_report_bundle_parser_marks_unusable_malformed_report_with_mixed_diagnostics() -> None:
    payload = {
        "provider": "CAPE",
        "report_id": "cape-rep-bad",
        "report_style": "cape_summary",
        "behavioral_summary": "not-an-object",
        "network_summary": "also-not-an-object",
        "process_summary": "still-not-an-object",
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "behavior_report_bundle_parser_v1"},
    )

    report = result.package_payload["behavior_report_references"]["reports"][0]
    report_codes = {item["code"] for item in report["feature_extraction_diagnostics"]}
    parser_codes = {item["code"] for item in result.parser_diagnostics}
    assert "behavior.behavioral_summary.invalid_type" in report_codes
    assert "behavior.network_summary.invalid_type" in report_codes
    assert "behavior.process_summary.invalid_type" in report_codes
    assert "behavior.feature_extraction.unusable" in report_codes
    assert "behavior.feature_extraction.unusable" in parser_codes
    assert any(item["severity"] == "error" for item in result.parser_diagnostics)


def test_behavior_report_bundle_parser_name_is_registered_without_unknown_adapter_warning() -> None:
    payload = {
        "provider": "CAPE",
        "report_id": "cape-rep-routing",
        "report_style": "cape_summary",
        "behavioral_summary": {"high_level": "Observed helper process spawn.", "observed_capabilities": ["scripted_tasking"]},
        "network_summary": {"domains": ["example.invalid"], "ip_contacts": []},
        "process_summary": {"tree": [{"image": "cmd.exe", "command_line": "cmd.exe /c echo test", "children": []}]},
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "behavior_report_bundle_parser_v1"},
    )

    codes = {item["code"] for item in result.parser_diagnostics}
    assert "adapter.unknown" not in codes


def test_internal_reviewed_telemetry_parser_supports_sigma_review_rows() -> None:
    payload = {
        "record_id": "reviewed-siem-test",
        "source": "internal-reviewed-telemetry",
        "review_outcome": "suspicious",
        "review_summary": "Reviewed rare synchronization helper launched from user profile",
        "review_confidence": 0.66,
        "false_positive_risk": 0.34,
        "event_time_utc": "2026-04-22T12:00:00Z",
        "rule_family": "sigma",
        "rule_id": "REVIEWED-SIEM-TEST",
        "title": "Reviewed rare synchronization helper launched from user profile",
        "status": "stable",
        "level": "medium",
        "logsource": {"product": "windows", "service": "sysmon", "category": "process_creation"},
        "raw_hit_payload": {
            "event_id": "4688",
            "image": "sync-helper.exe",
            "command_line": "sync-helper.exe --profile user-cache --target relay-check.example.internal",
        },
        "object_metadata": {
            "object_id": "relay-check.example.internal",
            "object_type": "domain",
            "source_system": "siem",
        },
    }

    result = adapt_source_record(payload=payload, source_file={"parser_name": "internal_reviewed_telemetry_parser_v1"})

    assert result.package_payload["rule_family"] == "sigma"
    assert result.target_payload_patch["decision"]["verdict"] == "suspicious"
    assert result.package_payload["object_metadata"]["source_system"] == "siem"
    assert result.evidence_used_patch[0]["source"] == "internal_reviewed_telemetry"


def test_internal_reviewed_telemetry_parser_supports_network_review_rows() -> None:
    payload = {
        "record_id": "reviewed-snort-test",
        "source": "internal-reviewed-telemetry",
        "rule_family": "suricata",
        "review_outcome": "false_positive",
        "review_summary": "Reviewed approved scanner sweep from validation host",
        "review_confidence": 0.31,
        "false_positive_risk": 0.68,
        "event_time_utc": "2026-04-22T12:00:00Z",
        "rule_id": "REVIEWED-SNORT-TEST",
        "sid": "REVIEWED-SNORT-TEST",
        "msg": "Reviewed approved scanner sweep from validation host",
        "classification": "network-scan",
        "protocol": "tcp",
        "raw_hit_payload": {
            "message": "Reviewed approved scanner sweep from validation host",
            "network": {
                "five_tuple": {
                    "src_ip": "10.10.10.10",
                    "src_port": 51111,
                    "dst_ip": "10.10.10.20",
                    "dst_port": 443,
                    "protocol": "tcp",
                }
            },
        },
        "object_metadata": {
            "object_id": "flow:10.10.10.10:51111->10.10.10.20:443:tcp",
            "object_type": "network_flow",
            "source_system": "suricata",
        },
    }

    result = adapt_source_record(payload=payload, source_file={"parser_name": "internal_reviewed_telemetry_parser_v1"})

    assert result.package_payload["rule_family"] == "suricata"
    assert result.target_payload_patch["decision"]["verdict"] == "false_positive"
    assert result.package_payload["object_metadata"]["source_system"] == "suricata"
    assert result.evidence_used_patch[0]["source"] == "internal_reviewed_telemetry"


def test_internal_yara_hit_parser_maps_nested_aliases() -> None:
    payload = {
        "alert": {"rule": {"name": "NestedRule", "id": "NEST-1", "text": "rule NestedRule { condition: true }"}},
        "file": {"sha256": "c" * 64, "path": "C:/sample.bin"},
        "observed_at": "2026-04-16T00:00:00Z",
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "internal_yara_hit_json_parser_v1"},
    )

    assert result.package_payload["rule_metadata"]["rule_name"] == "NestedRule"
    assert result.package_payload["object_metadata"]["object_id"] == "c" * 64
    assert result.event_time_hint == "2026-04-16T00:00:00Z"


def test_threatfox_parser_maps_indicator_metadata_and_target_patch() -> None:
    payload = {
        "id": "777001",
        "ioc": "login-updater.example",
        "ioc_type": "domain",
        "threat_type": "botnet_cc",
        "threat_type_desc": "Botnet command and control",
        "malware": "winloader",
        "confidence_level": 85,
        "first_seen_utc": "2026-04-20T10:00:00Z",
        "tags": ["c2", "loader"],
        "reporter": "unit-test",
        "reference": "https://threatfox.abuse.ch/ioc/777001/",
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "threatfox_feed_parser_v1"},
    )

    assert result.package_payload["rule_family"] == "sigma"
    assert result.package_payload["raw_hit_payload"]["event_id"] == "threatfox-777001"
    assert result.package_payload["raw_hit_payload"]["domain"] == "login-updater.example"
    assert result.package_payload["object_metadata"]["object_type"] == "domain"
    assert result.target_payload_patch["decision"]["verdict"] == "likely_malicious"
    assert result.provenance_items[0]["source"] == "threatfox"


def test_urlhaus_parser_maps_url_metadata_payloads_and_target_patch() -> None:
    payload = {
        "id": "880011",
        "url": "https://cdn-bad.example/dropper.exe",
        "url_status": "online",
        "threat": "malware_download",
        "host": "cdn-bad.example",
        "dateadded": "2026-04-20 14:30:00 UTC",
        "payloads": [
            {
                "sha256_hash": "f" * 64,
                "signature": "dropper-family",
            }
        ],
        "urlhaus_link": "https://urlhaus.abuse.ch/url/880011/",
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "urlhaus_feed_parser_v1"},
    )

    assert result.package_payload["rule_family"] == "snort"
    assert result.package_payload["raw_hit_payload"]["message"].startswith("URLhaus malware url")
    assert result.package_payload["raw_hit_payload"]["network"]["request_url"] == "https://cdn-bad.example/dropper.exe"
    assert result.package_payload["object_metadata"]["object_type"] == "url"
    assert result.target_payload_patch["decision"]["verdict"] == "malicious"
    assert result.provenance_items[0]["source"] == "urlhaus"


def test_fixture_sigma_rule_parser_normalizes_metadata_and_lineage() -> None:
    payload = {
        "rule_family": "sigma",
        "full_rule_text": "title: Unit Sigma Rule",
        "rule_metadata": {
            "source": "sigma-unit",
            "rule_id": "SIG-UNIT-1",
            "title": "Unit Sigma Rule",
            "id": "SIGMA-UUID-1",
            "status": "stable",
            "logsource": {"category": "process_creation", "product": "windows"},
        },
        "raw_hit_payload": {
            "event_id": "evt-sigma-1",
            "process": {"process_guid": "proc-guid-1", "pid": 42},
        },
        "object_metadata": {"object_id": "proc-guid-1", "object_type": "process_event"},
        "process_lineage": [{"process_guid": "proc-guid-1", "parent_process_guid": "parent-guid-1"}],
        "host": {"host_id": "host-1", "hostname": "wkstn-1"},
        "user": {"user_id": "u-1", "user_name": "alice"},
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "fixture_sigma_rule_parser_v1", "source_path": "sigma-rule.json"},
    )

    assert result.package_payload["rule_family"] == "sigma"
    assert result.package_payload["rule_metadata"]["rule_id"] == "SIG-UNIT-1"
    assert result.package_payload["rule_metadata"]["logsource"]["category"] == "process_creation"
    assert result.package_payload["raw_hit_payload"]["lineage"]["process"][0]["process_guid"] == "proc-guid-1"
    assert result.package_payload["object_metadata"]["custom_attributes"]["lineage"]["host"]["host_id"] == "host-1"
    assert result.provenance_items[0]["retrieved_by"] == "fixture_sigma_rule_parser_v1"


def test_fixture_sigma_alert_parser_normalizes_alert_shape_and_lineage() -> None:
    payload = {
        "alert": {
            "event_id": "evt-alert-1",
            "timestamp": "2026-04-16T10:00:00Z",
            "source": "siem",
            "rule": {
                "source": "sigma-hq",
                "rule_id": "SIG-ALERT-1",
                "title": "Suspicious LOLBIN",
                "id": "rule-uuid-1",
                "status": "stable",
                "logsource": {"category": "process_creation", "product": "windows"},
                "text": "title: Suspicious LOLBIN",
            },
            "process": {"process_guid": "pg-1", "pid": 9001, "image": "cmd.exe"},
            "user": {"user_id": "u-2", "user_name": "bob"},
            "host": {"host_id": "h-2", "hostname": "srv-2"},
            "lineage": {"process": [{"process_guid": "pg-1", "parent_process_guid": "pg-0"}]},
        }
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "fixture_sigma_alert_parser_v1"},
    )

    assert result.package_payload["rule_metadata"]["rule_id"] == "SIG-ALERT-1"
    assert result.package_payload["raw_hit_payload"]["event"]["event_id"] == "evt-alert-1"
    assert result.package_payload["raw_hit_payload"]["process"]["pid"] == 9001
    assert result.package_payload["raw_hit_payload"]["lineage"]["process"][0]["parent_process_guid"] == "pg-0"
    assert result.package_payload["object_metadata"]["custom_attributes"]["lineage"]["process"][0]["process_guid"] == "pg-1"


def test_analyst_closure_parser_populates_prior_outcomes_and_target_patch() -> None:
    payload = {
        "closure_label": "false_positive",
        "analyst_id": "analyst-1",
        "case_id": "case-1",
        "decision_id": "dec-1",
        "closed_at": "2026-04-16T03:00:00Z",
        "notes": "Known software installer activity.",
        "is_final": True,
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "analyst_closure_parser_v1", "source_path": "closure.jsonl"},
    )

    assert result.target_payload_patch["decision"]["verdict"] == "likely_benign"
    prior = result.package_payload["prior_analyst_outcomes"]["outcomes"][0]
    assert prior["verdict"] == "false_positive"
    assert prior["analyst_id"] == "analyst-1"
    assert result.evidence_used_patch[0]["source"] == "analyst_closure"
    assert result.provenance_items[0]["source"] == "analyst_closure"


def test_context_parsers_handle_missing_context_safely() -> None:
    allowlist_result = adapt_source_record(
        payload={"id": "allowlist-row-1"},
        source_file={"parser_name": "internal_allowlist_parser_v1"},
    )
    baseline_result = adapt_source_record(
        payload={"id": "baseline-row-1"},
        source_file={"parser_name": "clean_baseline_profile_parser_v1"},
    )

    allowlist_codes = {item["code"] for item in allowlist_result.parser_diagnostics}
    baseline_codes = {item["code"] for item in baseline_result.parser_diagnostics}
    assert "allowlist.context.missing" in allowlist_codes
    assert "baseline.asset_context.missing" in baseline_codes
    assert "baseline.time_context.missing" in baseline_codes
    assert all(item["severity"] != "error" for item in allowlist_result.parser_diagnostics)
    assert all(item["severity"] != "error" for item in baseline_result.parser_diagnostics)


def test_sigma_alert_parser_emits_rule_metadata_diagnostics_when_fields_missing() -> None:
    payload = {
        "alert": {
            "event_id": "evt-missing-rule",
            "process": {"pid": 1},
        }
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "fixture_sigma_alert_parser_v1"},
    )

    codes = {item["code"] for item in result.parser_diagnostics}
    assert "sigma.rule_metadata.rule_id.missing" in codes
    assert "sigma.rule_metadata.title.missing" in codes
    assert result.package_payload["rule_family"] == "sigma"
    assert result.raw_payload["alert"]["event_id"] == "evt-missing-rule"


def test_fixture_snort_rule_parser_normalizes_core_fields_and_five_tuple() -> None:
    payload = {
        "rule_family": "snort",
        "full_rule_text": "alert tcp $HOME_NET any -> $EXTERNAL_NET 443 (msg:\"Suspicious beacon\"; sid:551001; rev:3; classtype:trojan-activity;)",
        "rule_metadata": {
            "source": "ids-unit",
            "rule_id": "SNRT-551001",
            "sid": "551001",
            "rev": "3",
            "msg": "Suspicious beacon",
            "classification": "trojan-activity",
        },
        "raw_hit_payload": {
            "src_ip": "10.1.2.3",
            "src_port": 51000,
            "dst_ip": "198.51.100.2",
            "dst_port": 443,
            "flow": "to_server,established",
            "observed_at": "2026-04-16T08:01:00Z",
        },
        "object_metadata": {"object_id": "flow-snort-551001", "object_type": "network_flow"},
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "fixture_snort_rule_parser_v1", "source_path": "snort-rule.json"},
    )

    metadata = result.package_payload["rule_metadata"]
    network = result.package_payload["raw_hit_payload"]["network"]
    assert result.package_payload["rule_family"] == "snort"
    assert metadata["sid"] == 551001
    assert metadata["msg"] == "Suspicious beacon"
    assert metadata["classification"] == "trojan-activity"
    assert network["five_tuple"]["protocol"] == "tcp"
    assert network["five_tuple"]["src_ip"] == "10.1.2.3"
    assert result.provenance_items[0]["retrieved_by"] == "fixture_snort_rule_parser_v1"
    assert all(item["severity"] != "error" for item in result.parser_diagnostics)


def test_fixture_snort_alert_parser_normalizes_directionality_timing_and_repetition() -> None:
    payload = {
        "alert": {
            "timestamp": "2026-04-16T09:30:00Z",
            "src_ip": "10.5.6.7",
            "src_port": 51234,
            "dst_ip": "203.0.113.44",
            "dst_port": 443,
            "flow": "to_server,established",
            "rule": {
                "source": "ids-unit",
                "rule_id": "SNRT-551010",
                "sid": 551010,
                "rev": 1,
                "msg": "Suspicious periodic cadence",
                "classtype": "trojan-activity",
                "text": "alert tcp any any -> any 443 (msg:\"Suspicious periodic cadence\"; flow:to_server,established; threshold:type both, track by_src, count 12, seconds 60; sid:551010; rev:1; classtype:trojan-activity;)",
            },
            "threshold": {"type": "both", "track": "by_src", "count": 12, "seconds": 60},
        }
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "fixture_snort_alert_parser_v1"},
    )

    network = result.package_payload["raw_hit_payload"]["network"]
    assert network["directionality"]["arrow"] == "->"
    assert "to_server" in network["directionality"]["flow"]
    assert network["timing"]["observed_at"] == "2026-04-16T09:30:00Z"
    assert network["repetition"]["count"] == 12
    assert network["repetition"]["window_seconds"] == 60
    assert network["repetition"]["track"] == "by_src"


def test_fixture_internal_flow_pcap_parser_maps_pcap_metadata_and_is_parse_safe() -> None:
    payload = {
        "full_rule_text": "alert tcp any any -> any 443 (msg:\"Flow pcap\"; sid:552000; rev:1; classtype:trojan-activity;)",
        "rule_metadata": {
            "source": "internal-flow",
            "rule_id": "SNRT-552000",
            "sid": 552000,
            "rev": 1,
            "msg": "Flow pcap",
            "classification": "trojan-activity",
        },
        "flow": {
            "flow_id": "flow-552000",
            "src_ip": "10.9.9.9",
            "src_port": 41234,
            "dst_ip": "198.51.100.55",
            "dst_port": 443,
            "protocol": "tcp",
            "observed_at": "2026-04-16T10:11:00Z",
        },
        "pcap": {
            "capture_id": "pcap-552000",
            "file_path": "captures/unit-552000.pcap",
            "packet_count": 120,
            "byte_count": 20480,
        },
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "fixture_internal_flow_pcap_metadata_parser_v1"},
    )

    network = result.package_payload["raw_hit_payload"]["network"]
    assert network["pcap_metadata"]["capture_id"] == "pcap-552000"
    assert network["pcap_metadata"]["packet_count"] == 120
    assert network["five_tuple"]["src_ip"] == "10.9.9.9"
    assert all(item["severity"] != "error" for item in result.parser_diagnostics)


def test_fixture_internal_environment_context_parser_handles_missing_context_safely() -> None:
    result = adapt_source_record(
        payload={"id": "env-row-1", "raw_hit_payload": {"sensor": "snort-lab-1"}},
        source_file={"parser_name": "fixture_internal_environment_context_parser_v1"},
    )

    codes = {item["code"] for item in result.parser_diagnostics}
    assert "snort.asset_context.missing" in codes
    assert "snort.time_context.missing" in codes
    assert "snort.allowlist_context.missing" in codes
    assert "snort.environment_context.missing" in codes
    assert result.raw_payload["id"] == "env-row-1"
    assert all(item["severity"] != "error" for item in result.parser_diagnostics)


def test_snort_rule_parser_emits_diagnostics_for_invalid_sid_and_bad_port() -> None:
    payload = {
        "full_rule_text": "alert tcp any any -> any 443 (msg:\"Bad sid\"; sid:abc; rev:1; classtype:trojan-activity;)",
        "rule_metadata": {
            "source": "ids-unit",
            "rule_id": "SNRT-BAD-1",
            "sid": "abc",
            "rev": 1,
            "msg": "Bad sid",
            "classification": "trojan-activity",
        },
        "raw_hit_payload": {
            "src_ip": "10.10.10.1",
            "src_port": "invalid-port",
            "dst_ip": "198.51.100.25",
            "dst_port": 443,
        },
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "fixture_snort_rule_parser_v1"},
    )

    codes = {item["code"] for item in result.parser_diagnostics}
    assert "snort.rule_metadata.sid.invalid" in codes
    assert "snort.rule_metadata.sid.missing" in codes
    assert "snort.network.src_port.invalid" in codes


def test_sigmahq_parser_maps_official_rule_metadata_and_target_patch() -> None:
    payload = {
        "id": "8f5a0d8e-53b3-48b5-a1f9-test",
        "title": "Suspicious PowerShell Encoded Command",
        "status": "stable",
        "level": "high",
        "source": "sigmahq",
        "logsource": {"product": "windows", "service": "sysmon", "category": "process_creation"},
        "detection": {"selection": {"EventID": 1, "Image|endswith": "powershell.exe"}, "condition": "selection"},
        "tags": ["attack.execution", "attack.t1059.001"],
        "rule_text": "title: Suspicious PowerShell Encoded Command",
        "raw_hit_payload": {"event_id": "sysmon-1", "image": "powershell.exe"},
        "object_metadata": {"object_id": "sigmahq:test", "object_type": "log_event", "source_system": "siem"},
        "source_url": "https://github.com/SigmaHQ/sigma",
    }
    result = adapt_source_record(
        payload=payload,
        source_file={"parser_name": "sigmahq_rule_parser_v1", "source_path": "sigmahq.jsonl", "record_locator": "row:1"},
    )

    assert result.package_payload["rule_family"] == "sigma"
    assert result.package_payload["rule_metadata"]["source"] == "sigmahq"
    assert result.target_payload_patch["decision"]["verdict"] == "likely_malicious"
    assert result.provenance_items[0]["source"] == "sigmahq"


def test_snort_community_parser_maps_network_rule_and_target_patch() -> None:
    payload = {
        "rule_id": "SNORT_COMMUNITY-2000001",
        "sid": "2000001",
        "msg": "ET TROJAN Known Bad Traffic",
        "classification": "trojan-activity",
        "protocol": "tcp",
        "rule_text": 'alert tcp any any -> any any (msg:"ET TROJAN Known Bad Traffic"; sid:2000001; rev:1; classtype:trojan-activity;)',
        "raw_hit_payload": {"event_id": "snort-2000001", "message": "ET TROJAN Known Bad Traffic"},
        "object_metadata": {"object_id": "snort:2000001", "object_type": "network_flow", "source_system": "snort"},
        "source_url": "https://www.snort.org/downloads/",
    }
    result = adapt_source_record(
        payload=payload,
        source_file={
            "parser_name": "snort_community_rule_parser_v1",
            "source_path": "snort-community.jsonl",
            "record_locator": "row:1",
        },
    )

    assert result.package_payload["rule_family"] == "snort"
    assert result.package_payload["rule_metadata"]["source"] == "snort_community"
    assert result.target_payload_patch["decision"]["verdict"] == "likely_malicious"


def test_et_open_suricata_parser_preserves_suricata_family() -> None:
    payload = {
        "rule_id": "ET_OPEN_SURICATA-1000001",
        "sid": "1000001",
        "msg": "ET MALWARE Suspicious DNS Request",
        "classification": "trojan-activity",
        "protocol": "udp",
        "rule_text": 'alert udp any any -> any 53 (msg:"ET MALWARE Suspicious DNS Request"; sid:1000001; rev:1; classtype:trojan-activity;)',
        "raw_hit_payload": {"event_id": "suricata-1000001", "message": "ET MALWARE Suspicious DNS Request"},
        "object_metadata": {"object_id": "suricata:1000001", "object_type": "network_flow", "source_system": "suricata"},
        "source_url": "https://rules.emergingthreats.net/open/suricata-7.0/",
    }
    result = adapt_source_record(
        payload=payload,
        source_file={
            "parser_name": "et_open_suricata_rule_parser_v1",
            "source_path": "et-open-suricata.jsonl",
            "record_locator": "row:1",
        },
    )

    assert result.package_payload["rule_family"] == "suricata"
    assert result.package_payload["rule_metadata"]["source"] == "et_open_suricata"
    assert result.package_payload["object_metadata"]["source_system"] == "suricata"
    assert result.target_payload_patch["decision"]["verdict"] == "likely_malicious"


def test_internal_negative_sources_patch_benign_targets() -> None:
    allowlist_payload = {
        "record_id": "allow-1",
        "title": "Approved enterprise updater",
        "rule_id": "ALLOW-1",
        "status": "stable",
        "level": "low",
        "logsource": {"product": "windows", "service": "sysmon", "category": "process_creation"},
        "rule_text": "title: Approved enterprise updater",
        "raw_hit_payload": {"event_id": "4688", "image": "updater.exe"},
        "object_metadata": {"object_id": "allow-obj", "object_type": "log_event", "source_system": "siem"},
        "allowlist_baseline_context": {"allowlisted": True, "baseline_match": True, "baseline_name": "enterprise-known-good"},
    }
    allowlist_result = adapt_source_record(
        payload=allowlist_payload,
        source_file={"parser_name": "internal_allowlist_parser_v1"},
    )
    assert allowlist_result.target_payload_patch["decision"]["verdict"] == "benign"

    baseline_payload = {
        "profile_id": "base-1",
        "title": "Known clean recurring service",
        "rule_id": "BASE-1",
        "status": "stable",
        "level": "low",
        "logsource": {"product": "windows", "service": "sysmon", "category": "process_creation"},
        "rule_text": "title: Known clean recurring service",
        "raw_hit_payload": {"event_id": "4688", "image": "service.exe"},
        "object_metadata": {"object_id": "base-obj", "object_type": "log_event", "source_system": "siem"},
        "allowlist_baseline_context": {"allowlisted": False, "baseline_match": True, "baseline_name": "enterprise-known-good"},
        "time_prevalence_context": {"trend": "stable", "recency_bucket": "persistent", "hit_count_7d": 24},
    }
    baseline_result = adapt_source_record(
        payload=baseline_payload,
        source_file={"parser_name": "clean_baseline_profile_parser_v1"},
    )
    assert baseline_result.target_payload_patch["decision"]["verdict"] in {"benign", "likely_benign"}


