from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.model_selection import StratifiedKFold, StratifiedShuffleSplit

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from decision_service.calibration import train_logistic_calibrator
from decision_service.dataset_registry import DatasetRegistryStore
from decision_service.evaluator import evaluate_examples
from decision_service.registry import ModelRegistryEntry, ModelRegistryStore, artifact_path_for_registry
from decision_service.scorer import BaselineScorer, ScorerContext, ScoringThresholds
from decision_service.snapshots import SnapshotLoader, build_training_examples


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train a candidate baseline with a 10% held-out test split and 5-fold CV on the remaining data."
    )
    parser.add_argument("--snapshot-root", type=Path, required=True)
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--registry-path", type=Path, required=True)
    parser.add_argument("--artifacts-dir", type=Path, required=True)
    parser.add_argument("--dataset-registry-path", type=Path, default=None)
    parser.add_argument("--horizon-hours", type=int, default=72)
    parser.add_argument("--target-recall", type=float, default=0.90)
    parser.add_argument("--test-ratio", type=float, default=0.10)
    parser.add_argument("--folds", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
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
    if len(examples) < 50:
        raise RuntimeError("Need at least 50 examples for held-out test plus 5-fold cross-validation.")

    labels = np.array([example.label for example in examples], dtype=int)
    if len(set(labels.tolist())) < 2:
        raise RuntimeError("Need both positive and negative labels to train the baseline.")

    splitter = StratifiedShuffleSplit(n_splits=1, test_size=args.test_ratio, random_state=args.seed)
    all_indices = np.arange(len(examples))
    dev_idx, test_idx = next(splitter.split(all_indices, labels))
    dev_examples = [examples[index] for index in dev_idx]
    test_examples = [examples[index] for index in test_idx]
    dev_labels = labels[dev_idx]

    cv_metrics: list[dict[str, float]] = []
    cv_thresholds: list[dict[str, float]] = []
    kfold = StratifiedKFold(n_splits=args.folds, shuffle=True, random_state=args.seed)
    for fold_number, (train_rel_idx, val_rel_idx) in enumerate(kfold.split(np.arange(len(dev_examples)), dev_labels), start=1):
        train_examples = [dev_examples[index] for index in train_rel_idx]
        val_examples = [dev_examples[index] for index in val_rel_idx]
        scorer, thresholds = _train_scorer(
            examples=train_examples,
            dataset_version=args.dataset_version,
            source_trust_map=snapshot.source_trust_map,
            target_recall=args.target_recall,
            model_version=f"cv-fold-{fold_number}",
        )
        overall, _, sample_size = evaluate_examples(
            scorer=scorer,
            examples=val_examples,
            slice_fields=["ioc_type", "source_system", "time_bucket"],
        )
        cv_metrics.append(
            {
                "fold": float(fold_number),
                "precision": overall.precision,
                "recall": overall.recall,
                "pr_auc": overall.pr_auc,
                "calibration_error": overall.calibration_error,
                "abstain_rate": overall.abstain_rate,
                "coverage": overall.coverage,
                "sample_size": float(sample_size),
            }
        )
        cv_thresholds.append(thresholds)

    model_version = f"v1-{args.dataset_version}-cv5-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    final_scorer, final_thresholds = _train_scorer(
        examples=dev_examples,
        dataset_version=args.dataset_version,
        source_trust_map=snapshot.source_trust_map,
        target_recall=args.target_recall,
        model_version=model_version,
    )
    test_overall, _, test_sample_size = evaluate_examples(
        scorer=final_scorer,
        examples=test_examples,
        slice_fields=["ioc_type", "source_system", "time_bucket"],
    )

    cv_summary = _summarize_cv_metrics(cv_metrics)
    test_metrics = {
        "precision": test_overall.precision,
        "recall": test_overall.recall,
        "pr_auc": test_overall.pr_auc,
        "calibration_error": test_overall.calibration_error,
        "abstain_rate": test_overall.abstain_rate,
        "coverage": test_overall.coverage,
        "test_sample_size": float(test_sample_size),
    }

    model_dir = args.artifacts_dir / "models" / model_version
    artifact_root = args.registry_path.resolve().parent
    model_dir.mkdir(parents=True, exist_ok=True)
    calibration_path = model_dir / "calibration.json"
    thresholds_path = model_dir / "thresholds.json"
    metrics_path = model_dir / "metrics.json"
    cv_report_path = model_dir / "cv_report.json"
    calibration_path.write_text(json.dumps(final_scorer.calibrator.to_dict(), indent=2), encoding="utf-8")
    thresholds_path.write_text(json.dumps(final_thresholds, indent=2), encoding="utf-8")
    metrics_payload = {"cv_summary": cv_summary, "test_metrics": test_metrics}
    metrics_path.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")
    cv_report_path.write_text(json.dumps({"fold_metrics": cv_metrics, "fold_thresholds": cv_thresholds}, indent=2), encoding="utf-8")

    artifact_hashes = {
        "calibration": _sha256_file(calibration_path),
        "thresholds": _sha256_file(thresholds_path),
        "metrics": _sha256_file(metrics_path),
        "cv_report": _sha256_file(cv_report_path),
    }

    now = datetime.now(timezone.utc)
    entry = ModelRegistryEntry(
        model_id="cti-v1-baseline",
        model_version=model_version,
        dataset_version=args.dataset_version,
        status="candidate",
        created_at_utc=now,
        training_window_start_utc=min(example.event_time for example in dev_examples),
        training_window_end_utc=max(example.event_time for example in dev_examples),
        evaluation_window_start_utc=min(example.event_time for example in test_examples),
        evaluation_window_end_utc=max(example.event_time for example in test_examples),
        metrics=_finite_metric_dict(
            {
                "precision": test_metrics["precision"],
                "recall": test_metrics["recall"],
                "pr_auc": test_metrics["pr_auc"],
                "calibration_error": test_metrics["calibration_error"],
                "abstain_rate": test_metrics["abstain_rate"],
                "coverage": test_metrics["coverage"],
                "validation_sample_size": test_metrics["test_sample_size"],
                "cv_precision_mean": cv_summary["precision_mean"],
                "cv_recall_mean": cv_summary["recall_mean"],
                "cv_calibration_error_mean": cv_summary["calibration_error_mean"],
            }
        ),
        scoring_profile_version="heuristic-v1",
        feature_schema_version="cti-feature-schema-v1",
        thresholds=final_thresholds,
        calibration=final_scorer.calibrator.to_dict(),
        calibration_metadata={"method": "logistic_regression", "library": "scikit-learn", "cv_folds": str(args.folds)},
        artifact_paths={
            "calibration": artifact_path_for_registry(calibration_path, artifact_root),
            "thresholds": artifact_path_for_registry(thresholds_path, artifact_root),
            "metrics": artifact_path_for_registry(metrics_path, artifact_root),
            "cv_report": artifact_path_for_registry(cv_report_path, artifact_root),
        },
        artifact_hashes=artifact_hashes,
        dataset_manifest_hash=dataset_manifest_hash,
        notes="Candidate baseline trained with held-out test split and 5-fold CV on development data.",
    )
    ModelRegistryStore(args.registry_path).upsert(entry)

    print(
        json.dumps(
            {
                "modelVersion": model_version,
                "datasetVersion": args.dataset_version,
                "devExampleCount": len(dev_examples),
                "testExampleCount": len(test_examples),
                "cvSummary": cv_summary,
                "testMetrics": test_metrics,
                "thresholds": final_thresholds,
            },
            indent=2,
        )
    )


