from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from cti_service.snapshots import SnapshotLoader, build_training_examples
from cti_service.dataset_registry import DatasetRegistryEntry, DatasetRegistryStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build normalized training rows from a versioned snapshot.")
    parser.add_argument("--snapshot-root", type=Path, required=True)
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--horizon-hours", type=int, default=72)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--dataset-registry-path", type=Path, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    loader = SnapshotLoader(args.snapshot_root)
    snapshot = loader.load(args.dataset_version)
    examples = build_training_examples(snapshot=snapshot, horizon_hours=args.horizon_hours)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for example in examples:
        payload = example.request.model_dump(mode="json", by_alias=True)
        rows.append(
            {
                "caseId": payload["caseId"],
                "asOfTime": payload["asOfTime"],
                "sourceSystem": payload["sourceSystem"],
                "iocType": payload["iocType"],
                "iocValue": payload["iocValue"],
                "hostContextJson": json.dumps(payload["hostContext"], sort_keys=True),
                "ruleContextJson": json.dumps(payload["ruleContext"], sort_keys=True),
                "label": example.label,
                "sourceTrust": example.source_trust,
                "eventTime": example.event_time.isoformat(),
            }
        )

    frame = pd.DataFrame(rows)
    frame.to_csv(args.output_dir / "training_rows.csv", index=False)
    meta = {
        "datasetVersion": args.dataset_version,
        "datasetManifestHash": snapshot.manifest_hash,
        "horizonHours": args.horizon_hours,
        "rowCount": int(len(frame)),
        "outputFile": str((args.output_dir / "training_rows.csv").resolve()),
    }
    (args.output_dir / "dataset_manifest.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    if args.dataset_registry_path is not None:
        dataset_store = DatasetRegistryStore(args.dataset_registry_path)
        dataset_store.upsert(
            DatasetRegistryEntry(
                dataset_version=snapshot.dataset_version,
                created_at_utc=snapshot.created_at_utc,
                manifest_path=str(snapshot.manifest_path.resolve()),
                manifest_hash=snapshot.manifest_hash,
                source_files=snapshot.manifest_files,
                notes="Persisted by build_dataset job.",
            )
        )
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
