from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


MALWARE_TOKENS = {
    "agenttesla",
    "backdoor",
    "banker",
    "bot",
    "botnet",
    "cobalt",
    "darkgate",
    "dcrat",
    "formbook",
    "gafgyt",
    "keylogger",
    "loader",
    "masslogger",
    "miner",
    "mirai",
    "njrat",
    "ransom",
    "rat",
    "redline",
    "remcos",
    "skuld",
    "stealer",
    "trojan",
    "valleyrat",
    "worm",
    "xworm",
}
THREATFOX_MALICIOUS_THREAT_TYPES = {"botnet_cc", "malware_download", "payload_delivery"}
SUPPORTED_THREATFOX_IOC_TYPES = {"domain", "ip", "ip:port", "url", "sha256_hash", "md5_hash"}


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Extend a strict labeled snapshot with high-confidence labeled external feed rows."
    )
    parser.add_argument("--base-dataset-dir", type=Path, default=ai_root / "datasets" / "processed" / "strict-labeled-v5")
    parser.add_argument("--output-root", type=Path, default=ai_root / "datasets" / "processed")
    parser.add_argument("--dataset-version", default="strict-labeled-v6")
    parser.add_argument(
        "--threatfox-file",
        type=Path,
        default=latest_matching(ai_root / "datasets" / "raw" / "threatfox", "recent-iocs-api-*.jsonl"),
    )
    parser.add_argument(
        "--malwarebazaar-file",
        type=Path,
        default=latest_matching(ai_root / "datasets" / "raw" / "malwarebazaar", "recent-api-*.jsonl"),
    )
    parser.add_argument("--min-threatfox-confidence", type=int, default=75)
    parser.add_argument("--max-threatfox-rows", type=int, default=2500)
    parser.add_argument("--max-malwarebazaar-rows", type=int, default=500)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output_root / args.dataset_version
    output_dir.mkdir(parents=True, exist_ok=True)

    observables = read_csv(args.base_dataset_dir / "observables.csv")
    detections = read_csv(args.base_dataset_dir / "detections.csv")
    outcomes = read_csv(args.base_dataset_dir / "outcomes.csv")
    source_trust = read_csv(args.base_dataset_dir / "source_trust.csv")
    existing_keys = {
        (row["ioc_type"].strip().lower(), row["ioc_value"].strip().lower(), row["source_system"].strip().lower())
        for row in observables
    }

    audit: dict[str, Any] = {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "datasetVersion": args.dataset_version,
        "baseDataset": str(args.base_dataset_dir.resolve()),
        "policy": {
            "threatfoxMinConfidence": args.min_threatfox_confidence,
            "threatfoxAcceptedThreatTypes": sorted(THREATFOX_MALICIOUS_THREAT_TYPES),
            "maxThreatfoxRows": args.max_threatfox_rows,
            "maxMalwarebazaarRows": args.max_malwarebazaar_rows,
            "externalRowsRequireProviderLabel": True,
        },
        "sources": {},
    }

    threatfox_rows, threatfox_audit = build_threatfox_rows(
        path=args.threatfox_file,
        existing_keys=existing_keys,
        min_confidence=args.min_threatfox_confidence,
        max_rows=args.max_threatfox_rows,
    )
    append_rows(observables, detections, outcomes, threatfox_rows)
    audit["sources"]["threatfox"] = threatfox_audit

    malwarebazaar_rows, malwarebazaar_audit = build_malwarebazaar_rows(
        path=args.malwarebazaar_file,
        existing_keys=existing_keys,
        max_rows=args.max_malwarebazaar_rows,
    )
    append_rows(observables, detections, outcomes, malwarebazaar_rows)
    audit["sources"]["malwarebazaar"] = malwarebazaar_audit

    write_csv(
        output_dir / "observables.csv",
        ["ioc_type", "ioc_value", "event_time", "source_system", "host_context_json", "rule_context_json"],
        observables,
    )
    write_csv(output_dir / "detections.csv", ["ioc_type", "ioc_value", "event_time", "scanner_family", "severity_score"], detections)
    write_csv(output_dir / "outcomes.csv", ["ioc_type", "ioc_value", "event_time", "verdict"], outcomes)
    write_csv(output_dir / "source_trust.csv", ["source_system", "trust_score"], source_trust)

    manifest = {
        "datasetVersion": args.dataset_version,
        "createdAtUtc": audit["generatedAtUtc"],
        "files": {
            "observables": "observables.csv",
            "detections": "detections.csv",
            "outcomes": "outcomes.csv",
            "source_trust": "source_trust.csv",
        },
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    audit["rowCounts"] = {
        "observables": len(observables),
        "detections": len(detections),
        "outcomes": len(outcomes),
    }
    audit["labelDistribution"] = dict(sorted(Counter(row["verdict"] for row in outcomes).items()))
    audit["sourceSystemDistribution"] = dict(sorted(Counter(row["source_system"] for row in observables).items()))
    audit["artifactPaths"] = {
        "observables": str((output_dir / "observables.csv").resolve()),
        "detections": str((output_dir / "detections.csv").resolve()),
        "outcomes": str((output_dir / "outcomes.csv").resolve()),
        "source_trust": str((output_dir / "source_trust.csv").resolve()),
        "manifest": str((output_dir / "manifest.json").resolve()),
        "audit": str((output_dir / "training_eligibility_audit.json").resolve()),
    }
    (output_dir / "training_eligibility_audit.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")
    print(json.dumps(audit, indent=2))


def build_threatfox_rows(
    *,
    path: Path | None,
    existing_keys: set[tuple[str, str, str]],
    min_confidence: int,
    max_rows: int,
) -> tuple[list[dict[str, dict[str, str]]], dict[str, Any]]:
    if path is None or not path.exists():
        return [], {"selected": 0, "reason": "missing_file"}

    selected: list[dict[str, dict[str, str]]] = []
    counts: Counter[str] = Counter()
    group_counts: Counter[str] = Counter()
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            counts["read"] += 1
            normalized = normalize_threatfox_row(row)
            if normalized is None:
                counts["unsupported"] += 1
                continue
            ioc_type, ioc_value, event_time = normalized
            confidence = coerce_int(row.get("confidence_level"), 0)
            threat_type = str(row.get("threat_type") or "").strip().lower()
            malware = str(row.get("malware_printable") or row.get("malware") or "").strip()
            dedupe_key = (ioc_type, ioc_value.lower(), "threatfox")
            if dedupe_key in existing_keys:
                counts["duplicate"] += 1
                continue
            if confidence < min_confidence or threat_type not in THREATFOX_MALICIOUS_THREAT_TYPES or not malware:
                counts["enrichment_only"] += 1
                continue
            group_key = f"{threat_type}:{malware.lower()}"
            if group_counts[group_key] >= 75:
                counts["group_capped"] += 1
                continue
            verdict = "malicious" if confidence >= 90 else "likely_malicious"
            severity = "0.9200" if verdict == "malicious" else "0.8200"
            confidence_signal = round(min(max(confidence / 100.0, 0.0), 1.0), 4)
            indicator_strength = 0.84 if ioc_type in {"sha256", "md5", "url"} else 0.76
            enrichment_strength = 0.78 if row.get("tags") or row.get("malware_alias") else 0.68
            activity_signal = 0.72 if row.get("last_seen") else 0.58
            rule_context = {
                "rule_id": str(row.get("id") or ioc_value),
                "rule_name": malware,
                "scanner_family": "threatfox",
                "source": "threatfox",
                "source_trust": 0.72,
                "source_trust_class": "trusted_supervised",
                "label_basis": "provider_confidence_external",
                "confidence_level": confidence,
                "threat_type": threat_type,
                "reference": row.get("reference"),
                "providerConfidence": confidence_signal,
                "indicatorStrength": indicator_strength,
                "enrichmentStrength": enrichment_strength,
                "activitySignal": activity_signal,
                "benignContext": 0.02,
                "heuristicNoise": 0.04,
                "sourceThreatSignal": 0.90 if verdict == "malicious" else 0.78,
                "externalSourceSignal": 0.88 if verdict == "malicious" else 0.80,
                "sightingsCount": 4 if verdict == "malicious" else 2,
                "sightingsCorroboration": 0.72 if verdict == "malicious" else 0.56,
            }
            host_context = {
                "criticality": "medium",
                "environment": "external_feed",
                "host_id": ioc_value,
                "host_type": ioc_type,
            }
            selected.append(
                make_snapshot_row(
                    ioc_type=ioc_type,
                    ioc_value=ioc_value,
                    event_time=event_time,
                    source_system="threatfox",
                    scanner_family="threatfox",
                    severity_score=severity,
                    verdict=verdict,
                    host_context=host_context,
                    rule_context=rule_context,
                )
            )
            existing_keys.add(dedupe_key)
            group_counts[group_key] += 1
            counts["selected"] += 1
            counts[f"selected::{verdict}"] += 1
            if len(selected) >= max_rows:
                counts["max_rows_reached"] += 1
                break
    return selected, dict(sorted(counts.items()))


def build_malwarebazaar_rows(
    *,
    path: Path | None,
    existing_keys: set[tuple[str, str, str]],
    max_rows: int,
) -> tuple[list[dict[str, dict[str, str]]], dict[str, Any]]:
    if path is None or not path.exists():
        return [], {"selected": 0, "reason": "missing_file"}

    selected: list[dict[str, dict[str, str]]] = []
    counts: Counter[str] = Counter()
    group_counts: Counter[str] = Counter()
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            counts["read"] += 1
            sha256 = str(row.get("sha256_hash") or "").strip().lower()
            signature = str(row.get("signature") or "").strip()
            event_time = str(row.get("first_seen") or row.get("first_seen_utc") or "").strip()
            if not sha256 or not signature or not event_time:
                counts["unsupported"] += 1
                continue
            dedupe_key = ("sha256", sha256, "malwarebazaar")
            if dedupe_key in existing_keys:
                counts["duplicate"] += 1
                continue
            group_key = signature.lower()
            if group_counts[group_key] >= 50:
                counts["group_capped"] += 1
                continue
            signature_normalized = signature.lower().replace(" ", "").replace("-", "")
            verdict = "malicious" if any(token in signature_normalized for token in MALWARE_TOKENS) else "likely_malicious"
            severity = "0.9200" if verdict == "malicious" else "0.8200"
            provider_confidence = 0.90 if verdict == "malicious" else 0.82
            rule_context = {
                "rule_id": sha256,
                "rule_name": signature,
                "scanner_family": "malwarebazaar",
                "source": "malwarebazaar",
                "source_trust": 0.72,
                "source_trust_class": "trusted_supervised",
                "label_basis": "provider_explicit_external",
                "providerConfidence": provider_confidence,
                "indicatorStrength": 0.94,
                "enrichmentStrength": 0.78,
                "activitySignal": 0.70,
                "benignContext": 0.01,
                "heuristicNoise": 0.03,
                "sourceThreatSignal": 0.92 if verdict == "malicious" else 0.80,
                "externalSourceSignal": 0.86 if verdict == "malicious" else 0.78,
                "sightingsCount": 5 if verdict == "malicious" else 3,
                "sightingsCorroboration": 0.74 if verdict == "malicious" else 0.58,
            }
            host_context = {
                "criticality": "high",
                "environment": "external_feed",
                "host_id": sha256,
                "host_type": "file",
            }
            selected.append(
                make_snapshot_row(
                    ioc_type="sha256",
                    ioc_value=sha256,
                    event_time=event_time,
                    source_system="malwarebazaar",
                    scanner_family="malwarebazaar",
                    severity_score=severity,
                    verdict=verdict,
                    host_context=host_context,
                    rule_context=rule_context,
                )
            )
            existing_keys.add(dedupe_key)
            group_counts[group_key] += 1
            counts["selected"] += 1
            counts[f"selected::{verdict}"] += 1
            if len(selected) >= max_rows:
                counts["max_rows_reached"] += 1
                break
    return selected, dict(sorted(counts.items()))


def normalize_threatfox_row(row: dict[str, Any]) -> tuple[str, str, str] | None:
    ioc_type = str(row.get("ioc_type") or "").strip().lower()
    ioc_value = str(row.get("ioc") or "").strip()
    event_time = str(row.get("first_seen") or "").strip()
    if not ioc_type or not ioc_value or not event_time or ioc_type not in SUPPORTED_THREATFOX_IOC_TYPES:
        return None
    if ioc_type == "ip:port":
        ioc_type = "ip"
    elif ioc_type == "sha256_hash":
        ioc_type = "sha256"
    elif ioc_type == "md5_hash":
        ioc_type = "md5"
    return ioc_type, ioc_value, event_time


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


def coerce_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


if __name__ == "__main__":
    main()
