from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
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


TRUSTED_CANONICAL_SOURCES = {
    "internal-reviewed-telemetry",
    "internal-clean-baselines",
    "internal-allowlists",
    "sigma_fixtures",
    "sigma_alert_fixtures",
    "snort_fixtures",
    "snort_alert_fixtures",
    "snort_flow_pcap_fixtures",
    "snort_environment_context_fixtures",
    "yara_fixtures",
}
URLHAUS_ELIGIBLE_THREATS = {"malware_download", "payload_delivery"}
POSITIVE_VERDICT = "likely_malicious"
MIN_TRAINING_ELIGIBLE_ROWS = 1800
URLHAUS_PREFERRED_CAP = 350
URLHAUS_GROUP_CAP = 20
URLHAUS_TOPUP_GROUP_CAP = 40
URLHAUS_MIN_QUALITY_SCORE = 7
MALWAREBAZAAR_PREFERRED_CAP = 900
MALWAREBAZAAR_GROUP_CAP = 24
MALWAREBAZAAR_TOPUP_GROUP_CAP = 60
MALWAREBAZAAR_MIN_QUALITY_SCORE = 5
SOURCE_TRUST_DEFAULTS = {
    "malwarebazaar": 0.72,
    "urlhaus": 0.72,
    "siem": 0.90,
    "ids": 0.55,
    "edr": 0.55,
    "snort": 0.71,
    "suricata": 0.71,
    "yara": 0.72,
}
VERDICT_TO_SEVERITY = {
    "malicious": 0.92,
    "likely_malicious": 0.82,
    "suspicious": 0.68,
    "insufficient_evidence": 0.42,
    "false_positive": 0.24,
    "likely_benign": 0.20,
    "benign": 0.18,
    "stale_or_revoked": 0.22,
}


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description=(
            "Build a strict labeled snapshot using only trusted local labeled rows and explicitly "
            "malicious provider-labeled external rows."
        )
    )
    parser.add_argument(
        "--canonical-rows",
        type=Path,
        default=ai_root / "datasets" / "processed" / "reliable-mix-v3" / "canonical_rows.jsonl",
    )
    parser.add_argument(
        "--source-trust",
        type=Path,
        default=ai_root / "datasets" / "processed" / "reliable-mix-v3" / "source_trust.csv",
    )
    parser.add_argument(
        "--urlhaus-file",
        type=Path,
        default=_latest_matching(ai_root / "datasets" / "raw" / "urlhaus", "recent-iocs-2000-*.jsonl"),
    )
    parser.add_argument(
        "--malwarebazaar-file",
        type=Path,
        default=_latest_matching(ai_root / "datasets" / "raw" / "malwarebazaar", "metadata-3000-*.jsonl"),
    )
    parser.add_argument(
        "--threatfox-file",
        type=Path,
        default=_latest_matching(ai_root / "datasets" / "raw" / "threatfox", "recent-iocs-2000-*.jsonl"),
    )
    parser.add_argument("--dataset-version", default="strict-labeled-v4")
    parser.add_argument("--output-root", type=Path, default=ai_root / "datasets" / "processed")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = build_strict_labeled_snapshot(
        canonical_rows_path=args.canonical_rows,
        source_trust_path=args.source_trust,
        urlhaus_file=args.urlhaus_file,
        malwarebazaar_file=args.malwarebazaar_file,
        threatfox_file=args.threatfox_file,
        dataset_version=args.dataset_version,
        output_root=args.output_root,
    )
    print(json.dumps(result, indent=2))


