from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, confusion_matrix

from app.feature_views import build_feature_snapshot
from app.schemas import IocEvent
from app.training.dataset_builder import build_training_rows

VIEW_NAMES = ["lexical", "tabular", "graph", "temporal"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate IoC intelligence model bundle.")
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--artifact-dir", required=True, type=Path)
    parser.add_argument("--horizon-hours", type=int, default=72)
    parser.add_argument("--report-out", type=Path, default=Path("evaluation_report.json"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows, _ = build_training_rows(args.input_dir, args.horizon_hours)
    if len(rows) < 20:
        raise RuntimeError("Need at least 20 rows for evaluation.")

    rows = sorted(rows, key=lambda r: r.event_time)
    snapshots = _build_snapshots(rows)
    y = np.array([row.malicious_within_horizon for row in rows], dtype=int)

    split = int(len(rows) * 0.8)
    val_rows = rows[split:]
    val_snaps = snapshots[split:]
    y_val = y[split:]

    bundle = joblib.load(args.artifact_dir / "model_bundle.joblib")
    thresholds = json.loads((args.artifact_dir / "thresholds.json").read_text(encoding="utf-8"))
    calibrated_probs = _predict_probs(bundle, val_snaps)

    pr_auc = float(average_precision_score(y_val, calibrated_probs))
    default_threshold = float(thresholds.get("default", {}).get("high", 0.55))
    y_pred = (calibrated_probs >= default_threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_val, y_pred, labels=[0, 1]).ravel()
    fnr = float(fn / max(1, fn + tp))
    recall = float(tp / max(1, tp + fn))
    precision = float(tp / max(1, tp + fp))
    precision_at_k = _precision_at_k(y_val, calibrated_probs, max(20, int(len(y_val) * 0.1)))
    analyst_time_saved_ratio = _estimate_time_saved(y_val, calibrated_probs)

    ablations = {}
    for removed in VIEW_NAMES:
        probs = _predict_probs(bundle, val_snaps, remove_view=removed)
        ablations[removed] = {
            "pr_auc": float(average_precision_score(y_val, probs)),
            "delta_pr_auc": float(average_precision_score(y_val, probs) - pr_auc),
        }

    feed_outage = _simulate_feed_outage(bundle, val_snaps)
    adversarial = _simulate_adversarial_mutations(bundle, val_rows)

    report = {
        "validation_count": int(len(y_val)),
        "pr_auc": pr_auc,
        "recall": recall,
        "precision": precision,
        "precision_at_k": precision_at_k,
        "analyst_time_saved_ratio": analyst_time_saved_ratio,
        "fnr": fnr,
        "calibration_error": float(np.mean(np.abs(y_val - calibrated_probs))),
        "ablations": ablations,
        "feed_outage": feed_outage,
        "adversarial_mutation": adversarial,
    }

    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


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
        history[key] = {
            "first_seen": history.get(key, {}).get("first_seen", row.event_time),
            "last_seen": row.event_time,
            "seen_count": history.get(key, {}).get("seen_count", 0) + 1,
            "burst_1h": history.get(key, {}).get("burst_1h", 0.0) + 1.0,
            "burst_24h": history.get(key, {}).get("burst_24h", 0.0) + 1.0,
            "scanner_consensus_24h": min(1.0, history.get(key, {}).get("scanner_consensus_24h", 0.0) + 0.05),
        }
    return snapshots


def _predict_probs(bundle: dict[str, Any], snapshots: list[Any], remove_view: str | None = None) -> np.ndarray:
    feature_orders = bundle.get("feature_orders", {})
    view_models = bundle["view_models"]
    meta_model = bundle["meta_model"]
    calibrator = bundle["calibrator"]

    view_probs = []
    for view in VIEW_NAMES:
        frame = pd.DataFrame([getattr(snapshot, view) for snapshot in snapshots]).fillna(0.0)
        order = feature_orders.get(view, list(frame.columns))
        frame = frame.reindex(columns=order, fill_value=0.0)

        if remove_view == view:
            view_probs.append(np.full(len(frame), 0.5, dtype=float))
        else:
            view_probs.append(view_models[view].predict_proba(frame.to_numpy(dtype=float))[:, 1])

    stacked = np.column_stack(view_probs)
    raw = meta_model.predict_proba(stacked)[:, 1]
    return calibrator.predict(raw)


def _simulate_feed_outage(bundle: dict[str, Any], snapshots: list[Any]) -> dict[str, float]:
    # Simulate a scanner feed outage by zeroing graph and temporal context.
    degraded = []
    for snapshot in snapshots:
        clone = snapshot.model_copy(deep=True)
        for key in clone.graph:
            clone.graph[key] = 0.0
        for key in clone.temporal:
            clone.temporal[key] = 0.0
        degraded.append(clone)

    baseline = _predict_probs(bundle, snapshots)
    outage = _predict_probs(bundle, degraded)
    return {
        "avg_score_drop": float(np.mean(baseline - outage)),
        "max_score_drop": float(np.max(baseline - outage)),
    }


def _simulate_adversarial_mutations(bundle: dict[str, Any], rows: list[Any]) -> dict[str, float]:
    mutated_snapshots = []
    baseline_snapshots = []
    for row in rows[: min(100, len(rows))]:
        baseline_event = IocEvent(
            ioc_type=row.ioc_type,
            ioc_value=row.ioc_value,
            source_system=row.source_system,
            event_time=row.event_time,
            host_context=row.host_context,
            rule_context=row.rule_context,
        )
        mutated_value = row.ioc_value.replace(".", "[.]").replace("http", "hxxp")
        mutated_event = baseline_event.model_copy(update={"ioc_value": mutated_value})
        baseline_snapshots.append(build_feature_snapshot(baseline_event, history=None, feedback_stats={}))
        mutated_snapshots.append(build_feature_snapshot(mutated_event, history=None, feedback_stats={}))

    baseline = _predict_probs(bundle, baseline_snapshots)
    mutated = _predict_probs(bundle, mutated_snapshots)
    return {
        "avg_absolute_shift": float(np.mean(np.abs(mutated - baseline))),
        "max_absolute_shift": float(np.max(np.abs(mutated - baseline))),
    }


def _precision_at_k(y_true: np.ndarray, probs: np.ndarray, k: int) -> float:
    if k <= 0:
        return 0.0
    indices = np.argsort(probs)[::-1][:k]
    return float(y_true[indices].sum() / max(1, len(indices)))


def _estimate_time_saved(y_true: np.ndarray, probs: np.ndarray) -> float:
    """
    Estimate analyst-time reduction by triaging top 30% first instead of full queue.
    This is a relative proxy for operational impact in offline evaluation.
    """
    n = len(y_true)
    if n == 0:
        return 0.0
    queue_size = max(1, int(n * 0.30))
    top_indices = np.argsort(probs)[::-1][:queue_size]
    useful_hits = int(y_true[top_indices].sum())
    baseline_useful = int(y_true.sum())
    if baseline_useful == 0:
        return 0.0

    coverage = useful_hits / baseline_useful
    review_reduction = 1.0 - (queue_size / n)
    return float(max(0.0, min(1.0, 0.6 * coverage + 0.4 * review_reduction)))


if __name__ == "__main__":
    main()
