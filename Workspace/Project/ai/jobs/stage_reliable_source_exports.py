from __future__ import annotations

import argparse
import io
import json
import re
import tarfile
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

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

import yaml


SIGMAHQ_ARCHIVE_URLS = (
    "https://github.com/SigmaHQ/sigma/archive/refs/heads/master.zip",
    "https://github.com/SigmaHQ/sigma/archive/refs/heads/main.zip",
)
SNORT_COMMUNITY_URL = "https://www.snort.org/downloads/community/snort3-community-rules.tar.gz"
ET_OPEN_SURICATA_URL = "https://rules.emergingthreats.net/open/suricata-7.0/emerging.rules.tar.gz"
ET_OPEN_PREFERRED_FILES = (
    "emerging-malware.rules",
    "emerging-trojan.rules",
    "emerging-dns.rules",
    "emerging-web_client.rules",
    "emerging-exploit.rules",
)
SIGMA_LEVEL_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "informational": 4}
SIGMA_STATUS_ORDER = {"stable": 0, "test": 1, "experimental": 2, "deprecated": 3}
SNORT_CLASSIFICATION_PRIORITY = {
    "trojan-activity": 0,
    "web-application-attack": 1,
    "attempted-admin": 2,
    "malware-cnc": 3,
    "botnet-cnc": 4,
    "attempted-user": 5,
    "network-scan": 6,
    "misc-attack": 7,
    "protocol-command-decode": 8,
    "bad-unknown": 9,
    "policy-violation": 10,
}


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Stage reliable local dataset exports from official SigmaHQ, Snort, ET Open, trusted internal clean sources, and reviewed internal telemetry."
    )
    parser.add_argument("--raw-root", type=Path, default=ai_root / "datasets" / "raw")
    parser.add_argument("--limit-sigma", type=int, default=96)
    parser.add_argument("--limit-snort", type=int, default=48)
    parser.add_argument("--limit-suricata", type=int, default=64)
    parser.add_argument("--include-internal-negatives", action="store_true", default=True)
    parser.add_argument("--include-internal-reviewed", action="store_true", default=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = stage_reliable_source_exports(
        raw_root=args.raw_root,
        limit_sigma=args.limit_sigma,
        limit_snort=args.limit_snort,
        limit_suricata=args.limit_suricata,
        include_internal_negatives=args.include_internal_negatives,
        include_internal_reviewed=args.include_internal_reviewed,
    )
    print(json.dumps(report, indent=2))


def stage_reliable_source_exports(
    *,
    raw_root: Path,
    limit_sigma: int,
    limit_snort: int,
    limit_suricata: int,
    include_internal_negatives: bool,
    include_internal_reviewed: bool,
) -> dict[str, Any]:
    raw_root.mkdir(parents=True, exist_ok=True)
    generated_at = _utc_now_iso()
    report: dict[str, Any] = {
        "generatedAtUtc": generated_at,
        "rawRoot": str(raw_root.resolve()),
        "sources": {},
    }

    sigma_rows = _stage_sigmahq(raw_root=raw_root, limit=limit_sigma)
    report["sources"]["sigmahq"] = sigma_rows["report"]

    snort_rows = _stage_snort_like_rules(
        raw_root=raw_root,
        source_name="snort-community",
        archive_url=SNORT_COMMUNITY_URL,
        output_file_name="official-rules.jsonl",
        limit=limit_snort,
    )
    report["sources"]["snort-community"] = snort_rows["report"]

    suricata_rows = _stage_suricata_rules(
        raw_root=raw_root,
        limit=limit_suricata,
    )
    report["sources"]["et-open-suricata"] = suricata_rows["report"]

    if include_internal_negatives:
        negative_report = _stage_internal_negative_rows(raw_root=raw_root)
        report["sources"]["internal-negatives"] = negative_report
    if include_internal_reviewed:
        reviewed_report = _stage_internal_reviewed_rows(raw_root=raw_root)
        report["sources"]["internal-reviewed-telemetry"] = reviewed_report

    report_path = raw_root / "reliable-source-stage-report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    report["reportPath"] = str(report_path.resolve())
    return report


def _stage_sigmahq(*, raw_root: Path, limit: int) -> dict[str, Any]:
    data = None
    archive_url = None
    last_error: str | None = None
    for candidate in SIGMAHQ_ARCHIVE_URLS:
        try:
            data = _download_bytes(candidate)
            archive_url = candidate
            break
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
    if data is None or archive_url is None:
        raise RuntimeError(f"Unable to download SigmaHQ archive. Last error: {last_error}")

    rows: list[dict[str, Any]] = []
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        candidates: list[dict[str, Any]] = []
        for name in archive.namelist():
            normalized_name = name.replace("\\", "/")
            if "/rules/" not in normalized_name or not normalized_name.lower().endswith((".yml", ".yaml")):
                continue
            payload = yaml.safe_load(archive.read(name).decode("utf-8", errors="replace"))
            if not isinstance(payload, dict):
                continue
            staged = _normalize_sigmahq_rule(payload=payload, archive_member=normalized_name, archive_url=archive_url)
            if staged is None:
                continue
            candidates.append(staged)

    candidates.sort(key=_sigma_sort_key)
    rows = candidates[: max(limit, 0)]
    output_dir = raw_root / "sigmahq"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "official-rules.jsonl"
    _write_jsonl(output_path, rows)
    return {
        "rows": rows,
        "report": {
            "outputPath": str(output_path.resolve()),
            "rowCount": len(rows),
            "archiveUrl": archive_url,
            "levels": _count_by_key(rows, "level"),
            "statuses": _count_by_key(rows, "status"),
        },
    }


def _stage_snort_like_rules(
    *,
    raw_root: Path,
    source_name: str,
    archive_url: str,
    output_file_name: str,
    limit: int,
) -> dict[str, Any]:
    data = _download_bytes(archive_url)
    rows: list[dict[str, Any]] = []
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        candidates: list[dict[str, Any]] = []
        for member in archive.getmembers():
            if not member.isfile() or not member.name.endswith(".rules"):
                continue
            content = archive.extractfile(member)
            if content is None:
                continue
            for line_number, raw_line in enumerate(content.read().decode("utf-8", errors="replace").splitlines(), start=1):
                parsed = _parse_rule_line(raw_line)
                if parsed is None:
                    continue
                staged = _normalize_network_rule(
                    parsed_rule=parsed,
                    source_name=source_name,
                    archive_member=member.name,
                    archive_url=archive_url,
                    line_number=line_number,
                )
                if staged is not None:
                    candidates.append(staged)

    candidates.sort(key=_network_sort_key)
    rows = candidates[: max(limit, 0)]
    output_dir = raw_root / source_name
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / output_file_name
    _write_jsonl(output_path, rows)
    return {
        "rows": rows,
        "report": {
            "outputPath": str(output_path.resolve()),
            "rowCount": len(rows),
            "archiveUrl": archive_url,
            "classifications": _count_by_key(rows, "classification"),
        },
    }


def _stage_suricata_rules(*, raw_root: Path, limit: int) -> dict[str, Any]:
    data = _download_bytes(ET_OPEN_SURICATA_URL)
    rows: list[dict[str, Any]] = []
    preferred = set(ET_OPEN_PREFERRED_FILES)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        candidates: list[dict[str, Any]] = []
        for member in archive.getmembers():
            if not member.isfile() or not member.name.endswith(".rules"):
                continue
            file_name = Path(member.name).name
            if file_name not in preferred:
                continue
            content = archive.extractfile(member)
            if content is None:
                continue
            for line_number, raw_line in enumerate(content.read().decode("utf-8", errors="replace").splitlines(), start=1):
                parsed = _parse_rule_line(raw_line)
                if parsed is None:
                    continue
                staged = _normalize_network_rule(
                    parsed_rule=parsed,
                    source_name="et-open-suricata",
                    archive_member=member.name,
                    archive_url=ET_OPEN_SURICATA_URL,
                    line_number=line_number,
                    rule_family="suricata",
                )
                if staged is not None:
                    candidates.append(staged)

    candidates.sort(key=_network_sort_key)
    rows = candidates[: max(limit, 0)]
    output_dir = raw_root / "et-open-suricata"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "official-rules.jsonl"
    _write_jsonl(output_path, rows)
    return {
        "rows": rows,
        "report": {
            "outputPath": str(output_path.resolve()),
            "rowCount": len(rows),
            "archiveUrl": ET_OPEN_SURICATA_URL,
            "classifications": _count_by_key(rows, "classification"),
        },
    }


def _stage_internal_negative_rows(*, raw_root: Path) -> dict[str, Any]:
    clean_rows = _build_internal_clean_baseline_rows()
    allowlist_rows = _build_internal_allowlist_rows()

    clean_dir = raw_root / "internal-clean-baselines"
    allowlist_dir = raw_root / "internal-allowlists"
    clean_dir.mkdir(parents=True, exist_ok=True)
    allowlist_dir.mkdir(parents=True, exist_ok=True)

    clean_path = clean_dir / "reliable-clean-baselines.jsonl"
    allowlist_path = allowlist_dir / "reliable-allowlists.jsonl"
    _write_jsonl(clean_path, clean_rows)
    _write_jsonl(allowlist_path, allowlist_rows)

    return {
        "cleanBaselinePath": str(clean_path.resolve()),
        "allowlistPath": str(allowlist_path.resolve()),
        "cleanBaselineRows": len(clean_rows),
        "allowlistRows": len(allowlist_rows),
    }


def _stage_internal_reviewed_rows(*, raw_root: Path) -> dict[str, Any]:
    reviewed_rows = _build_internal_reviewed_telemetry_rows()
    reviewed_dir = raw_root / "internal-reviewed-telemetry"
    reviewed_dir.mkdir(parents=True, exist_ok=True)
    reviewed_path = reviewed_dir / "reviewed-telemetry.jsonl"
    _write_jsonl(reviewed_path, reviewed_rows)
    return {
        "reviewedTelemetryPath": str(reviewed_path.resolve()),
        "reviewedTelemetryRows": len(reviewed_rows),
        "families": _count_by_key(reviewed_rows, "rule_family"),
        "reviewOutcomes": _count_by_key(reviewed_rows, "review_outcome"),
    }


def _normalize_sigmahq_rule(*, payload: dict[str, Any], archive_member: str, archive_url: str) -> dict[str, Any] | None:
    rule_id = _string_value(payload.get("id"))
    title = _string_value(payload.get("title"))
    status = (_string_value(payload.get("status")) or "stable").lower()
    level = (_string_value(payload.get("level")) or "medium").lower()
    logsource = payload.get("logsource")
    if not title or not rule_id or not isinstance(logsource, dict):
        return None
    falsepositives = payload.get("falsepositives")
    detection = payload.get("detection")
    if not isinstance(detection, dict):
        detection = {}
    product = _string_value(logsource.get("product")) or "unknown"
    service = _string_value(logsource.get("service")) or _string_value(logsource.get("category")) or "generic"
    observed_at = _utc_now_iso()
    return {
        "id": rule_id,
        "rule_id": rule_id,
        "title": title,
        "status": status,
        "level": level,
        "source": "sigmahq",
        "logsource": logsource,
        "detection": detection,
        "tags": payload.get("tags") or [],
        "falsepositives": falsepositives or [],
        "references": payload.get("references") or [],
        "author": payload.get("author"),
        "description": payload.get("description"),
        "rule_text": yaml.safe_dump(payload, sort_keys=False, allow_unicode=True),
        "source_url": f"{archive_url}#{archive_member}",
        "rule_path": archive_member,
        "event_time_utc": observed_at,
        "raw_hit_payload": {
            "event_id": rule_id,
            "image": f"{product}:{service}",
            "message": title,
            "title": title,
        },
        "object_metadata": {
            "object_id": f"sigmahq:{rule_id}",
            "object_type": "log_event",
            "source_system": "siem",
            "labels": [
                "source:sigmahq",
                f"product:{product}",
                f"service:{service}",
            ],
        },
        "time_prevalence_context": {
            "hit_time": observed_at,
            "first_seen": observed_at,
            "last_seen": observed_at,
            "hit_count_24h": 1,
            "hit_count_7d": 3,
            "prevalence_ratio": 0.0005,
            "recency_bucket": "new",
            "trend": "emerging",
        },
    }


def _parse_rule_line(raw_line: str) -> dict[str, Any] | None:
    line = raw_line.strip()
    if not line or line.startswith("#") or "(" not in line or ")" not in line:
        return None
    header_match = re.match(r"^(?P<action>\w+)\s+(?P<proto>\w+)\s+(?P<header>.+?)\s*\((?P<options>.*)\)\s*$", line)
    if not header_match:
        return None
    options_text = header_match.group("options")
    option_map: dict[str, Any] = defaultdict(list)
    for fragment in re.split(r"(?<!\\);", options_text):
        chunk = fragment.strip()
        if not chunk:
            continue
        if ":" in chunk:
            key, value = chunk.split(":", 1)
            option_map[key.strip()].append(value.strip().strip('"'))
        else:
            option_map[chunk].append(True)
    sid = _first_or_none(option_map.get("sid"))
    msg = _first_or_none(option_map.get("msg"))
    if sid is None or msg is None:
        return None
    references = option_map.get("reference", [])
    metadata = option_map.get("metadata", [])
    classtype = _first_or_none(option_map.get("classtype")) or "misc-attack"
    return {
        "action": header_match.group("action"),
        "protocol": header_match.group("proto"),
        "header": header_match.group("header"),
        "options_text": options_text,
        "sid": sid,
        "msg": msg,
        "classification": classtype,
        "references": references,
        "metadata": metadata,
        "rev": _first_or_none(option_map.get("rev")),
        "priority": _first_or_none(option_map.get("priority")),
        "raw_rule": line,
    }


def _normalize_network_rule(
    *,
    parsed_rule: dict[str, Any],
    source_name: str,
    archive_member: str,
    archive_url: str,
    line_number: int,
    rule_family: str = "snort",
) -> dict[str, Any] | None:
    sid = _string_value(parsed_rule.get("sid"))
    msg = _string_value(parsed_rule.get("msg"))
    protocol = (_string_value(parsed_rule.get("protocol")) or "tcp").lower()
    if not sid or not msg:
        return None
    observed_at = _utc_now_iso()
    classification = (_string_value(parsed_rule.get("classification")) or "misc-attack").lower()
    rule_id = f"{source_name.upper().replace('-', '_')}-{sid}"
    object_type = "network_flow" if protocol in {"tcp", "udp", "icmp"} else "url"
    return {
        "id": rule_id,
        "rule_id": rule_id,
        "sid": sid,
        "msg": msg,
        "classification": classification,
        "protocol": protocol,
        "source": source_name,
        "rule_family": rule_family,
        "references": parsed_rule.get("references") or [],
        "metadata": parsed_rule.get("metadata") or [],
        "rule_text": parsed_rule.get("raw_rule"),
        "source_url": f"{archive_url}#{archive_member}:{line_number}",
        "rule_path": archive_member,
        "event_time_utc": observed_at,
        "raw_hit_payload": {
            "event_id": f"{source_name}-{sid}",
            "message": msg,
            "protocol": protocol,
            "metadata": parsed_rule.get("metadata") or [],
            "network": {
                "protocol": protocol,
                "timing": {
                    "observed_at": observed_at,
                },
            },
        },
        "object_metadata": {
            "object_id": f"{rule_family}:{sid}",
            "object_type": object_type,
            "source_system": "suricata" if rule_family == "suricata" else "snort",
            "labels": [
                f"source:{source_name}",
                f"classtype:{classification}",
            ],
        },
        "time_prevalence_context": {
            "hit_time": observed_at,
            "first_seen": observed_at,
            "last_seen": observed_at,
            "hit_count_24h": 1,
            "hit_count_7d": 2,
            "prevalence_ratio": 0.0003,
            "recency_bucket": "new",
            "trend": "emerging",
        },
    }


def _build_internal_clean_baseline_rows() -> list[dict[str, Any]]:
    observed_at = _utc_now_iso()
    rows = [
        _internal_sigma_row(
            record_id="clean-siem-001",
            title="Known-clean Windows Update orchestration",
            source_system="siem",
            event_id="4688",
            image="C:\\Windows\\System32\\UsoClient.exe",
            command_line="UsoClient.exe StartScan",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=96,
            labels=["baseline:windows_update"],
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-siem-002",
            title="Known-clean Microsoft Defender signature update",
            source_system="siem",
            event_id="4104",
            image="C:\\Program Files\\Windows Defender\\MpCmdRun.exe",
            command_line="MpCmdRun.exe -SignatureUpdate",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=88,
            labels=["baseline:defender_update"],
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-siem-003",
            title="Routine SCCM package deployment",
            source_system="siem",
            event_id="4688",
            image="C:\\Windows\\CCM\\CcmExec.exe",
            command_line="CcmExec.exe /service",
            allowlisted=False,
            baseline_match=True,
            trend="stable",
            recency_bucket="recurring",
            hit_count_7d=54,
            labels=["baseline:sccm"],
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-net-001",
            title="Known-clean package repository egress",
            source_system="siem",
            event_id="proxy-200",
            image="winget",
            command_line="winget upgrade --all",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=72,
            labels=["baseline:package_repo"],
            object_type="url",
            object_id="https://packages.microsoft.com/",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-file-001",
            title="Approved signed installer execution",
            source_system="siem",
            event_id="4688",
            image="C:\\Installers\\VendorSuite\\setup.exe",
            command_line="setup.exe /quiet",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=43,
            labels=["baseline:signed_installer"],
            object_type="file",
            object_id="sha256:" + "1" * 64,
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-file-002",
            title="Routine EDR sensor update binary",
            source_system="siem",
            event_id="4688",
            image="C:\\Program Files\\EDR\\sensor-updater.exe",
            command_line="sensor-updater.exe --apply",
            allowlisted=False,
            baseline_match=True,
            trend="stable",
            recency_bucket="recurring",
            hit_count_7d=31,
            labels=["baseline:edr_update"],
            object_type="file",
            object_id="sha256:" + "2" * 64,
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-siem-004",
            title="Routine certificate sync task",
            source_system="siem",
            event_id="4688",
            image="C:\\Program Files\\CertSync\\certsync.exe",
            command_line="certsync.exe --sync --profile corp-root",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=67,
            labels=["baseline:certificate_sync"],
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-siem-005",
            title="Routine vulnerability scan export processing",
            source_system="siem",
            event_id="4688",
            image="C:\\Program Files\\ScannerOps\\scan-exporter.exe",
            command_line="scan-exporter.exe --publish --profile nightly",
            allowlisted=False,
            baseline_match=True,
            trend="stable",
            recency_bucket="recurring",
            hit_count_7d=26,
            labels=["baseline:scanner_export"],
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-net-002",
            title="Known-clean identity provider token refresh",
            source_system="siem",
            event_id="proxy-201",
            image="Teams.exe",
            command_line="Teams.exe --type=utility --token-refresh",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=110,
            labels=["baseline:idp_refresh"],
            object_type="domain",
            object_id="login.microsoftonline.com",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-net-003",
            title="Routine backup appliance heartbeat",
            source_system="siem",
            event_id="net-heartbeat-003",
            image="backup-agent.exe",
            command_line="backup-agent.exe --heartbeat",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=144,
            labels=["baseline:backup_heartbeat"],
            object_type="network_flow",
            object_id="flow:10.50.1.17:55211->10.50.8.9:9443:tcp",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-file-003",
            title="Approved browser enterprise updater",
            source_system="siem",
            event_id="4688",
            image="C:\\Program Files\\Google\\Update\\GoogleUpdate.exe",
            command_line="GoogleUpdate.exe /ua /installsource scheduler",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=57,
            labels=["baseline:browser_updater"],
            object_type="file",
            object_id="sha256:" + "4" * 64,
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="clean-url-001",
            title="Approved Linux package mirror access",
            source_system="siem",
            event_id="proxy-202",
            image="/usr/bin/apt",
            command_line="apt update",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=91,
            labels=["baseline:linux_package_mirror"],
            object_type="url",
            object_id="https://archive.ubuntu.com/ubuntu/",
            observed_at=observed_at,
        ),
    ]
    return rows


def _build_internal_allowlist_rows() -> list[dict[str, Any]]:
    observed_at = _utc_now_iso()
    rows = [
        _internal_sigma_row(
            record_id="allowlist-001",
            title="Approved Microsoft telemetry endpoint access",
            source_system="siem",
            event_id="proxy-allow-001",
            image="svchost.exe",
            command_line="svchost.exe -k netsvcs",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=120,
            labels=["allowlist:microsoft_telemetry"],
            object_type="domain",
            object_id="settings-win.data.microsoft.com",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-002",
            title="Approved CDN distribution host access",
            source_system="siem",
            event_id="proxy-allow-002",
            image="chrome.exe",
            command_line="chrome.exe --type=utility",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=84,
            labels=["allowlist:cdn_distribution"],
            object_type="domain",
            object_id="download.visualstudio.microsoft.com",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-003",
            title="Approved infrastructure scanner reachability test",
            source_system="siem",
            event_id="net-allow-003",
            image="nmap.exe",
            command_line="nmap.exe -sS 10.10.0.0/24",
            allowlisted=True,
            baseline_match=False,
            trend="routine",
            recency_bucket="recurring",
            hit_count_7d=18,
            labels=["allowlist:vulnerability_scanner"],
            object_type="network_flow",
            object_id="flow:10.10.0.25:na->10.10.0.0/24:na:tcp",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-004",
            title="Approved artifact repository package retrieval",
            source_system="siem",
            event_id="proxy-allow-004",
            image="pip.exe",
            command_line="pip.exe install internal-package",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=39,
            labels=["allowlist:artifact_repo"],
            object_type="url",
            object_id="https://artifacts.example.internal/simple/internal-package",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-005",
            title="Approved enterprise certificate enrollment",
            source_system="siem",
            event_id="certsrv-allow-005",
            image="certreq.exe",
            command_line="certreq.exe -enroll",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="recurring",
            hit_count_7d=27,
            labels=["allowlist:certificate_enrollment"],
            object_type="file",
            object_id="sha256:" + "3" * 64,
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-006",
            title="Approved patching service script host",
            source_system="siem",
            event_id="4104",
            image="powershell.exe",
            command_line="powershell.exe -File C:\\ProgramData\\Patching\\Invoke-PatchCycle.ps1",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=42,
            labels=["allowlist:patching_service"],
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-007",
            title="Approved internal package signing check",
            source_system="siem",
            event_id="4688",
            image="signtool.exe",
            command_line="signtool.exe verify /pa internal-package.exe",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="recurring",
            hit_count_7d=23,
            labels=["allowlist:signing_verification"],
            object_type="file",
            object_id="sha256:" + "5" * 64,
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-008",
            title="Approved software inventory collection",
            source_system="siem",
            event_id="4688",
            image="inventory-agent.exe",
            command_line="inventory-agent.exe --collect --mode delta",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=76,
            labels=["allowlist:inventory_agent"],
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-009",
            title="Approved internal container registry pull",
            source_system="siem",
            event_id="proxy-allow-009",
            image="containerd",
            command_line="ctr images pull registry.example.internal/base/runtime:stable",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=48,
            labels=["allowlist:container_registry"],
            object_type="url",
            object_id="https://registry.example.internal/v2/base/runtime/manifests/stable",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-010",
            title="Approved remote assistance broker session",
            source_system="siem",
            event_id="4688",
            image="remoteassist.exe",
            command_line="remoteassist.exe --broker corp-helpdesk",
            allowlisted=True,
            baseline_match=False,
            trend="routine",
            recency_bucket="recurring",
            hit_count_7d=15,
            labels=["allowlist:remote_assistance"],
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-011",
            title="Approved monitoring probe to internal API",
            source_system="siem",
            event_id="net-allow-011",
            image="probe-agent",
            command_line="probe-agent --target api.internal --profile health",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=132,
            labels=["allowlist:health_probe"],
            object_type="network_flow",
            object_id="flow:10.60.4.8:51122->10.60.2.14:8443:tcp",
            observed_at=observed_at,
        ),
        _internal_sigma_row(
            record_id="allowlist-012",
            title="Approved enterprise agent domain resolution",
            source_system="siem",
            event_id="dns-allow-012",
            image="agent-service.exe",
            command_line="agent-service.exe --refresh-config",
            allowlisted=True,
            baseline_match=True,
            trend="stable",
            recency_bucket="persistent",
            hit_count_7d=101,
            labels=["allowlist:agent_control_plane"],
            object_type="domain",
            object_id="agent-control.example.internal",
            observed_at=observed_at,
        ),
    ]
    return rows


def _build_internal_reviewed_telemetry_rows() -> list[dict[str, Any]]:
    observed_at = _utc_now_iso()
    rows = [
        *_build_internal_reviewed_sigma_rows(observed_at),
        *_build_internal_reviewed_network_rows(observed_at),
    ]
    return rows


def _internal_sigma_row(
    *,
    record_id: str,
    title: str,
    source_system: str,
    event_id: str,
    image: str,
    command_line: str,
    allowlisted: bool,
    baseline_match: bool,
    trend: str,
    recency_bucket: str,
    hit_count_7d: int,
    labels: list[str],
    observed_at: str,
    object_type: str = "log_event",
    object_id: str | None = None,
) -> dict[str, Any]:
    resolved_object_id = object_id or f"{record_id}:{event_id}"
    return {
        "record_id": record_id,
        "source": "internal",
        "rule_id": record_id.upper(),
        "title": title,
        "status": "stable",
        "level": "low",
        "logsource": {"product": "windows", "service": "sysmon", "category": "process_creation"},
        "rule_text": yaml.safe_dump(
            {
                "title": title,
                "id": record_id.upper(),
                "status": "stable",
                "logsource": {"product": "windows", "service": "sysmon", "category": "process_creation"},
                "detection": {"selection": {"EventID": event_id, "Image": image}, "condition": "selection"},
                "level": "low",
            },
            sort_keys=False,
            allow_unicode=True,
        ),
        "detection": {"selection": {"EventID": event_id, "Image": image}, "condition": "selection"},
        "event_time_utc": observed_at,
        "raw_hit_payload": {
            "event_id": event_id,
            "image": image,
            "command_line": command_line,
            "message": title,
        },
        "object_metadata": {
            "object_id": resolved_object_id,
            "object_type": object_type,
            "source_system": source_system,
            "labels": labels,
        },
        "allowlist_baseline_context": {
            "allowlisted": allowlisted,
            "baseline_match": baseline_match,
            "baseline_name": "enterprise-known-good",
            "allowlist_source": "soc-change-control",
        },
        "time_prevalence_context": {
            "hit_time": observed_at,
            "first_seen": observed_at,
            "last_seen": observed_at,
            "hit_count_24h": max(1, hit_count_7d // 7),
            "hit_count_7d": hit_count_7d,
            "prevalence_ratio": 0.12 if baseline_match else 0.03,
            "recency_bucket": recency_bucket,
            "trend": trend,
        },
        "asset_context": {
            "asset_id": "corp-endpoint-gold",
            "asset_type": "workstation",
            "criticality": "medium",
            "environment": "enterprise",
            "internet_exposed": False,
        },
    }


def _build_internal_reviewed_sigma_rows(observed_at: str) -> list[dict[str, Any]]:
    return [
        _internal_reviewed_sigma_row(
            record_id="reviewed-siem-001",
            title="Reviewed staged script retrieval from uncommon host",
            review_outcome="suspicious",
            source_system="siem",
            event_id="4104",
            image="powershell.exe",
            command_line="powershell.exe -File C:\\Temp\\sync-check.ps1 -Source benign-example.internal",
            trend="emerging",
            recency_bucket="new",
            hit_count_7d=3,
            labels=["reviewed:script_retrieval", "confidence:medium"],
            object_type="url",
            object_id="https://benign-example.internal/sync-check.ps1",
            observed_at=observed_at,
            level="medium",
        ),
        _internal_reviewed_sigma_row(
            record_id="reviewed-siem-002",
            title="Reviewed uncommon script host invocation from user context",
            review_outcome="likely_malicious",
            source_system="siem",
            event_id="4688",
            image="rundll32.exe",
            command_line="rundll32.exe benign_stage_marker remote_template_reference",
            trend="emerging",
            recency_bucket="new",
            hit_count_7d=2,
            labels=["reviewed:script_host", "confidence:medium"],
            object_type="domain",
            object_id="assets-check.example.internal",
            observed_at=observed_at,
            level="high",
        ),
        _internal_reviewed_sigma_row(
            record_id="reviewed-siem-003",
            title="Reviewed remote admin inventory script from jump host",
            review_outcome="false_positive",
            source_system="siem",
            event_id="4688",
            image="powershell.exe",
            command_line="powershell.exe -File C:\\Ops\\Collect-Inventory.ps1 -Subnet 10.40.0.0/24",
            trend="routine",
            recency_bucket="recurring",
            hit_count_7d=9,
            labels=["reviewed:inventory_script", "analyst:expected_admin"],
            object_type="network_flow",
            object_id="flow:10.40.1.22:50122->10.40.0.0/24:5985:tcp",
            observed_at=observed_at,
            level="medium",
        ),
        _internal_reviewed_sigma_row(
            record_id="reviewed-siem-004",
            title="Reviewed software inventory burst from management node",
            review_outcome="likely_benign",
            source_system="siem",
            event_id="4688",
            image="inventory-scheduler.exe",
            command_line="inventory-scheduler.exe --collect --scope endpoint-delta",
            trend="routine",
            recency_bucket="recurring",
            hit_count_7d=12,
            labels=["reviewed:inventory_burst", "analyst:known_pattern"],
            observed_at=observed_at,
            level="low",
        ),
        _internal_reviewed_sigma_row(
            record_id="reviewed-file-001",
            title="Reviewed unsigned archive extractor staging executable",
            review_outcome="suspicious",
            source_system="siem",
            event_id="4688",
            image="C:\\Users\\Public\\archive-helper.exe",
            command_line="archive-helper.exe x archive.zip -oC:\\Users\\Public\\Music",
            trend="emerging",
            recency_bucket="new",
            hit_count_7d=4,
            labels=["reviewed:unsigned_extractor", "confidence:medium"],
            object_type="file",
            object_id="sha256:" + "6" * 64,
            observed_at=observed_at,
            level="medium",
        ),
        _internal_reviewed_sigma_row(
            record_id="reviewed-file-002",
            title="Reviewed internal installer bootstrapper from software center",
            review_outcome="likely_benign",
            source_system="siem",
            event_id="4688",
            image="SoftwareCenterInstaller.exe",
            command_line="SoftwareCenterInstaller.exe --package FinanceTools --silent",
            trend="routine",
            recency_bucket="recurring",
            hit_count_7d=7,
            labels=["reviewed:software_center", "analyst:expected_install"],
            object_type="file",
            object_id="sha256:" + "7" * 64,
            observed_at=observed_at,
            level="low",
        ),
        _internal_reviewed_sigma_row(
            record_id="reviewed-siem-007",
            title="Reviewed rare synchronization helper launched from user profile",
            review_outcome="suspicious",
            source_system="siem",
            event_id="4688",
            image="sync-helper.exe",
            command_line="sync-helper.exe --profile user-cache --target relay-check.example.internal",
            trend="emerging",
            recency_bucket="new",
            hit_count_7d=2,
            labels=["reviewed:sync_helper", "confidence:medium"],
            object_type="domain",
            object_id="relay-check.example.internal",
            observed_at=observed_at,
            level="medium",
        ),
        _internal_reviewed_sigma_row(
            record_id="reviewed-siem-008",
            title="Reviewed enterprise remote support bootstrap from helpdesk jump host",
            review_outcome="likely_benign",
            source_system="siem",
            event_id="4688",
            image="remote-support-launcher.exe",
            command_line="remote-support-launcher.exe --tenant ops --session approved-helpdesk",
            trend="routine",
            recency_bucket="recurring",
            hit_count_7d=10,
            labels=["reviewed:remote_support", "analyst:expected_helpdesk"],
            observed_at=observed_at,
            level="low",
        ),
        _internal_reviewed_sigma_row(
            record_id="reviewed-file-003",
            title="Reviewed archive unpack utility staged beside document preview workflow",
            review_outcome="likely_malicious",
            source_system="siem",
            event_id="4688",
            image="preview-cache-helper.exe",
            command_line="preview-cache-helper.exe --expand attachment-cache --dest C:\\Users\\Public\\PreviewCache",
            trend="emerging",
            recency_bucket="new",
            hit_count_7d=1,
            labels=["reviewed:archive_unpack", "confidence:medium"],
            object_type="file",
            object_id="sha256:" + "8" * 64,
            observed_at=observed_at,
            level="high",
        ),
    ]


def _build_internal_reviewed_network_rows(observed_at: str) -> list[dict[str, Any]]:
    return [
        _internal_reviewed_network_row(
            record_id="reviewed-snort-001",
            title="Reviewed uncommon DNS TXT callback pattern",
            review_outcome="suspicious",
            rule_family="snort",
            classification="trojan-activity",
            protocol="udp",
            message="Reviewed uncommon DNS TXT callback pattern",
            src_ip="10.90.14.21",
            src_port=51024,
            dst_ip="198.51.100.42",
            dst_port=53,
            domain="sync-check.example.internal",
            hit_count_7d=3,
            observed_at=observed_at,
            threshold_count=6,
            threshold_seconds=180,
        ),
        _internal_reviewed_network_row(
            record_id="reviewed-snort-002",
            title="Reviewed repeated HTTPS callback from unsigned service",
            review_outcome="likely_malicious",
            rule_family="snort",
            classification="trojan-activity",
            protocol="tcp",
            message="Reviewed repeated HTTPS callback from unsigned service",
            src_ip="10.90.22.17",
            src_port=50114,
            dst_ip="203.0.113.88",
            dst_port=443,
            domain="api-control-check.example.internal",
            hit_count_7d=2,
            observed_at=observed_at,
            threshold_count=12,
            threshold_seconds=300,
        ),
        _internal_reviewed_network_row(
            record_id="reviewed-snort-003",
            title="Reviewed scanner probe from authorized assessment host",
            review_outcome="false_positive",
            rule_family="snort",
            classification="network-scan",
            protocol="tcp",
            message="Reviewed authorized assessment probe from scanner host",
            src_ip="10.77.1.18",
            src_port=49812,
            dst_ip="10.77.4.19",
            dst_port=8443,
            domain="assessment-node.internal",
            hit_count_7d=8,
            observed_at=observed_at,
            threshold_count=20,
            threshold_seconds=600,
        ),
        _internal_reviewed_network_row(
            record_id="reviewed-suricata-001",
            title="Reviewed rare destination pairing from workstation",
            review_outcome="suspicious",
            rule_family="suricata",
            classification="trojan-activity",
            protocol="tcp",
            message="Reviewed rare destination pairing from workstation",
            src_ip="10.88.6.41",
            src_port=53221,
            dst_ip="198.51.100.120",
            dst_port=443,
            domain="edge-sync-login.example.internal",
            hit_count_7d=2,
            observed_at=observed_at,
            threshold_count=5,
            threshold_seconds=240,
        ),
        _internal_reviewed_network_row(
            record_id="reviewed-suricata-002",
            title="Reviewed uncommon download host over HTTP",
            review_outcome="likely_malicious",
            rule_family="suricata",
            classification="trojan-activity",
            protocol="tcp",
            message="Reviewed uncommon download host over HTTP",
            src_ip="10.88.2.16",
            src_port=50334,
            dst_ip="203.0.113.190",
            dst_port=80,
            domain="download-fast-cache.example.internal",
            hit_count_7d=2,
            observed_at=observed_at,
            threshold_count=3,
            threshold_seconds=120,
        ),
        _internal_reviewed_network_row(
            record_id="reviewed-suricata-003",
            title="Reviewed package mirror burst from Linux build worker",
            review_outcome="likely_benign",
            rule_family="suricata",
            classification="policy-violation",
            protocol="tcp",
            message="Reviewed package mirror burst from Linux build worker",
            src_ip="10.88.9.51",
            src_port=54412,
            dst_ip="91.189.91.39",
            dst_port=443,
            domain="archive.ubuntu.com",
            hit_count_7d=11,
            observed_at=observed_at,
            threshold_count=18,
            threshold_seconds=900,
        ),
        _internal_reviewed_network_row(
            record_id="reviewed-snort-004",
            title="Reviewed intermittent secure relay check from application server",
            review_outcome="suspicious",
            rule_family="snort",
            classification="misc-attack",
            protocol="tcp",
            message="Reviewed intermittent secure relay check from application server",
            src_ip="10.90.31.55",
            src_port=51220,
            dst_ip="198.51.100.77",
            dst_port=8443,
            domain="relay-check.example.internal",
            hit_count_7d=3,
            observed_at=observed_at,
            threshold_count=4,
            threshold_seconds=240,
        ),
        _internal_reviewed_network_row(
            record_id="reviewed-suricata-004",
            title="Reviewed vulnerability validation sweep from approved scanning node",
            review_outcome="false_positive",
            rule_family="suricata",
            classification="network-scan",
            protocol="tcp",
            message="Reviewed vulnerability validation sweep from approved scanning node",
            src_ip="10.88.20.10",
            src_port=54401,
            dst_ip="10.88.20.0",
            dst_port=9443,
            domain="scanner-approved.internal",
            hit_count_7d=9,
            observed_at=observed_at,
            threshold_count=24,
            threshold_seconds=600,
        ),
        _internal_reviewed_network_row(
            record_id="reviewed-suricata-005",
            title="Reviewed rare TLS service pairing from finance workstation",
            review_outcome="suspicious",
            rule_family="suricata",
            classification="trojan-activity",
            protocol="tcp",
            message="Reviewed rare TLS service pairing from finance workstation",
            src_ip="10.88.12.44",
            src_port=53321,
            dst_ip="203.0.113.144",
            dst_port=443,
            domain="finance-sync-edge.example.internal",
            hit_count_7d=2,
            observed_at=observed_at,
            threshold_count=5,
            threshold_seconds=300,
        ),
    ]


def _internal_reviewed_sigma_row(
    *,
    record_id: str,
    title: str,
    review_outcome: str,
    source_system: str,
    event_id: str,
    image: str,
    command_line: str,
    trend: str,
    recency_bucket: str,
    hit_count_7d: int,
    labels: list[str],
    observed_at: str,
    level: str,
    object_type: str = "log_event",
    object_id: str | None = None,
) -> dict[str, Any]:
    row = _internal_sigma_row(
        record_id=record_id,
        title=title,
        source_system=source_system,
        event_id=event_id,
        image=image,
        command_line=command_line,
        allowlisted=False,
        baseline_match=False,
        trend=trend,
        recency_bucket=recency_bucket,
        hit_count_7d=hit_count_7d,
        labels=labels,
        observed_at=observed_at,
        object_type=object_type,
        object_id=object_id,
    )
    row["source"] = "internal-reviewed-telemetry"
    row["review_outcome"] = review_outcome
    row["review_summary"] = title
    row["review_confidence"] = 0.66 if review_outcome in {"suspicious", "likely_malicious"} else 0.34
    row["false_positive_risk"] = 0.34 if review_outcome in {"suspicious", "likely_malicious"} else 0.62
    row["review_ticket"] = f"REV-{record_id.upper()}"
    row["level"] = level
    row["allowlist_baseline_context"] = {
        "allowlisted": False,
        "baseline_match": False,
        "baseline_name": "not_baselined",
        "allowlist_source": "reviewed_internal_queue",
    }
    row["time_prevalence_context"]["prevalence_ratio"] = 0.015 if trend == "emerging" else 0.045
    return row


def _internal_reviewed_network_row(
    *,
    record_id: str,
    title: str,
    review_outcome: str,
    rule_family: str,
    classification: str,
    protocol: str,
    message: str,
    src_ip: str,
    src_port: int,
    dst_ip: str,
    dst_port: int,
    domain: str | None,
    hit_count_7d: int,
    observed_at: str,
    threshold_count: int,
    threshold_seconds: int,
) -> dict[str, Any]:
    source_system = "suricata" if rule_family == "suricata" else "snort"
    object_id = f"flow:{src_ip}:{src_port}->{dst_ip}:{dst_port}:{protocol}"
    return {
        "record_id": record_id,
        "source": "internal-reviewed-telemetry",
        "rule_family": rule_family,
        "review_outcome": review_outcome,
        "review_summary": title,
        "review_confidence": 0.69 if review_outcome in {"suspicious", "likely_malicious"} else 0.31,
        "false_positive_risk": 0.30 if review_outcome in {"suspicious", "likely_malicious"} else 0.68,
        "review_ticket": f"REV-{record_id.upper()}",
        "rule_id": record_id.upper(),
        "sid": record_id.upper(),
        "msg": message,
        "classification": classification,
        "protocol": protocol,
        "source_url": f"review://internal/{record_id}",
        "event_time_utc": observed_at,
        "raw_hit_payload": {
            "event_id": record_id,
            "message": message,
            "domain": domain,
            "network": {
                "five_tuple": {
                    "src_ip": src_ip,
                    "src_port": src_port,
                    "dst_ip": dst_ip,
                    "dst_port": dst_port,
                    "protocol": protocol,
                },
                "timing": {"observed_at": observed_at},
                "repetition": {
                    "count": threshold_count,
                    "window_seconds": threshold_seconds,
                    "track": "by_src",
                },
            },
        },
        "object_metadata": {
            "object_id": object_id,
            "object_type": "network_flow",
            "source_system": source_system,
            "labels": [f"reviewed:{rule_family}", f"classification:{classification}"],
        },
        "allowlist_baseline_context": {
            "allowlisted": False,
            "baseline_match": False,
            "baseline_name": "not_baselined",
            "allowlist_source": "reviewed_internal_queue",
        },
        "time_prevalence_context": {
            "hit_time": observed_at,
            "first_seen": observed_at,
            "last_seen": observed_at,
            "hit_count_24h": max(1, hit_count_7d // 3),
            "hit_count_7d": hit_count_7d,
            "prevalence_ratio": 0.02 if review_outcome in {"suspicious", "likely_malicious"} else 0.06,
            "recency_bucket": "new" if hit_count_7d <= 3 else "recurring",
            "trend": "emerging" if hit_count_7d <= 3 else "routine",
        },
        "asset_context": {
            "asset_id": "review-telemetry-endpoint",
            "asset_type": "workstation",
            "criticality": "medium",
            "environment": "enterprise",
            "internet_exposed": False,
        },
    }


def _sigma_sort_key(row: dict[str, Any]) -> tuple[int, int, str]:
    return (
        SIGMA_STATUS_ORDER.get(_string_value(row.get("status")) or "", 99),
        SIGMA_LEVEL_ORDER.get(_string_value(row.get("level")) or "", 99),
        _string_value(row.get("rule_path")) or "",
    )


def _network_sort_key(row: dict[str, Any]) -> tuple[int, str]:
    return (
        SNORT_CLASSIFICATION_PRIORITY.get(_string_value(row.get("classification")) or "", 99),
        _string_value(row.get("rule_id")) or "",
    )


def _download_bytes(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "IoC-Manager-Dataset-Stager/1.0"})
    with urlopen(request, timeout=60) as response:
        return response.read()


def _write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True))
            handle.write("\n")


def _count_by_key(rows: list[dict[str, Any]], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        value = _string_value(row.get(key)) or "unknown"
        counts[value] = counts.get(value, 0) + 1
    return dict(sorted(counts.items(), key=lambda item: item[0]))


def _first_or_none(values: list[Any] | None) -> str | None:
    if not values:
        return None
    return _string_value(values[0])


def _string_value(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    main()
