from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys


def _load_harness_module():
    path = Path(__file__).resolve().parents[2] / "jobs" / "run_evaluation_harness.py"
    spec = importlib.util.spec_from_file_location("run_evaluation_harness", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_harness_load_rows_parses_jsonl_payload(tmp_path: Path) -> None:
    module = _load_harness_module()
    rows_path = tmp_path / "rows.jsonl"
    rows_path.write_text(
        "\n".join(
            [
                json.dumps(
                    {
                        "caseId": "case-1",
                        "modelVersion": "v1-test",
                        "datasetVersion": "test-v1",
                        "eventTime": "2026-03-10T00:00:00Z",
                        "label": 1,
                        "score": 0.82,
                        "decisionState": "recommend",
                        "sourceTrust": 0.7,
                        "highImpact": True,
                        "queueRank": 1,
                        "baselineRank": 3,
                    }
                ),
                json.dumps(
                    {
                        "caseId": "case-2",
                        "eventTime": "2026-03-10T01:00:00Z",
                        "label": 0,
                        "score": 0.22,
                        "decisionState": "abstain",
                        "sourceTrust": 0.3,
                        "rolledBack": True,
                    }
                ),
            ]
        ),
        encoding="utf-8",
    )

    rows = module.load_rows(rows_path)

    assert len(rows) == 2
    assert rows[0].case_id == "case-1"
    assert rows[0].model_version == "v1-test"
    assert rows[0].dataset_version == "test-v1"
    assert rows[0].high_impact is True
    assert rows[1].rolled_back is True


def test_harness_report_includes_simple_uniform_baseline(tmp_path: Path) -> None:
    module = _load_harness_module()
    rows_path = tmp_path / "rows.jsonl"
    output_path = tmp_path / "report.json"
    rows_path.write_text(
        "\n".join(
            [
                json.dumps(
                    {
                        "caseId": "case-1",
                        "eventTime": "2026-03-10T00:00:00Z",
                        "label": 1,
                        "score": 0.88,
                        "decisionState": "recommend",
                        "sourceTrust": 0.8,
                        "queueRank": 1,
                        "baselineRank": 2,
                    }
                ),
                json.dumps(
                    {
                        "caseId": "case-2",
                        "eventTime": "2026-03-10T01:00:00Z",
                        "label": 0,
                        "score": 0.31,
                        "decisionState": "abstain",
                        "sourceTrust": 0.2,
                        "queueRank": 2,
                        "baselineRank": 1,
                    }
                ),
            ]
        ),
        encoding="utf-8",
    )

    previous_argv = sys.argv
    sys.argv = [
        "run_evaluation_harness.py",
        "--input-file",
        str(rows_path),
        "--output-file",
        str(output_path),
    ]
    try:
        module.main()
    finally:
        sys.argv = previous_argv

    report = json.loads(output_path.read_text(encoding="utf-8"))
    assert "uniform" in report["baselines"]
    assert "unavailable_metrics" in report["candidate"]
