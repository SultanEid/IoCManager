from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator

from cti_service.adjudication_dataset_builder import (
    CANONICAL_PROVENANCE_FIELDS,
    CANONICAL_ROW_FIELDS,
    TASK_SNORT,
    TASK_YARA,
    DatasetBuildConfig,
    _check_split_leakage,
    _normalize_row,
    _split_rows_group_time,
    build_adjudication_dataset,
)


AI_ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_DIR = AI_ROOT / "schemas"


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row))
            handle.write("\n")


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def test_manifest_ingestion_records_disabled_remote_and_missing_local_sources(tmp_path: Path) -> None:
    manifests_dir = tmp_path / "manifests"
    fixtures_dir = tmp_path / "fixtures"
    for family in ("yara", "sigma", "snort"):
        (fixtures_dir / family / "scenarios").mkdir(parents=True, exist_ok=True)

    _write_json(
        manifests_dir / "disabled-local.manifest.json",
        {
            "source_name": "disabled-local",
            "source_type": "internal_behavior_reports",
            "location": {"local_path": "imports/disabled"},
            "access_notes": ["test"],
            "ingestion_mode": "manual_internal_import",
            "parser_name": "x",
            "normalization_target": "x",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": False,
        },
    )
    _write_json(
        manifests_dir / "remote-only.manifest.json",
        {
            "source_name": "remote-only",
            "source_type": "external_feed",
            "location": {"remote_reference": {"uri": "https://example.test/feed"}},
            "access_notes": ["test"],
            "ingestion_mode": "deferred_remote_import",
            "parser_name": "x",
            "normalization_target": "x",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": True,
        },
    )
    _write_json(
        manifests_dir / "missing-local.manifest.json",
        {
            "source_name": "missing-local",
            "source_type": "internal_analyst_closures",
            "location": {"local_path": "imports/does-not-exist"},
            "access_notes": ["test"],
            "ingestion_mode": "manual_internal_import",
            "parser_name": "x",
            "normalization_target": "x",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": True,
        },
    )

    output_root = tmp_path / "processed"
    result = build_adjudication_dataset(
        DatasetBuildConfig(
            dataset_version="manifests-v1",
            manifests_dir=manifests_dir,
            fixtures_dir=fixtures_dir,
            imports_root=tmp_path,
            output_root=output_root,
        )
    )

    manifest = _read_json(Path(result["splitManifestPath"]))
    reasons = {entry["reason"] for entry in manifest["skippedItems"]}
    assert "manifest_disabled" in reasons
    assert "deferred_remote_import" in reasons
    assert "local_path_missing" in reasons


def test_new_dataset_schemas_compile() -> None:
    row_schema = _read_json(SCHEMAS_DIR / "adjudication-training-row.schema.json")
    split_schema = _read_json(SCHEMAS_DIR / "adjudication-split-manifest.schema.json")
    Draft202012Validator.check_schema(row_schema)
    Draft202012Validator.check_schema(split_schema)


def test_normalization_preserves_provenance_and_evidence_from_import_rows() -> None:
    payload = {
        "rule_family": "sigma",
        "full_rule_text": "title: test",
        "rule_metadata": {"source": "lab", "rule_id": "SIG-1"},
        "raw_hit_payload": {"event_id": "evt-1"},
        "object_metadata": {"object_id": "obj-1", "object_type": "process_event"},
        "event_time": "2026-04-16T00:00:00Z",
        "adjudication_result": {
            "verdict": "likely_malicious",
            "confidence": 0.7,
            "false_positive_risk": 0.2,
        },
        "evidence_used": [{"evidence_id": "ev-1", "source": "sigma", "summary": "Test summary"}],
        "evidence_missing": [{"gap_id": "gap-1", "description": "Need more", "importance": "medium"}],
        "provenance": [{"source": "import", "key": "k", "value": "v", "evidence_id": "ev-1"}],
    }
    normalized = _normalize_row(
        raw={
            "raw": payload,
            "scenario_label": None,
            "source_file": {
                "manifest_name": "imports.manifest.json",
                "source_name": "unit-test-import",
                "source_type": "internal_behavior_reports",
                "source_path": "C:/tmp/rows.jsonl",
                "record_locator": "row:1",
                "loader": "import_jsonl",
                "parser_name": "passthrough_source_adapter_v1",
            },
        },
        dataset_version="unit-v1",
    )

    assert normalized["evidence_used"][0]["evidence_id"] == "ev-1"
    assert normalized["evidence_missing"][0]["gap_id"] == "gap-1"
    assert any(item["source"] == "import" for item in normalized["provenance"])
    assert all(field in normalized["provenance"][0] for field in CANONICAL_PROVENANCE_FIELDS)
    assert isinstance(normalized["raw_payload"], dict)
    assert isinstance(normalized["parser_diagnostics"], list)


