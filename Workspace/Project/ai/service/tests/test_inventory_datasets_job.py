from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys


def _load_job_module():
    path = Path(__file__).resolve().parents[2] / "jobs" / "inventory_datasets.py"
    spec = importlib.util.spec_from_file_location("inventory_datasets", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def test_inventory_job_reports_supported_and_unsupported_sources(tmp_path: Path) -> None:
    module = _load_job_module()
    manifests_dir = tmp_path / "manifests"
    raw_root = tmp_path / "raw"
    processed_root = tmp_path / "processed"
    dataset_registry_path = tmp_path / "artifacts" / "dataset_registry.json"
    output_file = tmp_path / "reports" / "inventory.json"

    _write_json(
        manifests_dir / "supported.manifest.json",
        {
            "source_name": "malwarebazaar",
            "source_type": "external_feed",
            "location": {"local_path": "ai/datasets/raw/malwarebazaar"},
            "access_notes": ["test"],
            "ingestion_mode": "deferred_remote_import",
            "parser_name": "malwarebazaar_feed_parser_v1",
            "normalization_target": "observable_enrichment_v1",
            "provenance_fields": [
                "source",
                "key",
                "value",
                "evidence_id",
                "citation_ref",
                "retrieved_at_utc",
                "retrieved_by",
                "record_locator",
            ],
            "enabled": True,
        },
    )
    _write_json(
        manifests_dir / "unsupported.manifest.json",
        {
            "source_name": "threatfox",
            "source_type": "external_feed",
            "location": {"local_path": "ai/datasets/raw/threatfox"},
            "access_notes": ["test"],
            "ingestion_mode": "deferred_remote_import",
            "parser_name": "threatfox_feed_parser_v1",
            "normalization_target": "observable_enrichment_v1",
            "provenance_fields": [
                "source",
                "key",
                "value",
                "evidence_id",
                "citation_ref",
                "retrieved_at_utc",
                "retrieved_by",
                "record_locator",
            ],
            "enabled": False,
        },
    )

    (raw_root / "malwarebazaar").mkdir(parents=True, exist_ok=True)
    (raw_root / "malwarebazaar" / "rows.jsonl").write_text("{}\n", encoding="utf-8")
    (processed_root / "seed-v1").mkdir(parents=True, exist_ok=True)
    (processed_root / "seed-v1" / "manifest.json").write_text(
        json.dumps(
            {
                "datasetVersion": "seed-v1",
                "createdAtUtc": "2026-04-22T00:00:00+00:00",
                "files": {
                    "observables": "observables.csv",
                    "detections": "detections.csv",
                    "outcomes": "outcomes.csv",
                    "source_trust": "source_trust.csv",
                },
            }
        ),
        encoding="utf-8",
    )
    dataset_registry_path.parent.mkdir(parents=True, exist_ok=True)
    dataset_registry_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "updated_at_utc": "2026-04-22T00:00:00+00:00",
                "entries": [],
            }
        ),
        encoding="utf-8",
    )

    previous_argv = sys.argv
    sys.argv = [
        "inventory_datasets.py",
        "--manifests-dir",
        str(manifests_dir),
        "--raw-root",
        str(raw_root),
        "--processed-root",
        str(processed_root),
        "--dataset-registry-path",
        str(dataset_registry_path),
        "--output-file",
        str(output_file),
    ]
    try:
        module.main()
    finally:
        sys.argv = previous_argv

    report = json.loads(output_file.read_text(encoding="utf-8"))
    assert "malwarebazaar" in report["classifications"]["ready_to_stage"]
    assert "threatfox" in report["classifications"]["supported_but_unstaged"]
    assert report["processedDatasets"][0]["datasetVersion"] == "seed-v1"