def build_strict_labeled_snapshot(
    *,
    canonical_rows_path: Path,
    source_trust_path: Path,
    urlhaus_file: Path | None,
    malwarebazaar_file: Path | None,
    threatfox_file: Path | None,
    dataset_version: str,
    output_root: Path,
) -> dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()
    version_dir = output_root / dataset_version
    version_dir.mkdir(parents=True, exist_ok=True)

    observables: list[dict[str, Any]] = []
    detections: list[dict[str, Any]] = []
    outcomes: list[dict[str, Any]] = []
    audit_summary: dict[str, Any] = {
        "generatedAtUtc": created_at,
        "datasetVersion": dataset_version,
        "policy": {
            "trustedCanonicalSources": sorted(TRUSTED_CANONICAL_SOURCES),
            "urlhausEligibleEndpoint": "urls/recent",
            "urlhausEligibleThreats": sorted(URLHAUS_ELIGIBLE_THREATS),
            "threatfoxPolicy": "enrichment_only",
            "malwarebazaarPolicy": "provider_explicit_malicious_only",
            "minimumTrainingEligibleRows": MIN_TRAINING_ELIGIBLE_ROWS,
            "urlhausPreferredCap": URLHAUS_PREFERRED_CAP,
            "malwarebazaarPreferredCap": MALWAREBAZAAR_PREFERRED_CAP,
            "urlhausMinimumQualityScore": URLHAUS_MIN_QUALITY_SCORE,
            "malwarebazaarMinimumQualityScore": MALWAREBAZAAR_MIN_QUALITY_SCORE,
        },
        "sources": {},
    }

    canonical_counts = _ingest_trusted_canonical_rows(
        canonical_rows_path=canonical_rows_path,
        observables=observables,
        detections=detections,
        outcomes=outcomes,
    )
    audit_summary["sources"]["trusted_canonical"] = canonical_counts

    urlhaus_candidates: list[dict[str, Any]] = []
    if urlhaus_file and urlhaus_file.exists():
        urlhaus_counts = _load_urlhaus_candidates(path=urlhaus_file, candidates=urlhaus_candidates)
    else:
        urlhaus_counts = {"training_eligible": 0, "enrichment_only": 0, "excluded": 0, "reason": "missing_file"}

    malwarebazaar_candidates: list[dict[str, Any]] = []
    if malwarebazaar_file and malwarebazaar_file.exists():
        malwarebazaar_counts = _load_malwarebazaar_candidates(path=malwarebazaar_file, candidates=malwarebazaar_candidates)
    else:
        malwarebazaar_counts = {"training_eligible": 0, "enrichment_only": 0, "excluded": 0, "reason": "missing_file"}

    threatfox_counts = {"training_eligible": 0, "enrichment_only": 0, "excluded": 0}
    if threatfox_file and threatfox_file.exists():
        total = 0
        with threatfox_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    total += 1
        threatfox_counts["enrichment_only"] = total
        threatfox_counts["reason"] = "community confidence feed kept out of supervised labels under strict policy"
    else:
        threatfox_counts["reason"] = "missing_file"
    audit_summary["sources"]["threatfox"] = threatfox_counts

    selected_candidates, selection_report = _select_external_training_candidates(
        trusted_count=len(outcomes),
        urlhaus_candidates=urlhaus_candidates,
        malwarebazaar_candidates=malwarebazaar_candidates,
    )
    for candidate in selected_candidates:
        observables.append(candidate["observable"])
        detections.append(candidate["detection"])
        outcomes.append(candidate["outcome"])
    audit_summary["sources"]["urlhaus"] = {
        **urlhaus_counts,
        **selection_report["urlhaus"],
    }
    audit_summary["sources"]["malwarebazaar"] = {
        **malwarebazaar_counts,
        **selection_report["malwarebazaar"],
    }

    observables_path = version_dir / "observables.csv"
    detections_path = version_dir / "detections.csv"
    outcomes_path = version_dir / "outcomes.csv"
    source_trust_path_out = version_dir / "source_trust.csv"
    audit_path = version_dir / "training_eligibility_audit.json"
    manifest_path = version_dir / "manifest.json"

    _write_csv(
        observables_path,
        ["ioc_type", "ioc_value", "event_time", "source_system", "host_context_json", "rule_context_json"],
        observables,
    )
    _write_csv(
        detections_path,
        ["ioc_type", "ioc_value", "event_time", "scanner_family", "severity_score"],
        detections,
    )
    _write_csv(
        outcomes_path,
        ["ioc_type", "ioc_value", "event_time", "verdict"],
        outcomes,
    )
    _write_source_trust_csv(source_trust_path, source_trust_path_out)

    manifest = {
        "datasetVersion": dataset_version,
        "createdAtUtc": created_at,
        "files": {
            "observables": "observables.csv",
            "detections": "detections.csv",
            "outcomes": "outcomes.csv",
            "source_trust": "source_trust.csv",
        },
    }
    audit_summary["rowCounts"] = {
        "observables": len(observables),
        "detections": len(detections),
        "outcomes": len(outcomes),
    }
    audit_summary["labelDistribution"] = dict(sorted(Counter(row["verdict"] for row in outcomes).items()))
    audit_summary["sourceSystemDistribution"] = dict(sorted(Counter(row["source_system"] for row in observables).items()))
    audit_summary["artifactPaths"] = {
        "observables": str(observables_path.resolve()),
        "detections": str(detections_path.resolve()),
        "outcomes": str(outcomes_path.resolve()),
        "source_trust": str(source_trust_path_out.resolve()),
        "manifest": str(manifest_path.resolve()),
        "audit": str(audit_path.resolve()),
    }

    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    audit_path.write_text(json.dumps(audit_summary, indent=2), encoding="utf-8")
    return audit_summary