def test_yara_rows_without_adjudication_are_backfilled_by_deterministic_pipeline() -> None:
    normalized = _normalize_row(
        raw={
            "raw": {
                "rule_family": "yara",
                "full_rule_text": "rule test { condition: true }",
                "rule_metadata": {"source": "lab", "rule_id": "Y-1", "rule_name": "YRule"},
                "raw_hit_payload": {"event_id": "evt-y1", "matched_strings": ["VirtualAllocEx"], "match_count": 1},
                "object_metadata": {"object_id": "obj-y1", "object_type": "file"},
                "event_time": "2026-04-16T01:00:00Z",
            },
            "scenario_label": None,
            "source_file": {
                "manifest_name": "imports.manifest.json",
                "source_name": "unit-test-import",
                "source_type": "internal_behavior_reports",
                "source_path": "C:/tmp/rows.jsonl",
                "record_locator": "row:2",
                "loader": "import_jsonl",
                "parser_name": "passthrough_source_adapter_v1",
            },
        },
        dataset_version="unit-v1",
    )

    adjudication = normalized["target_payload"]["adjudication"]
    assert adjudication["verdict"] in {
        "benign",
        "likely_benign",
        "suspicious",
        "likely_malicious",
        "malicious",
        "false_positive",
        "insufficient_evidence",
        "stale_or_revoked",
    }
    assert "bucket_scores" in adjudication
    assert "interpretable_features" in adjudication
    assert isinstance(adjudication.get("suggested_next_checks"), list)
    assert TASK_YARA in normalized["eligible_tasks"]
    assert normalized["source_file"]["parser_name"] == "passthrough_source_adapter_v1"


def test_yara_backfill_is_deterministic_for_identical_rows() -> None:
    raw = {
        "raw": {
            "rule_family": "yara",
            "full_rule_text": "rule test { condition: true }",
            "rule_metadata": {"source": "lab", "rule_id": "Y-DET-1", "rule_name": "YDetRule", "tags": ["suspicious"]},
            "raw_hit_payload": {"event_id": "evt-y-det-1", "matched_strings": ["VirtualAllocEx"], "match_count": 1},
            "object_metadata": {"object_id": "obj-y-det-1", "object_type": "file"},
            "event_time": "2026-04-16T01:00:00Z",
        },
        "scenario_label": None,
        "source_file": {
            "manifest_name": "imports.manifest.json",
            "source_name": "unit-test-import",
            "source_type": "internal_behavior_reports",
            "source_path": "C:/tmp/rows.jsonl",
            "record_locator": "row:2",
            "loader": "import_jsonl",
            "parser_name": "passthrough_source_adapter_v1",
        },
    }
    first = _normalize_row(raw=raw, dataset_version="unit-v1")
    second = _normalize_row(raw=raw, dataset_version="unit-v1")
    assert first["target_payload"]["adjudication"] == second["target_payload"]["adjudication"]


def test_yara_backfill_preserves_explicit_verdict_and_confidence() -> None:
    normalized = _normalize_row(
        raw={
            "raw": {
                "rule_family": "yara",
                "full_rule_text": "rule explicit { condition: true }",
                "rule_metadata": {"source": "lab", "rule_id": "Y-EXP-1", "rule_name": "ExplicitRule"},
                "raw_hit_payload": {"event_id": "evt-y-exp-1", "matched_strings": ["VirtualAllocEx"], "match_count": 1},
                "object_metadata": {"object_id": "obj-y-exp-1", "object_type": "file"},
                "event_time": "2026-04-16T01:00:00Z",
                "adjudication_result": {
                    "verdict": "false_positive",
                    "confidence": 0.91,
                    "false_positive_risk": 0.03,
                },
            },
            "scenario_label": None,
            "source_file": {
                "manifest_name": "imports.manifest.json",
                "source_name": "explicit-source",
                "source_type": "internal_behavior_reports",
                "source_path": "C:/tmp/rows.jsonl",
                "record_locator": "row:99",
                "loader": "import_jsonl",
                "parser_name": "passthrough_source_adapter_v1",
            },
        },
        dataset_version="unit-v1",
    )
    adjudication = normalized["target_payload"]["adjudication"]
    assert adjudication["verdict"] == "false_positive"
    assert adjudication["confidence"] == 0.91
    assert adjudication["false_positive_risk"] == 0.03
    assert isinstance(adjudication.get("suggested_next_checks"), list)
    assert isinstance(adjudication.get("bucket_scores"), dict)


