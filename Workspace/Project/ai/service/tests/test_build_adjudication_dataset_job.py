from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys


def _load_job_module():
    path = Path(__file__).resolve().parents[2] / "jobs" / "build_adjudication_dataset.py"
    spec = importlib.util.spec_from_file_location("build_adjudication_dataset", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def test_job_main_creates_expected_artifacts(tmp_path: Path) -> None:
    module = _load_job_module()
    manifests_dir = tmp_path / "manifests"
    fixtures_dir = tmp_path / "fixtures"
    imports_dir = tmp_path / "imports" / "feed"
    output_root = tmp_path / "processed"

    for family in ("yara", "sigma", "snort"):
        (fixtures_dir / family / "scenarios").mkdir(parents=True, exist_ok=True)

    _write_json(
        fixtures_dir / "yara" / "scenarios" / "yara-malicious.example.json",
        {
            "rule_family": "yara",
            "full_rule_text": "rule X { condition: true }",
            "rule_metadata": {"source": "test", "rule_id": "Y-CLI-1", "rule_name": "YCLI1", "tags": ["t"], "meta": {}},
            "raw_hit_payload": {"event": "x"},
            "object_metadata": {"object_id": "obj-1", "object_type": "file"},
            "time_prevalence_context": {"hit_time": "2026-04-16T00:00:00Z"}
        },
    )
    _write_json(
        manifests_dir / "feed.manifest.json",
        {
            "source_name": "feed",
            "source_type": "internal_behavior_reports",
            "location": {"local_path": "imports/feed"},
            "access_notes": ["test"],
            "ingestion_mode": "manual_internal_import",
            "parser_name": "feed_parser",
            "normalization_target": "feed_target",
            "provenance_fields": [
                "source",
                "key",
                "value",
                "evidence_id",
                "citation_ref",
                "retrieved_at_utc",
                "retrieved_by",
                "record_locator"
            ],
            "enabled": True
        },
    )
    imports_dir.mkdir(parents=True, exist_ok=True)
    (imports_dir / "rows.jsonl").write_text(
        json.dumps(
            {
                "rule_family": "sigma",
                "full_rule_text": "title: sample",
                "rule_metadata": {"source": "feed", "rule_id": "SIG-CLI-1", "title": "sample", "id": "id-1", "status": "stable", "logsource": {"category": "process_creation", "product": "windows"}},
                "raw_hit_payload": {"event_id": "evt-1"},
                "object_metadata": {"object_id": "obj-2", "object_type": "process_event"},
                "event_time": "2026-04-16T00:05:00Z",
                "verdict": "likely_malicious"
            }
        )
        + "\n",
        encoding="utf-8",
    )

    previous_argv = sys.argv
    sys.argv = [
        "build_adjudication_dataset.py",
        "--dataset-version",
        "cli-v1",
        "--manifests-dir",
        str(manifests_dir),
        "--fixtures-dir",
        str(fixtures_dir),
        "--imports-root",
        str(tmp_path),
        "--output-root",
        str(output_root),
    ]
    try:
        module.main()
    finally:
        sys.argv = previous_argv

    dataset_root = output_root / "cli-v1"
    assert (dataset_root / "canonical_rows.jsonl").exists()
    assert (dataset_root / "split_manifest.json").exists()
    assert (dataset_root / "training_row_format.md").exists()