def _ingest_trusted_canonical_rows(
    *,
    canonical_rows_path: Path,
    observables: list[dict[str, Any]],
    detections: list[dict[str, Any]],
    outcomes: list[dict[str, Any]],
) -> dict[str, Any]:
    counts = Counter()
    with canonical_rows_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            source_name = (((row.get("source_file") or {}).get("source_name")) or "").strip()
            if source_name not in TRUSTED_CANONICAL_SOURCES:
                counts["excluded"] += 1
                continue
            package = row.get("package_payload") or {}
            target = row.get("target_payload") or {}
            decision = target.get("decision") or target.get("adjudication") or {}
            verdict = str(decision.get("verdict") or target.get("scenario_label") or "").strip().lower()
            event_time = str(row.get("event_time_utc") or "").strip()
            ioc_type, ioc_value = _canonical_ioc_identity(package)
            if not (verdict and event_time and ioc_type and ioc_value):
                counts["excluded"] += 1
                continue
            source_system = str(((package.get("object_metadata") or {}).get("source_system")) or "unknown").strip().lower()
            rule_family = str(package.get("rule_family") or "unknown").strip().lower()
            rule_metadata = package.get("rule_metadata") or {}
            rule_context = {
                "rule_id": rule_metadata.get("rule_id") or rule_metadata.get("id") or rule_metadata.get("sid"),
                "rule_name": rule_metadata.get("title") or rule_metadata.get("rule_name") or rule_metadata.get("msg"),
                "scanner_family": rule_family,
                "source": rule_metadata.get("source") or source_name,
                "label_basis": _label_basis_for_canonical_source(source_name),
            }
            host_context = {
                "criticality": ((package.get("asset_context") or {}).get("criticality")),
                "environment": ((package.get("asset_context") or {}).get("environment")),
                "host_id": ((package.get("object_metadata") or {}).get("object_id")),
                "host_type": ((package.get("object_metadata") or {}).get("object_type")),
            }
            severity_score = _derive_severity_score(verdict=verdict, package=package)
            observables.append(
                {
                    "ioc_type": ioc_type,
                    "ioc_value": ioc_value,
                    "event_time": event_time,
                    "source_system": source_system,
                    "host_context_json": json.dumps(host_context, sort_keys=True),
                    "rule_context_json": json.dumps(rule_context, sort_keys=True),
                }
            )
            detections.append(
                {
                    "ioc_type": ioc_type,
                    "ioc_value": ioc_value,
                    "event_time": event_time,
                    "scanner_family": rule_family,
                    "severity_score": f"{severity_score:.4f}",
                }
            )
            outcomes.append(
                {
                    "ioc_type": ioc_type,
                    "ioc_value": ioc_value,
                    "event_time": event_time,
                    "verdict": verdict,
                }
            )
            counts["training_eligible"] += 1
            counts[f"source::{source_name}"] += 1
    return dict(sorted(counts.items()))