def test_snort_rows_without_adjudication_are_backfilled_by_deterministic_pipeline() -> None:
    normalized = _normalize_row(
        raw={
            "raw": {
                "rule_family": "snort",
                "full_rule_text": (
                    "alert tcp any any -> any 443 "
                    "(msg:\"Suspicious periodic beacon cadence\"; sid:551001; rev:3; classtype:trojan-activity;)"
                ),
                "rule_metadata": {
                    "source": "lab",
                    "rule_id": "SNRT-1",
                    "sid": 551001,
                    "rev": 3,
                    "msg": "Suspicious periodic beacon cadence",
                    "classification": "trojan-activity",
                    "protocol": "tcp",
                },
                "raw_hit_payload": {"event_id": "evt-s1", "message": "Suspicious periodic beacon cadence"},
                "object_metadata": {"object_id": "obj-s1", "object_type": "network_flow"},
                "event_time": "2026-04-16T01:00:00Z",
            },
            "scenario_label": None,
            "source_file": {
                "manifest_name": "imports.manifest.json",
                "source_name": "unit-test-import",
                "source_type": "internal_behavior_reports",
                "source_path": "C:/tmp/rows.jsonl",
                "record_locator": "row:3",
                "loader": "import_jsonl",
                "parser_name": "passthrough_source_adapter_v1",
            },
        },
        dataset_version="unit-v1",
    )

    adjudication = normalized["target_payload"]["adjudication"]
    assert adjudication["verdict"] in {
        "benign",
        "likely_benign",
        "suspicious",
        "likely_malicious",
        "malicious",
        "false_positive",
        "insufficient_evidence",
        "stale_or_revoked",
    }
    assert "bucket_scores" in adjudication
    assert "interpretable_features" in adjudication
    assert isinstance(adjudication.get("suggested_next_checks"), list)
    assert TASK_SNORT in normalized["eligible_tasks"]
    assert normalized["source_file"]["parser_name"] == "passthrough_source_adapter_v1"


def test_snort_backfill_is_deterministic_for_identical_rows() -> None:
    raw = {
        "raw": {
            "rule_family": "snort",
            "full_rule_text": (
                "alert tcp any any -> any 443 "
                "(msg:\"Suspicious periodic beacon cadence\"; sid:551001; rev:3; classtype:trojan-activity;)"
            ),
            "rule_metadata": {
                "source": "lab",
                "rule_id": "SNRT-DET-1",
                "sid": 551001,
                "rev": 3,
                "msg": "Suspicious periodic beacon cadence",
                "classification": "trojan-activity",
                "protocol": "tcp",
            },
            "raw_hit_payload": {"event_id": "evt-s-det-1", "message": "Suspicious periodic beacon cadence"},
            "object_metadata": {"object_id": "obj-s-det-1", "object_type": "network_flow"},
            "event_time": "2026-04-16T01:00:00Z",
        },
        "scenario_label": None,
        "source_file": {
            "manifest_name": "imports.manifest.json",
            "source_name": "unit-test-import",
            "source_type": "internal_behavior_reports",
            "source_path": "C:/tmp/rows.jsonl",
            "record_locator": "row:4",
            "loader": "import_jsonl",
            "parser_name": "passthrough_source_adapter_v1",
        },
    }
    first = _normalize_row(raw=raw, dataset_version="unit-v1")
    second = _normalize_row(raw=raw, dataset_version="unit-v1")
    assert first["target_payload"]["adjudication"] == second["target_payload"]["adjudication"]


def test_snort_backfill_preserves_explicit_verdict_and_confidence() -> None:
    normalized = _normalize_row(
        raw={
            "raw": {
                "rule_family": "snort",
                "full_rule_text": "alert tcp any any -> any 443 (msg:\"Explicit snort\"; sid:552001; rev:1; classtype:policy-violation;)",
                "rule_metadata": {
                    "source": "lab",
                    "rule_id": "SNRT-EXP-1",
                    "sid": 552001,
                    "rev": 1,
                    "msg": "Explicit snort",
                    "classification": "policy-violation",
                    "protocol": "tcp",
                },
                "raw_hit_payload": {"event_id": "evt-s-exp-1", "message": "Explicit snort"},
                "object_metadata": {"object_id": "obj-s-exp-1", "object_type": "network_flow"},
                "event_time": "2026-04-16T01:00:00Z",
                "adjudication_result": {
                    "verdict": "false_positive",
                    "confidence": 0.89,
                    "false_positive_risk": 0.07,
                },
            },
            "scenario_label": None,
            "source_file": {
                "manifest_name": "imports.manifest.json",
                "source_name": "explicit-source",
                "source_type": "internal_behavior_reports",
                "source_path": "C:/tmp/rows.jsonl",
                "record_locator": "row:100",
                "loader": "import_jsonl",
                "parser_name": "passthrough_source_adapter_v1",
            },
        },
        dataset_version="unit-v1",
    )
    adjudication = normalized["target_payload"]["adjudication"]
    assert adjudication["verdict"] == "false_positive"
    assert adjudication["confidence"] == 0.89
    assert adjudication["false_positive_risk"] == 0.07
    assert isinstance(adjudication.get("suggested_next_checks"), list)
    assert isinstance(adjudication.get("bucket_scores"), dict)


