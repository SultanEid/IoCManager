from __future__ import annotations

import argparse
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from cti_service.calibration import train_logistic_calibrator
from cti_service.dataset_registry import DatasetRegistryStore
from cti_service.evaluator import evaluate_examples
from cti_service.registry import ModelRegistryEntry, ModelRegistryStore
from cti_service.scorer import BaselineScorer, ScorerContext, ScoringThresholds
from cti_service.snapshots import SnapshotLoader, build_training_examples


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train baseline calibrator/thresholds from versioned snapshot data.")
    parser.add_argument("--snapshot-root", type=Path, required=True)
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--registry-path", type=Path, required=True)
    parser.add_argument("--artifacts-dir", type=Path, required=True)
    parser.add_argument("--horizon-hours", type=int, default=72)
    parser.add_argument("--target-recall", type=float, default=0.90)
    parser.add_argument("--dataset-registry-path", type=Path, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    loader = SnapshotLoader(args.snapshot_root)
    snapshot = loader.load(args.dataset_version)
    dataset_manifest_hash = None
    if args.dataset_registry_path is not None:
        dataset_entry = DatasetRegistryStore(args.dataset_registry_path).get_by_version(args.dataset_version)
        if dataset_entry is not None:
            dataset_manifest_hash = dataset_entry.manifest_hash
    examples = build_training_examples(snapshot=snapshot, horizon_hours=args.horizon_hours)
    if len(examples) < 20:
        raise RuntimeError("Need at least 20 examples to train baseline calibrator.")

    split = max(1, int(len(examples) * 0.8))
    train_examples = examples[:split]
    val_examples = examples[split:]
    if len(val_examples) < 5:
        raise RuntimeError("Validation split is too small; provide a larger snapshot.")

    raw_scorer = BaselineScorer(
        context=ScorerContext(
            model_version="v1-baseline-raw",
            dataset_version=args.dataset_version,
            source_trust_map=snapshot.source_trust_map,
        )
    )
    train_raw = [raw_scorer.raw_score(example.request) for example in train_examples]
    train_labels = [example.label for example in train_examples]
    calibrator = train_logistic_calibrator(train_raw, train_labels)

    val_scores = [calibrator.calibrate(raw_scorer.raw_score(example.request)) for example in val_examples]
    val_labels = [example.label for example in val_examples]
    thresholds = _fit_thresholds(scores=val_scores, labels=val_labels, target_recall=args.target_recall)

    model_version = f"v1-{args.dataset_version}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    scorer = BaselineScorer(
        context=ScorerContext(
            model_version=model_version,
            dataset_version=args.dataset_version,
            source_trust_map=snapshot.source_trust_map,
        ),
        calibrator=calibrator,
        thresholds=ScoringThresholds(
            recommend=thresholds["recommend"],
            escalate=thresholds["escalate"],
            abstain=thresholds["abstain"],
        ),
    )

    overall, _, sample_size = evaluate_examples(
        scorer=scorer,
        examples=val_examples,
        slice_fields=["ioc_type", "source_system", "time_bucket"],
    )
    metrics = {
        "precision": overall.precision,
        "recall": overall.recall,
        "pr_auc": overall.pr_auc,
        "calibration_error": overall.calibration_error,
        "abstain_rate": overall.abstain_rate,
        "coverage": overall.coverage,
        "validation_sample_size": float(sample_size),
    }

    model_dir = args.artifacts_dir / "models" / model_version
    model_dir.mkdir(parents=True, exist_ok=True)
    calibration_path = model_dir / "calibration.json"
    thresholds_path = model_dir / "thresholds.json"
    metrics_path = model_dir / "metrics.json"
    calibration_path.write_text(json.dumps(calibrator.to_dict(), indent=2), encoding="utf-8")
    thresholds_path.write_text(json.dumps(thresholds, indent=2), encoding="utf-8")
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    artifact_hashes = {
        "calibration": _sha256_file(calibration_path),
        "thresholds": _sha256_file(thresholds_path),
        "metrics": _sha256_file(metrics_path),
    }

    now = datetime.now(timezone.utc)
    entry = ModelRegistryEntry(
        model_id="cti-v1-baseline",
        model_version=model_version,
        dataset_version=args.dataset_version,
        status="candidate",
        created_at_utc=now,
        training_window_start_utc=train_examples[0].event_time,
        training_window_end_utc=train_examples[-1].event_time,
        evaluation_window_start_utc=val_examples[0].event_time,
        evaluation_window_end_utc=val_examples[-1].event_time,
        metrics=metrics,
        scoring_profile_version="heuristic-v1",
        feature_schema_version="cti-feature-schema-v1",
        thresholds=thresholds,
        calibration=calibrator.to_dict(),
        calibration_metadata={"method": "logistic_regression", "library": "scikit-learn"},
        artifact_paths={
            "calibration": str(calibration_path.resolve()),
            "thresholds": str(thresholds_path.resolve()),
            "metrics": str(metrics_path.resolve()),
        },
        artifact_hashes=artifact_hashes,
        dataset_manifest_hash=dataset_manifest_hash,
        notes="Deterministic baseline trained from versioned local snapshot.",
    )
    store = ModelRegistryStore(args.registry_path)
    store.upsert(entry)

    print(
        json.dumps(
            {
                "modelVersion": model_version,
                "datasetVersion": args.dataset_version,
                "registryPath": str(args.registry_path.resolve()),
                "metrics": metrics,
                "thresholds": thresholds,
            },
            indent=2,
        )
    )


def _fit_thresholds(scores: list[float], labels: list[int], target_recall: float) -> dict[str, float]:
    if not scores:
        return {"recommend": 0.55, "escalate": 0.80, "abstain": 0.35}

    paired = sorted(zip(scores, labels), key=lambda item: item[0], reverse=True)
    positives = max(1, sum(labels))
    best_recommend = 0.55
    running_tp = 0

    for score, label in paired:
        if label == 1:
            running_tp += 1
        recall = running_tp / positives
        if recall >= target_recall:
            best_recommend = float(score)
            break

    recommend = float(np.clip(best_recommend, 0.10, 0.95))
    escalate = float(np.clip(recommend + 0.18, recommend, 0.99))
    abstain = float(np.clip(recommend - 0.20, 0.05, recommend))
    return {"recommend": recommend, "escalate": escalate, "abstain": abstain}


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    main()
