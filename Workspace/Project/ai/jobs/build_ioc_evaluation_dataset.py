from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


EVALUATION_SCHEMA_VERSION = "ioc-evaluation-row-v1"
VERDICTS = {
    "benign",
    "likely_benign",
    "suspicious",
    "likely_malicious",
    "malicious",
    "false_positive",
    "stale_or_revoked",
    "insufficient_evidence",
}
CONFIDENCE_BANDS = {
    "very_low": (0.0, 0.20),
    "low": (0.20, 0.40),
    "medium": (0.40, 0.66),
    "high": (0.66, 0.85),
    "very_high": (0.85, 1.0),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a masked IOC evaluation JSONL dataset from fixtures or IOC exports.")
    parser.add_argument("--input-file", type=Path, required=True)
    parser.add_argument("--output-file", type=Path, required=True)
    parser.add_argument("--report-file", type=Path, default=None)
    parser.add_argument("--sample-size", type=int, default=None)
    parser.add_argument(
        "--sample-by",
        default="ioc_type,severity,source_name,age_bucket,evidence_tier,label_provenance",
        help="Comma-separated fields used for deterministic round-robin sampling.",
    )
    parser.add_argument(
        "--include-raw-values",
        action="store_true",
        help="Include raw IOC values in output. Off by default for safe review reports.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = build_ioc_evaluation_rows(
        read_jsonl(args.input_file),
        include_raw_values=args.include_raw_values,
    )
    selected = deterministic_sample(
        rows,
        sample_size=args.sample_size,
        sample_by=[item.strip() for item in args.sample_by.split(",") if item.strip()],
    )
    write_jsonl(args.output_file, selected)
    if args.report_file is not None:
        args.report_file.parent.mkdir(parents=True, exist_ok=True)
        args.report_file.write_text(json.dumps(build_report(selected), indent=2), encoding="utf-8")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            payload = json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}:{line_number}: invalid JSONL row: {exc}") from exc
        if not isinstance(payload, dict):
            raise ValueError(f"{path}:{line_number}: row must be a JSON object.")
        rows.append(payload)
    return rows


def build_ioc_evaluation_rows(
    rows: Iterable[dict[str, Any]],
    *,
    include_raw_values: bool = False,
    reference_time: datetime | None = None,
) -> list[dict[str, Any]]:
    resolved_reference = reference_time or datetime.now(timezone.utc)
    output = [
        normalize_row(row, include_raw_value=include_raw_values, reference_time=resolved_reference)
        for row in rows
    ]
    return sorted(output, key=lambda row: str(row["example_id"]))


def normalize_row(
    row: dict[str, Any],
    *,
    include_raw_value: bool,
    reference_time: datetime,
) -> dict[str, Any]:
    raw_value = first_text(row, "ioc_value", "iocValue", "indicator", "indicatorValue", default=row.get("ioc_value_masked", ""))
    ioc_type = normalize_ioc_type(first_text(row, "ioc_type", "iocType", "indicator_type", "indicatorType", default="artifact"))
    expected_verdict = normalize_expected_verdict(first_text(row, "expected_verdict", "expectedVerdict", "label", "verdict", default="insufficient_evidence"))
    confidence_band = first_text(row, "expected_confidence_band", "expectedConfidenceBand", default=confidence_band_for_verdict(expected_verdict))
    confidence_min, confidence_max = CONFIDENCE_BANDS.get(confidence_band, CONFIDENCE_BANDS["low"])
    first_seen = first_text_or_none(row, "first_seen_utc", "firstSeenUtc", "firstSeen", "createdAtUtc")
    last_seen = first_text_or_none(row, "last_seen_utc", "lastSeenUtc", "lastSeen", "updatedAtUtc")
    linked_scan_count = int_or_default(row, "linked_scan_count", "linkedScanCount", "linkedScanResultCount", default=0)
    evidence_tier = first_text(row, "evidence_tier", "evidenceTier", default=infer_evidence_tier(row, linked_scan_count))
    label_provenance = first_text(row, "label_provenance", "labelProvenance", default=infer_label_provenance(row))

    normalized: dict[str, Any] = {
        "example_id": first_text(row, "example_id", "exampleId", "ioc_id", "iocId", default=stable_id(ioc_type, raw_value)),
        "ioc_type": ioc_type,
        "ioc_value_masked": str(row.get("ioc_value_masked") or mask_ioc_value(raw_value, ioc_type)),
        "ioc_value_hash": str(row.get("ioc_value_hash") or hash_ioc_value(raw_value)),
        "source_name": first_text(row, "source_name", "sourceName", "source", "sourceSystem", default="unknown"),
        "source_type": normalize_source_type(first_text(row, "source_type", "sourceType", default="unknown")),
        "source_trust": clip01(float_or_default(row, "source_trust", "sourceTrust", default=0.5)),
        "severity": normalize_severity(first_text(row, "severity", "severityLabel", default="none")),
        "table_confidence": clip01(float_or_default(row, "table_confidence", "tableConfidence", "confidence", default=0.0)),
        "first_seen_utc": normalize_datetime_text(first_seen),
        "last_seen_utc": normalize_datetime_text(last_seen),
        "age_bucket": first_text(row, "age_bucket", "ageBucket", default=age_bucket(last_seen or first_seen, reference_time)),
        "evidence_tier": normalize_evidence_tier(evidence_tier),
        "scan_evidence_available": bool(row.get("scan_evidence_available", row.get("scanEvidenceAvailable", linked_scan_count > 0))),
        "linked_scan_count": max(0, linked_scan_count),
        "sightings_count": max(0, int_or_default(row, "sightings_count", "sightingsCount", default=0)),
        "target_exposure": clip01(float_or_default(row, "target_exposure", "targetExposure", default=0.0)),
        "historical_decision": nullable_verdict(first_text_or_none(row, "historical_decision", "historicalDecision")),
        "analyst_outcome": normalize_analyst_outcome(first_text_or_none(row, "analyst_outcome", "analystOutcome")),
        "label_provenance": normalize_label_provenance(label_provenance),
        "expected_verdict": expected_verdict,
        "expected_confidence_band": confidence_band if confidence_band in CONFIDENCE_BANDS else "low",
        "expected_confidence_min": clip01(float(row.get("expected_confidence_min", row.get("expectedConfidenceMin", confidence_min)))),
        "expected_confidence_max": clip01(float(row.get("expected_confidence_max", row.get("expectedConfidenceMax", confidence_max)))),
        "review_status": first_text(row, "review_status", "reviewStatus", default="needs_review"),
        "reviewer": first_text_or_none(row, "reviewer"),
        "review_notes": first_text_or_none(row, "review_notes", "reviewNotes"),
        "tags": sorted(set(str(item).strip() for item in row.get("tags", []) if str(item).strip())) if isinstance(row.get("tags"), list) else [],
    }
    if include_raw_value:
        normalized["ioc_value"] = raw_value
    return normalized