def test_row_evidence_fusion_deduplicates_overlapping_payload_and_adapter_evidence() -> None:
    payload = {
        "rule_family": "sigma",
        "full_rule_text": "title: Overlap test",
        "rule_metadata": {"source": "unit", "rule_id": "SIG-OVERLAP-1", "tags": ["suspicious"]},
        "raw_hit_payload": {"event_id": "evt-overlap-1"},
        "object_metadata": {"object_id": "obj-overlap-1", "object_type": "process_event", "source_system": "siem"},
        "event_time": "2026-04-16T00:00:00Z",
        "adjudication_result": {"verdict": "likely_malicious"},
        "evidence_used": [
            {
                "evidence_id": "rep-overlap-1",
                "source": "sandbox-cluster",
                "summary": "Observed encoded script execution.",
                "reference": "internal://reports/rep-overlap-1",
            }
        ],
        "behavior_report_references": {
            "reports": [
                {
                    "report_id": "rep-overlap-1",
                    "source": "sandbox-cluster",
                    "reference": "internal://reports/rep-overlap-1",
                    "summary": "Observed encoded script execution.",
                }
            ]
        },
    }
    normalized = _normalize_row(
        raw={
            "raw": payload,
            "scenario_label": None,
            "source_file": {
                "manifest_name": "imports.manifest.json",
                "source_name": "overlap-source",
                "source_type": "internal_behavior_reports",
                "source_path": "C:/tmp/rows.jsonl",
                "record_locator": "row:1",
                "loader": "import_jsonl",
                "parser_name": "passthrough_source_adapter_v1",
            },
        },
        dataset_version="unit-v1",
    )

    report_rows = [item for item in normalized["evidence_used"] if item.get("evidence_id") == "rep-overlap-1"]
    assert len(report_rows) == 1
    dedup = normalized["target_payload"]["adjudication"]["evidence_fusion"]["deduplication"]
    assert dedup["input_count"] >= dedup["unique_count"]


def test_row_evidence_fusion_surfaces_contradictory_analyst_history() -> None:
    payload = {
        "rule_family": "sigma",
        "full_rule_text": "title: Conflict test",
        "rule_metadata": {"source": "unit", "rule_id": "SIG-CONFLICT-1", "tags": ["suspicious"]},
        "raw_hit_payload": {"event_id": "evt-conflict-1", "message": "malicious execution chain"},
        "object_metadata": {"object_id": "obj-conflict-1", "object_type": "process_event", "source_system": "siem"},
        "event_time": "2026-04-16T00:05:00Z",
        "adjudication_result": {"verdict": "likely_malicious"},
        "behavior_report_references": {
            "reports": [
                {
                    "report_id": "rep-conflict-1",
                    "source": "sandbox-cluster",
                    "summary": "C2 beacon behavior observed.",
                }
            ]
        },
        "prior_analyst_outcomes": {
            "outcomes": [
                {"analyst_id": "a1", "decision_id": "dec-conflict-1", "verdict": "likely_malicious", "notes": "Malicious."},
                {"analyst_id": "a2", "decision_id": "dec-conflict-1", "verdict": "false_positive", "notes": "Benign installer."},
            ]
        },
    }
    normalized = _normalize_row(
        raw={
            "raw": payload,
            "scenario_label": None,
            "source_file": {
                "manifest_name": "imports.manifest.json",
                "source_name": "conflict-source",
                "source_type": "internal_behavior_reports",
                "source_path": "C:/tmp/rows.jsonl",
                "record_locator": "row:2",
                "loader": "import_jsonl",
                "parser_name": "passthrough_source_adapter_v1",
            },
        },
        dataset_version="unit-v1",
    )

    adjudication = normalized["target_payload"]["adjudication"]
    assert adjudication["contradictory_evidence"]
    assert adjudication["evidence_fusion"]["contradictory_count"] > 0


def test_row_evidence_fusion_generates_missing_evidence_for_sparse_inputs() -> None:
    payload = {
        "rule_family": "sigma",
        "full_rule_text": "title: Sparse fusion",
        "rule_metadata": {"source": "unit", "rule_id": "SIG-SPARSE-2"},
        "raw_hit_payload": {"event_id": "evt-sparse-2"},
        "object_metadata": {"object_id": "obj-sparse-2", "object_type": "process_event", "source_system": "siem"},
        "event_time": "2026-04-16T00:10:00Z",
        "adjudication_result": {"verdict": "insufficient_evidence"},
    }
    normalized = _normalize_row(
        raw={
            "raw": payload,
            "scenario_label": None,
            "source_file": {
                "manifest_name": "imports.manifest.json",
                "source_name": "sparse-source",
                "source_type": "internal_behavior_reports",
                "source_path": "C:/tmp/rows.jsonl",
                "record_locator": "row:3",
                "loader": "import_jsonl",
                "parser_name": "passthrough_source_adapter_v1",
            },
        },
        dataset_version="unit-v1",
    )

    missing_channels = {item.get("channel") for item in normalized["evidence_missing"]}
    assert "linked_enrichment" in missing_channels
    assert "behavior_evidence" in missing_channels
    assert "analyst_history" in missing_channels


