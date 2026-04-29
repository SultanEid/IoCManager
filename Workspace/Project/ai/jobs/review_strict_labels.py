from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


POSITIVE_EXTERNAL_SOURCES = {"malwarebazaar", "urlhaus"}
HIGH_CONFIDENCE_MALWARE_TOKENS = {
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
EXECUTABLE_URL_MARKERS = {
    ".bat",
    ".bin",
    ".cmd",
    ".dll",
    ".elf",
    ".exe",
    ".jar",
    ".js",
    ".msi",
    ".ps1",
    ".scr",
    ".sh",
    ".vbs",
}


@dataclass(frozen=True)
class DatasetRow:
    key: tuple[str, str, str]
    ioc_type: str
    ioc_value: str
    event_time: str
    source_system: str
    scanner_family: str
    severity_score: float
    current_verdict: str
    host_context: dict[str, Any]
    rule_context: dict[str, Any]


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Review strict labeled snapshot rows and write deterministic label suggestions."
    )
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=ai_root / "datasets" / "processed" / "strict-labeled-v5",
    )
    parser.add_argument(
        "--raw-root",
        type=Path,
        default=ai_root / "datasets" / "raw",
    )
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--write-suggested-outcomes", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output_dir or args.dataset_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    rows = load_dataset_rows(args.dataset_dir)
    malwarebazaar = load_jsonl_index(
        latest_matching(args.raw_root / "malwarebazaar", "metadata-3000-*.jsonl"),
        key_field="sha256_hash",
    )
    urlhaus = load_jsonl_index(
        latest_matching(args.raw_root / "urlhaus", "recent-iocs-2000-*.jsonl"),
        key_field="indicator",
    )

    review_rows: list[dict[str, Any]] = []
    suggested_outcomes: list[dict[str, str]] = []
    for row in rows:
        raw = {}
        if row.source_system == "malwarebazaar":
            raw = malwarebazaar.get(row.ioc_value.lower(), {})
        elif row.source_system == "urlhaus":
            raw = urlhaus.get(row.ioc_value, {})

        suggestion = suggest_label(row, raw)
        review_rows.append(
            {
                "ioc_type": row.ioc_type,
                "ioc_value": row.ioc_value,
                "event_time": row.event_time,
                "source_system": row.source_system,
                "scanner_family": row.scanner_family,
                "severity_score": f"{row.severity_score:.4f}",
                "current_verdict": row.current_verdict,
                "suggested_verdict": suggestion["suggested_verdict"],
                "label_confidence": f"{suggestion['label_confidence']:.2f}",
                "review_action": suggestion["review_action"],
                "review_priority": suggestion["review_priority"],
                "label_basis": str(row.rule_context.get("label_basis") or ""),
                "rule_name": str(row.rule_context.get("rule_name") or ""),
                "rationale": suggestion["rationale"],
            }
        )
        suggested_outcomes.append(
            {
                "ioc_type": row.ioc_type,
                "ioc_value": row.ioc_value,
                "event_time": row.event_time,
                "verdict": suggestion["suggested_verdict"],
            }
        )

    review_path = output_dir / "label_review.csv"
    write_csv(review_path, review_rows)

    queue_rows = [
        row
        for row in review_rows
        if row["review_action"] in {"manual_review", "needs_source_enrichment"}
        or row["current_verdict"] != row["suggested_verdict"]
    ]
    queue_path = output_dir / "label_review_queue.csv"
    write_csv(queue_path, queue_rows)

    suggested_path = None
    if args.write_suggested_outcomes:
        suggested_path = output_dir / "outcomes.suggested.csv"
        write_csv(suggested_path, suggested_outcomes)

    summary = build_summary(review_rows)
    summary.update(
        {
            "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
            "datasetDir": str(args.dataset_dir.resolve()),
            "reviewCsv": str(review_path.resolve()),
            "reviewQueueCsv": str(queue_path.resolve()),
            "suggestedOutcomesCsv": str(suggested_path.resolve()) if suggested_path else None,
            "rawEnrichment": {
                "malwarebazaarRows": len(malwarebazaar),
                "urlhausRows": len(urlhaus),
            },
        }
    )
    summary_path = output_dir / "label_review_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


