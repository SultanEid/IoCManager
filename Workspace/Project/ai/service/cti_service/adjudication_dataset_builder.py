from __future__ import annotations

import csv
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .evidence_fusion import (
    EvidenceFusionResult,
    fuse_evidence,
    to_dataset_evidence_item,
    to_dataset_missing_item,
)
from .snort_adjudication import SnortAdjudicationResult, adjudicate_snort
from .source_adapters import adapt_source_record
from .yara_adjudication import YaraAdjudicationResult, adjudicate_yara

TASK_YARA = "yara_package_adjudication"
TASK_SIGMA = "sigma_package_adjudication"
TASK_SNORT = "snort_package_adjudication"
TASK_ACTION_PLAN = "action_plan_recommendation"

ALL_TASKS = [TASK_YARA, TASK_SIGMA, TASK_SNORT, TASK_ACTION_PLAN]
FAMILY_TO_TASK = {
    "yara": TASK_YARA,
    "sigma": TASK_SIGMA,
    "snort": TASK_SNORT,
}

CANONICAL_PROVENANCE_FIELDS = (
    "source",
    "key",
    "value",
    "evidence_id",
    "citation_ref",
    "retrieved_at_utc",
    "retrieved_by",
    "record_locator",
)

CANONICAL_ROW_FIELDS = (
    "row_id",
    "dataset_version",
    "task_type",
    "rule_family",
    "package_payload",
    "target_payload",
    "provenance",
    "evidence_used",
    "evidence_missing",
    "raw_payload",
    "parser_diagnostics",
    "group_key",
    "event_time_utc",
    "source_file",
    "is_partial",
    "missing_fields",
    "eligible_tasks",
)

SCENARIO_TO_VERDICT = {
    "malicious": "confirmed_malicious",
    "likely_malicious": "likely_malicious",
    "suspicious": "likely_malicious",
    "benign": "likely_benign",
    "likely_benign": "likely_benign",
    "false_positive": "likely_benign",
    "insufficient_evidence": "insufficient_evidence",
}

VERDICT_TO_ACTION = {
    "confirmed_malicious": ("canary", "high", True),
    "likely_malicious": ("canary", "high", True),
    "likely_benign": ("monitor", "low", False),
    "insufficient_evidence": ("hold", "low", False),
}

SPLIT_NAMES = ("train", "validation", "test")
SUPPORTED_IMPORT_EXTENSIONS = (".jsonl", ".json", ".csv")
CANONICAL_YARA_VERDICTS = {
    "benign",
    "likely_benign",
    "suspicious",
    "likely_malicious",
    "malicious",
    "false_positive",
    "insufficient_evidence",
    "stale_or_revoked",
}
CANONICAL_SNORT_VERDICTS = {
    "benign",
    "likely_benign",
    "suspicious",
    "likely_malicious",
    "malicious",
    "false_positive",
    "insufficient_evidence",
    "stale_or_revoked",
}


@dataclass(frozen=True)
class DatasetBuildConfig:
    dataset_version: str
    manifests_dir: Path
    fixtures_dir: Path
    imports_root: Path
    output_root: Path
    split_train_ratio: float = 0.80
    split_validation_ratio: float = 0.10
    split_test_ratio: float = 0.10
    seed: int = 0
    include_disabled_manifests: bool = False


def build_adjudication_dataset(config: DatasetBuildConfig) -> dict[str, Any]:
    _validate_split_ratios(config)

    started_at = _utc_now_iso()
    skipped_items: list[dict[str, Any]] = []

    manifests = _load_manifests(config.manifests_dir, skipped_items=skipped_items)

    rows: list[dict[str, Any]] = []
    rows.extend(_load_fixture_rows(config=config, skipped_items=skipped_items))
    rows.extend(
        _load_import_rows(
            manifests=manifests,
            config=config,
            skipped_items=skipped_items,
        )
    )

    normalized_rows = [_normalize_row(raw=row, dataset_version=config.dataset_version) for row in rows]
    normalized_rows.sort(key=lambda row: (_safe_event_time(row.get("event_time_utc")), row["row_id"]))

    dataset_root = config.output_root / config.dataset_version
    tasks_root = dataset_root / "tasks"
    splits_root = dataset_root / "splits"
    dataset_root.mkdir(parents=True, exist_ok=True)
    tasks_root.mkdir(parents=True, exist_ok=True)
    splits_root.mkdir(parents=True, exist_ok=True)

    canonical_path = dataset_root / "canonical_rows.jsonl"
    _write_jsonl(canonical_path, normalized_rows)

    task_files: dict[str, str] = {}
    split_files: dict[str, dict[str, str]] = {}
    task_reports: dict[str, dict[str, Any]] = {}

    for task in ALL_TASKS:
        task_rows = [row for row in normalized_rows if task in row["eligible_tasks"]]
        task_path = tasks_root / f"{task}.jsonl"
        _write_jsonl(task_path, task_rows)
        task_files[task] = str(task_path.resolve())

        split_candidates = [row for row in task_rows if _is_split_eligible(task=task, row=row)]
        split_assignment = _split_rows_group_time(
            rows=split_candidates,
            train_ratio=config.split_train_ratio,
            validation_ratio=config.split_validation_ratio,
            test_ratio=config.split_test_ratio,
        )

        split_task_root = splits_root / task
        split_task_root.mkdir(parents=True, exist_ok=True)
        split_files[task] = {}
        for split_name in SPLIT_NAMES:
            split_path = split_task_root / f"{split_name}.jsonl"
            _write_jsonl(split_path, split_assignment[split_name])
            split_files[task][split_name] = str(split_path.resolve())

        leakage = _check_split_leakage(split_assignment)
        group_counts = {
            split_name: len({row["group_key"] for row in rows_in_split})
            for split_name, rows_in_split in split_assignment.items()
        }
        partial_rows = sum(1 for row in task_rows if row["is_partial"])
        excluded_from_splits = len(task_rows) - len(split_candidates)
        task_reports[task] = {
            "taskRows": len(task_rows),
            "splitEligibleRows": len(split_candidates),
            "excludedFromSplits": excluded_from_splits,
            "partialRows": partial_rows,
            "splitRowCounts": {split_name: len(split_assignment[split_name]) for split_name in SPLIT_NAMES},
            "splitGroupCounts": group_counts,
            "leakageAssertions": leakage,
        }

    provenance_rows = [row for row in normalized_rows if row["provenance"]]
    provenance_required_coverage = sum(
        1
        for row in provenance_rows
        if all(all(field in item for field in CANONICAL_PROVENANCE_FIELDS) for item in row["provenance"])
    )

    split_manifest = {
        "datasetVersion": config.dataset_version,
        "generatedAtUtc": _utc_now_iso(),
        "buildStartedAtUtc": started_at,
        "seed": config.seed,
        "splitRatios": {
            "train": config.split_train_ratio,
            "validation": config.split_validation_ratio,
            "test": config.split_test_ratio,
        },
        "manifests": {
            "count": len(manifests),
            "paths": [str(item["__manifest_path"].resolve()) for item in manifests],
        },
        "rows": {
            "canonical": len(normalized_rows),
            "partial": sum(1 for row in normalized_rows if row["is_partial"]),
            "byRuleFamily": _count_by_key(normalized_rows, "rule_family"),
            "withProvenance": len(provenance_rows),
            "provenanceCoverage": {
                "rowsWithProvenanceRatio": _ratio(len(provenance_rows), len(normalized_rows)),
                "rowsWithRequiredFieldsRatio": _ratio(provenance_required_coverage, len(normalized_rows)),
            },
        },
        "files": {
            "canonical": str(canonical_path.resolve()),
            "tasks": task_files,
            "splits": split_files,
        },
        "tasks": task_reports,
        "skippedItems": skipped_items,
    }

    split_manifest_path = dataset_root / "split_manifest.json"
    split_manifest_path.write_text(json.dumps(split_manifest, indent=2), encoding="utf-8")

    row_format_path = dataset_root / "training_row_format.md"
    row_format_path.write_text(_render_training_row_report(normalized_rows), encoding="utf-8")

    return {
        "datasetVersion": config.dataset_version,
        "canonicalRows": len(normalized_rows),
        "canonicalPath": str(canonical_path.resolve()),
        "splitManifestPath": str(split_manifest_path.resolve()),
        "trainingRowFormatPath": str(row_format_path.resolve()),
        "tasks": task_reports,
        "skippedItems": skipped_items,
    }


