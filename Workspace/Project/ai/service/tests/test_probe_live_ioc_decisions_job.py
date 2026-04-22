from __future__ import annotations

import importlib.util
from pathlib import Path


_JOB_PATH = (
    Path(__file__).resolve().parents[2]
    / "jobs"
    / "probe_live_ioc_decisions.py"
)
_SPEC = importlib.util.spec_from_file_location("probe_live_ioc_decisions", _JOB_PATH)
if _SPEC is None or _SPEC.loader is None:  # pragma: no cover
    raise RuntimeError("Unable to load probe_live_ioc_decisions job module for tests.")
_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)

_confidence_band = _MODULE._confidence_band
_summarize_rows = _MODULE._summarize_rows
_select_ioc_sample = _MODULE._select_ioc_sample


def test_confidence_band_classifies_medium_slice() -> None:
    assert _confidence_band(None) == "unknown"
    assert _confidence_band(0.05) == "low"
    assert _confidence_band(0.35) == "medium"
    assert _confidence_band(0.84) == "high"


def test_summarize_rows_tracks_family_and_severity_bands() -> None:
    rows = [
        {"status": "Completed", "scannerFamily": "suricata", "severity": "Medium", "confidence": 0.18},
        {"status": "Completed", "scannerFamily": "suricata", "severity": "High", "confidence": 0.44},
        {"status": "Completed", "scannerFamily": "sigma", "severity": "High", "confidence": 0.81},
        {"status": "error", "scannerFamily": "snort", "severity": "Critical", "confidence": None},
    ]

    summary = _summarize_rows(rows)

    assert summary["completedCount"] == 3
    assert summary["errorCount"] == 1
    assert summary["mediumSignalCount"] == 1
    assert summary["confidenceBands"] == {"low": 1, "medium": 1, "high": 1, "unknown": 0}
    assert summary["byFamily"]["suricata"]["count"] == 2
    assert summary["byFamily"]["suricata"]["bands"]["medium"] == 1
    assert summary["bySeverity"]["High"]["count"] == 2


def test_select_ioc_sample_keeps_running_when_one_combination_fails(monkeypatch) -> None:
    def fake_request_json(*, query=None, **_kwargs):
        scanner_family = query["scannerFamily"]
        severity = query["severity"]
        if scanner_family == "sigma":
            raise RuntimeError("500 broken filter")
        if severity == "Critical":
            return {"items": [], "totalCount": 0}
        return {
            "items": [
                {"iocId": f"{scanner_family}-{severity}-1"},
                {"iocId": f"{scanner_family}-{severity}-2"},
            ],
            "totalCount": 2,
        }

    monkeypatch.setattr(_MODULE, "_request_json", fake_request_json)

    selection = _select_ioc_sample(
        base_url="http://localhost:5127",
        token="token",
        scanner_families=["suricata", "sigma"],
        severities=["Medium", "Critical"],
        per_combination=1,
    )

    assert [item["iocId"] for item in selection["items"]] == ["suricata-Medium-1"]
    assert selection["combinationErrors"] == [
        {"scannerFamily": "sigma", "severity": "Medium", "error": "500 broken filter"},
        {"scannerFamily": "sigma", "severity": "Critical", "error": "500 broken filter"},
    ]
    assert selection["combinationStats"] == [
        {"scannerFamily": "suricata", "severity": "Medium", "totalCount": 2, "selectedCount": 1, "status": "ok"},
        {"scannerFamily": "suricata", "severity": "Critical", "totalCount": 0, "selectedCount": 0, "status": "empty"},
    ]
