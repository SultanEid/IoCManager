from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator


AI_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = AI_ROOT / "fixtures" / "ioc_evaluation" / "golden_ioc_rows.jsonl"
SCHEMA_PATH = AI_ROOT / "schemas" / "ioc-evaluation-row.schema.json"


def _load_job_module():
    path = AI_ROOT / "jobs" / "shadow_score_ioc_table.py"
    jobs_dir = str(path.parent)
    if jobs_dir not in sys.path:
        sys.path.insert(0, jobs_dir)
    spec = importlib.util.spec_from_file_location("shadow_score_ioc_table", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def test_shadow_score_ioc_table_writes_read_only_masked_report_and_review_stubs(tmp_path: Path) -> None:
    module = _load_job_module()
    output_file = tmp_path / "shadow" / "report.json"
    review_file = tmp_path / "shadow" / "review.jsonl"
    review_csv = tmp_path / "shadow" / "review.csv"

    previous_argv = sys.argv
    sys.argv = [
        "shadow_score_ioc_table.py",
        "--input-file",
        str(FIXTURE_PATH),
        "--output-file",
        str(output_file),
        "--review-stubs-file",
        str(review_file),
        "--review-csv-file",
        str(review_csv),
    ]
    try:
        module.main()
    finally:
        sys.argv = previous_argv

    report = json.loads(output_file.read_text(encoding="utf-8"))
    assert report["reportType"] == "ioc_shadow_scoring"
    assert report["readOnly"] is True
    assert "decision support only" in report["disclaimer"].lower()
    assert report["sampleSize"] >= 7
    assert report["summary"]["manualOnlyCount"] == report["sampleSize"]
    assert report["summary"]["weakEvidenceCount"] >= 1
    assert "verdictDistribution" in report["summary"]
    assert "confidenceBands" in report["summary"]
    assert "falsePositiveRiskBands" in report["summary"]
    assert report["slices"]
    assert report["highlights"]["needsAnalystLabels"]
    assert all("***" in row["iocValueMasked"] for row in report["rows"])
    assert all("iocValue" not in row for row in report["rows"])

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    review_rows = _read_jsonl(review_file)
    assert len(review_rows) == report["sampleSize"]
    for row in review_rows:
        validator.validate(row)
        assert row["label_provenance"] == "shadow_review"
        assert row["review_status"] == "needs_review"
    assert review_csv.exists()


def test_shadow_score_ioc_table_exposes_highlight_categories_without_writes() -> None:
    module = _load_job_module()
    rows = module.read_jsonl(FIXTURE_PATH)
    report, review_stubs = module.shadow_score_rows(rows)
    assert report["readOnly"] is True
    assert set(report["highlights"]) == {
        "highConfidenceWeakEvidence",
        "lowTrustLikelyMalicious",
        "staleActiveRows",
        "likelyFalsePositives",
        "needsAnalystLabels",
    }
    assert len(review_stubs) == len(rows)
    serialized = json.dumps(report).lower()
    assert "password" not in serialized
    assert "connectionstring" not in serialized
