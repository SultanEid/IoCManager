from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from cti_service.calibration import LogisticCalibrator
from cti_service.evaluator import evaluate_snapshot
from cti_service.registry import ModelRegistryStore
from cti_service.scorer import BaselineScorer, ScorerContext, ScoringThresholds
from cti_service.snapshots import SnapshotLoader


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate an IoC decision-support model version on a versioned snapshot.")
    parser.add_argument("--snapshot-root", type=Path, required=True)
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--registry-path", type=Path, required=True)
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--horizon-hours", type=int, default=72)
    parser.add_argument("--window-start-utc", type=str, default=None)
    parser.add_argument("--window-end-utc", type=str, default=None)
    parser.add_argument("--output-file", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    store = ModelRegistryStore(args.registry_path)
    entry = store.get_by_version(args.model_version)
    if entry is None:
        raise RuntimeError(f"Model version '{args.model_version}' was not found.")

    loader = SnapshotLoader(args.snapshot_root)
    snapshot = loader.load(args.dataset_version)
    scorer = BaselineScorer(
        context=ScorerContext(
            model_version=entry.model_version,
            dataset_version=args.dataset_version,
            source_trust_map=snapshot.source_trust_map,
        ),
        calibrator=LogisticCalibrator.from_dict(entry.calibration),
        thresholds=ScoringThresholds(
            recommend=float(entry.thresholds.get("recommend", 0.55)),
            escalate=float(entry.thresholds.get("escalate", 0.80)),
            abstain=float(entry.thresholds.get("abstain", 0.35)),
        ),
    )

    window_start = _parse_optional_utc(args.window_start_utc)
    window_end = _parse_optional_utc(args.window_end_utc)
    overall, slices, sample_size = evaluate_snapshot(
        scorer=scorer,
        snapshot=snapshot,
        horizon_hours=args.horizon_hours,
        window_start_utc=window_start,
        window_end_utc=window_end,
        slice_fields=["ioc_type", "source_system", "time_bucket", "recency_bucket", "trust_bucket"],
    )

    report = {
        "modelVersion": entry.model_version,
        "scoringProfileVersion": entry.scoring_profile_version,
        "featureSchemaVersion": entry.feature_schema_version,
        "datasetVersion": args.dataset_version,
        "datasetManifestHash": entry.dataset_manifest_hash,
        "windowStartUtc": window_start.isoformat() if window_start else None,
        "windowEndUtc": window_end.isoformat() if window_end else None,
        "sampleSize": sample_size,
        "overall": overall.model_dump(mode="json", by_alias=True),
        "slices": [row.model_dump(mode="json", by_alias=True) for row in slices],
        "metricAvailability": {
            "overallUnavailable": overall.unavailable_metrics,
            "sliceUnavailable": {
                f"{row.slice_field}:{row.slice_value}": row.unavailable_metrics
                for row in slices
            },
        },
    }
    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


def _parse_optional_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


if __name__ == "__main__":
    main()