def _validate_split_ratios(config: DatasetBuildConfig) -> None:
    ratios = [config.split_train_ratio, config.split_validation_ratio, config.split_test_ratio]
    if any(value < 0 for value in ratios):
        raise ValueError("Split ratios must be non-negative.")
    if abs(sum(ratios) - 1.0) > 1e-9:
        raise ValueError("Split ratios must sum to 1.0.")


def _load_manifests(manifests_dir: Path, skipped_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not manifests_dir.exists():
        raise FileNotFoundError(f"Manifests directory was not found: {manifests_dir}")

    manifests: list[dict[str, Any]] = []
    for manifest_path in sorted(manifests_dir.glob("*.manifest.json")):
        try:
            payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            skipped_items.append(
                {
                    "kind": "manifest",
                    "path": str(manifest_path),
                    "reason": "invalid_json",
                    "error": str(exc),
                }
            )
            continue

        required = (
            "source_name",
            "source_type",
            "location",
            "ingestion_mode",
            "parser_name",
            "normalization_target",
            "provenance_fields",
            "enabled",
        )
        missing = [key for key in required if key not in payload]
        if missing:
            skipped_items.append(
                {
                    "kind": "manifest",
                    "path": str(manifest_path),
                    "reason": "missing_required_fields",
                    "missingFields": missing,
                }
            )
            continue

        payload["__manifest_path"] = manifest_path
        manifests.append(payload)
    return manifests


def _load_fixture_rows(config: DatasetBuildConfig, skipped_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    parser_by_family = {
        "yara": "fixture_yara_parser_v1",
        "sigma": "fixture_sigma_rule_parser_v1",
        "snort": "fixture_snort_rule_parser_v1",
    }
    for family in ("yara", "sigma", "snort"):
        scenario_dir = config.fixtures_dir / family / "scenarios"
        if not scenario_dir.exists():
            skipped_items.append(
                {
                    "kind": "fixture_family",
                    "family": family,
                    "path": str(scenario_dir),
                    "reason": "scenario_directory_missing",
                }
            )
            continue

        for scenario_path in sorted(scenario_dir.glob(f"{family}-*.example.json")):
            try:
                payload = json.loads(scenario_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                skipped_items.append(
                    {
                        "kind": "fixture_row",
                        "path": str(scenario_path),
                        "reason": "invalid_json",
                        "error": str(exc),
                    }
                )
                continue

            scenario_label = _scenario_label_from_filename(scenario_path.name, family)
            source_file = {
                "manifest_name": "fixture",
                "source_name": f"{family}_fixtures",
                "source_type": "fixture",
                "source_path": str(scenario_path.resolve()),
                "record_locator": "file",
                "loader": "fixture",
                "parser_name": parser_by_family.get(family, "passthrough_source_adapter_v1"),
            }
            rows.append(
                {
                    "raw": payload,
                    "scenario_label": scenario_label,
                    "source_file": source_file,
                }
            )

        if family == "sigma":
            _append_optional_fixture_rows(
                rows=rows,
                skipped_items=skipped_items,
                fixture_dir=config.fixtures_dir / "sigma" / "alerts",
                scenario_prefix="sigma-alert",
                source_name="sigma_alert_fixtures",
                parser_name="fixture_sigma_alert_parser_v1",
            )
            continue

        if family == "snort":
            _append_optional_fixture_rows(
                rows=rows,
                skipped_items=skipped_items,
                fixture_dir=config.fixtures_dir / "snort" / "alerts",
                scenario_prefix="snort-alert",
                source_name="snort_alert_fixtures",
                parser_name="fixture_snort_alert_parser_v1",
            )
            _append_optional_fixture_rows(
                rows=rows,
                skipped_items=skipped_items,
                fixture_dir=config.fixtures_dir / "snort" / "flow_pcap",
                scenario_prefix="snort-flow-pcap",
                source_name="snort_flow_pcap_fixtures",
                parser_name="fixture_internal_flow_pcap_metadata_parser_v1",
            )
            _append_optional_fixture_rows(
                rows=rows,
                skipped_items=skipped_items,
                fixture_dir=config.fixtures_dir / "snort" / "environment_context",
                scenario_prefix="snort-environment-context",
                source_name="snort_environment_context_fixtures",
                parser_name="fixture_internal_environment_context_parser_v1",
            )
    return rows


def _append_optional_fixture_rows(
    *,
    rows: list[dict[str, Any]],
    skipped_items: list[dict[str, Any]],
    fixture_dir: Path,
    scenario_prefix: str,
    source_name: str,
    parser_name: str,
) -> None:
    if not fixture_dir.exists():
        return

    for fixture_path in sorted(fixture_dir.glob("*.example.json")):
        try:
            payload = json.loads(fixture_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            skipped_items.append(
                {
                    "kind": "fixture_row",
                    "path": str(fixture_path),
                    "reason": "invalid_json",
                    "error": str(exc),
                }
            )
            continue

        scenario_label = _scenario_label_from_filename(fixture_path.name, scenario_prefix)
        rows.append(
            {
                "raw": payload,
                "scenario_label": scenario_label,
                "source_file": {
                    "manifest_name": "fixture",
                    "source_name": source_name,
                    "source_type": "fixture",
                    "source_path": str(fixture_path.resolve()),
                    "record_locator": "file",
                    "loader": "fixture",
                    "parser_name": parser_name,
                },
            }
        )


def _load_import_rows(
    manifests: list[dict[str, Any]],
    config: DatasetBuildConfig,
    skipped_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for manifest in manifests:
        manifest_path: Path = manifest["__manifest_path"]
        source_name = str(manifest.get("source_name", "unknown"))
        enabled = bool(manifest.get("enabled", False))
        if not enabled and not config.include_disabled_manifests:
            skipped_items.append(
                {
                    "kind": "manifest_source",
                    "manifest": str(manifest_path),
                    "sourceName": source_name,
                    "reason": "manifest_disabled",
                }
            )
            continue

        location = manifest.get("location") if isinstance(manifest.get("location"), dict) else {}
        local_path_raw = location.get("local_path")
        remote_reference = location.get("remote_reference")
        ingestion_mode = str(manifest.get("ingestion_mode", ""))

        if not local_path_raw:
            reason = "deferred_remote_import" if ingestion_mode == "deferred_remote_import" and remote_reference else "no_local_path"
            skipped_items.append(
                {
                    "kind": "manifest_source",
                    "manifest": str(manifest_path),
                    "sourceName": source_name,
                    "reason": reason,
                }
            )
            continue

        local_path = Path(local_path_raw)
        resolved = local_path if local_path.is_absolute() else (config.imports_root / local_path)
        if not resolved.exists():
            skipped_items.append(
                {
                    "kind": "manifest_source",
                    "manifest": str(manifest_path),
                    "sourceName": source_name,
                    "reason": "local_path_missing",
                    "localPath": str(resolved),
                }
            )
            continue

        files = _discover_import_files(resolved)
        if not files:
            skipped_items.append(
                {
                    "kind": "manifest_source",
                    "manifest": str(manifest_path),
                    "sourceName": source_name,
                    "reason": "no_supported_files",
                    "localPath": str(resolved),
                }
            )
            continue

        for file_path in files:
            try:
                records = _load_records_from_file(file_path)
            except ValueError as exc:
                skipped_items.append(
                    {
                        "kind": "import_file",
                        "manifest": str(manifest_path),
                        "sourceName": source_name,
                        "path": str(file_path),
                        "reason": "file_parse_error",
                        "error": str(exc),
                    }
                )
                continue

            for index, record in enumerate(records, start=1):
                source_file = {
                    "manifest_name": manifest_path.name,
                    "source_name": source_name,
                    "source_type": manifest.get("source_type", "unknown"),
                    "source_path": str(file_path.resolve()),
                    "record_locator": f"row:{index}",
                    "loader": f"import_{file_path.suffix.lower().lstrip('.')}",
                    "parser_name": str(manifest.get("parser_name") or "passthrough_source_adapter_v1"),
                }
                rows.append(
                    {
                        "raw": record,
                        "scenario_label": None,
                        "source_file": source_file,
                    }
                )

    return rows


def _discover_import_files(path: Path) -> list[Path]:
    if path.is_file():
        return [path] if path.suffix.lower() in SUPPORTED_IMPORT_EXTENSIONS else []

    files: list[Path] = []
    for file_path in sorted(path.rglob("*")):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() in SUPPORTED_IMPORT_EXTENSIONS:
            files.append(file_path)
    return files


def _load_records_from_file(path: Path) -> list[dict[str, Any]]:
    ext = path.suffix.lower()
    if ext == ".jsonl":
        records: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line:
                    continue
                payload = json.loads(line)
                if isinstance(payload, dict):
                    records.append(payload)
        return records

    if ext == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if isinstance(payload, dict):
            if isinstance(payload.get("rows"), list):
                return [item for item in payload["rows"] if isinstance(item, dict)]
            if isinstance(payload.get("items"), list):
                return [item for item in payload["items"] if isinstance(item, dict)]
            return [payload]
        raise ValueError(f"Unsupported JSON root for import: {type(payload)!r}")

    if ext == ".csv":
        rows: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                rows.append({key: _coerce_csv_value(value) for key, value in row.items()})
        return rows

    raise ValueError(f"Unsupported import file extension: {ext}")


def _coerce_csv_value(value: Any) -> Any:
    if value is None:
        return None
    if not isinstance(value, str):
        return value

    text = value.strip()
    if not text:
        return None
    if text[0] in "{[":
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    lowered = text.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    if lowered in {"null", "none"}:
        return None
    return text


def _normalize_row(raw: dict[str, Any], dataset_version: str) -> dict[str, Any]:
    source_file = dict(raw["source_file"])
    source_file["parser_name"] = _normalize_parser_name(source_file)
    payload = raw["raw"] if isinstance(raw["raw"], dict) else {}
    scenario_label = raw.get("scenario_label")

    adapter_result = adapt_source_record(payload=payload, source_file=source_file)
    package_payload = adapter_result.package_payload if isinstance(adapter_result.package_payload, dict) else {}
    if not package_payload:
        package_payload = _extract_package_payload(payload)
    rule_family = _derive_rule_family(payload=payload, package_payload=package_payload, scenario_label=scenario_label)
    target_payload = _extract_target_payload(payload=payload, scenario_label=scenario_label)
    target_payload = _merge_mapping(target_payload, adapter_result.target_payload_patch)
    evidence_seed_used, evidence_seed_missing = _extract_evidence(
        payload=payload,
        package_payload=package_payload,
        target_payload=target_payload,
    )
    evidence_seed_used = _merge_object_lists(evidence_seed_used, adapter_result.evidence_used_patch)
    evidence_seed_missing = _merge_object_lists(evidence_seed_missing, adapter_result.evidence_missing_patch)
    evidence_used, evidence_missing, contradictory_evidence, fusion_result = _fuse_row_evidence(
        package_payload=package_payload,
        target_payload=target_payload,
        evidence_used=evidence_seed_used,
        evidence_missing=evidence_seed_missing,
    )
    _apply_deterministic_yara_adjudication(
        rule_family=rule_family,
        package_payload=package_payload,
        target_payload=target_payload,
        evidence_used=evidence_used,
        evidence_missing=evidence_missing,
        contradictory_evidence=contradictory_evidence,
        fusion_result=fusion_result,
    )
    _apply_deterministic_snort_adjudication(
        rule_family=rule_family,
        package_payload=package_payload,
        target_payload=target_payload,
        evidence_used=evidence_used,
        evidence_missing=evidence_missing,
        contradictory_evidence=contradictory_evidence,
        fusion_result=fusion_result,
    )
    if contradictory_evidence:
        target_adjudication = target_payload.get("adjudication")
        if isinstance(target_adjudication, dict):
            target_adjudication["contradictory_evidence"] = contradictory_evidence
    provenance = _extract_provenance(
        payload=payload,
        source_file=source_file,
        adapter_provenance_items=adapter_result.provenance_items,
    )
    parser_diagnostics = _normalize_parser_diagnostics(adapter_result.parser_diagnostics, source_file)
    raw_payload = _normalize_raw_payload(adapter_result.raw_payload, payload)

    if "action_plan" not in target_payload and "adjudication" in target_payload:
        derived = _derive_action_plan_from_adjudication(target_payload["adjudication"], evidence_used)
        if derived is not None:
            target_payload["action_plan"] = derived

    event_time = _derive_event_time(
        payload=payload,
        package_payload=package_payload,
        event_time_hint=adapter_result.event_time_hint,
    )
    group_key = _derive_group_key(payload=payload, package_payload=package_payload, rule_family=rule_family)
    eligible_tasks = _derive_eligible_tasks(
        rule_family=rule_family,
        target_payload=target_payload,
    )
    missing_fields = _derive_missing_fields(
        rule_family=rule_family,
        package_payload=package_payload,
        target_payload=target_payload,
        event_time_utc=event_time,
        eligible_tasks=eligible_tasks,
        parser_diagnostics=parser_diagnostics,
    )
    task_type = eligible_tasks[0] if eligible_tasks else "unknown"

    source_blob = {
        "source_file": source_file,
        "payload": package_payload,
        "target": target_payload,
        "event_time_utc": event_time,
        "group_key": group_key,
        "scenario_label": scenario_label,
    }
    row_id = hashlib.sha256(json.dumps(source_blob, sort_keys=True, default=str).encode("utf-8")).hexdigest()[:24]

    row = {
        "row_id": row_id,
        "dataset_version": dataset_version,
        "task_type": task_type,
        "rule_family": rule_family,
        "package_payload": package_payload,
        "target_payload": target_payload,
        "provenance": provenance,
        "evidence_used": evidence_used,
        "evidence_missing": evidence_missing,
        "raw_payload": raw_payload,
        "parser_diagnostics": parser_diagnostics,
        "group_key": group_key,
        "event_time_utc": event_time,
        "source_file": source_file,
        "is_partial": bool(missing_fields),
        "missing_fields": sorted(set(missing_fields)),
        "eligible_tasks": eligible_tasks,
    }
    return row


def _extract_package_payload(payload: dict[str, Any]) -> dict[str, Any]:
    direct = payload.get("package_payload")
    if isinstance(direct, dict):
        return direct

    nested = payload.get("detection_package")
    if isinstance(nested, dict):
        return nested

    nested = payload.get("input_package")
    if isinstance(nested, dict):
        return nested

    base_keys = {
        "rule_family",
        "full_rule_text",
        "rule_metadata",
        "raw_hit_payload",
        "object_metadata",
        "asset_context",
        "time_prevalence_context",
        "allowlist_baseline_context",
        "linked_enrichment",
        "behavior_report_references",
        "prior_analyst_outcomes",
        "related_detections",
    }
    if any(key in payload for key in base_keys):
        result = {key: payload[key] for key in base_keys if key in payload}
        return result if isinstance(result, dict) else {}

    return {}


def _derive_rule_family(payload: dict[str, Any], package_payload: dict[str, Any], scenario_label: str | None) -> str:
    family = (
        package_payload.get("rule_family")
        or payload.get("rule_family")
        or payload.get("family")
    )
    if isinstance(family, str) and family.strip():
        return family.strip().lower()
    if scenario_label:
        source_name = str(payload.get("source_name", "")).lower()
        for candidate in ("yara", "sigma", "snort"):
            if candidate in source_name:
                return candidate
    return "unknown"


def _extract_target_payload(payload: dict[str, Any], scenario_label: str | None) -> dict[str, Any]:
    if isinstance(payload.get("target_payload"), dict):
        target = dict(payload["target_payload"])
    else:
        target = {}

    explicit_adjudication = payload.get("adjudication_result") or payload.get("adjudication")
    if isinstance(explicit_adjudication, dict):
        target["adjudication"] = explicit_adjudication
    elif "verdict" in payload:
        verdict = str(payload.get("verdict", "")).strip()
        if verdict:
            target["adjudication"] = {
                "verdict": verdict,
                "confidence": _float_or_none(payload.get("confidence")),
                "false_positive_risk": _float_or_none(payload.get("false_positive_risk")),
            }

    explicit_action_plan = payload.get("action_plan")
    if isinstance(explicit_action_plan, dict):
        target["action_plan"] = explicit_action_plan

    if "scenario_label" in payload and isinstance(payload["scenario_label"], str):
        target["scenario_label"] = payload["scenario_label"]
    elif scenario_label:
        target["scenario_label"] = scenario_label

    if "adjudication" not in target and scenario_label:
        verdict = SCENARIO_TO_VERDICT.get(scenario_label, "insufficient_evidence")
        target["adjudication"] = {
            "verdict": verdict,
            "confidence": _default_confidence_for_verdict(verdict),
            "false_positive_risk": _default_fp_risk_for_verdict(verdict),
            "derived_from": "scenario_label",
        }

    return target


def _extract_evidence(
    payload: dict[str, Any],
    package_payload: dict[str, Any],
    target_payload: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    evidence_used = payload.get("evidence_used")
    if not isinstance(evidence_used, list) and isinstance(target_payload.get("adjudication"), dict):
        maybe_used = target_payload["adjudication"].get("evidence_used")
        if isinstance(maybe_used, list):
            evidence_used = maybe_used
    if not isinstance(evidence_used, list):
        evidence_used = []
    evidence_used = _merge_object_lists(_normalize_list_of_dicts(evidence_used), _derive_fixture_evidence(package_payload))

    evidence_missing = payload.get("evidence_missing")
    if not isinstance(evidence_missing, list) and isinstance(target_payload.get("adjudication"), dict):
        maybe_missing = target_payload["adjudication"].get("evidence_missing")
        if isinstance(maybe_missing, list):
            evidence_missing = maybe_missing
    if not isinstance(evidence_missing, list):
        verdict = (
            target_payload.get("adjudication", {}).get("verdict")
            if isinstance(target_payload.get("adjudication"), dict)
            else None
        )
        if verdict == "insufficient_evidence":
            evidence_missing = [
                {
                    "gap_id": "missing-corroboration",
                    "description": "Additional corroborating evidence is required.",
                    "importance": "high",
                    "derived_from": "dataset_builder",
                }
            ]
        else:
            evidence_missing = []

    return _normalize_list_of_dicts(evidence_used), _normalize_list_of_dicts(evidence_missing)


def _fuse_row_evidence(
    *,
    package_payload: dict[str, Any],
    target_payload: dict[str, Any],
    evidence_used: list[dict[str, Any]],
    evidence_missing: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], EvidenceFusionResult]:
    fusion = fuse_evidence(
        detection_package=package_payload,
        provided_evidence_used=evidence_used,
        provided_evidence_missing=evidence_missing,
    )

    fused_used_candidates = [to_dataset_evidence_item(item) for item in fusion.positive_evidence]
    fused_used_candidates.extend(to_dataset_evidence_item(item) for item in fusion.negative_evidence)
    fused_used_input_count = len(evidence_used) + len(fused_used_candidates)
    fused_used = _merge_object_lists(evidence_used, fused_used_candidates)
    fused_used_duplicate_count = max(0, fused_used_input_count - len(fused_used))

    fused_missing_candidates = [to_dataset_missing_item(item) for item in fusion.missing_evidence]
    fused_missing_input_count = len(evidence_missing) + len(fused_missing_candidates)
    fused_missing = _merge_object_lists(evidence_missing, fused_missing_candidates)
    fused_missing_duplicate_count = max(0, fused_missing_input_count - len(fused_missing))

    contradictory = [to_dataset_evidence_item(item) for item in fusion.contradictory_evidence]
    contradictory = _merge_object_lists([], contradictory)

    if isinstance(target_payload.get("adjudication"), dict):
        dedup_duplicate_count = max(
            fusion.deduplication.duplicate_count,
            fused_used_duplicate_count + fused_missing_duplicate_count,
        )
        target_payload["adjudication"]["evidence_fusion"] = {
            "coverage": dict(sorted(fusion.coverage.items(), key=lambda entry: entry[0])),
            "deduplication": {
                "input_count": fusion.deduplication.input_count,
                "unique_count": fusion.deduplication.unique_count,
                "duplicate_count": dedup_duplicate_count,
            },
            "explanation_lines": list(fusion.explanation_lines),
            "positive_count": len(fusion.positive_evidence),
            "negative_count": len(fusion.negative_evidence),
            "contradictory_count": len(fusion.contradictory_evidence),
            "missing_count": len(fusion.missing_evidence),
        }

    return fused_used, fused_missing, contradictory, fusion


def _apply_deterministic_yara_adjudication(
    *,
    rule_family: str,
    package_payload: dict[str, Any],
    target_payload: dict[str, Any],
    evidence_used: list[dict[str, Any]],
    evidence_missing: list[dict[str, Any]],
    contradictory_evidence: list[dict[str, Any]],
    fusion_result: EvidenceFusionResult,
) -> None:
    if rule_family != "yara":
        return

    generated = adjudicate_yara(
        detection_package=package_payload,
        evidence_fusion=fusion_result,
    )
    adjudication = target_payload.get("adjudication")
    if not isinstance(adjudication, dict):
        adjudication = {}
        target_payload["adjudication"] = adjudication

    _backfill_adjudication_from_yara(
        adjudication=adjudication,
        generated=generated,
        evidence_used=evidence_used,
        evidence_missing=evidence_missing,
        contradictory_evidence=contradictory_evidence,
    )

    if "evidence_fusion" not in adjudication or not isinstance(adjudication.get("evidence_fusion"), dict):
        adjudication["evidence_fusion"] = {
            "coverage": dict(sorted(fusion_result.coverage.items(), key=lambda entry: entry[0])),
            "deduplication": {
                "input_count": fusion_result.deduplication.input_count,
                "unique_count": fusion_result.deduplication.unique_count,
                "duplicate_count": fusion_result.deduplication.duplicate_count,
            },
            "explanation_lines": list(fusion_result.explanation_lines),
            "positive_count": len(fusion_result.positive_evidence),
            "negative_count": len(fusion_result.negative_evidence),
            "contradictory_count": len(fusion_result.contradictory_evidence),
            "missing_count": len(fusion_result.missing_evidence),
        }


def _backfill_adjudication_from_yara(
    *,
    adjudication: dict[str, Any],
    generated: YaraAdjudicationResult,
    evidence_used: list[dict[str, Any]],
    evidence_missing: list[dict[str, Any]],
    contradictory_evidence: list[dict[str, Any]],
) -> None:
    existing_verdict = adjudication.get("verdict")
    verdict_present = isinstance(existing_verdict, str) and bool(existing_verdict.strip())
    if not verdict_present:
        adjudication["verdict"] = generated.verdict

    if "confidence" not in adjudication or adjudication.get("confidence") is None:
        adjudication["confidence"] = generated.confidence
    if "false_positive_risk" not in adjudication or adjudication.get("false_positive_risk") is None:
        adjudication["false_positive_risk"] = generated.false_positive_risk
    if "explanation" not in adjudication or not str(adjudication.get("explanation", "")).strip():
        adjudication["explanation"] = generated.explanation
    if "suggested_next_checks" not in adjudication or not isinstance(adjudication.get("suggested_next_checks"), list):
        adjudication["suggested_next_checks"] = list(generated.suggested_next_checks)
    if "evidence_used" not in adjudication or not isinstance(adjudication.get("evidence_used"), list):
        adjudication["evidence_used"] = _merge_object_lists([], evidence_used)
    if "evidence_missing" not in adjudication or not isinstance(adjudication.get("evidence_missing"), list):
        adjudication["evidence_missing"] = _merge_object_lists([], evidence_missing)
    if "contradictory_evidence" not in adjudication or not isinstance(adjudication.get("contradictory_evidence"), list):
        adjudication["contradictory_evidence"] = _merge_object_lists([], contradictory_evidence)
    if (
        (adjudication.get("verdict") == "insufficient_evidence" or generated.verdict == "insufficient_evidence")
        and ("abstain_reason" not in adjudication or not str(adjudication.get("abstain_reason", "")).strip())
    ):
        adjudication["abstain_reason"] = generated.abstain_reason or "insufficient_correlated_evidence"

    if "bucket_scores" not in adjudication or not isinstance(adjudication.get("bucket_scores"), dict):
        adjudication["bucket_scores"] = {
            "positive_score": generated.bucket_scores.positive_score,
            "negative_score": generated.bucket_scores.negative_score,
            "contradictory_score": generated.bucket_scores.contradictory_score,
            "missing_score": generated.bucket_scores.missing_score,
        }
    if "interpretable_features" not in adjudication or not isinstance(adjudication.get("interpretable_features"), dict):
        adjudication["interpretable_features"] = dict(generated.interpretable_features)

    # Explicit verdicts are preserved as requested; if they are missing/blank, generated verdict is used.
    if verdict_present and isinstance(existing_verdict, str):
        existing_value = existing_verdict.strip()
        if existing_value in CANONICAL_YARA_VERDICTS:
            adjudication["verdict"] = existing_value


def _apply_deterministic_snort_adjudication(
    *,
    rule_family: str,
    package_payload: dict[str, Any],
    target_payload: dict[str, Any],
    evidence_used: list[dict[str, Any]],
    evidence_missing: list[dict[str, Any]],
    contradictory_evidence: list[dict[str, Any]],
    fusion_result: EvidenceFusionResult,
) -> None:
    if rule_family != "snort":
        return

    generated = adjudicate_snort(
        detection_package=package_payload,
        evidence_fusion=fusion_result,
    )
    adjudication = target_payload.get("adjudication")
    if not isinstance(adjudication, dict):
        adjudication = {}
        target_payload["adjudication"] = adjudication

    _backfill_adjudication_from_snort(
        adjudication=adjudication,
        generated=generated,
        evidence_used=evidence_used,
        evidence_missing=evidence_missing,
        contradictory_evidence=contradictory_evidence,
    )

    if "evidence_fusion" not in adjudication or not isinstance(adjudication.get("evidence_fusion"), dict):
        adjudication["evidence_fusion"] = {
            "coverage": dict(sorted(fusion_result.coverage.items(), key=lambda entry: entry[0])),
            "deduplication": {
                "input_count": fusion_result.deduplication.input_count,
                "unique_count": fusion_result.deduplication.unique_count,
                "duplicate_count": fusion_result.deduplication.duplicate_count,
            },
            "explanation_lines": list(fusion_result.explanation_lines),
            "positive_count": len(fusion_result.positive_evidence),
            "negative_count": len(fusion_result.negative_evidence),
            "contradictory_count": len(fusion_result.contradictory_evidence),
            "missing_count": len(fusion_result.missing_evidence),
        }


def _backfill_adjudication_from_snort(
    *,
    adjudication: dict[str, Any],
    generated: SnortAdjudicationResult,
    evidence_used: list[dict[str, Any]],
    evidence_missing: list[dict[str, Any]],
    contradictory_evidence: list[dict[str, Any]],
) -> None:
    existing_verdict = adjudication.get("verdict")
    verdict_present = isinstance(existing_verdict, str) and bool(existing_verdict.strip())
    if not verdict_present:
        adjudication["verdict"] = generated.verdict

    if "confidence" not in adjudication or adjudication.get("confidence") is None:
        adjudication["confidence"] = generated.confidence
    if "false_positive_risk" not in adjudication or adjudication.get("false_positive_risk") is None:
        adjudication["false_positive_risk"] = generated.false_positive_risk
    if "explanation" not in adjudication or not str(adjudication.get("explanation", "")).strip():
        adjudication["explanation"] = generated.explanation
    if "suggested_next_checks" not in adjudication or not isinstance(adjudication.get("suggested_next_checks"), list):
        adjudication["suggested_next_checks"] = list(generated.suggested_next_checks)
    if "evidence_used" not in adjudication or not isinstance(adjudication.get("evidence_used"), list):
        adjudication["evidence_used"] = _merge_object_lists([], evidence_used)
    if "evidence_missing" not in adjudication or not isinstance(adjudication.get("evidence_missing"), list):
        adjudication["evidence_missing"] = _merge_object_lists([], evidence_missing)
    if "contradictory_evidence" not in adjudication or not isinstance(adjudication.get("contradictory_evidence"), list):
        adjudication["contradictory_evidence"] = _merge_object_lists([], contradictory_evidence)
    if (
        (adjudication.get("verdict") == "insufficient_evidence" or generated.verdict == "insufficient_evidence")
        and ("abstain_reason" not in adjudication or not str(adjudication.get("abstain_reason", "")).strip())
    ):
        adjudication["abstain_reason"] = generated.abstain_reason or "insufficient_correlated_evidence"

    if "bucket_scores" not in adjudication or not isinstance(adjudication.get("bucket_scores"), dict):
        adjudication["bucket_scores"] = {
            "positive_score": generated.bucket_scores.positive_score,
            "negative_score": generated.bucket_scores.negative_score,
            "contradictory_score": generated.bucket_scores.contradictory_score,
            "missing_score": generated.bucket_scores.missing_score,
        }
    if "interpretable_features" not in adjudication or not isinstance(adjudication.get("interpretable_features"), dict):
        adjudication["interpretable_features"] = dict(generated.interpretable_features)

    if verdict_present and isinstance(existing_verdict, str):
        existing_value = existing_verdict.strip()
        if existing_value in CANONICAL_SNORT_VERDICTS:
            adjudication["verdict"] = existing_value


def _derive_fixture_evidence(package_payload: dict[str, Any]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    report_refs = package_payload.get("behavior_report_references")
    if isinstance(report_refs, dict):
        reports = report_refs.get("reports")
        if isinstance(reports, list):
            for item in reports:
                if not isinstance(item, dict):
                    continue
                output.append(
                    {
                        "evidence_id": str(item.get("report_id", "behavior-report")),
                        "source": str(item.get("source", "behavior_report")),
                        "summary": str(item.get("summary", "Referenced behavior report")),
                        "reference": item.get("reference"),
                    }
                )

    related = package_payload.get("related_detections")
    if isinstance(related, dict):
        detections = related.get("detections")
        if isinstance(detections, list):
            for item in detections:
                if not isinstance(item, dict):
                    continue
                output.append(
                    {
                        "evidence_id": str(item.get("detection_id", "related-detection")),
                        "source": str(item.get("rule_family", "related_detection")),
                        "summary": f"Related detection {item.get('rule_id', 'unknown')}",
                        "confidence": item.get("confidence"),
                    }
                )
    return output


def _extract_provenance(
    payload: dict[str, Any],
    source_file: dict[str, Any],
    adapter_provenance_items: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    provenance: list[dict[str, Any]] = []
    provided = payload.get("provenance")
    if isinstance(provided, list):
        for item in provided:
            if not isinstance(item, dict):
                continue
            provenance.append(_normalize_provenance_item(item))
    for item in adapter_provenance_items or []:
        if not isinstance(item, dict):
            continue
        provenance.append(_normalize_provenance_item(item))

    source_item = {
        "source": str(source_file.get("source_name", "unknown")),
        "key": "source_path",
        "value": str(source_file.get("source_path", "")),
        "evidence_id": None,
        "citation_ref": str(source_file.get("source_path", "")),
        "retrieved_at_utc": _utc_now_iso(),
        "retrieved_by": "adjudication_dataset_builder_v1",
        "record_locator": str(source_file.get("record_locator", "")),
    }
    provenance.append(_normalize_provenance_item(source_item))
    return provenance


def _derive_action_plan_from_adjudication(
    adjudication: dict[str, Any],
    evidence_used: list[dict[str, Any]],
) -> dict[str, Any] | None:
    verdict = adjudication.get("verdict")
    if not isinstance(verdict, str):
        return None
    verdict_key = verdict.strip()
    if verdict_key not in VERDICT_TO_ACTION:
        return None

    action, severity, requires_human = VERDICT_TO_ACTION[verdict_key]
    return {
        "recommended_actions": [
            {
                "action": action,
                "summary": f"Auto-derived action from verdict '{verdict_key}'.",
                "requires_human_approval": requires_human,
            }
        ],
        "severity": severity,
        "evidence_basis": [
            {
                "evidence_id": item.get("evidence_id", "unknown-evidence"),
                "summary": item.get("summary", "Supporting evidence"),
                "source": item.get("source"),
            }
            for item in evidence_used
        ],
        "prerequisites": [],
        "cautions": [],
        "human_approval_required": requires_human,
        "derived_from": "adjudication_verdict",
    }


def _derive_event_time(payload: dict[str, Any], package_payload: dict[str, Any], event_time_hint: str | None = None) -> str | None:
    candidates = [
        event_time_hint,
        payload.get("event_time_utc"),
        payload.get("event_time"),
        payload.get("timestamp"),
    ]
    time_ctx = payload.get("time_prevalence_context")
    if isinstance(time_ctx, dict):
        candidates.append(time_ctx.get("hit_time"))
    package_time_ctx = package_payload.get("time_prevalence_context")
    if isinstance(package_time_ctx, dict):
        candidates.append(package_time_ctx.get("hit_time"))

    for candidate in candidates:
        parsed = _parse_datetime_utc(candidate)
        if parsed is not None:
            return parsed.isoformat()
    return None


def _derive_group_key(payload: dict[str, Any], package_payload: dict[str, Any], rule_family: str) -> str:
    if isinstance(payload.get("group_key"), str) and payload["group_key"].strip():
        return payload["group_key"].strip()

    rule_metadata = package_payload.get("rule_metadata") if isinstance(package_payload.get("rule_metadata"), dict) else {}
    object_metadata = package_payload.get("object_metadata") if isinstance(package_payload.get("object_metadata"), dict) else {}
    rule_id = rule_metadata.get("rule_id") or rule_metadata.get("id") or rule_metadata.get("sid")
    object_id = object_metadata.get("object_id")
    source_system = object_metadata.get("source_system")
    base = f"{rule_family}:{rule_id or 'na'}:{object_id or 'na'}:{source_system or 'na'}"
    return base


def _derive_eligible_tasks(rule_family: str, target_payload: dict[str, Any]) -> list[str]:
    tasks: list[str] = []
    family_task = FAMILY_TO_TASK.get(rule_family)
    if family_task:
        tasks.append(family_task)
    if isinstance(target_payload.get("action_plan"), dict) or isinstance(target_payload.get("adjudication"), dict):
        tasks.append(TASK_ACTION_PLAN)
    return tasks


def _derive_missing_fields(
    rule_family: str,
    package_payload: dict[str, Any],
    target_payload: dict[str, Any],
    event_time_utc: str | None,
    eligible_tasks: list[str],
    parser_diagnostics: list[dict[str, Any]] | None = None,
) -> list[str]:
    missing: list[str] = []
    if not rule_family or rule_family == "unknown":
        missing.append("rule_family")
    if not package_payload:
        missing.append("package_payload")
    if not event_time_utc:
        missing.append("event_time_utc")

    adjudication = target_payload.get("adjudication")
    if any(task in eligible_tasks for task in (TASK_YARA, TASK_SIGMA, TASK_SNORT)):
        if not isinstance(adjudication, dict) or not str(adjudication.get("verdict", "")).strip():
            missing.append("target_payload.adjudication.verdict")

    action_plan = target_payload.get("action_plan")
    if TASK_ACTION_PLAN in eligible_tasks:
        if not isinstance(action_plan, dict):
            missing.append("target_payload.action_plan")
        else:
            recommended = action_plan.get("recommended_actions")
            if not isinstance(recommended, list) or not recommended:
                missing.append("target_payload.action_plan.recommended_actions")

    if rule_family == "yara":
        full_rule_text = package_payload.get("full_rule_text")
        if not isinstance(full_rule_text, str) or not full_rule_text.strip():
            missing.append("package_payload.full_rule_text")

        rule_metadata = package_payload.get("rule_metadata")
        if not isinstance(rule_metadata, dict):
            missing.append("package_payload.rule_metadata")
        else:
            if not str(rule_metadata.get("source", "")).strip():
                missing.append("package_payload.rule_metadata.source")
            if not str(rule_metadata.get("rule_id", "")).strip():
                missing.append("package_payload.rule_metadata.rule_id")

        object_metadata = package_payload.get("object_metadata")
        if not isinstance(object_metadata, dict):
            missing.append("package_payload.object_metadata")
        else:
            if not str(object_metadata.get("object_id", "")).strip():
                missing.append("package_payload.object_metadata.object_id")
            if not str(object_metadata.get("object_type", "")).strip():
                missing.append("package_payload.object_metadata.object_type")

        raw_hit_payload = package_payload.get("raw_hit_payload")
        if not isinstance(raw_hit_payload, dict):
            missing.append("package_payload.raw_hit_payload")

    if any(str(item.get("severity", "")).lower() == "error" for item in parser_diagnostics or []):
        missing.append("parser_diagnostics.error")

    return missing


def _normalize_parser_name(source_file: dict[str, Any]) -> str:
    parser_name = source_file.get("parser_name")
    if isinstance(parser_name, str) and parser_name.strip():
        return parser_name.strip()

    source_type = str(source_file.get("source_type", "")).lower()
    source_name = str(source_file.get("source_name", "")).lower()
    if source_type == "fixture" and "yara" in source_name:
        return "fixture_yara_parser_v1"
    return "passthrough_source_adapter_v1"


def _merge_mapping(base: dict[str, Any], patch: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(base, dict):
        base = {}
    if not isinstance(patch, dict):
        return dict(base)

    merged = dict(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _merge_mapping(merged[key], value)
            continue
        merged[key] = value
    return merged


def _merge_object_lists(left: list[dict[str, Any]], right: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in list(left) + list(right or []):
        if not isinstance(item, dict):
            continue
        key = json.dumps(item, sort_keys=True, default=str)
        if key in seen:
            continue
        seen.add(key)
        output.append(dict(item))
    return output


def _normalize_raw_payload(raw_payload: dict[str, Any] | None, fallback_payload: dict[str, Any]) -> dict[str, Any]:
    if isinstance(raw_payload, dict):
        return _safe_copy_payload(raw_payload)
    return _safe_copy_payload(fallback_payload)


def _normalize_parser_diagnostics(
    diagnostics: list[dict[str, Any]] | None,
    source_file: dict[str, Any],
) -> list[dict[str, str]]:
    parser_name = str(source_file.get("parser_name", "passthrough_source_adapter_v1"))
    output: list[dict[str, str]] = []
    for item in diagnostics or []:
        if not isinstance(item, dict):
            continue
        severity = str(item.get("severity", "warning")).lower()
        if severity not in {"info", "warning", "error"}:
            severity = "warning"
        output.append(
            {
                "code": str(item.get("code", "adapter.unspecified")),
                "severity": severity,
                "message": str(item.get("message", "Adapter diagnostic")),
                "field_path": str(item.get("field_path", "")),
                "adapter": str(item.get("adapter", parser_name)),
            }
        )
    return output


def _safe_copy_payload(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    try:
        encoded = json.dumps(value, default=str)
        decoded = json.loads(encoded)
        if isinstance(decoded, dict):
            return decoded
    except (TypeError, ValueError):
        pass
    return dict(value)


def _is_split_eligible(task: str, row: dict[str, Any]) -> bool:
    if task not in row.get("eligible_tasks", []):
        return False
    if not row.get("group_key"):
        return False
    if not row.get("event_time_utc"):
        return False
    target = row.get("target_payload")
    if not isinstance(target, dict):
        return False

    if task in {TASK_YARA, TASK_SIGMA, TASK_SNORT}:
        adjudication = target.get("adjudication")
        return isinstance(adjudication, dict) and bool(str(adjudication.get("verdict", "")).strip())

    if task == TASK_ACTION_PLAN:
        action_plan = target.get("action_plan")
        if not isinstance(action_plan, dict):
            return False
        recommended = action_plan.get("recommended_actions")
        return isinstance(recommended, list) and len(recommended) > 0

    return False


def _split_rows_group_time(
    rows: list[dict[str, Any]],
    train_ratio: float,
    validation_ratio: float,
    test_ratio: float,
) -> dict[str, list[dict[str, Any]]]:
    del test_ratio  # Derived by remaining rows.
    ordered_rows = sorted(rows, key=lambda row: (_safe_event_time(row.get("event_time_utc")), row["row_id"]))
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in ordered_rows:
        groups.setdefault(row["group_key"], []).append(row)

    group_order = sorted(
        groups.keys(),
        key=lambda key: (
            min(_safe_event_time(item.get("event_time_utc")) for item in groups[key]),
            key,
        ),
    )

    total_rows = len(ordered_rows)
    train_target = int(total_rows * train_ratio)
    validation_target = int(total_rows * validation_ratio)
    split_rows = {"train": [], "validation": [], "test": []}

    for group_key in group_order:
        group_rows = groups[group_key]
        if len(split_rows["train"]) < train_target:
            split_rows["train"].extend(group_rows)
            continue
        if len(split_rows["validation"]) < validation_target:
            split_rows["validation"].extend(group_rows)
            continue
        split_rows["test"].extend(group_rows)

    for split_name in SPLIT_NAMES:
        split_rows[split_name] = sorted(
            split_rows[split_name],
            key=lambda row: (_safe_event_time(row.get("event_time_utc")), row["row_id"]),
        )
    return split_rows


def _check_split_leakage(split_rows: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    groups_by_split = {
        split_name: {row["group_key"] for row in rows}
        for split_name, rows in split_rows.items()
    }
    overlaps: list[dict[str, Any]] = []
    pairs = [("train", "validation"), ("train", "test"), ("validation", "test")]
    for left, right in pairs:
        shared = sorted(groups_by_split[left].intersection(groups_by_split[right]))
        if shared:
            overlaps.append(
                {
                    "left": left,
                    "right": right,
                    "overlapGroups": shared,
                }
            )
    return {
        "passed": not overlaps,
        "overlaps": overlaps,
    }


def _normalize_list_of_dicts(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [dict(item) for item in value if isinstance(item, dict)]


def _normalize_provenance_item(item: dict[str, Any]) -> dict[str, Any]:
    output: dict[str, Any] = {}
    for key in CANONICAL_PROVENANCE_FIELDS:
        value = item.get(key)
        if value is None:
            output[key] = None
            continue
        output[key] = str(value)
    return output


def _parse_datetime_utc(value: Any) -> datetime | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _safe_event_time(value: Any) -> datetime:
    parsed = _parse_datetime_utc(value)
    if parsed is None:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)
    return parsed


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _default_confidence_for_verdict(verdict: str) -> float:
    if verdict == "confirmed_malicious":
        return 0.92
    if verdict == "likely_malicious":
        return 0.78
    if verdict == "likely_benign":
        return 0.72
    return 0.35


def _default_fp_risk_for_verdict(verdict: str) -> float:
    if verdict in {"confirmed_malicious", "likely_malicious"}:
        return 0.18
    if verdict == "likely_benign":
        return 0.35
    return 0.5


def _count_by_key(rows: list[dict[str, Any]], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        value = str(row.get(key, "unknown"))
        counts[value] = counts.get(value, 0) + 1
    return dict(sorted(counts.items(), key=lambda item: item[0]))


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def _write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True))
            handle.write("\n")


def _scenario_label_from_filename(filename: str, family: str) -> str:
    prefix = f"{family}-"
    suffix = ".example.json"
    if filename.startswith(prefix) and filename.endswith(suffix):
        return filename[len(prefix) : -len(suffix)]
    return "insufficient_evidence"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _render_training_row_report(rows: list[dict[str, Any]]) -> str:
    header = [
        "# Training Row Format",
        "",
        "Canonical JSONL rows produced by `build_adjudication_dataset.py`.",
        "",
        "## Canonical Fields",
    ]
    field_lines = [f"- `{field}`" for field in CANONICAL_ROW_FIELDS]
    semantics = [
        "",
        "## Semantics",
        "- `package_payload` stores the normalized detection package input.",
        "- `target_payload` stores adjudication and action-plan targets.",
        "- `raw_payload` stores the full source row payload before adapter normalization.",
        "- `parser_diagnostics` surfaces adapter-level parse notes without dropping rows.",
        "- `is_partial` and `missing_fields` retain incomplete rows instead of dropping them.",
        "- `eligible_tasks` indicates which task views may include the row.",
        "- Rows can remain in canonical output even when excluded from task split files.",
        "",
        "## Task Views",
        f"- `{TASK_YARA}`",
        f"- `{TASK_SIGMA}`",
        f"- `{TASK_SNORT}`",
        f"- `{TASK_ACTION_PLAN}`",
        "",
        "## Split Policy",
        "- Group+Time split with atomic group assignment and chronological group ordering.",
    ]

    example_row = rows[0] if rows else _empty_example_row()
    example_lines = [
        "",
        "## Example Row",
        "```json",
        json.dumps(example_row, indent=2, sort_keys=True),
        "```",
    ]
    return "\n".join(header + field_lines + semantics + example_lines) + "\n"


def _empty_example_row() -> dict[str, Any]:
    return {
        "row_id": "example-row-id",
        "dataset_version": "example-v1",
        "task_type": TASK_YARA,
        "rule_family": "yara",
        "package_payload": {},
        "target_payload": {},
        "provenance": [],
        "evidence_used": [],
        "evidence_missing": [],
        "raw_payload": {},
        "parser_diagnostics": [],
        "group_key": "yara:rule:object:source",
        "event_time_utc": "2026-01-01T00:00:00+00:00",
        "source_file": {
            "manifest_name": "example.manifest.json",
            "source_name": "example-source",
            "source_type": "external_feed",
            "source_path": "ai/datasets/raw/example/rows.jsonl",
            "record_locator": "row:1",
            "loader": "import_jsonl",
            "parser_name": "passthrough_source_adapter_v1",
        },
        "is_partial": True,
        "missing_fields": ["target_payload.adjudication.verdict"],
        "eligible_tasks": [TASK_YARA],
    }