def test_group_time_split_keeps_group_isolation_and_is_deterministic() -> None:
    rows = [
        {
            "row_id": "a",
            "group_key": "g-1",
            "event_time_utc": "2026-04-16T00:00:00+00:00",
        },
        {
            "row_id": "b",
            "group_key": "g-1",
            "event_time_utc": "2026-04-16T00:05:00+00:00",
        },
        {
            "row_id": "c",
            "group_key": "g-2",
            "event_time_utc": "2026-04-16T01:00:00+00:00",
        },
        {
            "row_id": "d",
            "group_key": "g-3",
            "event_time_utc": "2026-04-16T02:00:00+00:00",
        },
    ]

    split_a = _split_rows_group_time(rows=rows, train_ratio=0.5, validation_ratio=0.25, test_ratio=0.25)
    split_b = _split_rows_group_time(rows=rows, train_ratio=0.5, validation_ratio=0.25, test_ratio=0.25)

    assert _check_split_leakage(split_a)["passed"] is True
    assert {name: [row["row_id"] for row in split_a[name]] for name in split_a} == {
        name: [row["row_id"] for row in split_b[name]]
        for name in split_b
    }


def test_end_to_end_build_writes_canonical_task_split_and_report_files(tmp_path: Path) -> None:
    manifests_dir = tmp_path / "manifests"
    imports_dir = tmp_path / "imports" / "unit-feed"
    fixtures_dir = AI_ROOT / "fixtures"
    output_root = tmp_path / "processed"

    _write_json(
        manifests_dir / "unit-feed.manifest.json",
        {
            "source_name": "unit-feed",
            "source_type": "internal_behavior_reports",
            "location": {"local_path": "imports/unit-feed"},
            "access_notes": ["test"],
            "ingestion_mode": "manual_internal_import",
            "parser_name": "unit_parser",
            "normalization_target": "unit_target",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": True,
        },
    )
    _write_json(
        manifests_dir / "remote-skip.manifest.json",
        {
            "source_name": "remote-skip",
            "source_type": "external_feed",
            "location": {"remote_reference": {"uri": "https://example.test/feed"}},
            "access_notes": ["test"],
            "ingestion_mode": "deferred_remote_import",
            "parser_name": "remote_parser",
            "normalization_target": "remote_target",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": True,
        },
    )

    _write_jsonl(
        imports_dir / "rows.jsonl",
        [
            {
                "rule_family": "yara",
                "full_rule_text": "rule Import_Yara_1 { condition: true }",
                "rule_metadata": {"source": "unit-feed", "rule_id": "IMP-YARA-1", "rule_name": "Import_Yara_1"},
                "raw_hit_payload": {"event_id": "evt-100"},
                "object_metadata": {"object_id": "obj-100", "object_type": "file", "source_system": "edr"},
                "event_time": "2026-04-16T10:00:00Z",
                "adjudication_result": {
                    "verdict": "likely_malicious",
                    "confidence": 0.8,
                    "false_positive_risk": 0.2,
                },
                "evidence_used": [{"evidence_id": "ev-100", "source": "unit", "summary": "Imported evidence"}],
            },
            {
                "rule_family": "yara",
                "full_rule_text": "rule Import_Yara_Partial { condition: true }",
                "rule_metadata": {"source": "unit-feed", "rule_id": "IMP-YARA-2", "rule_name": "Import_Yara_Partial"},
                "raw_hit_payload": {"event_id": "evt-101"},
                "object_metadata": {"object_id": "obj-101", "object_type": "file", "source_system": "edr"},
                "event_time": "2026-04-16T10:10:00Z",
            },
        ],
    )

    result = build_adjudication_dataset(
        DatasetBuildConfig(
            dataset_version="integration-v1",
            manifests_dir=manifests_dir,
            fixtures_dir=fixtures_dir,
            imports_root=tmp_path,
            output_root=output_root,
        )
    )

    canonical_path = Path(result["canonicalPath"])
    split_manifest_path = Path(result["splitManifestPath"])
    row_format_path = Path(result["trainingRowFormatPath"])
    assert canonical_path.exists()
    assert split_manifest_path.exists()
    assert row_format_path.exists()

    split_manifest = _read_json(split_manifest_path)
    assert split_manifest["rows"]["canonical"] > 0
    for task_name, task_report in split_manifest["tasks"].items():
        assert "splitRowCounts" in task_report
        assert task_report["leakageAssertions"]["passed"] is True
        for split_name in ("train", "validation", "test"):
            assert Path(split_manifest["files"]["splits"][task_name][split_name]).exists()

    canonical_rows = _read_jsonl(canonical_path)
    row_schema = _read_json(SCHEMAS_DIR / "adjudication-training-row.schema.json")
    split_schema = _read_json(SCHEMAS_DIR / "adjudication-split-manifest.schema.json")
    row_validator = Draft202012Validator(row_schema)
    split_validator = Draft202012Validator(split_schema)
    split_validator.validate(split_manifest)
    for row in canonical_rows:
        row_validator.validate(row)
        assert set(row.keys()) == set(CANONICAL_ROW_FIELDS)

    imported_rows = [row for row in canonical_rows if row["source_file"]["source_name"] == "unit-feed"]
    assert imported_rows
    assert all(isinstance(row["target_payload"].get("adjudication"), dict) for row in imported_rows)
    assert all(str(row["target_payload"]["adjudication"].get("verdict", "")).strip() for row in imported_rows)
    assert all(isinstance(row["raw_payload"], dict) for row in imported_rows)
    assert all(isinstance(row["parser_diagnostics"], list) for row in imported_rows)
    assert all(isinstance(row["source_file"]["parser_name"], str) and row["source_file"]["parser_name"] for row in imported_rows)
    assert all(any(item["key"] == "source_path" for item in row["provenance"]) for row in imported_rows)

    yara_task_rows = _read_jsonl(Path(split_manifest["files"]["tasks"]["yara_package_adjudication"]))
    yara_split_rows = []
    for split_name in ("train", "validation", "test"):
        yara_split_rows.extend(_read_jsonl(Path(split_manifest["files"]["splits"]["yara_package_adjudication"][split_name])))
    assert len(yara_task_rows) >= len(yara_split_rows)


