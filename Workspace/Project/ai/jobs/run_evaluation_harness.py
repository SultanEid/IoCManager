from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from _bootstrap import bootstrap_service_path
except ModuleNotFoundError:
    import importlib.util

    _bootstrap_path = Path(__file__).with_name("_bootstrap.py")
    _bootstrap_spec = importlib.util.spec_from_file_location("_bootstrap", _bootstrap_path)
    if _bootstrap_spec is None or _bootstrap_spec.loader is None:
        raise
    _bootstrap_module = importlib.util.module_from_spec(_bootstrap_spec)
    _bootstrap_spec.loader.exec_module(_bootstrap_module)
    bootstrap_service_path = _bootstrap_module.bootstrap_service_path

bootstrap_service_path()

from cti_service.action_plan_evaluator import evaluate_canonical_action_plan_rows
from cti_service.evaluation_artifacts import hash_file, write_report_bundle
from cti_service.evaluation_metrics import (
    AdjudicationEvaluationRow,
    slice_adjudication_metrics,
)
from cti_service.eval_framework import (
    EvaluationRecord,
    backtest_by_time,
    compare_against_baselines,
    compute_metric_bundle,
    make_simple_baseline,
    metric_bundle_to_dict,
)


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description=(
            "Run offline adjudication and action-plan evaluation with reproducible report bundles."
        )
    )
    parser.add_argument("--input-file", type=Path, required=True, help="JSONL file with scored rows or canonical dataset rows.")
    parser.add_argument("--output-file", type=Path, required=True, help="Path to write evaluation report JSON.")
    parser.add_argument("--task", choices=["auto", "adjudication", "action_plan", "both"], default="auto")
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--time-bucket", choices=["month", "week"], default="month")
    parser.add_argument("--min-precision-gain", type=float, default=0.01)
    parser.add_argument("--max-unsafe-rate-increase", type=float, default=0.0)
    parser.add_argument("--max-regret-increase", type=float, default=0.0)
    parser.add_argument("--fail-on-no-gain", action="store_true")
    parser.add_argument(
        "--bundle-root",
        type=Path,
        default=ai_root / "datasets" / "processed" / "evaluations",
        help="Stable directory for reproducible evaluation bundles.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payloads = load_jsonl_payloads(args.input_file)
    input_hash = hash_file(args.input_file)
    input_format = detect_input_format(payloads)
    task_mode = resolve_task_mode(args.task, input_format)

    report: dict[str, Any] = {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "inputFile": str(args.input_file.resolve()),
        "inputHash": input_hash,
        "inputFormat": input_format,
        "taskMode": task_mode,
        "adjudication": None,
        "actionPlan": None,
    }
    summary_lines = [
        "# Offline Evaluation Report",
        "",
        f"- input file: `{args.input_file.resolve()}`",
        f"- input hash: `{input_hash}`",
        f"- input format: `{input_format}`",
        f"- task mode: `{task_mode}`",
    ]

    adjudication_candidate = None
    if task_mode in {"adjudication", "both"}:
        scored_rows = build_scored_rows(payloads)
        if scored_rows:
            adjudication_candidate = compute_metric_bundle(scored_rows, top_k=args.top_k)
            adjudication_section = build_adjudication_section(
                scored_rows=scored_rows,
                candidate_metrics=adjudication_candidate,
                top_k=args.top_k,
                time_bucket=args.time_bucket,
                min_precision_gain=args.min_precision_gain,
                max_unsafe_rate_increase=args.max_unsafe_rate_increase,
                max_regret_increase=args.max_regret_increase,
            )
            report["adjudication"] = adjudication_section
            summary_lines.extend(
                [
                    "",
                    "## Adjudication",
                    f"- sample size: `{adjudication_section['sampleSize']}`",
                    f"- precision: `{adjudication_section['candidate']['precision']}`",
                    f"- recall: `{adjudication_section['candidate']['recall']}`",
                    f"- F1: `{adjudication_section['candidate']['f1']}`",
                    f"- abstain rate: `{adjudication_section['candidate']['abstain_rate']}`",
                    f"- false-positive rate: `{adjudication_section['candidate']['false_positive_rate']}`",
                    f"- false-negative rate: `{adjudication_section['candidate']['false_negative_rate']}`",
                    f"- ECE: `{adjudication_section['candidate']['calibration_error']}`",
                    f"- Brier score: `{adjudication_section['candidate']['brier_score']}`",
                ]
            )

    if task_mode in {"action_plan", "both"}:
        overall, slices, sample_size = evaluate_canonical_action_plan_rows(
            payloads,
            top_k=min(args.top_k, 3),
            slice_fields=["rule_family", "evidence_availability_bucket"],
        )
        if sample_size > 0:
            action_plan_section = {
                "sampleSize": sample_size,
                "topK": min(args.top_k, 3),
                "overall": asdict(overall),
                "slices": [asdict(item) for item in slices],
                "metricAvailability": {
                    "overallUnavailable": overall.unavailable_metrics,
                    "sliceUnavailable": {
                        f"{item.slice_field}:{item.slice_value}": item.metrics.unavailable_metrics
                        for item in slices
                    },
                },
            }
            report["actionPlan"] = action_plan_section
            summary_lines.extend(
                [
                    "",
                    "## Action Plan",
                    f"- sample size: `{sample_size}`",
                    f"- exact match rate: `{action_plan_section['overall']['exact_match_rate']}`",
                    f"- top-k usefulness rate: `{action_plan_section['overall']['top_k_usefulness_rate']}`",
                    f"- analyst acceptance rate: `{action_plan_section['overall']['analyst_acceptance_rate']}`",
                    f"- unsafe recommendation rate: `{action_plan_section['overall']['unsafe_recommendation_rate']}`",
                ]
            )

    if task_mode == "adjudication" and report["adjudication"] is None:
        raise SystemExit("No scored adjudication rows were found in the input file.")
    if task_mode == "action_plan" and report["actionPlan"] is None:
        raise SystemExit("No canonical action-plan rows were found in the input file.")

    bundle_name = build_bundle_name(report)
    run_manifest = {
        "reportType": "offline_evaluation",
        "inputFile": str(args.input_file.resolve()),
        "inputHash": input_hash,
        "inputFormat": input_format,
        "taskMode": task_mode,
        "topK": args.top_k,
        "timeBucket": args.time_bucket,
        "thresholds": {
            "adjudicationPositiveThreshold": 0.55,
        },
    }
    calibration_bins = []
    if adjudication_candidate is not None:
        calibration_bins = [asdict(item) for item in adjudication_candidate.calibration_bins]
    bundle_files = write_report_bundle(
        bundle_dir=args.bundle_root / bundle_name,
        report_payload=report,
        summary_markdown="\n".join(summary_lines),
        run_manifest=run_manifest,
        calibration_bins=calibration_bins,
    )
    report["bundleFiles"] = bundle_files

    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))

    if args.fail_on_no_gain and report["adjudication"] is not None:
        if not report["adjudication"]["complexityGate"]["passed"]:
            raise SystemExit(2)


