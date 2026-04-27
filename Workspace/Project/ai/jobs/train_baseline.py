from __future__ import annotations

import argparse
import json
import hashlib
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from decision_service.calibration import train_logistic_calibrator
from decision_service.dataset_registry import DatasetRegistryStore
from decision_service.evaluator import evaluate_examples
from decision_service.registry import ModelRegistryEntry, ModelRegistryStore, artifact_path_for_registry
from decision_service.scorer import BaselineScorer, ScorerContext, ScoringThresholds
from decision_service.snapshots import SnapshotLoader, build_training_examples


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
    train_weights = [
        _calibration_sample_weight(example=example, raw_score=score)
        for example, score in zip(train_examples, train_raw)
    ]
    calibrator = train_logistic_calibrator(train_raw, train_labels, sample_weights=train_weights)

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
    metrics_payload = {
        "precision": overall.precision,
        "recall": overall.recall,
        "pr_auc": overall.pr_auc,
        "calibration_error": overall.calibration_error,
        "abstain_rate": overall.abstain_rate,
        "coverage": overall.coverage,
        "validation_sample_size": float(sample_size),
    }
    metrics = _finite_metric_dict(metrics_payload)

    model_dir = args.artifacts_dir / "models" / model_version
    artifact_root = args.registry_path.resolve().parent
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
            "calibration": artifact_path_for_registry(calibration_path, artifact_root),
            "thresholds": artifact_path_for_registry(thresholds_path, artifact_root),
            "metrics": artifact_path_for_registry(metrics_path, artifact_root),
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

    recommend = float(np.clip(best_recommend, 0.10, 0.80))
    escalate = float(np.clip(recommend + 0.15, recommend, 0.95))
    abstain = float(np.clip(recommend - 0.25, 0.05, 0.55))
    return {"recommend": recommend, "escalate": escalate, "abstain": abstain}


def _calibration_sample_weight(*, example, raw_score: float) -> float:
    source_system = str(example.request.source_system or "").strip().lower()
    rule_family = str(example.request.rule_context.get("ruleFamily", "") or "").strip().lower()
    severity_score = _coerce_float(example.request.rule_context.get("severityScore"), default=0.5)

    weight = 1.0
    if source_system in {"siem", "sigma", "snort", "suricata", "yara"} or rule_family in {
        "sigma",
        "snort",
        "suricata",
        "yara",
    }:
        weight += 0.30
    if 0.25 <= raw_score <= 0.75:
        weight += 0.60
    if 0.35 <= raw_score <= 0.65:
        weight += 0.70
    if 0.55 <= example.source_trust <= 0.80:
        weight += 0.30
    if 0.50 <= severity_score <= 0.80:
        weight += 0.15
    return float(round(weight, 6))


def _coerce_float(value: object, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _finite_metric_dict(payload: dict[str, Any]) -> dict[str, float]:
    metrics: dict[str, float] = {}
    for key, value in payload.items():
        if value is None:
            continue
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(parsed):
            metrics[key] = parsed
    return metrics


if __name__ == "__main__":
    main()

