from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from build_ioc_evaluation_dataset import (  # noqa: E402
    build_ioc_evaluation_rows,
    confidence_band_for_verdict,
    hash_ioc_value,
    mask_ioc_value,
    read_jsonl,
    write_jsonl,
)
from decision_service.contracts import ScoreCaseRequest  # noqa: E402
from decision_service.decision_support import build_grounded_decision  # noqa: E402
from decision_service.scorer import BaselineScorer, ScorerContext  # noqa: E402


SHADOW_DISCLAIMER = (
    "Shadow-mode IOC scores are analyst decision support only. "
    "This job is read-only and must not write production decisions or execute response actions."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Score IOC table rows in read-only shadow mode.")
    parser.add_argument("--input-file", type=Path, required=True)
    parser.add_argument("--output-file", type=Path, required=True)
    parser.add_argument("--review-stubs-file", type=Path, default=None)
    parser.add_argument("--review-csv-file", type=Path, default=None)
    parser.add_argument("--model-version", default="shadow-baseline")
    parser.add_argument("--dataset-version", default="shadow-fixture")
    parser.add_argument("--include-raw-values", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report, review_stubs = shadow_score_rows(
        read_jsonl(args.input_file),
        model_version=args.model_version,
        dataset_version=args.dataset_version,
        include_raw_values=args.include_raw_values,
    )
    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if args.review_stubs_file is not None:
        write_jsonl(args.review_stubs_file, review_stubs)
    if args.review_csv_file is not None:
        write_review_csv(args.review_csv_file, review_stubs)


def shadow_score_rows(
    input_rows: list[dict[str, Any]],
    *,
    model_version: str = "shadow-baseline",
    dataset_version: str = "shadow-fixture",
    include_raw_values: bool = False,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    normalized_rows = build_ioc_evaluation_rows(input_rows, include_raw_values=include_raw_values)
    scorer = BaselineScorer(context=ScorerContext(model_version=model_version, dataset_version=dataset_version))
    scored_rows: list[dict[str, Any]] = []
    review_stubs: list[dict[str, Any]] = []

    for row in normalized_rows:
        request = _request_from_row(row)
        score = scorer.score_case(request)
        grounded = build_grounded_decision(score, request)
        report_row = _report_row(row, grounded)
        scored_rows.append(report_row)
        review_stubs.append(_review_stub(row, grounded))

    report = {
        "reportType": "ioc_shadow_scoring",
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "mode": "decision_support_shadow",
        "disclaimer": SHADOW_DISCLAIMER,
        "readOnly": True,
        "sampleSize": len(scored_rows),
        "summary": _summary(scored_rows),
        "slices": _slices(scored_rows),
        "highlights": _highlights(scored_rows),
        "rows": scored_rows,
    }
    return report, review_stubs


def write_review_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "example_id",
        "ioc_type",
        "ioc_value_masked",
        "ioc_value_hash",
        "expected_verdict",
        "expected_confidence_band",
        "evidence_tier",
        "label_provenance",
        "review_status",
        "review_notes",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows([{key: row.get(key) for key in fieldnames} for row in rows])


def _request_from_row(row: dict[str, Any]) -> ScoreCaseRequest:
    confidence = float(row.get("table_confidence") or 0.0)
    source_trust = float(row.get("source_trust") or 0.5)
    linked_scan_count = int(row.get("linked_scan_count") or 0)
    sightings_count = int(row.get("sightings_count") or 0)
    target_exposure = float(row.get("target_exposure") or 0.0)
    ioc_type = str(row.get("ioc_type") or "artifact")
    ioc_value = str(row.get("ioc_value") or row.get("ioc_value_masked") or row.get("ioc_value_hash") or "masked-ioc")
    return ScoreCaseRequest(
        case_id=str(row["example_id"]),
        as_of_time=_parse_time(row.get("last_seen_utc") or row.get("first_seen_utc")),
        source_system="ioc_manager_ioc_table",
        ioc_type=ioc_type,
        ioc_value=ioc_value,
        host_context={"criticality": 0.5, "assetExposure": target_exposure, "linkedScanResultCount": linked_scan_count},
        rule_context={
            "severityScore": _severity_score(str(row.get("severity") or "none")),
            "scannerAgreement": confidence,
            "sourceTrust": source_trust,
            "sourceName": row.get("source_name") or "ioc_table",
            "sourceType": row.get("source_type") or "unknown",
            "tableConfidence": confidence,
            "linkedScanResultCount": linked_scan_count,
            "sightingsCount": sightings_count,
            "targetExposure": target_exposure,
            "evidenceTier": row.get("evidence_tier"),
            "labelProvenance": row.get("label_provenance"),
            "analystOutcome": row.get("analyst_outcome"),
            "historicalDecision": row.get("historical_decision"),
            "falsePositiveSignal": row.get("expected_verdict") == "false_positive",
            "staleIndicator": row.get("expected_verdict") == "stale_or_revoked",
        },
        detection_package={
            "rule_family": "generic",
            "object_metadata": {
                "object_id": str(row["example_id"]),
                "object_type": "ioc",
                "source_system": "ioc_manager_ioc_table",
            },
            "rule_metadata": {
                "rule_id": f"ioc-table-{row['example_id']}",
                "title": f"Shadow IOC score for {ioc_type}",
            },
            "raw_hit_payload": {
                "indicator": ioc_value,
                "indicator_type": ioc_type,
                "linked_scan_result_count": linked_scan_count,
            },
        },
    )


def _report_row(row: dict[str, Any], grounded) -> dict[str, Any]:
    confidence = float(grounded.confidence)
    fp_risk = float(grounded.false_positive_risk)
    payload = {
        "exampleId": row["example_id"],
        "iocType": row["ioc_type"],
        "iocValueMasked": row.get("ioc_value_masked") or mask_ioc_value(str(row.get("ioc_value", "")), str(row.get("ioc_type", "artifact"))),
        "iocValueHash": row.get("ioc_value_hash") or hash_ioc_value(str(row.get("ioc_value", ""))),
        "sourceName": row.get("source_name"),
        "sourceType": row.get("source_type"),
        "sourceTrust": row.get("source_trust"),
        "severity": row.get("severity"),
        "evidenceTier": row.get("evidence_tier"),
        "labelProvenance": row.get("label_provenance"),
        "verdict": grounded.verdict,
        "confidence": round(confidence, 6),
        "confidenceBand": _score_band(confidence),
        "falsePositiveRisk": round(fp_risk, 6),
        "falsePositiveRiskBand": _risk_band(fp_risk),
        "weakEvidence": grounded.safety_diagnostics.weak_evidence,
        "abstainReason": grounded.abstain_reason,
        "action": grounded.action,
        "reviewPriority": grounded.review_priority,
        "reviewStatus": "needs_analyst_review",
        "manualOnly": grounded.action_plan.never_auto_executes,
    }
    if "ioc_value" in row:
        payload["iocValue"] = row["ioc_value"]
    return payload


def _review_stub(row: dict[str, Any], grounded) -> dict[str, Any]:
    confidence = float(grounded.confidence)
    band = _score_band(confidence)
    return {
        "example_id": f"shadow-{row['example_id']}",
        "ioc_type": row["ioc_type"],
        "ioc_value_masked": row.get("ioc_value_masked") or mask_ioc_value(str(row.get("ioc_value", "")), str(row.get("ioc_type", "artifact"))),
        "ioc_value_hash": row.get("ioc_value_hash") or hash_ioc_value(str(row.get("ioc_value", ""))),
        "source_name": row.get("source_name") or "shadow",
        "source_type": row.get("source_type") or "unknown",
        "source_trust": row.get("source_trust") or 0.5,
        "severity": row.get("severity") or "none",
        "table_confidence": row.get("table_confidence") or 0.0,
        "first_seen_utc": row.get("first_seen_utc"),
        "last_seen_utc": row.get("last_seen_utc"),
        "age_bucket": row.get("age_bucket") or "unknown",
        "evidence_tier": row.get("evidence_tier") or "attribute_only",
        "scan_evidence_available": bool(row.get("scan_evidence_available")),
        "linked_scan_count": int(row.get("linked_scan_count") or 0),
        "sightings_count": int(row.get("sightings_count") or 0),
        "target_exposure": float(row.get("target_exposure") or 0.0),
        "historical_decision": row.get("historical_decision"),
        "analyst_outcome": None,
        "label_provenance": "shadow_review",
        "expected_verdict": grounded.verdict,
        "expected_confidence_band": band,
        "expected_confidence_min": _band_bounds(band)[0],
        "expected_confidence_max": _band_bounds(band)[1],
        "review_status": "needs_review",
        "reviewer": None,
        "review_notes": "Shadow suggestion; analyst must approve or correct before training.",
        "tags": sorted(set(["shadow_mode", str(row.get("evidence_tier") or "attribute_only")])),
    }


def _summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "verdictDistribution": dict(Counter(row["verdict"] for row in rows)),
        "confidenceBands": dict(Counter(row["confidenceBand"] for row in rows)),
        "falsePositiveRiskBands": dict(Counter(row["falsePositiveRiskBand"] for row in rows)),
        "weakEvidenceCount": sum(1 for row in rows if row["weakEvidence"]),
        "abstainCount": sum(1 for row in rows if row["verdict"] == "insufficient_evidence"),
        "manualOnlyCount": sum(1 for row in rows if row["manualOnly"]),
    }


def _slices(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fields = ["iocType", "sourceName", "sourceType", "severity", "evidenceTier", "labelProvenance"]
    output: list[dict[str, Any]] = []
    for field in fields:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            grouped[str(row.get(field) or "unknown")].append(row)
        for value, group in sorted(grouped.items()):
            output.append(
                {
                    "sliceField": field,
                    "sliceValue": value,
                    "sampleSize": len(group),
                    "verdictDistribution": dict(Counter(row["verdict"] for row in group)),
                    "weakEvidenceCount": sum(1 for row in group if row["weakEvidence"]),
                }
            )
    return output


def _highlights(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    def light(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "exampleId": row["exampleId"],
            "iocType": row["iocType"],
            "iocValueMasked": row["iocValueMasked"],
            "verdict": row["verdict"],
            "confidence": row["confidence"],
            "falsePositiveRisk": row["falsePositiveRisk"],
            "reason": row.get("abstainReason") or row["falsePositiveRiskBand"],
        }

    return {
        "highConfidenceWeakEvidence": [
            light(row) for row in rows if row["weakEvidence"] and row["confidence"] >= 0.60
        ],
        "lowTrustLikelyMalicious": [
            light(row) for row in rows if row["verdict"] in {"likely_malicious", "malicious"} and float(row.get("sourceTrust") or 0.0) < 0.35
        ],
        "staleActiveRows": [
            light(row) for row in rows if row["verdict"] not in {"stale_or_revoked", "false_positive"} and row.get("evidenceTier") == "low_trust_conflicting_stale"
        ],
        "likelyFalsePositives": [
            light(row) for row in rows if row["falsePositiveRisk"] >= 0.55 or row["verdict"] == "false_positive"
        ],
        "needsAnalystLabels": [
            light(row) for row in rows if row.get("labelProvenance") in {"weak_table_label", "shadow_review"} or row["reviewStatus"] == "needs_analyst_review"
        ],
    }


def _severity_score(value: str) -> float:
    return {"critical": 0.95, "high": 0.80, "medium": 0.55, "low": 0.25, "none": 0.0}.get(str(value).lower(), 0.0)


def _score_band(value: float) -> str:
    if value < 0.20:
        return "very_low"
    if value < 0.40:
        return "low"
    if value < 0.66:
        return "medium"
    if value < 0.85:
        return "high"
    return "very_high"


def _risk_band(value: float) -> str:
    if value < 0.25:
        return "low"
    if value < 0.50:
        return "medium"
    if value < 0.75:
        return "high"
    return "critical"


def _band_bounds(band: str) -> tuple[float, float]:
    return {
        "very_low": (0.0, 0.20),
        "low": (0.20, 0.40),
        "medium": (0.40, 0.66),
        "high": (0.66, 0.85),
        "very_high": (0.85, 1.0),
    }.get(band, (0.20, 0.40))


def _parse_time(value: object) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


if __name__ == "__main__":
    main()
