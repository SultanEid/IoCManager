from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_recall_curve
from sklearn.model_selection import TimeSeriesSplit

from app.feature_views import build_feature_snapshot
from app.schemas import IocEvent
from app.training.dataset_builder import build_training_rows

VIEW_NAMES = ["lexical", "tabular", "graph", "temporal"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train IoC Intelligence model from real data exports.")
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--horizon-hours", type=int, default=72)
    parser.add_argument("--target-recall", type=float, default=0.95)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    rows, dataset_hash = build_training_rows(args.input_dir, args.horizon_hours)
    if not rows:
        raise RuntimeError("No training rows were produced. Check input exports.")

    rows = sorted(rows, key=lambda row: row.event_time)
    snapshots = _build_snapshots(rows)
    y = np.array([row.malicious_within_horizon for row in rows], dtype=int)

    split_index = max(1, int(len(rows) * 0.8))
    train_idx = np.arange(0, split_index)
    val_idx = np.arange(split_index, len(rows))
    if len(val_idx) < 5:
        raise RuntimeError("Validation window is too small. Provide more historical rows.")

    X_views, feature_orders = _view_matrices_from_snapshots(snapshots)

    view_models: dict[str, Any] = {}
    oof_matrix = np.zeros((len(train_idx), len(VIEW_NAMES)), dtype=float)

    for col, view in enumerate(VIEW_NAMES):
        base_model = HistGradientBoostingClassifier(max_depth=4, learning_rate=0.05, random_state=42)
        view_X_train = X_views[view][train_idx]
        view_y_train = y[train_idx]
        oof_probs = _time_oof_probabilities(base_model, view_X_train, view_y_train)
        oof_matrix[:, col] = oof_probs

        fitted = clone(base_model).fit(view_X_train, view_y_train)
        view_models[view] = fitted

    meta_model = LogisticRegression(max_iter=1200, class_weight="balanced")
    meta_model.fit(oof_matrix, y[train_idx])

    val_base = np.column_stack([
        view_models[view].predict_proba(X_views[view][val_idx])[:, 1] for view in VIEW_NAMES
    ])
    val_meta = meta_model.predict_proba(val_base)[:, 1]

    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(val_meta, y[val_idx])
    val_calibrated = calibrator.predict(val_meta)

    metrics = _compute_metrics(y[val_idx], val_calibrated)
    thresholds = _build_thresholds(rows, val_idx, val_calibrated, args.target_recall)

    bundle = {
        "view_models": view_models,
        "meta_model": meta_model,
        "calibrator": calibrator,
        "view_weights": {"lexical": 0.24, "tabular": 0.32, "graph": 0.22, "temporal": 0.22},
        "feature_orders": feature_orders,
        "dataset_hash": dataset_hash,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
    }

    joblib.dump(bundle, args.output_dir / "model_bundle.joblib")
    _write_json(args.output_dir / "thresholds.json", thresholds)
    _write_json(
        args.output_dir / "model_card.json",
        {
            "model_version": f"v1-{dataset_hash[:8]}",
            "trained_at_utc": bundle["trained_at_utc"],
            "views": VIEW_NAMES,
            "metrics": [
                f"pr_auc={metrics['pr_auc']:.6f}",
                f"recall_at_top_k={metrics['recall_at_top_k']:.6f}",
                f"fnr_at_alert_budget={metrics['fnr_at_alert_budget']:.6f}",
                f"calibration_error={metrics['calibration_error']:.6f}",
                f"mean_time_to_detect_gain={metrics['mean_time_to_detect_gain']:.6f}",
            ],
            "supported_ioc_types": sorted({row.ioc_type for row in rows}),
            "optimization_target": "recall-first",
        },
    )
    _write_json(
        args.output_dir / "training_manifest.json",
        {
            "dataset_hash": dataset_hash,
            "row_count": len(rows),
            "train_count": int(len(train_idx)),
            "validation_count": int(len(val_idx)),
            "horizon_hours": args.horizon_hours,
            "target_recall": args.target_recall,
            "metrics": metrics,
        },
    )

    print("Training complete.")
    print(json.dumps({"dataset_hash": dataset_hash, "metrics": metrics}, indent=2))


def _build_snapshots(rows: list[Any]) -> list[Any]:
    history: dict[tuple[str, str], dict[str, Any]] = {}
    snapshots = []
    for row in rows:
        key = (row.ioc_type, row.ioc_value.lower())
        event = IocEvent(
            ioc_type=row.ioc_type,
            ioc_value=row.ioc_value,
            source_system=row.source_system,
            event_time=row.event_time,
            host_context=row.host_context,
            rule_context=row.rule_context,
        )
        snapshot = build_feature_snapshot(event, history.get(key), feedback_stats={})
        snapshots.append(snapshot)

        prev = history.get(key)
        if prev is None:
            history[key] = {
                "first_seen": row.event_time,
                "last_seen": row.event_time,
                "seen_count": 1,
                "burst_1h": 1.0,
                "burst_24h": 1.0,
                "scanner_consensus_24h": min(1.0, 1.0 / 4.0),
            }
        else:
            prev["last_seen"] = row.event_time
            prev["seen_count"] += 1
            prev["burst_1h"] = min(200.0, prev["burst_1h"] + 1.0)
            prev["burst_24h"] = min(500.0, prev["burst_24h"] + 1.0)
            prev["scanner_consensus_24h"] = min(1.0, prev["scanner_consensus_24h"] + 0.05)
    return snapshots


def _view_matrices_from_snapshots(snapshots: list[Any]) -> tuple[dict[str, np.ndarray], dict[str, list[str]]]:
    view_frames: dict[str, pd.DataFrame] = {}
    for view in VIEW_NAMES:
        rows = [getattr(snapshot, view) for snapshot in snapshots]
        view_frames[view] = pd.DataFrame(rows).fillna(0.0)

    feature_orders = {view: list(frame.columns) for view, frame in view_frames.items()}
    matrices = {view: frame.to_numpy(dtype=float) for view, frame in view_frames.items()}
    return matrices, feature_orders


def _time_oof_probabilities(model: Any, X: np.ndarray, y: np.ndarray) -> np.ndarray:
    splitter = TimeSeriesSplit(n_splits=min(5, max(2, len(X) // 100)))
    oof = np.zeros(len(X), dtype=float)

    for train_part, test_part in splitter.split(X):
        fitted = clone(model).fit(X[train_part], y[train_part])
        oof[test_part] = fitted.predict_proba(X[test_part])[:, 1]

    if np.allclose(oof, 0.0):
        fitted = clone(model).fit(X, y)
        oof = fitted.predict_proba(X)[:, 1]
    return oof


def _compute_metrics(y_true: np.ndarray, probs: np.ndarray) -> dict[str, float]:
    pr_auc = float(average_precision_score(y_true, probs))
    top_k = max(1, int(len(probs) * 0.1))
    top_idx = np.argsort(probs)[::-1][:top_k]
    recall_at_top_k = float(y_true[top_idx].sum() / max(1, y_true.sum()))
    positives = y_true == 1
    fnr_at_alert_budget = float(((probs < np.quantile(probs, 0.90)) & positives).sum() / max(1, positives.sum()))
    calibration_error = float(np.mean(np.abs(y_true - probs)))
    mean_time_to_detect_gain = float(0.0)
    return {
        "pr_auc": pr_auc,
        "recall_at_top_k": recall_at_top_k,
        "fnr_at_alert_budget": fnr_at_alert_budget,
        "calibration_error": calibration_error,
        "mean_time_to_detect_gain": mean_time_to_detect_gain,
    }


def _build_thresholds(rows: list[Any], val_idx: np.ndarray, probs: np.ndarray, target_recall: float) -> dict[str, dict[str, float]]:
    output: dict[str, dict[str, float]] = {}
    val_rows = [rows[int(i)] for i in val_idx]
    by_type: dict[str, list[tuple[int, float]]] = {}
    for row, score in zip(val_rows, probs, strict=True):
        by_type.setdefault(row.ioc_type, []).append((row.malicious_within_horizon, float(score)))

    for ioc_type, pairs in by_type.items():
        y_true = np.array([pair[0] for pair in pairs], dtype=int)
        scores = np.array([pair[1] for pair in pairs], dtype=float)
        precision, recall, thresholds = precision_recall_curve(y_true, scores)

        high = 0.55
        for idx, rec in enumerate(recall[:-1]):
            if rec >= target_recall:
                high = float(thresholds[idx])
                break

        high = float(np.clip(high, 0.10, 0.95))
        critical = float(np.clip(high + 0.15, 0.20, 0.98))
        medium = float(np.clip(high - 0.15, 0.05, 0.90))
        output[ioc_type] = {"critical": critical, "high": high, "medium": medium}

    if "default" not in output:
        output["default"] = {"critical": 0.70, "high": 0.55, "medium": 0.40}
    return output


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, default=str)


if __name__ == "__main__":
    main()

