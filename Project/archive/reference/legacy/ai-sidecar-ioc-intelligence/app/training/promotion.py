from __future__ import annotations

import argparse
import json
from pathlib import Path


DEFAULT_GATES = {
    "min_precision_at_k": 0.75,
    "min_analyst_time_saved_ratio": 0.45,
    "min_pr_auc": 0.70,
    "max_fnr": 0.12,
    "max_calibration_error": 0.20,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Model promotion gate checks.")
    parser.add_argument("--report", required=True, type=Path, help="Path to evaluation_report.json")
    parser.add_argument("--gates", type=Path, help="Optional gate override JSON file")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = json.loads(args.report.read_text(encoding="utf-8"))
    gates = dict(DEFAULT_GATES)
    if args.gates and args.gates.exists():
        gates.update(json.loads(args.gates.read_text(encoding="utf-8")))

    failures = []
    if report.get("precision_at_k", 0.0) < gates["min_precision_at_k"]:
        failures.append(
            f"precision_at_k {report.get('precision_at_k', 0.0):.4f} < {gates['min_precision_at_k']:.4f}"
        )
    if report.get("analyst_time_saved_ratio", 0.0) < gates["min_analyst_time_saved_ratio"]:
        failures.append(
            "analyst_time_saved_ratio "
            f"{report.get('analyst_time_saved_ratio', 0.0):.4f} < {gates['min_analyst_time_saved_ratio']:.4f}"
        )
    if report["pr_auc"] < gates["min_pr_auc"]:
        failures.append(f"pr_auc {report['pr_auc']:.4f} < {gates['min_pr_auc']:.4f}")
    if report["fnr"] > gates["max_fnr"]:
        failures.append(f"fnr {report['fnr']:.4f} > {gates['max_fnr']:.4f}")
    if report["calibration_error"] > gates["max_calibration_error"]:
        failures.append(
            f"calibration_error {report['calibration_error']:.4f} > {gates['max_calibration_error']:.4f}"
        )

    if failures:
        print("PROMOTION_BLOCKED")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)

    print("PROMOTION_ALLOWED")


if __name__ == "__main__":
    main()
