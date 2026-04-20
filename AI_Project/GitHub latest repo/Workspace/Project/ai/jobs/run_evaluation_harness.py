from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from cti_service.eval_framework import (  # noqa: E402
    EvaluationRecord,
    backtest_by_time,
    compare_against_baselines,
    compute_metric_bundle,
    make_simple_baseline,
    metric_bundle_to_dict,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run IoC decision-support evaluation harness with honest baselines, backtesting, "
            "and complexity-gain gating."
        )
    )
    parser.add_argument("--input-file", type=Path, required=True, help="JSONL file with scored decision rows.")
    parser.add_argument("--output-file", type=Path, required=True, help="Path to write evaluation report JSON.")
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--time-bucket", choices=["month", "week"], default="month")
    parser.add_argument("--min-precision-gain", type=float, default=0.01)
    parser.add_argument("--max-unsafe-rate-increase", type=float, default=0.0)
    parser.add_argument("--max-regret-increase", type=float, default=0.0)
    parser.add_argument("--fail-on-no-gain", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = load_rows(args.input_file)
    candidate_metrics = compute_metric_bundle(rows, top_k=args.top_k)

    baselines: dict[str, dict[str, float | int]] = {}
    baseline_metric_objects = {}

    source_trust_rows = make_simple_baseline(rows, strategy="source_trust")
    source_trust_metrics = compute_metric_bundle(source_trust_rows, top_k=args.top_k)
    baseline_metric_objects["source_trust"] = source_trust_metrics
    baselines["source_trust"] = metric_bundle_to_dict(source_trust_metrics)

    random_rows = make_simple_baseline(rows, strategy="random")
    random_metrics = compute_metric_bundle(random_rows, top_k=args.top_k)
    baseline_metric_objects["random"] = random_metrics
    baselines["random"] = metric_bundle_to_dict(random_metrics)

    uniform_rows = make_simple_baseline(rows, strategy="uniform")
    uniform_metrics = compute_metric_bundle(uniform_rows, top_k=args.top_k)
    baseline_metric_objects["uniform"] = uniform_metrics
    baselines["uniform"] = metric_bundle_to_dict(uniform_metrics)

    if any(row.baseline_score is not None for row in rows):
        provided_rows = make_simple_baseline(rows, strategy="provided")
        provided_metrics = compute_metric_bundle(provided_rows, top_k=args.top_k)
        baseline_metric_objects["provided"] = provided_metrics
        baselines["provided"] = metric_bundle_to_dict(provided_metrics)

    complexity_gate = compare_against_baselines(
        candidate=candidate_metrics,
        baselines=baseline_metric_objects,
        min_precision_gain=args.min_precision_gain,
        max_unsafe_rate_increase=args.max_unsafe_rate_increase,
        max_regret_increase=args.max_regret_increase,
    )

    backtest = backtest_by_time(rows, top_k=args.top_k, bucket=args.time_bucket)
    model_versions = sorted({row.model_version for row in rows if row.model_version})
    dataset_versions = sorted({row.dataset_version for row in rows if row.dataset_version})
    report = {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "inputFile": str(args.input_file.resolve()),
        "sampleSize": len(rows),
        "topK": args.top_k,
        "modelVersion": model_versions[0] if len(model_versions) == 1 else None,
        "datasetVersion": dataset_versions[0] if len(dataset_versions) == 1 else None,
        "modelVersionsObserved": model_versions,
        "datasetVersionsObserved": dataset_versions,
        "candidate": metric_bundle_to_dict(candidate_metrics),
        "baselines": baselines,
        "metricAvailability": {
            "candidateUnavailable": candidate_metrics.unavailable_metrics,
            "baselineUnavailable": {
                name: metrics.unavailable_metrics
                for name, metrics in baseline_metric_objects.items()
            },
        },
        "complexityGate": {
            "passed": complexity_gate.passed,
            "reasons": complexity_gate.reasons,
        },
        "timeBacktest": [
            {
                "bucket": item.bucket,
                "metrics": metric_bundle_to_dict(item.metrics),
            }
            for item in backtest
        ],
    }

    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))

    if args.fail_on_no_gain and not complexity_gate.passed:
        raise SystemExit(2)