def test_training_row_documentation_tracks_canonical_schema_fields() -> None:
    doc_path = AI_ROOT / "datasets" / "training-row-format.md"
    content = doc_path.read_text(encoding="utf-8")
    for field in CANONICAL_ROW_FIELDS:
        assert f"`{field}`" in content


def test_manifest_parser_name_dispatch_is_applied_to_import_rows(tmp_path: Path) -> None:
    manifests_dir = tmp_path / "manifests"
    imports_dir = tmp_path / "imports" / "internal-yara-hit"
    fixtures_dir = AI_ROOT / "fixtures"
    output_root = tmp_path / "processed"

    _write_json(
        manifests_dir / "internal-yara-hit.manifest.json",
        {
            "source_name": "internal-yara-hit",
            "source_type": "internal_behavior_reports",
            "location": {"local_path": "imports/internal-yara-hit"},
            "access_notes": ["test"],
            "ingestion_mode": "manual_internal_import",
            "parser_name": "internal_yara_hit_json_parser_v1",
            "normalization_target": "unit_target",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": True,
        },
    )

    _write_jsonl(
        imports_dir / "rows.jsonl",
        [
            {
                "alert": {
                    "rule": {
                        "name": "InternalUnitRule",
                        "id": "INT-100",
                        "text": "rule InternalUnitRule { condition: true }",
                    }
                },
                "file": {"sha256": "d" * 64, "path": "C:/sample.bin"},
                "observed_at": "2026-04-16T12:00:00Z",
                "adjudication_result": {"verdict": "likely_malicious"},
            }
        ],
    )

    result = build_adjudication_dataset(
        DatasetBuildConfig(
            dataset_version="parser-dispatch-v1",
            manifests_dir=manifests_dir,
            fixtures_dir=fixtures_dir,
            imports_root=tmp_path,
            output_root=output_root,
        )
    )

    canonical_rows = _read_jsonl(Path(result["canonicalPath"]))
    imported = [row for row in canonical_rows if row["source_file"]["source_name"] == "internal-yara-hit"]
    assert len(imported) == 1
    row = imported[0]
    assert row["source_file"]["parser_name"] == "internal_yara_hit_json_parser_v1"
    assert row["raw_payload"]["file"]["sha256"] == "d" * 64
    assert row["package_payload"]["rule_metadata"]["rule_name"] == "InternalUnitRule"
    assert any(item["retrieved_by"] == "internal_yara_hit_json_parser_v1" for item in row["provenance"])


def test_fixture_dispatch_includes_sigma_rule_and_sigma_alert_parsers(tmp_path: Path) -> None:
    fixtures_dir = tmp_path / "fixtures"
    manifests_dir = tmp_path / "manifests"
    output_root = tmp_path / "processed"
    imports_root = tmp_path / "imports"

    manifests_dir.mkdir(parents=True, exist_ok=True)
    imports_root.mkdir(parents=True, exist_ok=True)

    for family in ("yara", "sigma", "snort"):
        (fixtures_dir / family / "scenarios").mkdir(parents=True, exist_ok=True)
    (fixtures_dir / "sigma" / "alerts").mkdir(parents=True, exist_ok=True)

    _write_json(
        fixtures_dir / "sigma" / "scenarios" / "sigma-suspicious.example.json",
        {
            "rule_family": "sigma",
            "full_rule_text": "title: Suspicious Process",
            "rule_metadata": {
                "source": "sigma-unit",
                "rule_id": "SIG-FIX-1",
                "title": "Suspicious Process",
                "id": "sigma-fix-1",
                "status": "stable",
                "logsource": {"category": "process_creation", "product": "windows"},
            },
            "raw_hit_payload": {"event_id": "evt-sigma-rule-1"},
            "object_metadata": {"object_id": "obj-sigma-rule-1", "object_type": "process_event"},
            "event_time": "2026-04-16T08:00:00Z",
            "adjudication_result": {"verdict": "likely_malicious"},
        },
    )
    _write_json(
        fixtures_dir / "sigma" / "alerts" / "sigma-alert-suspicious.example.json",
        {
            "alert": {
                "event_id": "evt-sigma-alert-1",
                "timestamp": "2026-04-16T08:01:00Z",
                "rule": {
                    "source": "sigma-unit",
                    "rule_id": "SIG-ALERT-FIX-1",
                    "title": "Alert Rule",
                    "id": "sigma-alert-fix-1",
                    "status": "stable",
                    "logsource": {"category": "process_creation", "product": "windows"},
                    "text": "title: Alert Rule",
                },
                "process": {"process_guid": "proc-1", "pid": 1001},
            },
            "adjudication_result": {"verdict": "likely_malicious"},
        },
    )

    result = build_adjudication_dataset(
        DatasetBuildConfig(
            dataset_version="fixture-dispatch-v1",
            manifests_dir=manifests_dir,
            fixtures_dir=fixtures_dir,
            imports_root=imports_root,
            output_root=output_root,
        )
    )

    rows = _read_jsonl(Path(result["canonicalPath"]))
    sigma_rule_rows = [row for row in rows if row["source_file"]["source_name"] == "sigma_fixtures"]
    sigma_alert_rows = [row for row in rows if row["source_file"]["source_name"] == "sigma_alert_fixtures"]
    assert sigma_rule_rows
    assert sigma_alert_rows
    assert sigma_rule_rows[0]["source_file"]["parser_name"] == "fixture_sigma_rule_parser_v1"
    assert sigma_alert_rows[0]["source_file"]["parser_name"] == "fixture_sigma_alert_parser_v1"


