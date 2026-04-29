from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Build one unified supervised snapshot for local Python model training.")
    parser.add_argument("--base-dataset-dir", type=Path, default=ai_root / "datasets" / "processed" / "strict-labeled-v6")
    parser.add_argument("--output-root", type=Path, default=ai_root / "datasets" / "processed")
    parser.add_argument("--dataset-version", default="unified-supervised-v1")
    parser.add_argument(
        "--benign-domain-file",
        type=Path,
        default=latest_matching(ai_root / "datasets" / "raw" / "majestic-million", "top-domains-*.jsonl"),
    )
    parser.add_argument("--max-benign-domains", type=int, default=2400)
    parser.add_argument("--db-scan-results-file", type=Path, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output_root / args.dataset_version
    output_dir.mkdir(parents=True, exist_ok=True)
    created_at = datetime.now(timezone.utc).isoformat()

    observables = read_csv(args.base_dataset_dir / "observables.csv")
    detections = read_csv(args.base_dataset_dir / "detections.csv")
    outcomes = read_csv(args.base_dataset_dir / "outcomes.csv")
    source_trust = read_csv(args.base_dataset_dir / "source_trust.csv")
    detection_metadata = {
        row_key(row): {
            "scanner_family": row.get("scanner_family", "").strip().lower(),
            "severity_score": coerce_float(row.get("severity_score"), default=0.5),
        }
        for row in detections
    }
    enrichment_report = enrich_inherited_contexts(observables, detection_metadata)
    ensure_source_trust(source_trust, "majestic", "0.78")
    ensure_source_trust(source_trust, "db_scan_results", "0.62")

    existing_keys = {
        (row["ioc_type"].strip().lower(), row["ioc_value"].strip().lower(), row["source_system"].strip().lower())
        for row in observables
    }
    source_reports: dict[str, Any] = {}
    source_reports["inherited_context_enrichment"] = enrichment_report

    benign_rows, benign_report = build_benign_domain_rows(
        path=args.benign_domain_file,
        existing_keys=existing_keys,
        max_rows=args.max_benign_domains,
        created_at=created_at,
    )
    append_rows(observables, detections, outcomes, benign_rows)
    source_reports["majestic-million"] = benign_report

    db_rows: list[dict[str, dict[str, str]]] = []
    db_report: dict[str, Any] = {"selected": 0, "reason": "not_requested"}
    if args.db_scan_results_file is not None:
        db_rows, db_report = build_db_scan_result_rows(args.db_scan_results_file, existing_keys=existing_keys)
        append_rows(observables, detections, outcomes, db_rows)
    source_reports["db_scan_results"] = db_report

    sort_key = lambda row: (row["event_time"], row["ioc_type"], row["ioc_value"], row.get("source_system", ""))
    observables = sorted(observables, key=sort_key)
    detections = sorted(detections, key=lambda row: (row["event_time"], row["ioc_type"], row["ioc_value"], row.get("scanner_family", "")))
    outcomes = sorted(outcomes, key=lambda row: (row["event_time"], row["ioc_type"], row["ioc_value"], row.get("verdict", "")))

    write_csv(
        output_dir / "observables.csv",
        ["ioc_type", "ioc_value", "event_time", "source_system", "host_context_json", "rule_context_json"],
        observables,
    )
    write_csv(output_dir / "detections.csv", ["ioc_type", "ioc_value", "event_time", "scanner_family", "severity_score"], detections)
    write_csv(output_dir / "outcomes.csv", ["ioc_type", "ioc_value", "event_time", "verdict"], outcomes)
    write_csv(output_dir / "source_trust.csv", ["source_system", "trust_score"], sorted(source_trust, key=lambda row: row["source_system"]))

    manifest = {
        "datasetVersion": args.dataset_version,
        "createdAtUtc": created_at,
        "files": {
            "observables": "observables.csv",
            "detections": "detections.csv",
            "outcomes": "outcomes.csv",
            "source_trust": "source_trust.csv",
        },
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    audit = {
        "generatedAtUtc": created_at,
        "datasetVersion": args.dataset_version,
        "baseDataset": str(args.base_dataset_dir.resolve()),
        "policy": {
            "purpose": "Unified supervised local Python training snapshot.",
            "benignDomainLabel": "likely_benign",
            "benignDomainSource": "Majestic Million popularity ranking",
            "dbRowsIncludedOnlyWhenExplicitDisposition": True,
        },
        "sources": source_reports,
        "rowCounts": {
            "observables": len(observables),
            "detections": len(detections),
            "outcomes": len(outcomes),
        },
        "labelDistribution": dict(sorted(Counter(row["verdict"] for row in outcomes).items())),
        "sourceSystemDistribution": dict(sorted(Counter(row["source_system"] for row in observables).items())),
        "artifactPaths": {
            "observables": str((output_dir / "observables.csv").resolve()),
            "detections": str((output_dir / "detections.csv").resolve()),
            "outcomes": str((output_dir / "outcomes.csv").resolve()),
            "source_trust": str((output_dir / "source_trust.csv").resolve()),
            "manifest": str((output_dir / "manifest.json").resolve()),
            "audit": str((output_dir / "training_eligibility_audit.json").resolve()),
        },
    }
    (output_dir / "training_eligibility_audit.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")
    print(json.dumps(audit, indent=2))


def build_benign_domain_rows(
    *,
    path: Path | None,
    existing_keys: set[tuple[str, str, str]],
    max_rows: int,
    created_at: str,
) -> tuple[list[dict[str, dict[str, str]]], dict[str, Any]]:
    if path is None or not path.exists():
        return [], {"selected": 0, "reason": "missing_file"}

    selected: list[dict[str, dict[str, str]]] = []
    counts: Counter[str] = Counter()
    with path.open("r", encoding="utf-8-sig") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            counts["read"] += 1
            domain = str(row.get("domain") or "").strip().lower()
            rank = row.get("rank")
            if not domain or "." not in domain:
                counts["unsupported"] += 1
                continue
            dedupe_key = ("domain", domain, "majestic")
            if dedupe_key in existing_keys:
                counts["duplicate"] += 1
                continue
            rule_context = {
                "rule_id": f"majestic:{rank or domain}",
                "rule_name": "popular-domain-baseline",
                "scanner_family": "majestic",
                "source": "majestic-million",
                "source_trust": 0.78,
                "source_trust_class": "trusted_benign_baseline",
                "label_basis": "public_popularity_baseline",
                "rank": rank,
                "providerConfidence": 0.70,
                "indicatorStrength": 0.30,
                "enrichmentStrength": 0.32,
                "activitySignal": 0.18,
                "benignContext": 0.94,
                "heuristicNoise": 0.05,
                "sourceThreatSignal": 0.0,
                "externalSourceSignal": 0.10,
                "sightingsCount": 1,
                "sightingsCorroboration": 0.20,
            }
            host_context = {
                "criticality": "low",
                "environment": "external_baseline",
                "host_id": domain,
                "host_type": "domain",
            }
            selected.append(
                make_snapshot_row(
                    ioc_type="domain",
                    ioc_value=domain,
                    event_time=created_at,
                    source_system="majestic",
                    scanner_family="majestic",
                    severity_score="0.1200",
                    verdict="likely_benign",
                    host_context=host_context,
                    rule_context=rule_context,
                )
            )
            existing_keys.add(dedupe_key)
            counts["selected"] += 1
            if len(selected) >= max_rows:
                counts["max_rows_reached"] += 1
                break
    return selected, dict(sorted(counts.items()))


def enrich_inherited_contexts(observables: list[dict[str, str]], detection_metadata: dict[tuple[str, str, str], dict[str, Any]]) -> dict[str, Any]:
    counts: Counter[str] = Counter()
    for row in observables:
        source_system = row["source_system"].strip().lower()
        metadata = detection_metadata.get(row_key(row), {})
        severity_score = float(metadata.get("severity_score", 0.5))
        rule_context = parse_json_object(row.get("rule_context_json"))
        source_name = str(rule_context.get("source") or "").strip().lower()
        scanner_family = str(metadata.get("scanner_family") or rule_context.get("scanner_family") or "").strip().lower()
        signals = inherited_signal_defaults(
            source_system=source_system,
            source_name=source_name,
            scanner_family=scanner_family,
            ioc_type=row["ioc_type"].strip().lower(),
            severity_score=severity_score,
        )
        if not signals:
            continue
        changed = False
        for key, value in signals.items():
            if key not in rule_context:
                rule_context[key] = value
                changed = True
        if changed:
            row["rule_context_json"] = json.dumps(rule_context, sort_keys=True)
            counts["rows_enriched"] += 1
            counts[f"source::{source_system}"] += 1
    return dict(sorted(counts.items()))


def inherited_signal_defaults(
    *,
    source_system: str,
    source_name: str,
    scanner_family: str,
    ioc_type: str,
    severity_score: float,
) -> dict[str, Any]:
    positive = severity_score >= 0.64
    negative = severity_score <= 0.30
    unresolved = not positive and not negative

    if source_system in {"urlhaus", "threatfox", "malwarebazaar"}:
        if source_system == "malwarebazaar":
            indicator_strength = 0.94 if ioc_type in {"sha256", "sha1", "md5"} else 0.82
            source_signal = 0.86
        elif source_system == "urlhaus":
            indicator_strength = 0.88 if ioc_type == "url" else 0.78
            source_signal = 0.84
        else:
            indicator_strength = 0.84 if ioc_type in {"sha256", "md5", "url"} else 0.76
            source_signal = 0.84
        return {
            "sourceName": source_system,
            "providerConfidence": 0.86,
            "indicatorStrength": indicator_strength,
            "enrichmentStrength": 0.72,
            "activitySignal": 0.62,
            "benignContext": 0.02,
            "heuristicNoise": 0.04,
            "sourceThreatSignal": 0.84,
            "externalSourceSignal": source_signal,
            "sightingsCount": 3,
            "sightingsCorroboration": 0.58,
        }

    if scanner_family == "sigma" and source_system == "siem":
        if positive:
            return {
                "sourceName": "sigmahq",
                "providerConfidence": 0.86,
                "indicatorStrength": 0.66,
                "enrichmentStrength": 0.74,
                "activitySignal": 0.50,
                "benignContext": 0.04,
                "heuristicNoise": 0.10,
                "sourceThreatSignal": 0.72,
                "externalSourceSignal": 0.76,
                "sightingsCount": 2,
                "sightingsCorroboration": 0.45,
            }
        if negative:
            return {
                "sourceName": "internal-reviewed-telemetry",
                "providerConfidence": 0.62,
                "indicatorStrength": 0.42,
                "enrichmentStrength": 0.38,
                "activitySignal": 0.34,
                "benignContext": 0.78,
                "heuristicNoise": 0.16,
                "sourceThreatSignal": 0.08,
                "externalSourceSignal": 0.30,
                "sightingsCount": 1,
                "sightingsCorroboration": 0.12,
            }

    if scanner_family in {"snort", "suricata"}:
        if positive:
            return {
                "sourceName": "et-open-suricata" if scanner_family == "suricata" else "snort-community",
                "providerConfidence": 0.88,
                "indicatorStrength": 0.78,
                "enrichmentStrength": 0.70,
                "activitySignal": 0.62,
                "benignContext": 0.03,
                "heuristicNoise": 0.08,
                "sourceThreatSignal": 0.78,
                "externalSourceSignal": 0.82,
                "sightingsCount": 2,
                "sightingsCorroboration": 0.45,
            }
        if negative:
            return {
                "sourceName": "internal-reviewed-telemetry",
                "providerConfidence": 0.58,
                "indicatorStrength": 0.42,
                "enrichmentStrength": 0.34,
                "activitySignal": 0.30,
                "benignContext": 0.76,
                "heuristicNoise": 0.18,
                "sourceThreatSignal": 0.08,
                "externalSourceSignal": 0.28,
                "sightingsCount": 1,
                "sightingsCorroboration": 0.12,
            }

    if scanner_family == "yara":
        if positive:
            return {
                "sourceName": "yaraify",
                "providerConfidence": 0.88,
                "indicatorStrength": 0.94 if ioc_type in {"sha256", "md5", "sha1"} else 0.78,
                "enrichmentStrength": 0.72,
                "activitySignal": 0.64,
                "benignContext": 0.04,
                "heuristicNoise": 0.08,
                "sourceThreatSignal": 0.84,
                "externalSourceSignal": 0.78,
                "sightingsCount": 3,
                "sightingsCorroboration": 0.54,
            }
        if negative:
            return {
                "sourceName": "internal-reviewed-telemetry",
                "providerConfidence": 0.56,
                "indicatorStrength": 0.38,
                "enrichmentStrength": 0.30,
                "activitySignal": 0.26,
                "benignContext": 0.82,
                "heuristicNoise": 0.14,
                "sourceThreatSignal": 0.06,
                "externalSourceSignal": 0.24,
                "sightingsCount": 1,
                "sightingsCorroboration": 0.10,
            }

    if unresolved:
        return {
            "providerConfidence": 0.34,
            "indicatorStrength": 0.24,
            "enrichmentStrength": 0.18,
            "activitySignal": 0.18,
            "benignContext": 0.30,
            "heuristicNoise": 0.30,
            "sourceThreatSignal": 0.06,
            "externalSourceSignal": 0.12,
        }

    return {}


def build_db_scan_result_rows(
    path: Path,
    *,
    existing_keys: set[tuple[str, str, str]],
) -> tuple[list[dict[str, dict[str, str]]], dict[str, Any]]:
    if not path.exists():
        return [], {"selected": 0, "reason": "missing_file"}
    selected: list[dict[str, dict[str, str]]] = []
    counts: Counter[str] = Counter()
    with path.open("r", encoding="utf-8-sig") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            counts["read"] += 1
            disposition = str(row.get("disposition") or "").strip().lower()
            scanner_family = str(row.get("scanner_family") or "unknown").strip().lower()
            ioc_type = str(row.get("ioc_type") or "artifact").strip().lower()
            ioc_value = str(row.get("ioc_value") or row.get("fingerprint") or "").strip()
            event_time = str(row.get("observed_at_utc") or row.get("last_observed_at_utc") or "").strip()
            if not ioc_value or not event_time:
                counts["unsupported"] += 1
                continue
            if disposition == "informational":
                verdict = "insufficient_evidence"
                severity = "0.3000"
                source_signals = {
                    "providerConfidence": 0.42,
                    "indicatorStrength": 0.28,
                    "enrichmentStrength": 0.20,
                    "activitySignal": 0.24,
                    "benignContext": 0.36,
                    "heuristicNoise": 0.24,
                    "sourceThreatSignal": 0.08,
                    "externalSourceSignal": 0.14,
                    "sightingsCount": 1,
                    "sightingsCorroboration": 0.10,
                }
            elif disposition == "detection":
                verdict = "likely_malicious"
                severity = "0.8200"
                confidence = row.get("confidence")
                try:
                    provider_confidence = max(min(float(confidence) / 100.0, 1.0), 0.0) if confidence is not None else 0.66
                except (TypeError, ValueError):
                    provider_confidence = 0.66
                source_signals = {
                    "providerConfidence": max(provider_confidence, 0.78),
                    "indicatorStrength": 0.82,
                    "enrichmentStrength": 0.64,
                    "activitySignal": 0.68,
                    "benignContext": 0.04,
                    "heuristicNoise": 0.06,
                    "sourceThreatSignal": 0.84,
                    "externalSourceSignal": 0.72,
                    "sightingsCount": 3,
                    "sightingsCorroboration": 0.56,
                }
            else:
                counts["unlabeled"] += 1
                continue
            dedupe_key = (ioc_type, ioc_value.lower(), "db_scan_results")
            if dedupe_key in existing_keys:
                counts["duplicate"] += 1
                continue
            rule_context = {
                "rule_id": str(row.get("scan_result_id") or ioc_value),
                "rule_name": str(row.get("rule_name") or disposition),
                "scanner_family": scanner_family,
                "source": "app-db",
                "sourceName": "internal-reviewed-telemetry" if disposition == "detection" else "app-db",
                "source_trust": 0.62,
                "source_trust_class": "application_disposition",
                "label_basis": "scan_result_disposition",
                "disposition": disposition,
                **source_signals,
            }
            host_context = {
                "criticality": None,
                "environment": "app-db",
                "host_id": str(row.get("target_server_id") or row.get("target_display") or ""),
                "host_type": "scan_target",
            }
            selected.append(
                make_snapshot_row(
                    ioc_type=ioc_type,
                    ioc_value=ioc_value,
                    event_time=event_time,
                    source_system="db_scan_results",
                    scanner_family=scanner_family,
                    severity_score=severity,
                    verdict=verdict,
                    host_context=host_context,
                    rule_context=rule_context,
                )
            )
            existing_keys.add(dedupe_key)
            counts["selected"] += 1
            counts[f"selected::{verdict}"] += 1
    return selected, dict(sorted(counts.items()))


def make_snapshot_row(
    *,
    ioc_type: str,
    ioc_value: str,
    event_time: str,
    source_system: str,
    scanner_family: str,
    severity_score: str,
    verdict: str,
    host_context: dict[str, Any],
    rule_context: dict[str, Any],
) -> dict[str, dict[str, str]]:
    return {
        "observable": {
            "ioc_type": ioc_type,
            "ioc_value": ioc_value,
            "event_time": event_time,
            "source_system": source_system,
            "host_context_json": json.dumps(host_context, sort_keys=True),
            "rule_context_json": json.dumps(rule_context, sort_keys=True),
        },
        "detection": {
            "ioc_type": ioc_type,
            "ioc_value": ioc_value,
            "event_time": event_time,
            "scanner_family": scanner_family,
            "severity_score": severity_score,
        },
        "outcome": {
            "ioc_type": ioc_type,
            "ioc_value": ioc_value,
            "event_time": event_time,
            "verdict": verdict,
        },
    }


def append_rows(
    observables: list[dict[str, str]],
    detections: list[dict[str, str]],
    outcomes: list[dict[str, str]],
    rows: list[dict[str, dict[str, str]]],
) -> None:
    for row in rows:
        observables.append(row["observable"])
        detections.append(row["detection"])
        outcomes.append(row["outcome"])


def ensure_source_trust(rows: list[dict[str, str]], source_system: str, trust_score: str) -> None:
    normalized = source_system.strip().lower()
    for row in rows:
        if row.get("source_system", "").strip().lower() == normalized:
            row["trust_score"] = trust_score
            return
    rows.append({"source_system": normalized, "trust_score": trust_score})


def row_key(row: dict[str, str]) -> tuple[str, str, str]:
    return (
        row["ioc_type"].strip().lower(),
        row["ioc_value"].strip().lower(),
        row["event_time"].strip(),
    )


def parse_json_object(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def coerce_float(value: Any, *, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def latest_matching(root: Path, pattern: str) -> Path | None:
    matches = sorted(root.glob(pattern), key=lambda item: item.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


if __name__ == "__main__":
    main()