def load_rows(path: Path) -> list[EvaluationRecord]:
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")

    rows: list[EvaluationRecord] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            payload = json.loads(line)
            rows.append(_to_record(payload, line_number))
    return rows


def _to_record(payload: dict[str, Any], line_number: int) -> EvaluationRecord:
    case_id = _read_str(payload, "case_id", "caseId")
    event_time = _parse_utc(_read_str(payload, "event_time", "eventTime"))
    label = int(_read_float(payload, "label"))
    score = _read_float(payload, "score")
    decision_state = _read_optional_str(payload, "decision_state", "decisionState") or _state_from_score(score)

    return EvaluationRecord(
        case_id=case_id,
        event_time=event_time,
        label=1 if label > 0 else 0,
        score=score,
        decision_state=decision_state,
        model_version=_read_optional_str(payload, "model_version", "modelVersion"),
        dataset_version=_read_optional_str(payload, "dataset_version", "datasetVersion"),
        source_trust=_read_float(payload, "source_trust", "sourceTrust", default=0.5),
        analyst_overrode=_read_bool(payload, "analyst_overrode", "analystOverrode"),
        high_impact=_read_bool(payload, "high_impact", "highImpact"),
        queue_rank=_read_optional_int(payload, "queue_rank", "queueRank"),
        baseline_rank=_read_optional_int(payload, "baseline_rank", "baselineRank"),
        canary_succeeded=_read_optional_bool(payload, "canary_succeeded", "canarySucceeded"),
        rolled_back=_read_optional_bool(payload, "rolled_back", "rolledBack"),
        realized_harm=_read_optional_float(payload, "realized_harm", "realizedHarm"),
        alternative_harm=_read_optional_float(payload, "alternative_harm", "alternativeHarm"),
        baseline_score=_read_optional_float(payload, "baseline_score", "baselineScore"),
    )


def _state_from_score(score: float) -> str:
    if score < 0.35:
        return "abstain"
    if score >= 0.80:
        return "escalate"
    if score >= 0.55:
        return "recommend"
    return "defer"


def _read_str(payload: dict[str, Any], *keys: str) -> str:
    for key in keys:
        if key in payload and payload[key] is not None:
            value = str(payload[key]).strip()
            if value:
                return value
    raise ValueError(f"Missing required string field (checked keys: {keys}).")


def _read_optional_str(payload: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        if key in payload and payload[key] is not None:
            value = str(payload[key]).strip()
            return value or None
    return None


def _read_float(payload: dict[str, Any], *keys: str, default: float | None = None) -> float:
    for key in keys:
        if key in payload and payload[key] is not None:
            return float(payload[key])
    if default is not None:
        return float(default)
    raise ValueError(f"Missing required numeric field (checked keys: {keys}).")


def _read_optional_float(payload: dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        if key in payload and payload[key] is not None:
            return float(payload[key])
    return None


def _read_optional_int(payload: dict[str, Any], *keys: str) -> int | None:
    for key in keys:
        if key in payload and payload[key] is not None:
            return int(payload[key])
    return None


def _read_bool(payload: dict[str, Any], *keys: str) -> bool:
    value = _read_optional_bool(payload, *keys)
    return bool(value) if value is not None else False


def _read_optional_bool(payload: dict[str, Any], *keys: str) -> bool | None:
    for key in keys:
        if key not in payload or payload[key] is None:
            continue

        value = payload[key]
        if isinstance(value, bool):
            return value

        text = str(value).strip().lower()
        if text in {"1", "true", "yes", "y"}:
            return True
        if text in {"0", "false", "no", "n"}:
            return False
    return None


def _parse_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


if __name__ == "__main__":
    main()