def _train_scorer(
    *,
    examples,
    dataset_version: str,
    source_trust_map: dict[str, float],
    target_recall: float,
    model_version: str,
) -> tuple[BaselineScorer, dict[str, float]]:
    raw_scorer = BaselineScorer(
        context=ScorerContext(
            model_version=f"{model_version}-raw",
            dataset_version=dataset_version,
            source_trust_map=source_trust_map,
        )
    )
    raw_scores = [raw_scorer.raw_score(example.request) for example in examples]
    labels = [example.label for example in examples]
    class_weights = _class_weights(labels)
    sample_weights = [
        _calibration_sample_weight(example=example, raw_score=score, class_weight=class_weights[example.label])
        for example, score in zip(examples, raw_scores)
    ]
    calibrator = train_logistic_calibrator(raw_scores, labels, sample_weights=sample_weights)
    calibrated_scores = [calibrator.calibrate(raw_scorer.raw_score(example.request)) for example in examples]
    thresholds = _fit_thresholds(scores=calibrated_scores, labels=labels, target_recall=target_recall)
    scorer = BaselineScorer(
        context=ScorerContext(
            model_version=model_version,
            dataset_version=dataset_version,
            source_trust_map=source_trust_map,
        ),
        calibrator=calibrator,
        thresholds=ScoringThresholds(
            recommend=thresholds["recommend"],
            escalate=thresholds["escalate"],
            abstain=thresholds["abstain"],
        ),
    )
    return scorer, thresholds


