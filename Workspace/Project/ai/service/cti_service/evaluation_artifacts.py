from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path
from typing import Any


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def hash_payload(payload: Any) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def write_report_bundle(
    *,
    bundle_dir: Path,
    report_payload: dict[str, Any],
    summary_markdown: str,
    run_manifest: dict[str, Any],
    calibration_bins: list[dict[str, Any]] | None = None,
) -> dict[str, str]:
    bundle_dir.mkdir(parents=True, exist_ok=True)
    report_path = bundle_dir / "report.json"
    summary_path = bundle_dir / "summary.md"
    manifest_path = bundle_dir / "run_manifest.json"
    calibration_json_path = bundle_dir / "calibration_bins.json"
    calibration_csv_path = bundle_dir / "calibration_bins.csv"

    report_path.write_text(json.dumps(report_payload, indent=2, sort_keys=True), encoding="utf-8")
    summary_path.write_text(summary_markdown.rstrip() + "\n", encoding="utf-8")
    manifest_path.write_text(json.dumps(run_manifest, indent=2, sort_keys=True), encoding="utf-8")

    calibration_rows = calibration_bins or []
    calibration_json_path.write_text(json.dumps(calibration_rows, indent=2, sort_keys=True), encoding="utf-8")
    with calibration_csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "index",
                "lower_bound",
                "upper_bound",
                "sample_size",
                "average_confidence",
                "empirical_positive_rate",
            ],
        )
        writer.writeheader()
        for row in calibration_rows:
            writer.writerow(row)

    return {
        "bundleDir": str(bundle_dir.resolve()),
        "reportJson": str(report_path.resolve()),
        "summaryMarkdown": str(summary_path.resolve()),
        "runManifest": str(manifest_path.resolve()),
        "calibrationJson": str(calibration_json_path.resolve()),
        "calibrationCsv": str(calibration_csv_path.resolve()),
    }