def test_fixture_dispatch_includes_snort_rule_alert_flow_pcap_and_environment_parsers(tmp_path: Path) -> None:
    fixtures_dir = tmp_path / "fixtures"
    manifests_dir = tmp_path / "manifests"
    output_root = tmp_path / "processed"
    imports_root = tmp_path / "imports"

    manifests_dir.mkdir(parents=True, exist_ok=True)
    imports_root.mkdir(parents=True, exist_ok=True)

    for family in ("yara", "sigma", "snort"):
        (fixtures_dir / family / "scenarios").mkdir(parents=True, exist_ok=True)
    (fixtures_dir / "snort" / "alerts").mkdir(parents=True, exist_ok=True)
    (fixtures_dir / "snort" / "flow_pcap").mkdir(parents=True, exist_ok=True)
    (fixtures_dir / "snort" / "environment_context").mkdir(parents=True, exist_ok=True)

    _write_json(
        fixtures_dir / "snort" / "scenarios" / "snort-suspicious.example.json",
        {
            "rule_family": "snort",
            "full_rule_text": "alert tcp any any -> any 443 (msg:\"Scenario rule\"; sid:560001; rev:1; classtype:trojan-activity;)",
            "rule_metadata": {
                "source": "snort-unit",
                "rule_id": "SNRT-560001",
                "sid": 560001,
                "rev": 1,
                "msg": "Scenario rule",
                "classification": "trojan-activity",
            },
            "raw_hit_payload": {
                "src_ip": "10.0.0.10",
                "src_port": 50100,
                "dst_ip": "198.51.100.10",
                "dst_port": 443
            },
            "object_metadata": {"object_id": "flow-snort-scenario-1", "object_type": "network_flow"},
            "adjudication_result": {"verdict": "likely_malicious"},
        },
    )
    _write_json(
        fixtures_dir / "snort" / "alerts" / "snort-alert-suspicious.example.json",
        {
            "alert": {
                "timestamp": "2026-04-16T11:05:00Z",
                "src_ip": "10.0.0.11",
                "src_port": 50101,
                "dst_ip": "198.51.100.11",
                "dst_port": 443,
                "rule": {
                    "source": "snort-unit",
                    "rule_id": "SNRT-560002",
                    "sid": 560002,
                    "rev": 1,
                    "msg": "Alert rule",
                    "classtype": "trojan-activity",
                    "text": "alert tcp any any -> any 443 (msg:\"Alert rule\"; sid:560002; rev:1; classtype:trojan-activity;)",
                },
            },
            "adjudication_result": {"verdict": "likely_malicious"},
        },
    )
    _write_json(
        fixtures_dir / "snort" / "flow_pcap" / "snort-flow-pcap-suspicious.example.json",
        {
            "flow": {
                "flow_id": "flow-pcap-560003",
                "src_ip": "10.0.0.12",
                "src_port": 50102,
                "dst_ip": "198.51.100.12",
                "dst_port": 443,
                "protocol": "tcp",
            },
            "pcap": {
                "capture_id": "pcap-560003",
                "packet_count": 64,
            },
            "adjudication_result": {"verdict": "likely_malicious"},
        },
    )
    _write_json(
        fixtures_dir / "snort" / "environment_context" / "snort-environment-context-insufficient_evidence.example.json",
        {
            "record_id": "env-560004",
            "environment_context": {"environment": "prod", "sensor": "snort-env-1"},
            "asset_context": {"asset_id": "asset-560004", "environment": "prod"},
        },
    )

    result = build_adjudication_dataset(
        DatasetBuildConfig(
            dataset_version="fixture-snort-dispatch-v1",
            manifests_dir=manifests_dir,
            fixtures_dir=fixtures_dir,
            imports_root=imports_root,
            output_root=output_root,
        )
    )

    rows = _read_jsonl(Path(result["canonicalPath"]))
    by_source = {row["source_file"]["source_name"]: row for row in rows}

    assert by_source["snort_fixtures"]["source_file"]["parser_name"] == "fixture_snort_rule_parser_v1"
    assert by_source["snort_alert_fixtures"]["source_file"]["parser_name"] == "fixture_snort_alert_parser_v1"
    assert by_source["snort_flow_pcap_fixtures"]["source_file"]["parser_name"] == "fixture_internal_flow_pcap_metadata_parser_v1"
    assert by_source["snort_environment_context_fixtures"]["source_file"]["parser_name"] == "fixture_internal_environment_context_parser_v1"
    assert isinstance(by_source["snort_flow_pcap_fixtures"]["parser_diagnostics"], list)
    assert isinstance(by_source["snort_environment_context_fixtures"]["provenance"], list)