def _class_weights(labels: list[int]) -> dict[int, float]:
    positives = max(1, sum(labels))
    negatives = max(1, len(labels) - positives)
    total = positives + negatives
    return {
        1: total / (2.0 * positives),
        0: total / (2.0 * negatives),
    }


def _summarize_cv_metrics(fold_metrics: list[dict[str, float]]) -> dict[str, float]:
    keys = ["precision", "recall", "pr_auc", "calibration_error", "abstain_rate", "coverage"]
    summary: dict[str, Any] = {}
    for key in keys:
        values = np.array([float(metric[key]) for metric in fold_metrics if metric.get(key) is not None], dtype=float)
        if values.size == 0:
            summary[f"{key}_mean"] = None
            summary[f"{key}_std"] = None
            continue
        summary[f"{key}_mean"] = float(values.mean())
        summary[f"{key}_std"] = float(values.std(ddof=0))
    summary["folds"] = float(len(fold_metrics))
    return summary


def _fit_thresholds(scores: list[float], labels: list[int], target_recall: float) -> dict[str, float]:
    if not scores:
        return {"recommend": 0.55, "escalate": 0.80, "abstain": 0.35}
    paired = sorted(zip(scores, labels), key=lambda item: item[0], reverse=True)
    positives = max(1, sum(labels))
    running_tp = 0
    recommend = 0.55
    for score, label in paired:
        if label == 1:
            running_tp += 1
        if (running_tp / positives) >= target_recall:
            recommend = float(score)
            break
    recommend = float(np.clip(recommend, 0.10, 0.80))
    escalate = float(np.clip(recommend + 0.15, recommend, 0.95))
    abstain = float(np.clip(recommend - 0.25, 0.05, 0.55))
    return {"recommend": recommend, "escalate": escalate, "abstain": abstain}


def _calibration_sample_weight(*, example, raw_score: float, class_weight: float) -> float:
    source_system = str(example.request.source_system or "").strip().lower()
    source_name = str(example.request.rule_context.get("source", "") or "").strip().lower()
    label_basis = str(example.request.rule_context.get("label_basis", "") or "").strip().lower()
    rule_family = str(example.request.rule_context.get("ruleFamily", "") or "").strip().lower()
    severity_score = _coerce_float(example.request.rule_context.get("severityScore"), default=0.5)
    label = int(example.label)

    weight = float(class_weight)
    if label_basis == "authoritative_internal":
        weight += 2.35
    elif label_basis == "fixture_curated":
        weight += 0.90
    elif label_basis == "provider_explicit_external":
        weight *= 0.25 if label == 1 else 0.70

    if source_name in {"internal-reviewed-telemetry", "internal-clean-baselines", "internal-allowlists"}:
        weight += 1.10
    elif source_name in {"urlhaus", "malwarebazaar"} and label == 1:
        weight *= 0.45

    if label == 0 and label_basis == "authoritative_internal":
        weight += 2.40
    elif label == 1 and label_basis == "authoritative_internal":
        weight += 0.85

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