def deterministic_sample(
    rows: list[dict[str, Any]],
    *,
    sample_size: int | None,
    sample_by: list[str],
) -> list[dict[str, Any]]:
    if sample_size is None or sample_size <= 0 or len(rows) <= sample_size:
        return list(rows)
    grouped: dict[tuple[str, ...], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = tuple(str(row.get(field, "unknown")) for field in sample_by)
        grouped[key].append(row)
    for group in grouped.values():
        group.sort(key=lambda item: str(item["example_id"]))
    selected: list[dict[str, Any]] = []
    keys = sorted(grouped)
    while len(selected) < sample_size and keys:
        next_keys: list[tuple[str, ...]] = []
        for key in keys:
            group = grouped[key]
            if group and len(selected) < sample_size:
                selected.append(group.pop(0))
            if group:
                next_keys.append(key)
        keys = next_keys
    return sorted(selected, key=lambda row: str(row["example_id"]))


def build_report(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "schemaVersion": EVALUATION_SCHEMA_VERSION,
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "sampleSize": len(rows),
        "maskedValues": True,
        "distributions": {
            "iocType": count_by(rows, "ioc_type"),
            "severity": count_by(rows, "severity"),
            "sourceName": count_by(rows, "source_name"),
            "ageBucket": count_by(rows, "age_bucket"),
            "evidenceTier": count_by(rows, "evidence_tier"),
            "labelProvenance": count_by(rows, "label_provenance"),
            "expectedVerdict": count_by(rows, "expected_verdict"),
        },
        "reviewGuidance": "Shadow and dataset review output is decision support only; analysts must approve labels before training or promotion.",
    }


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(json.dumps(row, sort_keys=True) for row in rows) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = sorted({key for row in rows for key in row})
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def mask_ioc_value(value: str, ioc_type: str) -> str:
    text = str(value or "").strip()
    if not text:
        return "<empty>"
    if ioc_type in {"hash", "hash_md5", "hash_sha1", "hash_sha256"}:
        return text[:12] + "***" if len(text) > 12 else "***"
    if ioc_type == "ip":
        parts = text.split(".")
        return ".".join(parts[:3] + ["***"]) if len(parts) == 4 else "***"
    if ioc_type == "url":
        if "://" in text:
            scheme, rest = text.split("://", 1)
            host = rest.split("/", 1)[0]
            return f"{scheme}://{mask_domain(host)}/***"
        return mask_domain(text) + "/***"
    if ioc_type == "domain":
        return mask_domain(text)
    if len(text) <= 8:
        return text[0] + "***"
    return text[:12] + "***"


def mask_domain(value: str) -> str:
    labels = str(value).split(".")
    if len(labels) <= 2:
        return labels[0][:3] + "***." + labels[-1] if labels else "***"
    return labels[0][:3] + "***." + ".".join(labels[-2:])


def hash_ioc_value(value: str) -> str:
    return hashlib.sha256(str(value or "").strip().lower().encode("utf-8")).hexdigest()


def stable_id(ioc_type: str, value: str) -> str:
    return f"ioc-{ioc_type}-{hash_ioc_value(value)[:12]}"


def count_by(rows: list[dict[str, Any]], field: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        key = str(row.get(field, "unknown"))
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))