def _load_urlhaus_candidates(
    *,
    path: Path,
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    counts = Counter()
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            endpoint = str(row.get("endpoint") or "").strip()
            indicator_type = str(row.get("indicator_type") or "").strip().lower()
            indicator = str(row.get("indicator") or "").strip()
            threat = str(row.get("threat") or "").strip().lower()
            event_time = str(row.get("date_added") or "").strip()
            if endpoint != "urls/recent":
                counts["enrichment_only"] += 1
                continue
            if indicator_type != "url":
                counts["enrichment_only"] += 1
                continue
            if not indicator or not event_time or threat not in URLHAUS_ELIGIBLE_THREATS:
                counts["excluded"] += 1
                continue
            tags = [str(tag).strip().lower() for tag in (row.get("tags") or []) if str(tag).strip() and str(tag).strip().lower() != "null"]
            reporter = str(row.get("reporter") or "").strip().lower()
            quality_score = 0
            quality_score += 4 if str(row.get("url_status") or "").strip().lower() == "online" else 0
            quality_score += 2 if threat == "payload_delivery" else 1
            quality_score += min(len(tags), 3)
            quality_score += 1 if indicator.startswith("https://") else 0
            quality_score += 1 if reporter and reporter != "anonymous" else 0
            if quality_score < URLHAUS_MIN_QUALITY_SCORE:
                counts["enrichment_only"] += 1
                continue
            host_context = {
                "criticality": "medium",
                "environment": "external_feed",
                "host_id": str(row.get("host") or indicator),
                "host_type": "url",
            }
            rule_context = {
                "rule_id": str(row.get("record_id") or indicator),
                "rule_name": threat,
                "scanner_family": "urlhaus",
                "source": "urlhaus",
                "source_trust": 0.72,
                "label_basis": "provider_explicit_external",
            }
            counts["training_eligible"] += 1
            candidates.append(
                {
                    "source": "urlhaus",
                    "candidate_id": indicator,
                    "group_key": tags[0] if tags else threat,
                    "quality_score": quality_score,
                    "observable": {
                        "ioc_type": "url",
                        "ioc_value": indicator,
                        "event_time": event_time,
                        "source_system": "urlhaus",
                        "host_context_json": json.dumps(host_context, sort_keys=True),
                        "rule_context_json": json.dumps(rule_context, sort_keys=True),
                    },
                    "detection": {
                        "ioc_type": "url",
                        "ioc_value": indicator,
                        "event_time": event_time,
                        "scanner_family": "urlhaus",
                        "severity_score": "0.8600",
                    },
                    "outcome": {
                        "ioc_type": "url",
                        "ioc_value": indicator,
                        "event_time": event_time,
                        "verdict": POSITIVE_VERDICT,
                    },
                }
            )
    return dict(sorted(counts.items()))


def _load_malwarebazaar_candidates(
    *,
    path: Path,
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    counts = Counter()
    seen: set[str] = set()
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            sha256 = str(row.get("sha256_hash") or "").strip().lower()
            signature = str(row.get("signature") or "").strip()
            event_time = (
                str(row.get("first_seen") or "").strip()
                or str(row.get("first_seen_utc") or "").strip()
            )
            if not sha256 or not signature or not event_time:
                counts["excluded"] += 1
                continue
            if sha256 in seen:
                counts["excluded"] += 1
                continue
            seen.add(sha256)
            file_name = str(row.get("file_name") or "").strip().lower()
            query_name = str(row.get("_query_name") or "").strip().lower()
            quality_score = 0
            quality_score += 3 if signature else 0
            quality_score += 2 if query_name == "recent_detections" else 1
            quality_score += 1 if file_name.endswith((".exe", ".dll", ".bin", ".elf")) else 0
            quality_score += 1 if any(token in signature.lower() for token in ("rat", "loader", "stealer", "bot", "trojan")) else 0
            if quality_score < MALWAREBAZAAR_MIN_QUALITY_SCORE:
                counts["enrichment_only"] += 1
                continue
            host_context = {
                "criticality": "high",
                "environment": "external_feed",
                "host_id": sha256,
                "host_type": "file",
            }
            rule_context = {
                "rule_id": sha256,
                "rule_name": signature,
                "scanner_family": "malwarebazaar",
                "source": "malwarebazaar",
                "source_trust": 0.72,
                "label_basis": "provider_explicit_external",
            }
            counts["training_eligible"] += 1
            candidates.append(
                {
                    "source": "malwarebazaar",
                    "candidate_id": sha256,
                    "group_key": signature.lower(),
                    "quality_score": quality_score,
                    "observable": {
                        "ioc_type": "sha256",
                        "ioc_value": sha256,
                        "event_time": event_time,
                        "source_system": "malwarebazaar",
                        "host_context_json": json.dumps(host_context, sort_keys=True),
                        "rule_context_json": json.dumps(rule_context, sort_keys=True),
                    },
                    "detection": {
                        "ioc_type": "sha256",
                        "ioc_value": sha256,
                        "event_time": event_time,
                        "scanner_family": "malwarebazaar",
                        "severity_score": "0.9000",
                    },
                    "outcome": {
                        "ioc_type": "sha256",
                        "ioc_value": sha256,
                        "event_time": event_time,
                        "verdict": POSITIVE_VERDICT,
                    },
                }
            )
    return dict(sorted(counts.items()))


def _select_external_training_candidates(
    *,
    trusted_count: int,
    urlhaus_candidates: list[dict[str, Any]],
    malwarebazaar_candidates: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    selected_urlhaus, remaining_urlhaus = _select_with_group_caps(
        candidates=urlhaus_candidates,
        preferred_cap=URLHAUS_PREFERRED_CAP,
        group_cap=URLHAUS_GROUP_CAP,
    )
    selected_malwarebazaar, remaining_malwarebazaar = _select_with_group_caps(
        candidates=malwarebazaar_candidates,
        preferred_cap=MALWAREBAZAAR_PREFERRED_CAP,
        group_cap=MALWAREBAZAAR_GROUP_CAP,
    )

    selected = selected_urlhaus + selected_malwarebazaar
    total_selected = trusted_count + len(selected)
    topup_needed = max(0, MIN_TRAINING_ELIGIBLE_ROWS - total_selected)

    urlhaus_topup: list[dict[str, Any]] = []
    malwarebazaar_topup: list[dict[str, Any]] = []
    if topup_needed > 0:
        extra_urlhaus, remaining_urlhaus = _select_with_group_caps(
            candidates=remaining_urlhaus,
            preferred_cap=topup_needed,
            group_cap=URLHAUS_TOPUP_GROUP_CAP,
        )
        urlhaus_topup.extend(extra_urlhaus)
        topup_needed = max(0, topup_needed - len(extra_urlhaus))
    if topup_needed > 0:
        extra_malwarebazaar, remaining_malwarebazaar = _select_with_group_caps(
            candidates=remaining_malwarebazaar,
            preferred_cap=topup_needed,
            group_cap=MALWAREBAZAAR_TOPUP_GROUP_CAP,
        )
        malwarebazaar_topup.extend(extra_malwarebazaar)
        topup_needed = max(0, topup_needed - len(extra_malwarebazaar))

    ungated_urlhaus: list[dict[str, Any]] = []
    ungated_malwarebazaar: list[dict[str, Any]] = []
    if topup_needed > 0:
        ungated_urlhaus, remaining_urlhaus = _select_without_caps(
            candidates=remaining_urlhaus,
            preferred_cap=topup_needed,
        )
        topup_needed = max(0, topup_needed - len(ungated_urlhaus))
    if topup_needed > 0:
        ungated_malwarebazaar, remaining_malwarebazaar = _select_without_caps(
            candidates=remaining_malwarebazaar,
            preferred_cap=topup_needed,
        )

    selected.extend(urlhaus_topup)
    selected.extend(malwarebazaar_topup)
    selected.extend(ungated_urlhaus)
    selected.extend(ungated_malwarebazaar)
    report = {
        "urlhaus": {
            "preferred_selected": len(selected_urlhaus),
            "topup_selected": len(urlhaus_topup),
            "ungated_selected": len(ungated_urlhaus),
            "selected_total": len(selected_urlhaus) + len(urlhaus_topup) + len(ungated_urlhaus),
            "enrichment_only_after_split": max(
                0,
                len(urlhaus_candidates) - len(selected_urlhaus) - len(urlhaus_topup) - len(ungated_urlhaus),
            ),
        },
        "malwarebazaar": {
            "preferred_selected": len(selected_malwarebazaar),
            "topup_selected": len(malwarebazaar_topup),
            "ungated_selected": len(ungated_malwarebazaar),
            "selected_total": len(selected_malwarebazaar) + len(malwarebazaar_topup) + len(ungated_malwarebazaar),
            "enrichment_only_after_split": max(
                0,
                len(malwarebazaar_candidates)
                - len(selected_malwarebazaar)
                - len(malwarebazaar_topup)
                - len(ungated_malwarebazaar),
            ),
        },
    }
    return selected, report


def _select_with_group_caps(
    *,
    candidates: list[dict[str, Any]],
    preferred_cap: int,
    group_cap: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    ranked = sorted(
        candidates,
        key=lambda item: (
            -int(item.get("quality_score", 0)),
            str(item.get("candidate_id") or ""),
        ),
    )
    selected: list[dict[str, Any]] = []
    remaining: list[dict[str, Any]] = []
    group_counts: Counter[str] = Counter()
    for candidate in ranked:
        if len(selected) >= preferred_cap:
            remaining.append(candidate)
            continue
        group_key = str(candidate.get("group_key") or "ungrouped").strip().lower()
        if group_counts[group_key] >= group_cap:
            remaining.append(candidate)
            continue
        selected.append(candidate)
        group_counts[group_key] += 1
    return selected, remaining


def _select_without_caps(
    *,
    candidates: list[dict[str, Any]],
    preferred_cap: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    ranked = sorted(
        candidates,
        key=lambda item: (
            -int(item.get("quality_score", 0)),
            str(item.get("candidate_id") or ""),
        ),
    )
    selected = ranked[:preferred_cap]
    remaining = ranked[preferred_cap:]
    return selected, remaining


def _label_basis_for_canonical_source(source_name: str) -> str:
    normalized = str(source_name or "").strip().lower()
    if normalized in {"internal-reviewed-telemetry", "internal-clean-baselines", "internal-allowlists"}:
        return "authoritative_internal"
    if normalized.endswith("_fixtures") or normalized.endswith("-fixtures") or "fixtures" in normalized:
        return "fixture_curated"
    return "trusted_curated"


def _canonical_ioc_identity(package: dict[str, Any]) -> tuple[str | None, str | None]:
    object_metadata = package.get("object_metadata") or {}
    object_type = str(object_metadata.get("object_type") or "").strip().lower()
    object_id = str(object_metadata.get("object_id") or "").strip()
    raw_hit = package.get("raw_hit_payload") or {}

    if object_type == "file":
        file_hash = str(raw_hit.get("file_hash") or object_id).strip()
        if file_hash:
            return "sha256", file_hash
    if object_type == "network_flow":
        network = raw_hit.get("network") or {}
        five_tuple = network.get("five_tuple") or {}
        dst_ip = str(five_tuple.get("dst_ip") or raw_hit.get("dst_ip") or object_id).strip()
        if dst_ip:
            return "ip", dst_ip
    if object_type in {"log_event", "process_event"}:
        return object_type, object_id or str(raw_hit.get("event_id") or "").strip() or None
    return (object_type or None), (object_id or None)


def _derive_severity_score(*, verdict: str, package: dict[str, Any]) -> float:
    rule_metadata = package.get("rule_metadata") or {}
    level = str(
        rule_metadata.get("level")
        or rule_metadata.get("severity")
        or ""
    ).strip().lower()
    if level == "critical":
        return 0.92
    if level == "high":
        return 0.80
    if level == "medium":
        return 0.60
    if level == "low":
        return 0.25
    return VERDICT_TO_SEVERITY.get(verdict, 0.50)


def _write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({name: row.get(name, "") for name in fieldnames})


def _write_source_trust_csv(existing_path: Path, output_path: Path) -> None:
    merged: dict[str, float] = {}
    if existing_path.exists():
        with existing_path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                source_system = str(row.get("source_system") or "").strip().lower()
                if not source_system:
                    continue
                try:
                    merged[source_system] = float(row.get("trust_score") or 0.5)
                except (TypeError, ValueError):
                    merged[source_system] = 0.5
    for key, value in SOURCE_TRUST_DEFAULTS.items():
        merged.setdefault(key, value)

    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["source_system", "trust_score"])
        writer.writeheader()
        for source_system in sorted(merged):
            writer.writerow({"source_system": source_system, "trust_score": f"{merged[source_system]:.2f}"})


def _latest_matching(directory: Path, pattern: str) -> Path | None:
    if not directory.exists():
        return None
    matches = sorted(directory.glob(pattern))
    return matches[-1] if matches else None


if __name__ == "__main__":
    main()