def load_dataset_rows(dataset_dir: Path) -> list[DatasetRow]:
    observables = read_keyed_csv(dataset_dir / "observables.csv")
    detections = read_keyed_csv(dataset_dir / "detections.csv")
    outcomes = read_keyed_csv(dataset_dir / "outcomes.csv")
    rows: list[DatasetRow] = []
    for key, observable in observables.items():
        detection = detections.get(key)
        outcome = outcomes.get(key)
        if detection is None or outcome is None:
            continue
        rows.append(
            DatasetRow(
                key=key,
                ioc_type=observable["ioc_type"],
                ioc_value=observable["ioc_value"],
                event_time=observable["event_time"],
                source_system=str(observable.get("source_system") or "").strip().lower(),
                scanner_family=str(detection.get("scanner_family") or "").strip().lower(),
                severity_score=coerce_float(detection.get("severity_score"), 0.0),
                current_verdict=str(outcome.get("verdict") or "").strip().lower(),
                host_context=parse_json_object(observable.get("host_context_json")),
                rule_context=parse_json_object(observable.get("rule_context_json")),
            )
        )
    return rows


def suggest_label(row: DatasetRow, raw: dict[str, Any]) -> dict[str, Any]:
    label_basis = str(row.rule_context.get("label_basis") or "").strip().lower()
    if label_basis in {"authoritative_internal", "fixture_curated"}:
        return {
            "suggested_verdict": row.current_verdict,
            "label_confidence": 0.95,
            "review_action": "accept_current",
            "review_priority": "low",
            "rationale": f"Trusted {label_basis} row; preserve current analyst/fixture verdict.",
        }

    if row.source_system == "malwarebazaar":
        return suggest_malwarebazaar_label(row, raw)
    if row.source_system == "urlhaus":
        return suggest_urlhaus_label(row, raw)

    if row.severity_score <= 0.25 and row.current_verdict in {"benign", "likely_benign", "false_positive"}:
        return {
            "suggested_verdict": row.current_verdict,
            "label_confidence": 0.80,
            "review_action": "accept_current",
            "review_priority": "low",
            "rationale": "Low severity row already has a non-malicious verdict.",
        }

    return {
        "suggested_verdict": row.current_verdict or "insufficient_evidence",
        "label_confidence": 0.45,
        "review_action": "manual_review",
        "review_priority": "medium",
        "rationale": "No deterministic labeling rule matched this row.",
    }


def suggest_malwarebazaar_label(row: DatasetRow, raw: dict[str, Any]) -> dict[str, Any]:
    signature = str(raw.get("signature") or row.rule_context.get("rule_name") or "").strip()
    file_name = str(raw.get("file_name") or "").strip().lower()
    query_name = str(raw.get("_query_name") or "").strip().lower()
    signature_normalized = signature.lower().replace(" ", "").replace("-", "")
    token_hit = any(token in signature_normalized for token in HIGH_CONFIDENCE_MALWARE_TOKENS)
    executable_file = file_name.endswith((".exe", ".dll", ".bin", ".elf", ".scr", ".jar")) if file_name else False

    if token_hit and (query_name == "recent_detections" or executable_file):
        return {
            "suggested_verdict": "malicious",
            "label_confidence": 0.92,
            "review_action": "auto_relabel_candidate",
            "review_priority": "medium",
            "rationale": f"MalwareBazaar hash has explicit malware family '{signature}' and executable/recent-detection evidence.",
        }
    if token_hit:
        return {
            "suggested_verdict": "malicious",
            "label_confidence": 0.88,
            "review_action": "auto_relabel_candidate",
            "review_priority": "medium",
            "rationale": f"MalwareBazaar hash has explicit high-confidence malware family '{signature}'.",
        }
    if signature:
        return {
            "suggested_verdict": "likely_malicious",
            "label_confidence": 0.78,
            "review_action": "accept_current",
            "review_priority": "low",
            "rationale": f"MalwareBazaar hash has provider signature '{signature}', but no hard malicious token matched.",
        }
    return {
        "suggested_verdict": "suspicious",
        "label_confidence": 0.55,
        "review_action": "needs_source_enrichment",
        "review_priority": "high",
        "rationale": "MalwareBazaar row is missing signature enrichment; downgrade until reviewed.",
    }


