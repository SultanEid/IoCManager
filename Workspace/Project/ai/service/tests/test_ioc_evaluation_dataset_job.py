from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError


AI_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = AI_ROOT / "schemas" / "ioc-evaluation-row.schema.json"
FIXTURE_PATH = AI_ROOT / "fixtures" / "ioc_evaluation" / "golden_ioc_rows.jsonl"


def _load_job_module():
    path = AI_ROOT / "jobs" / "build_ioc_evaluation_dataset.py"
    jobs_dir = str(path.parent)
    if jobs_dir not in sys.path:
        sys.path.insert(0, jobs_dir)
    spec = importlib.util.spec_from_file_location("build_ioc_evaluation_dataset", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _validator() -> Draft202012Validator:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def test_ioc_evaluation_fixtures_validate_against_schema() -> None:
    validator = _validator()
    rows = _read_jsonl(FIXTURE_PATH)
    assert len(rows) >= 7
    verdicts = {row["expected_verdict"] for row in rows}
    assert {"false_positive", "malicious", "suspicious", "likely_malicious", "stale_or_revoked", "insufficient_evidence"}.issubset(verdicts)
    for row in rows:
        validator.validate(row)


def test_ioc_evaluation_schema_rejects_missing_provenance_and_confidence_band() -> None:
    validator = _validator()
    row = _read_jsonl(FIXTURE_PATH)[0]
    row.pop("label_provenance")
    row.pop("expected_confidence_band")
    with pytest.raises(ValidationError):
        validator.validate(row)


def test_build_ioc_evaluation_dataset_masks_values_and_samples_deterministically(tmp_path: Path) -> None:
    module = _load_job_module()
    output_file = tmp_path / "eval" / "rows.jsonl"
    report_file = tmp_path / "eval" / "report.json"

    previous_argv = sys.argv
    sys.argv = [
        "build_ioc_evaluation_dataset.py",
        "--input-file",
        str(FIXTURE_PATH),
        "--output-file",
        str(output_file),
        "--report-file",
        str(report_file),
        "--sample-size",
        "4",
        "--sample-by",
        "ioc_type,severity,evidence_tier,label_provenance",
    ]
    try:
        module.main()
    finally:
        sys.argv = previous_argv

    rows = _read_jsonl(output_file)
    assert len(rows) == 4
    assert rows == sorted(rows, key=lambda row: row["example_id"])
    assert all("ioc_value" not in row for row in rows)
    assert all("***" in row["ioc_value_masked"] or row["ioc_value_masked"] == "<empty>" for row in rows)
    for row in rows:
        _validator().validate(row)

    report = json.loads(report_file.read_text(encoding="utf-8"))
    assert report["sampleSize"] == 4
    assert report["maskedValues"] is True
    assert "evidenceTier" in report["distributions"]


def test_build_ioc_evaluation_dataset_normalizes_app_export_rows(tmp_path: Path) -> None:
    module = _load_job_module()
    input_file = tmp_path / "app-export.jsonl"
    output_file = tmp_path / "rows.jsonl"
    input_file.write_text(
        json.dumps(
            {
                "iocId": "ioc-1",
                "indicatorValue": "powershell.exe -enc SQBFAFgA",
                "indicatorType": "process",
                "sourceName": "manual_triage",
                "sourceType": "manual_entry",
                "sourceTrust": 0.64,
                "severity": "High",
                "confidence": 0.77,
                "lastSeenUtc": "2026-04-25T12:00:00Z",
                "linkedScanResultCount": 0,
                "sightingsCount": 1,
                "expectedVerdict": "likely_malicious",
                "expectedConfidenceBand": "medium",
            }
        )
        + "\n",
        encoding="utf-8",
    )

    rows = module.build_ioc_evaluation_rows(module.read_jsonl(input_file), reference_time=module.parse_datetime("2026-04-26T12:00:00Z"))
    module.write_jsonl(output_file, rows)
    row = _read_jsonl(output_file)[0]
    assert row["example_id"] == "ioc-1"
    assert row["ioc_type"] == "process"
    assert row["evidence_tier"] == "attribute_only"
    assert row["label_provenance"] == "weak_table_label"
    assert row["ioc_value_hash"]
    assert "powershell.exe" not in row["ioc_value_masked"].lower()
    _validator().validate(row)