def build_adjudication_section(
    *,
    scored_rows: list[EvaluationRecord],
    candidate_metrics,
    top_k: int,
    time_bucket: str,
    min_precision_gain: float,
    max_unsafe_rate_increase: float,
    max_regret_increase: float,
) -> dict[str, Any]:
    baseline_metric_objects: dict[str, Any] = {}
    baselines: dict[str, dict[str, Any]] = {}
    for strategy in ("source_trust", "random", "uniform"):
        baseline_rows = make_simple_baseline(scored_rows, strategy=strategy)
        baseline_metrics = compute_metric_bundle(baseline_rows, top_k=top_k)
        baseline_metric_objects[strategy] = baseline_metrics
        baselines[strategy] = metric_bundle_to_dict(baseline_metrics)

    if any(row.baseline_score is not None for row in scored_rows):
        provided_rows = make_simple_baseline(scored_rows, strategy="provided")
        provided_metrics = compute_metric_bundle(provided_rows, top_k=top_k)
        baseline_metric_objects["provided"] = provided_metrics
        baselines["provided"] = metric_bundle_to_dict(provided_metrics)

    complexity_gate = compare_against_baselines(
        candidate=candidate_metrics,
        baselines=baseline_metric_objects,
        min_precision_gain=min_precision_gain,
        max_unsafe_rate_increase=max_unsafe_rate_increase,
        max_regret_increase=max_regret_increase,
    )
    time_backtest = backtest_by_time(scored_rows, top_k=top_k, bucket=time_bucket)
    slice_rows = [
        AdjudicationEvaluationRow(
            label=row.label,
            score=row.score,
            abstained=row.is_abstention,
            rule_family=row.rule_family,
            source_system=row.source_system,
            ioc_type=row.ioc_type,
            event_time=row.event_time,
            source_trust=row.source_trust,
            evidence_used_count=row.evidence_used_count,
            evidence_missing_count=row.evidence_missing_count,
            contradictory_evidence_count=row.contradictory_evidence_count,
            analyst_overrode=row.analyst_overrode,
            rolled_back=row.rolled_back,
        )
        for row in scored_rows
    ]
    slices = slice_adjudication_metrics(
        slice_rows,
        threshold=0.55,
        slice_fields=[
            "rule_family",
            "ioc_type",
            "source_system",
            "time_bucket",
            "recency_bucket",
            "trust_bucket",
            "evidence_availability_bucket",
        ],
        top_k=top_k,
    )
    return {
        "sampleSize": len(scored_rows),
        "topK": top_k,
        "candidate": metric_bundle_to_dict(candidate_metrics),
        "baselines": baselines,
        "metricAvailability": {
            "candidateUnavailable": candidate_metrics.unavailable_metrics,
            "baselineUnavailable": {name: metrics.unavailable_metrics for name, metrics in baseline_metric_objects.items()},
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
            for item in time_backtest
        ],
        "slices": [asdict(item) for item in slices],
    }