def test_manifest_dispatch_supports_new_sigma_context_parsers(tmp_path: Path) -> None:
    manifests_dir = tmp_path / "manifests"
    fixtures_dir = tmp_path / "fixtures"
    output_root = tmp_path / "processed"
    imports_root = tmp_path / "imports"

    for family in ("yara", "sigma", "snort"):
        (fixtures_dir / family / "scenarios").mkdir(parents=True, exist_ok=True)

    _write_json(
        manifests_dir / "analyst-closures.manifest.json",
        {
            "source_name": "analyst-closures",
            "source_type": "internal_analyst_closures",
            "location": {"local_path": "imports/analyst-closures"},
            "access_notes": ["test"],
            "ingestion_mode": "manual_internal_import",
            "parser_name": "analyst_closure_parser_v1",
            "normalization_target": "analyst_outcome_reference_v1",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": True,
        },
    )
    _write_json(
        manifests_dir / "internal-allowlists.manifest.json",
        {
            "source_name": "internal-allowlists",
            "source_type": "internal_allowlists",
            "location": {"local_path": "imports/internal-allowlists"},
            "access_notes": ["test"],
            "ingestion_mode": "manual_internal_import",
            "parser_name": "internal_allowlist_parser_v1",
            "normalization_target": "allowlist_baseline_context_v1",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": True,
        },
    )
    _write_json(
        manifests_dir / "internal-clean-baselines.manifest.json",
        {
            "source_name": "internal-clean-baselines",
            "source_type": "internal_clean_baselines",
            "location": {"local_path": "imports/internal-clean-baselines"},
            "access_notes": ["test"],
            "ingestion_mode": "internal_export_import",
            "parser_name": "clean_baseline_profile_parser_v1",
            "normalization_target": "baseline_signal_profile_v1",
            "provenance_fields": list(CANONICAL_PROVENANCE_FIELDS),
            "enabled": True,
        },
    )

    _write_jsonl(
        imports_root / "analyst-closures" / "rows.jsonl",
        [
            {
                "closure_label": "true_positive",
                "is_final": True,
                "analyst_id": "analyst-1",
                "case_id": "case-1",
                "decision_id": "decision-1",
                "closed_at": "2026-04-16T09:00:00Z",
                "notes": "Confirmed malicious behavior.",
            }
        ],
    )
    _write_jsonl(
        imports_root / "internal-allowlists" / "rows.jsonl",
        [
            {
                "id": "allow-1",
                "allowlist_baseline_context": {
                    "allowlisted": True,
                    "baseline_match": True,
                    "baseline_name": "approved-admin-tools",
                    "allowlist_source": "soc-allowlist",
                },
            }
        ],
    )
    _write_jsonl(
        imports_root / "internal-clean-baselines" / "rows.jsonl",
        [
            {
                "id": "baseline-1",
                "asset_context": {"asset_id": "asset-1", "environment": "prod"},
                "time_prevalence_context": {"hit_time": "2026-04-16T09:15:00Z"},
            }
        ],
    )

    result = build_adjudication_dataset(
        DatasetBuildConfig(
            dataset_version="new-parsers-v1",
            manifests_dir=manifests_dir,
            fixtures_dir=fixtures_dir,
            imports_root=tmp_path,
            output_root=output_root,
        )
    )

    rows = _read_jsonl(Path(result["canonicalPath"]))
    by_source = {row["source_file"]["source_name"]: row for row in rows}

    analyst_row = by_source["analyst-closures"]
    allowlist_row = by_source["internal-allowlists"]
    baseline_row = by_source["internal-clean-baselines"]

    assert analyst_row["source_file"]["parser_name"] == "analyst_closure_parser_v1"
    assert analyst_row["target_payload"]["adjudication"]["verdict"] == "likely_malicious"
    assert allowlist_row["source_file"]["parser_name"] == "internal_allowlist_parser_v1"
    assert allowlist_row["package_payload"]["allowlist_baseline_context"]["allowlisted"] is True
    assert baseline_row["source_file"]["parser_name"] == "clean_baseline_profile_parser_v1"
    assert baseline_row["package_payload"]["asset_context"]["asset_id"] == "asset-1"