def suggest_urlhaus_label(row: DatasetRow, raw: dict[str, Any]) -> dict[str, Any]:
    threat = str(raw.get("threat") or row.rule_context.get("rule_name") or "").strip().lower()
    status = str(raw.get("url_status") or "").strip().lower()
    tags = [str(tag).strip().lower() for tag in raw.get("tags", []) if str(tag).strip()]
    indicator = str(raw.get("indicator") or row.ioc_value or "").strip().lower()
    executable_url = any(marker in indicator for marker in EXECUTABLE_URL_MARKERS)
    named_family = any(any(token in tag.replace(" ", "") for token in HIGH_CONFIDENCE_MALWARE_TOKENS) for tag in tags)

    if status == "online" and threat == "payload_delivery":
        return {
            "suggested_verdict": "malicious",
            "label_confidence": 0.90,
            "review_action": "auto_relabel_candidate",
            "review_priority": "medium",
            "rationale": "URLHaus URL is online and marked payload_delivery.",
        }
    if status == "online" and threat == "malware_download" and (executable_url or named_family):
        return {
            "suggested_verdict": "malicious",
            "label_confidence": 0.88,
            "review_action": "auto_relabel_candidate",
            "review_priority": "medium",
            "rationale": "URLHaus URL is online malware_download with executable path or named malware tag.",
        }
    if threat in {"malware_download", "payload_delivery"}:
        return {
            "suggested_verdict": "likely_malicious",
            "label_confidence": 0.76,
            "review_action": "accept_current",
            "review_priority": "low",
            "rationale": f"URLHaus provider threat is '{threat}', but hard malicious evidence is incomplete.",
        }
    return {
        "suggested_verdict": "suspicious",
        "label_confidence": 0.55,
        "review_action": "needs_source_enrichment",
        "review_priority": "high",
        "rationale": "URLHaus row lacks eligible malware_download or payload_delivery threat context.",
    }


def build_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    current = Counter(row["current_verdict"] for row in rows)
    suggested = Counter(row["suggested_verdict"] for row in rows)
    actions = Counter(row["review_action"] for row in rows)
    transitions = Counter(
        f"{row['current_verdict']} -> {row['suggested_verdict']}"
        for row in rows
        if row["current_verdict"] != row["suggested_verdict"]
    )
    source_actions = Counter(f"{row['source_system']}::{row['review_action']}" for row in rows)
    return {
        "rowCount": len(rows),
        "currentLabelDistribution": dict(sorted(current.items())),
        "suggestedLabelDistribution": dict(sorted(suggested.items())),
        "reviewActionDistribution": dict(sorted(actions.items())),
        "labelTransitions": dict(sorted(transitions.items())),
        "sourceActionDistribution": dict(sorted(source_actions.items())),
    }


def read_keyed_csv(path: Path) -> dict[tuple[str, str, str], dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    return {
        (
            str(row.get("ioc_type") or ""),
            str(row.get("ioc_value") or ""),
            str(row.get("event_time") or ""),
        ): row
        for row in rows
    }


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def latest_matching(root: Path, pattern: str) -> Path | None:
    matches = sorted(root.glob(pattern), key=lambda path: path.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def load_jsonl_index(path: Path | None, *, key_field: str) -> dict[str, dict[str, Any]]:
    if path is None or not path.exists():
        return {}
    index: dict[str, dict[str, Any]] = {}
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            key = str(row.get(key_field) or "").strip()
            if key:
                index[key.lower() if key_field == "sha256_hash" else key] = row
    return index


def parse_json_object(value: Any) -> dict[str, Any]:
    if not value:
        return {}
    try:
        parsed = json.loads(str(value))
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def coerce_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


if __name__ == "__main__":
    main()