def load_jsonl_payloads(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")

    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            payload = json.loads(line)
            if not isinstance(payload, dict):
                raise ValueError(f"Line {line_number} did not decode to a JSON object.")
            rows.append(payload)
    return rows


def detect_input_format(payloads: list[dict[str, Any]]) -> str:
    if not payloads:
        return "unknown"
    if any("target_payload" in row or "package_payload" in row for row in payloads):
        return "canonical_rows"
    return "scored_rows"


def resolve_task_mode(requested: str, input_format: str) -> str:
    if requested != "auto":
        return requested
    if input_format == "canonical_rows":
        return "action_plan"
    return "adjudication"


def build_scored_rows(payloads: list[dict[str, Any]]) -> list[EvaluationRecord]:
    rows: list[EvaluationRecord] = []
    for payload in payloads:
        if "score" not in payload or ("label" not in payload and "label" not in payload):
            continue
        rows.append(_to_record(payload))
    return rows


def build_bundle_name(report: dict[str, Any]) -> str:
    adjudication = report.get("adjudication")
    action_plan = report.get("actionPlan")
    if adjudication is not None:
        return "adjudication-harness"
    if action_plan is not None:
        return "action-plan-harness"
    return "evaluation-harness"


def _to_record(payload: dict[str, Any]) -> EvaluationRecord:
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
        rule_family=_read_optional_str(payload, "rule_family", "ruleFamily") or "unknown",
        source_system=_read_optional_str(payload, "source_system", "sourceSystem") or "unknown",
        ioc_type=_read_optional_str(payload, "ioc_type", "iocType") or "unknown",
        source_trust=_read_float(payload, "source_trust", "sourceTrust", default=0.5),
        evidence_used_count=_read_optional_int(payload, "evidence_used_count", "evidenceUsedCount") or 0,
        evidence_missing_count=_read_optional_int(payload, "evidence_missing_count", "evidenceMissingCount") or 0,
        contradictory_evidence_count=(
            _read_optional_int(payload, "contradictory_evidence_count", "contradictoryEvidenceCount") or 0
        ),
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