def first_text(row: dict[str, Any], *keys: str, default: Any = "") -> str:
    value = first_text_or_none(row, *keys)
    return str(default if value is None else value).strip()


def first_text_or_none(row: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = row.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def float_or_default(row: dict[str, Any], *keys: str, default: float) -> float:
    for key in keys:
        if key not in row:
            continue
        try:
            return float(row[key])
        except (TypeError, ValueError):
            continue
    return default


def int_or_default(row: dict[str, Any], *keys: str, default: int) -> int:
    for key in keys:
        if key not in row:
            continue
        try:
            return int(row[key])
        except (TypeError, ValueError):
            continue
    return default


def normalize_ioc_type(value: str) -> str:
    normalized = str(value or "").strip().lower().replace("-", "_")
    if normalized in {"sha256", "sha_256"}:
        return "hash_sha256"
    if normalized in {"sha1", "sha_1"}:
        return "hash_sha1"
    if normalized == "md5":
        return "hash_md5"
    if normalized in {"domain", "dns"}:
        return "domain"
    if normalized in {"uri", "url"}:
        return "url"
    if normalized in {"ipv4", "ipv6", "ip_address"}:
        return "ip"
    if normalized in {"process", "command_line"}:
        return "process"
    if normalized in {"file", "hash", "hash_md5", "hash_sha1", "hash_sha256", "artifact", "ip"}:
        return normalized
    return "artifact"


def normalize_severity(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"critical", "high", "medium", "low"}:
        return normalized
    if normalized in {"info", "informational", "none"}:
        return "none"
    return "none"


def normalize_source_type(value: str) -> str:
    normalized = str(value or "").strip().lower().replace("-", "_")
    allowed = {"trusted_feed", "low_trust_feed", "manual_entry", "api_import", "file_upload", "scanner", "internal_allowlist", "analyst_review", "unknown"}
    return normalized if normalized in allowed else "unknown"


def normalize_evidence_tier(value: str) -> str:
    normalized = str(value or "").strip().lower().replace("-", "_")
    allowed = {"attribute_only", "scan_correlated", "analyst_outcome", "low_trust_conflicting_stale"}
    return normalized if normalized in allowed else "attribute_only"


def normalize_label_provenance(value: str) -> str:
    normalized = str(value or "").strip().lower().replace("-", "_")
    allowed = {"analyst_outcome", "trusted_feed", "internal_allowlist", "weak_table_label", "synthetic_fixture", "shadow_review"}
    return normalized if normalized in allowed else "weak_table_label"


def normalize_expected_verdict(value: str) -> str:
    normalized = str(value or "").strip().lower().replace("-", "_")
    return normalized if normalized in VERDICTS else "insufficient_evidence"


def nullable_verdict(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = normalize_expected_verdict(value)
    return normalized if normalized in VERDICTS else None


def normalize_analyst_outcome(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip().lower().replace("-", "_")
    allowed = {"true_positive", "false_positive", "benign", "stale", "revoked", "needs_review"}
    return normalized if normalized in allowed else "needs_review"


def confidence_band_for_verdict(verdict: str) -> str:
    if verdict in {"malicious", "benign", "false_positive"}:
        return "high"
    if verdict in {"likely_malicious", "likely_benign", "stale_or_revoked"}:
        return "medium"
    if verdict == "suspicious":
        return "medium"
    return "low"


def infer_evidence_tier(row: dict[str, Any], linked_scan_count: int) -> str:
    if first_text_or_none(row, "analyst_outcome", "analystOutcome"):
        return "analyst_outcome"
    if linked_scan_count > 0 or bool(row.get("scanEvidenceAvailable", row.get("scan_evidence_available", False))):
        return "scan_correlated"
    if normalize_severity(first_text(row, "severity", default="none")) == "none" or float_or_default(row, "source_trust", "sourceTrust", default=0.5) < 0.25:
        return "low_trust_conflicting_stale"
    return "attribute_only"


def infer_label_provenance(row: dict[str, Any]) -> str:
    if first_text_or_none(row, "analyst_outcome", "analystOutcome"):
        return "analyst_outcome"
    source_type = normalize_source_type(first_text(row, "source_type", "sourceType", default="unknown"))
    if source_type == "internal_allowlist":
        return "internal_allowlist"
    if source_type == "trusted_feed":
        return "trusted_feed"
    return "weak_table_label"


def age_bucket(value: str | None, reference_time: datetime) -> str:
    parsed = parse_datetime(value)
    if parsed is None:
        return "unknown"
    hours = max(0.0, (reference_time - parsed).total_seconds() / 3600.0)
    if hours <= 24:
        return "0_24h"
    if hours <= 168:
        return "1_7d"
    if hours <= 720:
        return "8_30d"
    if hours <= 2160:
        return "31_90d"
    return "90d_plus"


def normalize_datetime_text(value: str | None) -> str | None:
    parsed = parse_datetime(value)
    if parsed is None:
        return None
    return parsed.isoformat().replace("+00:00", "Z")


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def clip01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


if __name__ == "__main__":
    main()
