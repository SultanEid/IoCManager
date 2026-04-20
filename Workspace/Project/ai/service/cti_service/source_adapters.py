from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable


Diagnostic = dict[str, str]

SIGMA_REQUIRED_RULE_FIELDS = ("source", "rule_id", "title", "id", "status", "logsource")
SIGMA_ALLOWED_STATUS = {"stable", "test", "experimental", "deprecated"}
SIGMA_ALLOWED_LEVEL = {"critical", "high", "medium", "low", "informational"}
SNORT_REQUIRED_RULE_FIELDS = ("source", "rule_id", "sid", "msg", "classification", "protocol")

ASSET_CONTEXT_KEYS = {
    "asset_id",
    "asset_name",
    "asset_type",
    "owner",
    "business_unit",
    "criticality",
    "internet_exposed",
    "environment",
    "tags",
}
TIME_PREVALENCE_CONTEXT_KEYS = {
    "hit_time",
    "first_seen",
    "last_seen",
    "hit_count_24h",
    "hit_count_7d",
    "prevalence_ratio",
    "recency_bucket",
    "trend",
}
ALLOWLIST_BASELINE_CONTEXT_KEYS = {
    "allowlisted",
    "baseline_match",
    "baseline_name",
    "allowlist_source",
    "last_baseline_update",
    "baseline_notes",
}
ENVIRONMENT_CONTEXT_KEYS = {
    "environment",
    "network_zone",
    "sensor",
    "sensor_type",
    "sensor_version",
    "tenant",
    "site",
    "business_unit",
    "segment",
    "capture_profile",
}

CLOSURE_TO_ADJUDICATION_VERDICT = {
    "true_positive": "likely_malicious",
    "confirmed_malicious": "likely_malicious",
    "escalated": "likely_malicious",
    "false_positive": "likely_benign",
    "benign": "likely_benign",
    "insufficient_evidence": "insufficient_evidence",
    "needs_review": "insufficient_evidence",
}
CLOSURE_CONFIDENCE_DEFAULTS = {
    "likely_malicious": 0.82,
    "likely_benign": 0.82,
    "insufficient_evidence": 0.35,
}
CLOSURE_FP_RISK_DEFAULTS = {
    "likely_malicious": 0.20,
    "likely_benign": 0.88,
    "insufficient_evidence": 0.50,
}

BEHAVIOR_SECTION_KEYS = ("behavioral_summary", "network_summary", "process_summary", "sample")
SCRIPT_INTERPRETER_NAMES = (
    "powershell.exe",
    "pwsh.exe",
    "wscript.exe",
    "cscript.exe",
    "cmd.exe",
    "mshta.exe",
    "python.exe",
    "rundll32.exe",
    "bash",
    "sh",
)
PERSISTENCE_KEYWORDS = (
    "runonce",
    "\\run",
    "schtasks",
    "startup",
    "autorun",
    "service install",
    "reg add",
    "registry run key",
    "scheduled task",
)
ANTI_ANALYSIS_KEYWORDS = (
    "sandbox",
    "debug",
    "anti-vm",
    "anti vm",
    "evasion",
    "sleep",
    "timing delay",
    "packer",
)
INJECTION_KEYWORDS = (
    "inject",
    "process hollow",
    "hollowing",
    "createremotethread",
    "writeprocessmemory",
    "virtualallocex",
    "ntmapviewofsection",
)
API_FAMILY_PATTERNS: dict[str, tuple[str, ...]] = {
    "memory_injection_api": ("virtualallocex", "writeprocessmemory", "createremotethread", "ntmapviewofsection"),
    "credential_access_api": ("lsass", "cred", "sam", "sekurlsa", "logonpasswords"),
    "process_execution_api": ("createprocess", "winexec", "shellexecute"),
    "registry_api": ("regopenkey", "regsetvalue", "registry"),
    "network_socket_api": ("wsasocket", "connect", "http", "dns", "wininet", "winhttp"),
}


@dataclass(slots=True)
class SourceAdapterResult:
    package_payload: dict[str, Any] = field(default_factory=dict)
    target_payload_patch: dict[str, Any] = field(default_factory=dict)
    evidence_used_patch: list[dict[str, Any]] = field(default_factory=list)
    evidence_missing_patch: list[dict[str, Any]] = field(default_factory=list)
    provenance_items: list[dict[str, Any]] = field(default_factory=list)
    raw_payload: dict[str, Any] = field(default_factory=dict)
    parser_diagnostics: list[Diagnostic] = field(default_factory=list)
    event_time_hint: str | None = None


SourceAdapter = Callable[[dict[str, Any], dict[str, Any]], SourceAdapterResult]


def adapt_source_record(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    parser_name = _normalize_string(source_file.get("parser_name")) or "passthrough_source_adapter_v1"
    adapter = ADAPTER_REGISTRY.get(parser_name)
    if adapter is None:
        result = passthrough_source_adapter_v1(payload, source_file)
        result.parser_diagnostics.append(
            _diagnostic(
                adapter="passthrough_source_adapter_v1",
                code="adapter.unknown",
                severity="warning",
                message=f"Unknown parser_name '{parser_name}'. Falling back to passthrough.",
                field_path="source_file.parser_name",
            )
        )
        return result
    return adapter(payload, source_file)


def passthrough_source_adapter_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    del source_file
    diagnostics: list[Diagnostic] = []
    package_payload = _extract_existing_package_payload(payload)
    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="passthrough_source_adapter_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}
    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            _nested_get(payload, "time_prevalence_context.hit_time"),
        ),
    )


def behavior_report_bundle_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    del source_file
    diagnostics: list[Diagnostic] = []
    package_payload = _extract_existing_package_payload(payload)
    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="behavior_report_bundle_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}
    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("generated_at"),
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
        ),
    )


def fixture_yara_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    package_payload = _extract_existing_package_payload(payload)
    diagnostics: list[Diagnostic] = []

    package_payload["rule_family"] = "yara"
    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="fixture_yara_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    family = _normalize_string(payload.get("rule_family"))
    if family and family.lower() != "yara":
        diagnostics.append(
            _diagnostic(
                adapter="fixture_yara_parser_v1",
                code="fixture.family.overridden",
                severity="warning",
                message=f"Fixture rule_family '{family}' overridden to 'yara'.",
                field_path="rule_family",
            )
        )

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="yara_fixture",
                key="adapter",
                value="fixture_yara_parser_v1",
                adapter="fixture_yara_parser_v1",
                source_file=source_file,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            _nested_get(payload, "time_prevalence_context.hit_time"),
        ),
    )


def fixture_sigma_rule_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_sigma_detection_package(
        payload=payload,
        adapter="fixture_sigma_rule_parser_v1",
        diagnostics=diagnostics,
        source_default="sigma_fixture",
        source_system_default="sigma_fixture",
        prefer_alert_shape=False,
    )

    family = _normalize_string(payload.get("rule_family"))
    if family and family.lower() != "sigma":
        diagnostics.append(
            _diagnostic(
                adapter="fixture_sigma_rule_parser_v1",
                code="fixture.family.overridden",
                severity="warning",
                message=f"Fixture rule_family '{family}' overridden to 'sigma'.",
                field_path="rule_family",
            )
        )

    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="fixture_sigma_rule_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="sigma_fixture",
                key="adapter",
                value="fixture_sigma_rule_parser_v1",
                adapter="fixture_sigma_rule_parser_v1",
                source_file=source_file,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            _nested_get(payload, "time_prevalence_context.hit_time"),
            _nested_get(payload, "raw_hit_payload.timestamp"),
        ),
    )


def fixture_sigma_alert_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_sigma_detection_package(
        payload=payload,
        adapter="fixture_sigma_alert_parser_v1",
        diagnostics=diagnostics,
        source_default="sigma_alert_fixture",
        source_system_default="sigma_alert_fixture",
        prefer_alert_shape=True,
    )

    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="fixture_sigma_alert_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="sigma_alert_fixture",
                key="adapter",
                value="fixture_sigma_alert_parser_v1",
                adapter="fixture_sigma_alert_parser_v1",
                source_file=source_file,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            payload.get("observed_at"),
            _nested_get(payload, "alert.timestamp"),
            _nested_get(payload, "alert.observed_at"),
            _nested_get(payload, "time_prevalence_context.hit_time"),
        ),
    )


def fixture_snort_rule_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_snort_detection_package(
        payload=payload,
        adapter="fixture_snort_rule_parser_v1",
        diagnostics=diagnostics,
        source_default="snort_fixture",
        source_system_default="snort_fixture",
        prefer_alert_shape=False,
        require_rule_fields=True,
    )

    family = _normalize_string(payload.get("rule_family"))
    if family and family.lower() != "snort":
        diagnostics.append(
            _diagnostic(
                adapter="fixture_snort_rule_parser_v1",
                code="fixture.family.overridden",
                severity="warning",
                message=f"Fixture rule_family '{family}' overridden to 'snort'.",
                field_path="rule_family",
            )
        )

    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="fixture_snort_rule_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    evidence_id = _first_non_empty(
        _nested_get(package_payload, "object_metadata.object_id"),
        _nested_get(package_payload, "rule_metadata.rule_id"),
        _nested_get(package_payload, "rule_metadata.sid"),
    )

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="snort_fixture",
                key="adapter",
                value="fixture_snort_rule_parser_v1",
                adapter="fixture_snort_rule_parser_v1",
                source_file=source_file,
                evidence_id=evidence_id,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            _nested_get(package_payload, "raw_hit_payload.network.timing.observed_at"),
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            _nested_get(payload, "time_prevalence_context.hit_time"),
        ),
    )


def fixture_snort_alert_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_snort_detection_package(
        payload=payload,
        adapter="fixture_snort_alert_parser_v1",
        diagnostics=diagnostics,
        source_default="snort_alert_fixture",
        source_system_default="snort_alert_fixture",
        prefer_alert_shape=True,
        require_rule_fields=True,
    )

    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="fixture_snort_alert_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    evidence_id = _first_non_empty(
        _nested_get(package_payload, "object_metadata.object_id"),
        _nested_get(package_payload, "rule_metadata.rule_id"),
        _nested_get(package_payload, "rule_metadata.sid"),
    )

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="snort_alert_fixture",
                key="adapter",
                value="fixture_snort_alert_parser_v1",
                adapter="fixture_snort_alert_parser_v1",
                source_file=source_file,
                evidence_id=evidence_id,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            _nested_get(package_payload, "raw_hit_payload.network.timing.observed_at"),
            payload.get("observed_at"),
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            _nested_get(payload, "alert.timestamp"),
        ),
    )


def fixture_internal_flow_pcap_metadata_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_snort_detection_package(
        payload=payload,
        adapter="fixture_internal_flow_pcap_metadata_parser_v1",
        diagnostics=diagnostics,
        source_default="internal_flow_pcap_fixture",
        source_system_default="internal_flow_pcap_fixture",
        prefer_alert_shape=False,
        require_rule_fields=False,
    )
    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="fixture_internal_flow_pcap_metadata_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    evidence_id = _first_non_empty(
        _nested_get(package_payload, "object_metadata.object_id"),
        _nested_get(package_payload, "raw_hit_payload.network.pcap_metadata.capture_id"),
    )

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="internal_flow_pcap_fixture",
                key="adapter",
                value="fixture_internal_flow_pcap_metadata_parser_v1",
                adapter="fixture_internal_flow_pcap_metadata_parser_v1",
                source_file=source_file,
                evidence_id=evidence_id,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            _nested_get(package_payload, "raw_hit_payload.network.timing.observed_at"),
            _nested_get(package_payload, "raw_hit_payload.network.pcap_metadata.capture_start"),
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
        ),
    )


def fixture_internal_environment_context_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_snort_detection_package(
        payload=payload,
        adapter="fixture_internal_environment_context_parser_v1",
        diagnostics=diagnostics,
        source_default="internal_environment_context_fixture",
        source_system_default="internal_environment_context_fixture",
        prefer_alert_shape=False,
        require_rule_fields=False,
        require_context_blocks=True,
    )

    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="fixture_internal_environment_context_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    evidence_id = _first_non_empty(
        _nested_get(package_payload, "object_metadata.object_id"),
        payload.get("record_id"),
        payload.get("id"),
    )

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="internal_environment_context_fixture",
                key="adapter",
                value="fixture_internal_environment_context_parser_v1",
                adapter="fixture_internal_environment_context_parser_v1",
                source_file=source_file,
                evidence_id=evidence_id,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            _nested_get(package_payload, "time_prevalence_context.hit_time"),
            _nested_get(package_payload, "raw_hit_payload.network.timing.observed_at"),
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
        ),
    )


def analyst_closure_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_sigma_detection_package(
        payload=payload,
        adapter="analyst_closure_parser_v1",
        diagnostics=diagnostics,
        source_default="analyst_closure",
        source_system_default="analyst_closure",
        prefer_alert_shape=False,
        require_sigma_fields=False,
    )

    closure_record = _first_dict(
        payload.get("closure"),
        payload.get("analyst_closure"),
        payload.get("outcome"),
    )
    closure_label = _first_non_empty(
        payload.get("closure_label"),
        payload.get("label"),
        payload.get("verdict"),
        _nested_get(payload, "closure.label"),
        _nested_get(payload, "analyst_closure.label"),
        _nested_get(payload, "closure.verdict"),
        _nested_get(payload, "analyst_closure.verdict"),
        closure_record.get("label") if closure_record else None,
        closure_record.get("verdict") if closure_record else None,
    )

    mapped_verdict, unknown_label = _map_closure_to_adjudication_verdict(closure_label)
    if closure_label is None:
        diagnostics.append(
            _diagnostic(
                adapter="analyst_closure_parser_v1",
                code="closure.label.missing",
                severity="warning",
                message="Analyst closure record is missing closure label/verdict.",
                field_path="closure_label",
            )
        )
    elif unknown_label:
        diagnostics.append(
            _diagnostic(
                adapter="analyst_closure_parser_v1",
                code="closure.label.unknown",
                severity="warning",
                message=f"Unknown analyst closure label '{closure_label}'. Defaulted to insufficient_evidence.",
                field_path="closure_label",
            )
        )

    outcome_timestamp = _first_non_empty(
        payload.get("closed_at"),
        payload.get("timestamp"),
        payload.get("event_time"),
        payload.get("event_time_utc"),
        _nested_get(payload, "closure.closed_at"),
        _nested_get(payload, "analyst_closure.closed_at"),
        closure_record.get("timestamp") if closure_record else None,
    )
    analyst_id = (
        _first_non_empty(
            payload.get("analyst_id"),
            payload.get("reviewer_id"),
            _nested_get(payload, "closure.analyst_id"),
            _nested_get(payload, "analyst_closure.analyst_id"),
            closure_record.get("analyst_id") if closure_record else None,
            closure_record.get("reviewer_id") if closure_record else None,
        )
        or "unknown_analyst"
    )

    prior_outcome = {
        "analyst_id": analyst_id,
        "case_id": _first_non_empty(
            payload.get("case_id"),
            _nested_get(payload, "closure.case_id"),
            _nested_get(payload, "analyst_closure.case_id"),
            closure_record.get("case_id") if closure_record else None,
        ),
        "decision_id": _first_non_empty(
            payload.get("decision_id"),
            _nested_get(payload, "closure.decision_id"),
            _nested_get(payload, "analyst_closure.decision_id"),
            closure_record.get("decision_id") if closure_record else None,
        ),
        "verdict": _normalize_closure_outcome_label(closure_label) or "needs_review",
        "timestamp": outcome_timestamp or _utc_now_iso(),
        "notes": _first_non_empty(
            payload.get("notes"),
            payload.get("comment"),
            _nested_get(payload, "closure.notes"),
            _nested_get(payload, "analyst_closure.notes"),
            closure_record.get("notes") if closure_record else None,
        ),
    }
    package_payload["prior_analyst_outcomes"] = {"outcomes": [_remove_none_values(prior_outcome)]}

    is_final = _closure_record_is_final(payload=payload, closure_record=closure_record)
    target_payload_patch: dict[str, Any] = {}
    if mapped_verdict and is_final:
        confidence = _float_or_none(
            _first_non_empty(
                payload.get("confidence"),
                _nested_get(payload, "closure.confidence"),
                _nested_get(payload, "analyst_closure.confidence"),
                closure_record.get("confidence") if closure_record else None,
            )
        )
        fp_risk = _float_or_none(
            _first_non_empty(
                payload.get("false_positive_risk"),
                _nested_get(payload, "closure.false_positive_risk"),
                _nested_get(payload, "analyst_closure.false_positive_risk"),
                closure_record.get("false_positive_risk") if closure_record else None,
            )
        )
        target_payload_patch["adjudication"] = {
            "verdict": mapped_verdict,
            "confidence": confidence if confidence is not None else CLOSURE_CONFIDENCE_DEFAULTS.get(mapped_verdict, 0.5),
            "false_positive_risk": fp_risk if fp_risk is not None else CLOSURE_FP_RISK_DEFAULTS.get(mapped_verdict, 0.5),
            "derived_from": "analyst_closure",
        }
    elif mapped_verdict and not is_final:
        diagnostics.append(
            _diagnostic(
                adapter="analyst_closure_parser_v1",
                code="closure.not_final",
                severity="info",
                message="Closure verdict present but record is not marked final; adjudication patch skipped.",
                field_path="closure.status",
            )
        )

    evidence_id = _first_non_empty(prior_outcome.get("decision_id"), prior_outcome.get("case_id"), payload.get("id"))
    evidence_used_patch: list[dict[str, Any]] = []
    if mapped_verdict:
        evidence_used_patch.append(
            {
                "evidence_id": evidence_id or "analyst-closure",
                "source": "analyst_closure",
                "summary": _first_non_empty(
                    prior_outcome.get("notes"),
                    f"Analyst closure label {closure_label or 'unknown'} mapped to {mapped_verdict}.",
                ),
            }
        )

    return SourceAdapterResult(
        package_payload=package_payload,
        target_payload_patch=target_payload_patch,
        evidence_used_patch=evidence_used_patch,
        provenance_items=[
            _build_adapter_provenance(
                source="analyst_closure",
                key="case_or_decision",
                value=evidence_id or "unknown",
                adapter="analyst_closure_parser_v1",
                source_file=source_file,
                evidence_id=evidence_id,
                citation_ref=_first_non_empty(payload.get("case_reference"), payload.get("reference")),
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=outcome_timestamp,
    )


def internal_allowlist_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_sigma_detection_package(
        payload=payload,
        adapter="internal_allowlist_parser_v1",
        diagnostics=diagnostics,
        source_default="internal_allowlist",
        source_system_default="internal_allowlist",
        prefer_alert_shape=False,
        require_sigma_fields=False,
    )

    allowlist_context = _normalize_context_candidate(
        context_name="allowlist_baseline_context",
        adapter="internal_allowlist_parser_v1",
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("allowlist_baseline_context"), "package_payload.allowlist_baseline_context"),
            (payload.get("allowlist_baseline_context"), "allowlist_baseline_context"),
            (payload.get("allowlist_context"), "allowlist_context"),
            (payload.get("allowlist"), "allowlist"),
            (payload.get("baseline_context"), "baseline_context"),
        ],
        allowed_keys=ALLOWLIST_BASELINE_CONTEXT_KEYS,
    )
    if allowlist_context:
        package_payload["allowlist_baseline_context"] = allowlist_context
    else:
        diagnostics.append(
            _diagnostic(
                adapter="internal_allowlist_parser_v1",
                code="allowlist.context.missing",
                severity="warning",
                message="Allowlist context is missing; row will be retained as partial evidence.",
                field_path="allowlist_baseline_context",
            )
        )

    return SourceAdapterResult(
        package_payload=package_payload,
        provenance_items=[
            _build_adapter_provenance(
                source="internal_allowlist",
                key="context_record_id",
                value=_first_non_empty(payload.get("record_id"), payload.get("id")) or "unknown",
                adapter="internal_allowlist_parser_v1",
                source_file=source_file,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            payload.get("updated_at"),
            payload.get("created_at"),
        ),
    )


def clean_baseline_profile_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    diagnostics: list[Diagnostic] = []
    package_payload = _build_sigma_detection_package(
        payload=payload,
        adapter="clean_baseline_profile_parser_v1",
        diagnostics=diagnostics,
        source_default="clean_baseline",
        source_system_default="clean_baseline",
        prefer_alert_shape=False,
        require_sigma_fields=False,
    )

    asset_context = _normalize_context_candidate(
        context_name="asset_context",
        adapter="clean_baseline_profile_parser_v1",
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("asset_context"), "package_payload.asset_context"),
            (payload.get("asset_context"), "asset_context"),
            (payload.get("asset"), "asset"),
        ],
        allowed_keys=ASSET_CONTEXT_KEYS,
    )
    time_context = _normalize_context_candidate(
        context_name="time_prevalence_context",
        adapter="clean_baseline_profile_parser_v1",
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("time_prevalence_context"), "package_payload.time_prevalence_context"),
            (payload.get("time_prevalence_context"), "time_prevalence_context"),
            (payload.get("prevalence"), "prevalence"),
            (payload.get("time_context"), "time_context"),
        ],
        allowed_keys=TIME_PREVALENCE_CONTEXT_KEYS,
    )

    if asset_context:
        package_payload["asset_context"] = asset_context
    else:
        diagnostics.append(
            _diagnostic(
                adapter="clean_baseline_profile_parser_v1",
                code="baseline.asset_context.missing",
                severity="info",
                message="Asset context missing from clean baseline record.",
                field_path="asset_context",
            )
        )

    if time_context:
        package_payload["time_prevalence_context"] = time_context
    else:
        diagnostics.append(
            _diagnostic(
                adapter="clean_baseline_profile_parser_v1",
                code="baseline.time_context.missing",
                severity="info",
                message="Time prevalence context missing from clean baseline record.",
                field_path="time_prevalence_context",
            )
        )

    return SourceAdapterResult(
        package_payload=package_payload,
        provenance_items=[
            _build_adapter_provenance(
                source="clean_baseline",
                key="profile_id",
                value=_first_non_empty(payload.get("profile_id"), payload.get("id")) or "unknown",
                adapter="clean_baseline_profile_parser_v1",
                source_file=source_file,
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            payload.get("updated_at"),
            payload.get("created_at"),
            _nested_get(payload, "time_prevalence_context.hit_time"),
        ),
    )

def yaraify_feed_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    del source_file
    diagnostics: list[Diagnostic] = []
    metadata = _coerce_dict(payload.get("metadata"))
    hit_block = _coerce_dict(payload.get("scan_result")) or _coerce_dict(payload.get("hit")) or _coerce_dict(payload.get("scan"))
    rule_block = _coerce_dict(payload.get("rule"))

    rule_text = _first_non_empty(
        payload.get("full_rule_text"),
        payload.get("rule_text"),
        payload.get("yara_rule"),
        _nested_get(payload, "rule.text"),
        metadata.get("rule_text"),
        rule_block.get("text"),
    )
    rule_name = _first_non_empty(
        payload.get("rule_name"),
        payload.get("name"),
        _nested_get(payload, "rule.name"),
        metadata.get("rule_name"),
        metadata.get("name"),
        rule_block.get("name"),
    )
    sample_sha256 = _first_non_empty(
        payload.get("sha256"),
        payload.get("sha256_hash"),
        _nested_get(payload, "sample.sha256"),
        metadata.get("sha256"),
        metadata.get("sample_sha256"),
        _nested_get(payload, "scan_result.sha256"),
    )
    rule_id = _first_non_empty(
        payload.get("rule_id"),
        metadata.get("rule_id"),
        _nested_get(payload, "rule.id"),
        rule_name,
        sample_sha256,
    ) or "yaraify-unknown-rule"
    object_id = sample_sha256 or _first_non_empty(payload.get("object_id"), payload.get("sample_id")) or "yaraify-object"

    if not rule_text:
        diagnostics.append(
            _diagnostic(
                adapter="yaraify_feed_parser_v1",
                code="yaraify.rule_text.missing",
                severity="warning",
                message="YARAify row is missing rule text.",
                field_path="rule_text",
            )
        )
    if not rule_name:
        diagnostics.append(
            _diagnostic(
                adapter="yaraify_feed_parser_v1",
                code="yaraify.rule_name.missing",
                severity="warning",
                message="YARAify row is missing rule_name.",
                field_path="rule_name",
            )
        )
    if not sample_sha256:
        diagnostics.append(
            _diagnostic(
                adapter="yaraify_feed_parser_v1",
                code="yaraify.sample_sha256.missing",
                severity="warning",
                message="YARAify row is missing sample sha256.",
                field_path="sha256",
            )
        )

    package_payload: dict[str, Any] = {
        "rule_family": "yara",
        "full_rule_text": rule_text or "",
        "rule_metadata": {
            "source": "yaraify",
            "rule_id": str(rule_id),
            "rule_name": rule_name or str(rule_id),
            "tags": _coerce_list_of_strings(payload.get("tags")) or _coerce_list_of_strings(metadata.get("tags")),
            "meta": _coerce_dict(metadata.get("meta")) or {},
        },
        "raw_hit_payload": hit_block if hit_block else _safe_copy_payload(payload),
        "object_metadata": {
            "object_id": str(object_id),
            "object_type": _first_non_empty(payload.get("object_type"), metadata.get("object_type")) or "file",
            "source_system": "yaraify",
            "labels": ["source:yaraify"],
            "custom_attributes": {
                "sha256": sample_sha256,
                "sample_name": _first_non_empty(payload.get("file_name"), metadata.get("file_name")),
            },
        },
    }
    linked_enrichment = {
        "enrichments": [
            {
                "kind": "threat_intel",
                "source": "yaraify",
                "value": {
                    "metadata": metadata,
                },
            }
        ]
    }
    package_payload["linked_enrichment"] = linked_enrichment

    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="yaraify_feed_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="yaraify",
                key="adapter_record_id",
                value=_first_non_empty(payload.get("id"), payload.get("record_id"), sample_sha256) or "unknown",
                adapter="yaraify_feed_parser_v1",
                source_file={"record_locator": payload.get("record_locator")},
                evidence_id=sample_sha256,
                citation_ref=_normalize_string(payload.get("url")),
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            payload.get("scan_date"),
            _nested_get(payload, "scan_result.observed_at"),
        ),
    )


def malwarebazaar_feed_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    del source_file
    diagnostics: list[Diagnostic] = []
    yara_entries = _coerce_list_of_dicts(payload.get("yara_rules")) or _coerce_list_of_dicts(payload.get("yara"))
    primary_rule = yara_entries[0] if yara_entries else {}

    rule_text = _first_non_empty(
        payload.get("full_rule_text"),
        payload.get("rule_text"),
        primary_rule.get("rule"),
        primary_rule.get("rule_text"),
    )
    rule_name = _first_non_empty(
        payload.get("rule_name"),
        primary_rule.get("rule_name"),
        payload.get("signature"),
    )
    rule_id = _first_non_empty(payload.get("rule_id"), primary_rule.get("rule_id"), rule_name) or "malwarebazaar-unknown-rule"
    sample_sha256 = _first_non_empty(payload.get("sha256_hash"), payload.get("sha256"), _nested_get(payload, "sample.sha256"))
    object_id = sample_sha256 or _first_non_empty(payload.get("sha1_hash"), payload.get("md5_hash")) or "malwarebazaar-object"

    if not rule_text:
        diagnostics.append(
            _diagnostic(
                adapter="malwarebazaar_feed_parser_v1",
                code="malwarebazaar.rule_text.missing",
                severity="warning",
                message="MalwareBazaar row does not contain YARA rule text.",
                field_path="rule_text",
            )
        )
    if not rule_name:
        diagnostics.append(
            _diagnostic(
                adapter="malwarebazaar_feed_parser_v1",
                code="malwarebazaar.rule_name.missing",
                severity="warning",
                message="MalwareBazaar row does not contain a rule name/signature.",
                field_path="rule_name",
            )
        )
    if not sample_sha256:
        diagnostics.append(
            _diagnostic(
                adapter="malwarebazaar_feed_parser_v1",
                code="malwarebazaar.sample_sha256.missing",
                severity="warning",
                message="MalwareBazaar row does not contain sample sha256.",
                field_path="sha256_hash",
            )
        )

    package_payload: dict[str, Any] = {
        "rule_family": "yara",
        "full_rule_text": rule_text or "",
        "rule_metadata": {
            "source": "malwarebazaar",
            "rule_id": str(rule_id),
            "rule_name": rule_name or str(rule_id),
            "tags": _coerce_list_of_strings(payload.get("tags")),
            "meta": {
                "signature": payload.get("signature"),
                "first_seen": payload.get("first_seen"),
            },
        },
        "raw_hit_payload": _safe_copy_payload(payload),
        "object_metadata": {
            "object_id": str(object_id),
            "object_type": "file",
            "source_system": "malwarebazaar",
            "labels": ["source:malwarebazaar"],
            "custom_attributes": {
                "sha256": sample_sha256,
                "sha1": payload.get("sha1_hash"),
                "md5": payload.get("md5_hash"),
                "file_name": payload.get("file_name"),
            },
        },
        "linked_enrichment": {
            "enrichments": [
                {
                    "kind": "threat_intel",
                    "source": "malwarebazaar",
                    "value": {
                        "signature": payload.get("signature"),
                        "tags": _coerce_list_of_strings(payload.get("tags")),
                        "file_type": payload.get("file_type"),
                        "file_type_mime": payload.get("file_type_mime"),
                        "intel": _coerce_dict(payload.get("intelligence")),
                    },
                }
            ]
        },
    }

    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="malwarebazaar_feed_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source="malwarebazaar",
                key="sample_sha256",
                value=sample_sha256 or "unknown",
                adapter="malwarebazaar_feed_parser_v1",
                source_file={"record_locator": _normalize_string(payload.get("id") or payload.get("record_id"))},
                evidence_id=sample_sha256,
                citation_ref=_normalize_string(payload.get("url")),
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("first_seen"),
            payload.get("last_seen"),
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
        ),
    )


def internal_yara_hit_json_parser_v1(payload: dict[str, Any], source_file: dict[str, Any]) -> SourceAdapterResult:
    del source_file
    diagnostics: list[Diagnostic] = []

    rule_name = _first_non_empty(
        payload.get("rule_name"),
        payload.get("yara_rule_name"),
        _nested_get(payload, "rule.name"),
        _nested_get(payload, "alert.rule.name"),
    )
    rule_text = _first_non_empty(
        payload.get("full_rule_text"),
        payload.get("rule_text"),
        payload.get("yara_rule"),
        _nested_get(payload, "rule.text"),
        _nested_get(payload, "alert.rule.text"),
    )
    rule_id = _first_non_empty(
        payload.get("rule_id"),
        payload.get("signature_id"),
        _nested_get(payload, "rule.id"),
        _nested_get(payload, "alert.rule.id"),
        rule_name,
    ) or "internal-yara-hit-unknown-rule"
    object_sha256 = _first_non_empty(
        payload.get("sha256"),
        _nested_get(payload, "file.sha256"),
        _nested_get(payload, "sample.sha256"),
    )
    object_path = _first_non_empty(payload.get("target_path"), _nested_get(payload, "file.path"))
    object_id = object_sha256 or object_path or _first_non_empty(payload.get("object_id")) or "internal-yara-object"

    if not rule_name:
        diagnostics.append(
            _diagnostic(
                adapter="internal_yara_hit_json_parser_v1",
                code="internal_yara.rule_name.missing",
                severity="warning",
                message="Internal YARA hit row is missing a rule name.",
                field_path="rule_name",
            )
        )
    if not rule_text:
        diagnostics.append(
            _diagnostic(
                adapter="internal_yara_hit_json_parser_v1",
                code="internal_yara.rule_text.missing",
                severity="warning",
                message="Internal YARA hit row is missing rule text.",
                field_path="rule_text",
            )
        )

    package_payload: dict[str, Any] = {
        "rule_family": "yara",
        "full_rule_text": rule_text or "",
        "rule_metadata": {
            "source": _first_non_empty(payload.get("source"), payload.get("source_system")) or "internal_yara_hit",
            "rule_id": str(rule_id),
            "rule_name": rule_name or str(rule_id),
            "tags": _coerce_list_of_strings(payload.get("tags")),
            "meta": _coerce_dict(payload.get("meta")),
        },
        "raw_hit_payload": _safe_copy_payload(payload),
        "object_metadata": {
            "object_id": str(object_id),
            "object_type": _first_non_empty(payload.get("object_type"), _nested_get(payload, "file.object_type")) or "file",
            "source_system": _first_non_empty(payload.get("source_system"), payload.get("source")) or "internal_yara_hit",
            "custom_attributes": {
                "sha256": object_sha256,
                "target_path": object_path,
            },
        },
    }

    reports = _collect_behavior_reports(
        payload=payload,
        package_payload=package_payload,
        adapter="internal_yara_hit_json_parser_v1",
        diagnostics=diagnostics,
    )
    if reports:
        package_payload["behavior_report_references"] = {"reports": reports}

    return SourceAdapterResult(
        package_payload=package_payload,
        evidence_used_patch=_behavior_reports_to_evidence(reports),
        provenance_items=[
            _build_adapter_provenance(
                source=_first_non_empty(payload.get("source"), payload.get("source_system")) or "internal_yara_hit",
                key="hit_id",
                value=_first_non_empty(payload.get("hit_id"), payload.get("event_id"), payload.get("id")) or "unknown",
                adapter="internal_yara_hit_json_parser_v1",
                source_file={"record_locator": _normalize_string(payload.get("record_locator"))},
                evidence_id=object_sha256,
                citation_ref=_normalize_string(payload.get("reference")),
            )
        ],
        raw_payload=_safe_copy_payload(payload),
        parser_diagnostics=diagnostics,
        event_time_hint=_first_non_empty(
            payload.get("observed_at"),
            payload.get("event_time_utc"),
            payload.get("event_time"),
            payload.get("timestamp"),
            _nested_get(payload, "scan.timestamp"),
        ),
    )


ADAPTER_REGISTRY: dict[str, SourceAdapter] = {
    "passthrough_source_adapter_v1": passthrough_source_adapter_v1,
    "behavior_report_bundle_parser_v1": behavior_report_bundle_parser_v1,
    "fixture_yara_parser_v1": fixture_yara_parser_v1,
    "fixture_sigma_rule_parser_v1": fixture_sigma_rule_parser_v1,
    "fixture_sigma_alert_parser_v1": fixture_sigma_alert_parser_v1,
    "fixture_snort_rule_parser_v1": fixture_snort_rule_parser_v1,
    "fixture_snort_alert_parser_v1": fixture_snort_alert_parser_v1,
    "fixture_internal_flow_pcap_metadata_parser_v1": fixture_internal_flow_pcap_metadata_parser_v1,
    "fixture_internal_environment_context_parser_v1": fixture_internal_environment_context_parser_v1,
    "analyst_closure_parser_v1": analyst_closure_parser_v1,
    "internal_allowlist_parser_v1": internal_allowlist_parser_v1,
    "clean_baseline_profile_parser_v1": clean_baseline_profile_parser_v1,
    "yaraify_feed_parser_v1": yaraify_feed_parser_v1,
    "malwarebazaar_feed_parser_v1": malwarebazaar_feed_parser_v1,
    "internal_yara_hit_json_parser_v1": internal_yara_hit_json_parser_v1,
}

def _extract_existing_package_payload(payload: dict[str, Any]) -> dict[str, Any]:
    direct = payload.get("package_payload")
    if isinstance(direct, dict):
        return _safe_copy_payload(direct)

    nested = payload.get("detection_package")
    if isinstance(nested, dict):
        return _safe_copy_payload(nested)

    nested = payload.get("input_package")
    if isinstance(nested, dict):
        return _safe_copy_payload(nested)

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
        return _safe_copy_payload({key: payload[key] for key in base_keys if key in payload})
    return {}


def _build_snort_detection_package(
    *,
    payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
    source_default: str,
    source_system_default: str,
    prefer_alert_shape: bool,
    require_rule_fields: bool,
    require_context_blocks: bool = False,
) -> dict[str, Any]:
    package_payload = _extract_existing_package_payload(payload)
    package_payload["rule_family"] = "snort"

    rule_text = _extract_snort_rule_text(payload=payload, package_payload=package_payload)
    if rule_text:
        package_payload["full_rule_text"] = rule_text
    elif require_rule_fields:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="snort.rule_text.missing",
                severity="warning",
                message="Snort rule text is missing.",
                field_path="full_rule_text",
            )
        )

    rule_metadata = _normalize_snort_rule_metadata(
        payload=payload,
        package_payload=package_payload,
        adapter=adapter,
        diagnostics=diagnostics,
        source_default=source_default,
        rule_text=rule_text,
        require_rule_fields=require_rule_fields,
    )
    if rule_metadata:
        package_payload["rule_metadata"] = rule_metadata

    alert_payload = _coerce_dict(payload.get("alert"))
    raw_hit_payload = _coerce_dict(package_payload.get("raw_hit_payload"))
    if prefer_alert_shape and alert_payload:
        raw_hit_payload = _safe_copy_payload(alert_payload)
    if not raw_hit_payload:
        raw_hit_payload = _coerce_dict(payload.get("raw_hit_payload"))
    if not raw_hit_payload and alert_payload:
        raw_hit_payload = _safe_copy_payload(alert_payload)
    if not raw_hit_payload:
        raw_hit_payload = _safe_copy_payload(payload)

    protocol_hint = _normalize_string(_nested_get(rule_metadata, "metadata.normalized_protocol"))
    network = _normalize_snort_network_payload(
        payload=payload,
        raw_hit_payload=raw_hit_payload,
        adapter=adapter,
        diagnostics=diagnostics,
        rule_text=rule_text,
        protocol_hint=protocol_hint,
        prefer_alert_shape=prefer_alert_shape,
    )
    if network:
        raw_hit_payload["network"] = network

    package_payload["raw_hit_payload"] = raw_hit_payload
    package_payload["object_metadata"] = _normalize_snort_object_metadata(
        payload=payload,
        package_payload=package_payload,
        raw_hit_payload=raw_hit_payload,
        adapter=adapter,
        diagnostics=diagnostics,
        source_system_default=source_system_default,
        network=network,
    )

    asset_context = _normalize_context_candidate(
        context_name="asset_context",
        adapter=adapter,
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("asset_context"), "package_payload.asset_context"),
            (payload.get("asset_context"), "asset_context"),
            (payload.get("asset"), "asset"),
            (_nested_get(payload, "alert.asset_context"), "alert.asset_context"),
        ],
        allowed_keys=ASSET_CONTEXT_KEYS,
    )
    if asset_context is not None:
        package_payload["asset_context"] = asset_context

    time_context = _normalize_context_candidate(
        context_name="time_prevalence_context",
        adapter=adapter,
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("time_prevalence_context"), "package_payload.time_prevalence_context"),
            (payload.get("time_prevalence_context"), "time_prevalence_context"),
            (payload.get("time_context"), "time_context"),
            (payload.get("prevalence"), "prevalence"),
            (_nested_get(payload, "alert.time_prevalence_context"), "alert.time_prevalence_context"),
        ],
        allowed_keys=TIME_PREVALENCE_CONTEXT_KEYS,
    )
    if time_context is not None:
        package_payload["time_prevalence_context"] = time_context

    allowlist_context = _normalize_context_candidate(
        context_name="allowlist_baseline_context",
        adapter=adapter,
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("allowlist_baseline_context"), "package_payload.allowlist_baseline_context"),
            (payload.get("allowlist_baseline_context"), "allowlist_baseline_context"),
            (payload.get("allowlist_context"), "allowlist_context"),
            (payload.get("allowlist"), "allowlist"),
            (payload.get("baseline_context"), "baseline_context"),
            (_nested_get(payload, "alert.allowlist_baseline_context"), "alert.allowlist_baseline_context"),
        ],
        allowed_keys=ALLOWLIST_BASELINE_CONTEXT_KEYS,
    )
    if allowlist_context is not None:
        package_payload["allowlist_baseline_context"] = allowlist_context

    environment_context = _normalize_context_candidate(
        context_name="environment_context",
        adapter=adapter,
        diagnostics=diagnostics,
        candidates=[
            (payload.get("environment_context"), "environment_context"),
            (_nested_get(payload, "alert.environment_context"), "alert.environment_context"),
            (_nested_get(raw_hit_payload, "environment_context"), "raw_hit_payload.environment_context"),
            (_nested_get(payload, "context.environment"), "context.environment"),
            (payload.get("context"), "context"),
        ],
        allowed_keys=ENVIRONMENT_CONTEXT_KEYS,
    )
    if environment_context is not None:
        object_metadata = _coerce_dict(package_payload.get("object_metadata"))
        custom_attributes = _coerce_dict(object_metadata.get("custom_attributes"))
        custom_attributes["environment_context"] = environment_context
        object_metadata["custom_attributes"] = custom_attributes
        package_payload["object_metadata"] = object_metadata

    if require_context_blocks:
        if asset_context is None:
            diagnostics.append(
                _diagnostic(
                    adapter=adapter,
                    code="snort.asset_context.missing",
                    severity="warning",
                    message="Asset context is missing for internal environment context evidence.",
                    field_path="asset_context",
                )
            )
        if time_context is None:
            diagnostics.append(
                _diagnostic(
                    adapter=adapter,
                    code="snort.time_context.missing",
                    severity="warning",
                    message="Time prevalence context is missing for internal environment context evidence.",
                    field_path="time_prevalence_context",
                )
            )
        if allowlist_context is None:
            diagnostics.append(
                _diagnostic(
                    adapter=adapter,
                    code="snort.allowlist_context.missing",
                    severity="warning",
                    message="Allowlist context is missing for internal environment context evidence.",
                    field_path="allowlist_baseline_context",
                )
            )
        if environment_context is None:
            diagnostics.append(
                _diagnostic(
                    adapter=adapter,
                    code="snort.environment_context.missing",
                    severity="warning",
                    message="Environment context is missing for internal environment context evidence.",
                    field_path="environment_context",
                )
            )

    return package_payload


def _extract_snort_rule_text(payload: dict[str, Any], package_payload: dict[str, Any]) -> str | None:
    return _first_non_empty(
        package_payload.get("full_rule_text"),
        payload.get("full_rule_text"),
        payload.get("rule_text"),
        payload.get("snort_rule"),
        _nested_get(payload, "rule.text"),
        _nested_get(payload, "rule.raw"),
        _nested_get(payload, "alert.rule.text"),
        _nested_get(payload, "alert.rule.raw"),
    )


def _normalize_snort_rule_metadata(
    *,
    payload: dict[str, Any],
    package_payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
    source_default: str,
    rule_text: str | None,
    require_rule_fields: bool,
) -> dict[str, Any]:
    existing = _coerce_dict(package_payload.get("rule_metadata"))
    explicit_rule = _coerce_dict(payload.get("rule"))
    nested_alert_rule = _coerce_dict(_nested_get(payload, "alert.rule"))

    source = _first_non_empty(
        existing.get("source"),
        explicit_rule.get("source"),
        nested_alert_rule.get("source"),
        payload.get("source"),
        payload.get("source_system"),
        source_default,
    )

    sid_raw = _first_non_empty(
        existing.get("sid"),
        explicit_rule.get("sid"),
        nested_alert_rule.get("sid"),
        payload.get("sid"),
        payload.get("signature_id"),
        _extract_snort_sid_from_rule_text(rule_text),
    )
    sid = _int_or_none(sid_raw)
    if sid_raw is not None and sid is None:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="snort.rule_metadata.sid.invalid",
                severity="warning",
                message=f"Snort sid '{sid_raw}' is not a positive integer.",
                field_path="rule_metadata.sid",
            )
        )
    if sid is not None and sid <= 0:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="snort.rule_metadata.sid.invalid",
                severity="warning",
                message="Snort sid must be a positive integer.",
                field_path="rule_metadata.sid",
            )
        )
        sid = None

    rev_raw = _first_non_empty(
        existing.get("rev"),
        explicit_rule.get("rev"),
        nested_alert_rule.get("rev"),
        payload.get("rev"),
        _extract_snort_rev_from_rule_text(rule_text),
    )
    rev = _int_or_none(rev_raw)
    if rev_raw is not None and rev is None:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="snort.rule_metadata.rev.invalid",
                severity="warning",
                message=f"Snort rev '{rev_raw}' is not a positive integer.",
                field_path="rule_metadata.rev",
            )
        )
    if rev is not None and rev <= 0:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="snort.rule_metadata.rev.invalid",
                severity="warning",
                message="Snort rev must be a positive integer.",
                field_path="rule_metadata.rev",
            )
        )
        rev = None

    msg = _first_non_empty(
        existing.get("msg"),
        existing.get("message"),
        explicit_rule.get("msg"),
        explicit_rule.get("message"),
        nested_alert_rule.get("msg"),
        nested_alert_rule.get("message"),
        payload.get("msg"),
        payload.get("message"),
        payload.get("title"),
        _extract_snort_msg_from_rule_text(rule_text),
    )
    classification = _first_non_empty(
        existing.get("classification"),
        existing.get("classtype"),
        existing.get("category"),
        explicit_rule.get("classification"),
        explicit_rule.get("classtype"),
        explicit_rule.get("category"),
        nested_alert_rule.get("classification"),
        nested_alert_rule.get("classtype"),
        nested_alert_rule.get("category"),
        payload.get("classification"),
        payload.get("classtype"),
        payload.get("category"),
        _extract_snort_classification_from_rule_text(rule_text),
    )
    protocol = _first_non_empty(
        existing.get("protocol"),
        explicit_rule.get("protocol"),
        nested_alert_rule.get("protocol"),
        payload.get("protocol"),
        payload.get("proto"),
        _extract_snort_protocol_from_rule_text(rule_text),
    )
    if protocol:
        protocol = protocol.lower()

    rule_id = _first_non_empty(
        existing.get("rule_id"),
        explicit_rule.get("rule_id"),
        nested_alert_rule.get("rule_id"),
        payload.get("rule_id"),
        existing.get("id"),
        explicit_rule.get("id"),
        nested_alert_rule.get("id"),
        f"SNRT-{sid}" if sid is not None else None,
    )
    metadata = _merge_dicts(
        _coerce_dict(existing.get("metadata")),
        _coerce_dict(explicit_rule.get("metadata")),
        _coerce_dict(nested_alert_rule.get("metadata")),
        _coerce_dict(payload.get("metadata")),
    )
    if msg is not None:
        metadata.setdefault("normalized_message", msg)
    if classification is not None:
        metadata.setdefault("normalized_category", classification)
    if protocol is not None:
        metadata.setdefault("normalized_protocol", protocol)

    rule_metadata: dict[str, Any] = _remove_none_values(
        {
            "source": source,
            "rule_id": rule_id,
            "sid": sid,
            "rev": rev,
            "msg": msg,
            "classification": classification,
            "priority": _int_or_none(
                _first_non_empty(
                    existing.get("priority"),
                    explicit_rule.get("priority"),
                    nested_alert_rule.get("priority"),
                    payload.get("priority"),
                )
            ),
            "references": _coerce_list_of_strings(
                existing.get("references")
                or explicit_rule.get("references")
                or nested_alert_rule.get("references")
                or payload.get("references")
            ),
            "metadata": metadata,
        }
    )
    if not rule_metadata.get("references"):
        rule_metadata.pop("references", None)
    if not rule_metadata.get("metadata"):
        rule_metadata.pop("metadata", None)

    if require_rule_fields:
        values_by_field = {
            "source": source,
            "rule_id": rule_id,
            "sid": sid,
            "msg": msg,
            "classification": classification,
            "protocol": protocol,
        }
        for field_name in SNORT_REQUIRED_RULE_FIELDS:
            value = values_by_field.get(field_name)
            missing = value is None
            if isinstance(value, str) and not value.strip():
                missing = True
            if missing:
                diagnostics.append(
                    _diagnostic(
                        adapter=adapter,
                        code=f"snort.rule_metadata.{field_name}.missing",
                        severity="warning",
                        message=f"Snort rule metadata field '{field_name}' is missing.",
                        field_path=f"rule_metadata.{field_name}",
                    )
                )
    return rule_metadata


def _normalize_snort_network_payload(
    *,
    payload: dict[str, Any],
    raw_hit_payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
    rule_text: str | None,
    protocol_hint: str | None,
    prefer_alert_shape: bool,
) -> dict[str, Any]:
    candidates = _snort_candidate_dicts(payload=payload, raw_hit_payload=raw_hit_payload, prefer_alert_shape=prefer_alert_shape)
    five_tuple = _normalize_snort_five_tuple(
        candidates=candidates,
        adapter=adapter,
        diagnostics=diagnostics,
        protocol_hint=protocol_hint,
        rule_text=rule_text,
    )
    directionality = _normalize_snort_directionality(candidates=candidates, rule_text=rule_text, adapter=adapter, diagnostics=diagnostics)
    timing = _normalize_snort_timing(candidates=candidates)
    repetition = _normalize_snort_repetition(candidates=candidates, payload=payload, rule_text=rule_text)
    pcap_metadata = _normalize_snort_pcap_metadata(candidates=candidates, payload=payload)

    network: dict[str, Any] = {}
    if five_tuple:
        network["five_tuple"] = five_tuple
    if directionality:
        network["directionality"] = directionality
    if timing:
        network["timing"] = timing
    if repetition:
        network["repetition"] = repetition
    if pcap_metadata:
        network["pcap_metadata"] = pcap_metadata
    return network


def _normalize_snort_five_tuple(
    *,
    candidates: list[dict[str, Any]],
    adapter: str,
    diagnostics: list[Diagnostic],
    protocol_hint: str | None,
    rule_text: str | None,
) -> dict[str, Any]:
    src_ip = _first_non_empty_from_dicts(candidates, "src_ip", "source_ip", "src", "ip_src")
    dst_ip = _first_non_empty_from_dicts(candidates, "dst_ip", "destination_ip", "dest_ip", "dst", "ip_dst")
    src_port = _normalize_port_value(
        raw=_first_non_empty_from_dicts(candidates, "src_port", "source_port", "sport"),
        adapter=adapter,
        diagnostics=diagnostics,
        field_path="raw_hit_payload.network.five_tuple.src_port",
    )
    dst_port = _normalize_port_value(
        raw=_first_non_empty_from_dicts(candidates, "dst_port", "destination_port", "dest_port", "dport"),
        adapter=adapter,
        diagnostics=diagnostics,
        field_path="raw_hit_payload.network.five_tuple.dst_port",
    )
    protocol = _first_non_empty(
        _first_non_empty_from_dicts(candidates, "protocol", "proto", "l4_protocol"),
        protocol_hint,
        _extract_snort_protocol_from_rule_text(rule_text),
    )
    if protocol:
        protocol = protocol.lower()

    five_tuple = _remove_none_values(
        {
            "src_ip": src_ip,
            "src_port": src_port,
            "dst_ip": dst_ip,
            "dst_port": dst_port,
            "protocol": protocol,
        }
    )
    if five_tuple and len(five_tuple) < 5:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="snort.network.five_tuple.partial",
                severity="warning",
                message="Snort 5-tuple is partially populated.",
                field_path="raw_hit_payload.network.five_tuple",
            )
        )
    return five_tuple


def _normalize_snort_directionality(
    *,
    candidates: list[dict[str, Any]],
    rule_text: str | None,
    adapter: str,
    diagnostics: list[Diagnostic],
) -> dict[str, Any]:
    arrow = _first_non_empty(
        _first_non_empty_from_dicts(candidates, "direction_arrow", "arrow"),
        _extract_snort_direction_arrow_from_rule_text(rule_text),
    )
    if arrow and arrow not in {"->", "<-", "<>"}:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="snort.directionality.arrow.invalid",
                severity="warning",
                message=f"Unsupported direction arrow '{arrow}'.",
                field_path="raw_hit_payload.network.directionality.arrow",
            )
        )
        arrow = None

    flow_terms = _coerce_snort_flow_terms(
        _first_non_empty_from_dicts(candidates, "flow", "flow_state"),
        _extract_snort_flow_terms_from_rule_text(rule_text),
    )
    direction = _first_non_empty_from_dicts(candidates, "directionality", "direction")
    if direction is None:
        if "to_server" in flow_terms:
            direction = "to_server"
        elif "from_server" in flow_terms:
            direction = "from_server"

    output = _remove_none_values(
        {
            "arrow": arrow,
            "direction": direction,
        }
    )
    if flow_terms:
        output["flow"] = flow_terms
    return output


def _normalize_snort_timing(*, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    output = _remove_none_values(
        {
            "observed_at": _first_non_empty_from_dicts(candidates, "observed_at", "timestamp", "event_time", "event_time_utc", "hit_time"),
            "first_seen": _first_non_empty_from_dicts(candidates, "first_seen"),
            "last_seen": _first_non_empty_from_dicts(candidates, "last_seen"),
            "window_seconds": _int_or_none(_first_non_empty_from_dicts(candidates, "window_seconds", "duration_seconds", "time_window_seconds")),
        }
    )
    return output


def _normalize_snort_repetition(*, candidates: list[dict[str, Any]], payload: dict[str, Any], rule_text: str | None) -> dict[str, Any]:
    threshold = _first_dict_from_dicts(candidates, "threshold", "repetition")
    threshold_from_rule = _parse_snort_threshold_from_rule_text(rule_text)
    output = _remove_none_values(
        {
            "type": _first_non_empty(threshold.get("type"), threshold_from_rule.get("type")),
            "track": _first_non_empty(threshold.get("track"), threshold_from_rule.get("track")),
            "count": _int_or_none(
                _first_non_empty(
                    threshold.get("count"),
                    threshold_from_rule.get("count"),
                    _first_non_empty_from_dicts(candidates, "count", "hit_count", "repetition_count", "repeat_count"),
                )
            ),
            "window_seconds": _int_or_none(
                _first_non_empty(
                    threshold.get("seconds"),
                    threshold_from_rule.get("seconds"),
                    _first_non_empty_from_dicts(candidates, "repeat_window_seconds", "window_seconds"),
                )
            ),
            "count_24h": _int_or_none(
                _first_non_empty(
                    _nested_get(payload, "time_prevalence_context.hit_count_24h"),
                    _first_non_empty_from_dicts(candidates, "hit_count_24h"),
                )
            ),
            "count_7d": _int_or_none(
                _first_non_empty(
                    _nested_get(payload, "time_prevalence_context.hit_count_7d"),
                    _first_non_empty_from_dicts(candidates, "hit_count_7d"),
                )
            ),
        }
    )
    return output


def _normalize_snort_pcap_metadata(*, candidates: list[dict[str, Any]], payload: dict[str, Any]) -> dict[str, Any]:
    pcap = _first_dict_from_dicts(candidates, "pcap_metadata", "pcap", "capture")
    if not pcap:
        pcap = _coerce_dict(payload.get("pcap"))
    output = _remove_none_values(
        {
            "capture_id": _first_non_empty(pcap.get("capture_id"), pcap.get("id"), payload.get("capture_id")),
            "file_path": _first_non_empty(pcap.get("file_path"), pcap.get("path")),
            "sha256": _first_non_empty(pcap.get("sha256"), pcap.get("pcap_sha256")),
            "packet_count": _int_or_none(_first_non_empty(pcap.get("packet_count"))),
            "byte_count": _int_or_none(_first_non_empty(pcap.get("byte_count"), pcap.get("bytes"))),
            "capture_start": _first_non_empty(pcap.get("capture_start"), pcap.get("started_at")),
            "capture_end": _first_non_empty(pcap.get("capture_end"), pcap.get("ended_at")),
        }
    )
    return output


def _normalize_snort_object_metadata(
    *,
    payload: dict[str, Any],
    package_payload: dict[str, Any],
    raw_hit_payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
    source_system_default: str,
    network: dict[str, Any],
) -> dict[str, Any]:
    existing = _coerce_dict(package_payload.get("object_metadata"))
    custom_attributes = _coerce_dict(existing.get("custom_attributes"))
    if network:
        custom_attributes["network"] = network
    pcap_metadata = _coerce_dict(network.get("pcap_metadata"))
    if pcap_metadata:
        custom_attributes.setdefault("pcap_metadata", pcap_metadata)

    flow_id = _first_non_empty(
        _nested_get(raw_hit_payload, "flow_id"),
        payload.get("flow_id"),
        _nested_get(network, "pcap_metadata.capture_id"),
    )
    object_id = _first_non_empty(
        existing.get("object_id"),
        payload.get("object_id"),
        flow_id,
        _build_network_object_id(_coerce_dict(network.get("five_tuple"))),
    )
    object_type = _first_non_empty(existing.get("object_type"), payload.get("object_type")) or "network_flow"
    source_system = _first_non_empty(
        existing.get("source_system"),
        payload.get("source_system"),
        payload.get("source"),
        _first_non_empty_from_dicts(_snort_candidate_dicts(payload=payload, raw_hit_payload=raw_hit_payload, prefer_alert_shape=False), "sensor"),
        source_system_default,
    )

    labels = _coerce_list_of_strings(existing.get("labels"))
    if "family:snort" not in labels:
        labels.append("family:snort")

    output = _remove_none_values(
        {
            "object_id": object_id,
            "object_type": object_type,
            "source_system": source_system,
            "labels": labels,
            "custom_attributes": custom_attributes,
        }
    )
    if not output.get("labels"):
        output.pop("labels", None)
    if not output.get("custom_attributes"):
        output.pop("custom_attributes", None)
    if not output.get("object_id"):
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="snort.object_metadata.object_id.missing",
                severity="warning",
                message="Object metadata is missing object_id.",
                field_path="object_metadata.object_id",
            )
        )
        output["object_id"] = "snort-object"
    return output


def _snort_candidate_dicts(*, payload: dict[str, Any], raw_hit_payload: dict[str, Any], prefer_alert_shape: bool) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []

    def _append(value: Any) -> None:
        if not isinstance(value, dict):
            return
        if value in output:
            return
        output.append(value)

    alert = _coerce_dict(payload.get("alert"))
    flow = _coerce_dict(payload.get("flow"))
    pcap = _coerce_dict(payload.get("pcap"))
    if prefer_alert_shape:
        _append(alert)
    _append(raw_hit_payload)
    _append(alert)
    _append(flow)
    _append(pcap)
    _append(payload)
    return output


def _first_non_empty_from_dicts(dicts: list[dict[str, Any]], *keys: str) -> str | None:
    for item in dicts:
        for key in keys:
            normalized = _normalize_string(item.get(key))
            if normalized:
                return normalized
    return None


def _first_dict_from_dicts(dicts: list[dict[str, Any]], *keys: str) -> dict[str, Any]:
    for item in dicts:
        for key in keys:
            value = item.get(key)
            if isinstance(value, dict):
                return value
    return {}


def _extract_snort_protocol_from_rule_text(rule_text: str | None) -> str | None:
    text = _normalize_string(rule_text)
    if text is None:
        return None
    match = re.search(r"^\s*[A-Za-z_]+\s+([A-Za-z0-9_]+)\s+", text)
    if match is None:
        return None
    return _normalize_string(match.group(1))


def _extract_snort_direction_arrow_from_rule_text(rule_text: str | None) -> str | None:
    text = _normalize_string(rule_text)
    if text is None:
        return None
    match = re.search(r"\s(->|<-|<>)\s", text)
    if match is None:
        return None
    return match.group(1)


def _extract_snort_msg_from_rule_text(rule_text: str | None) -> str | None:
    text = _normalize_string(rule_text)
    if text is None:
        return None
    match = re.search(r'msg\s*:\s*"([^"]+)"', text, flags=re.IGNORECASE)
    if match is None:
        return None
    return _normalize_string(match.group(1))


def _extract_snort_classification_from_rule_text(rule_text: str | None) -> str | None:
    text = _normalize_string(rule_text)
    if text is None:
        return None
    match = re.search(r"classtype\s*:\s*([^;]+)", text, flags=re.IGNORECASE)
    if match is None:
        return None
    return _normalize_string(match.group(1))


def _extract_snort_sid_from_rule_text(rule_text: str | None) -> str | None:
    text = _normalize_string(rule_text)
    if text is None:
        return None
    match = re.search(r"sid\s*:\s*([0-9]+)", text, flags=re.IGNORECASE)
    if match is None:
        return None
    return match.group(1)


def _extract_snort_rev_from_rule_text(rule_text: str | None) -> str | None:
    text = _normalize_string(rule_text)
    if text is None:
        return None
    match = re.search(r"rev\s*:\s*([0-9]+)", text, flags=re.IGNORECASE)
    if match is None:
        return None
    return match.group(1)


def _extract_snort_flow_terms_from_rule_text(rule_text: str | None) -> list[str]:
    text = _normalize_string(rule_text)
    if text is None:
        return []
    match = re.search(r"flow\s*:\s*([^;]+)", text, flags=re.IGNORECASE)
    if match is None:
        return []
    return _coerce_snort_flow_terms(match.group(1))


def _parse_snort_threshold_from_rule_text(rule_text: str | None) -> dict[str, Any]:
    text = _normalize_string(rule_text)
    if text is None:
        return {}
    match = re.search(r"threshold\s*:\s*([^;]+)", text, flags=re.IGNORECASE)
    if match is None:
        return {}

    output: dict[str, Any] = {}
    for chunk in match.group(1).split(","):
        part = chunk.strip()
        if not part:
            continue
        tokens = part.split(maxsplit=1)
        if len(tokens) != 2:
            continue
        key = tokens[0].lower().strip()
        value = tokens[1].strip()
        if key in {"count", "seconds"}:
            parsed = _int_or_none(value)
            if parsed is not None:
                output[key] = parsed
            continue
        if key in {"track", "type"}:
            output[key] = value
    return output


def _coerce_snort_flow_terms(*values: Any) -> list[str]:
    output: list[str] = []
    for value in values:
        if value is None:
            continue
        candidates: list[Any] = []
        if isinstance(value, list):
            candidates = value
        else:
            normalized = _normalize_string(value)
            if normalized is None:
                continue
            candidates = normalized.split(",")
        for item in candidates:
            text = _normalize_string(item)
            if text is None:
                continue
            lowered = text.lower()
            if lowered not in output:
                output.append(lowered)
    return output


def _normalize_port_value(
    *,
    raw: str | None,
    adapter: str,
    diagnostics: list[Diagnostic],
    field_path: str,
) -> int | str | None:
    text = _normalize_string(raw)
    if text is None:
        return None
    if text.lower() == "any":
        return "any"
    parsed = _int_or_none(text)
    if parsed is not None:
        return parsed
    diagnostics.append(
        _diagnostic(
            adapter=adapter,
            code=f"snort.network.{field_path.rsplit('.', 1)[-1]}.invalid",
            severity="warning",
            message=f"Port value '{text}' is not numeric.",
            field_path=field_path,
        )
    )
    return text


def _build_network_object_id(five_tuple: dict[str, Any]) -> str | None:
    if not five_tuple:
        return None
    src_ip = _normalize_string(five_tuple.get("src_ip"))
    dst_ip = _normalize_string(five_tuple.get("dst_ip"))
    src_port = _normalize_string(five_tuple.get("src_port"))
    dst_port = _normalize_string(five_tuple.get("dst_port"))
    protocol = _normalize_string(five_tuple.get("protocol"))
    if not src_ip or not dst_ip:
        return None
    return f"flow:{src_ip}:{src_port or 'na'}->{dst_ip}:{dst_port or 'na'}:{protocol or 'na'}"


def _int_or_none(value: Any) -> int | None:
    if value is None:
        return None
    try:
        parsed = int(str(value).strip())
    except (TypeError, ValueError):
        return None
    return parsed


def _build_sigma_detection_package(
    *,
    payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
    source_default: str,
    source_system_default: str,
    prefer_alert_shape: bool,
    require_sigma_fields: bool = True,
) -> dict[str, Any]:
    package_payload = _extract_existing_package_payload(payload)
    package_payload["rule_family"] = "sigma"

    rule_metadata = _normalize_sigma_rule_metadata(
        payload=payload,
        package_payload=package_payload,
        adapter=adapter,
        diagnostics=diagnostics,
        source_default=source_default,
        require_sigma_fields=require_sigma_fields,
    )
    if rule_metadata:
        package_payload["rule_metadata"] = rule_metadata

    rule_text = _extract_sigma_rule_text(payload=payload, package_payload=package_payload)
    if rule_text:
        package_payload["full_rule_text"] = rule_text
    elif require_sigma_fields:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="sigma.rule_text.missing",
                severity="warning",
                message="Sigma rule text is missing.",
                field_path="full_rule_text",
            )
        )

    raw_hit_payload = _coerce_dict(package_payload.get("raw_hit_payload"))
    if prefer_alert_shape:
        normalized_alert = _normalize_sigma_alert_payload(payload=payload, adapter=adapter, diagnostics=diagnostics)
        if normalized_alert:
            raw_hit_payload = normalized_alert
    if not raw_hit_payload:
        raw_hit_payload = _coerce_dict(payload.get("raw_hit_payload"))
    if not raw_hit_payload:
        raw_hit_payload = _normalize_sigma_alert_payload(payload=payload, adapter=adapter, diagnostics=diagnostics)
    if not raw_hit_payload:
        raw_hit_payload = _safe_copy_payload(payload)

    lineage = _extract_lineage(payload=payload, adapter=adapter, diagnostics=diagnostics)
    if lineage:
        raw_hit_payload["lineage"] = lineage

    package_payload["raw_hit_payload"] = raw_hit_payload
    package_payload["object_metadata"] = _normalize_sigma_object_metadata(
        payload=payload,
        package_payload=package_payload,
        raw_hit_payload=raw_hit_payload,
        adapter=adapter,
        diagnostics=diagnostics,
        source_system_default=source_system_default,
    )
    if lineage:
        custom_attributes = _coerce_dict(package_payload["object_metadata"].get("custom_attributes"))
        custom_attributes["lineage"] = lineage
        package_payload["object_metadata"]["custom_attributes"] = custom_attributes

    asset_context = _normalize_context_candidate(
        context_name="asset_context",
        adapter=adapter,
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("asset_context"), "package_payload.asset_context"),
            (payload.get("asset_context"), "asset_context"),
            (payload.get("asset"), "asset"),
        ],
        allowed_keys=ASSET_CONTEXT_KEYS,
    )
    if asset_context is not None:
        package_payload["asset_context"] = asset_context

    time_context = _normalize_context_candidate(
        context_name="time_prevalence_context",
        adapter=adapter,
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("time_prevalence_context"), "package_payload.time_prevalence_context"),
            (payload.get("time_prevalence_context"), "time_prevalence_context"),
            (payload.get("time_context"), "time_context"),
            (payload.get("prevalence"), "prevalence"),
        ],
        allowed_keys=TIME_PREVALENCE_CONTEXT_KEYS,
    )
    if time_context is not None:
        package_payload["time_prevalence_context"] = time_context

    allowlist_context = _normalize_context_candidate(
        context_name="allowlist_baseline_context",
        adapter=adapter,
        diagnostics=diagnostics,
        candidates=[
            (package_payload.get("allowlist_baseline_context"), "package_payload.allowlist_baseline_context"),
            (payload.get("allowlist_baseline_context"), "allowlist_baseline_context"),
            (payload.get("allowlist_context"), "allowlist_context"),
            (payload.get("allowlist"), "allowlist"),
            (payload.get("baseline_context"), "baseline_context"),
        ],
        allowed_keys=ALLOWLIST_BASELINE_CONTEXT_KEYS,
    )
    if allowlist_context is not None:
        package_payload["allowlist_baseline_context"] = allowlist_context

    return package_payload


def _normalize_sigma_rule_metadata(
    *,
    payload: dict[str, Any],
    package_payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
    source_default: str,
    require_sigma_fields: bool,
) -> dict[str, Any]:
    existing = _coerce_dict(package_payload.get("rule_metadata"))
    explicit_rule = _coerce_dict(payload.get("rule"))
    nested_alert_rule = _coerce_dict(_nested_get(payload, "alert.rule"))

    logsource = _normalize_sigma_logsource(
        _first_dict(
            existing.get("logsource"),
            explicit_rule.get("logsource"),
            nested_alert_rule.get("logsource"),
            payload.get("logsource"),
        ),
        adapter=adapter,
        diagnostics=diagnostics,
    )

    status_raw = _first_non_empty(
        existing.get("status"),
        explicit_rule.get("status"),
        nested_alert_rule.get("status"),
        payload.get("status"),
    )
    status = status_raw.lower() if status_raw else None
    if status and status not in SIGMA_ALLOWED_STATUS:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="sigma.status.invalid",
                severity="warning",
                message=f"Unsupported sigma status '{status_raw}'.",
                field_path="rule_metadata.status",
            )
        )
        status = None

    level_raw = _first_non_empty(
        existing.get("level"),
        explicit_rule.get("level"),
        nested_alert_rule.get("level"),
        payload.get("level"),
    )
    level = level_raw.lower() if level_raw else None
    if level and level not in SIGMA_ALLOWED_LEVEL:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="sigma.level.invalid",
                severity="warning",
                message=f"Unsupported sigma level '{level_raw}'.",
                field_path="rule_metadata.level",
            )
        )
        level = None

    rule_metadata: dict[str, Any] = {
        "source": _first_non_empty(
            existing.get("source"),
            explicit_rule.get("source"),
            nested_alert_rule.get("source"),
            payload.get("source"),
            payload.get("source_system"),
            source_default,
        ),
        "rule_id": _first_non_empty(
            existing.get("rule_id"),
            explicit_rule.get("rule_id"),
            nested_alert_rule.get("rule_id"),
            payload.get("rule_id"),
            explicit_rule.get("id"),
            nested_alert_rule.get("id"),
            payload.get("id"),
        ),
        "title": _first_non_empty(
            existing.get("title"),
            explicit_rule.get("title"),
            nested_alert_rule.get("title"),
            existing.get("name"),
            explicit_rule.get("name"),
            nested_alert_rule.get("name"),
            payload.get("rule_name"),
            payload.get("title"),
        ),
        "id": _first_non_empty(
            existing.get("id"),
            explicit_rule.get("id"),
            nested_alert_rule.get("id"),
            payload.get("id"),
            payload.get("rule_id"),
        ),
        "status": status,
        "description": _first_non_empty(
            existing.get("description"),
            explicit_rule.get("description"),
            nested_alert_rule.get("description"),
            payload.get("description"),
        ),
        "author": _first_non_empty(
            existing.get("author"),
            explicit_rule.get("author"),
            nested_alert_rule.get("author"),
            payload.get("author"),
        ),
        "tags": _coerce_list_of_strings(existing.get("tags") or explicit_rule.get("tags") or nested_alert_rule.get("tags") or payload.get("tags")),
        "level": level,
        "logsource": logsource,
    }
    rule_metadata = _remove_none_values(rule_metadata)

    if require_sigma_fields:
        for key in SIGMA_REQUIRED_RULE_FIELDS:
            value = rule_metadata.get(key)
            missing = False
            if value is None:
                missing = True
            elif isinstance(value, str) and not value.strip():
                missing = True
            elif key == "logsource" and not isinstance(value, dict):
                missing = True
            if missing:
                diagnostics.append(
                    _diagnostic(
                        adapter=adapter,
                        code=f"sigma.rule_metadata.{key}.missing",
                        severity="warning",
                        message=f"Sigma rule metadata field '{key}' is missing.",
                        field_path=f"rule_metadata.{key}",
                    )
                )

    return rule_metadata


def _normalize_sigma_logsource(
    raw: dict[str, Any] | None,
    *,
    adapter: str,
    diagnostics: list[Diagnostic],
) -> dict[str, Any] | None:
    if raw is None:
        return None
    if not isinstance(raw, dict):
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="sigma.logsource.invalid_type",
                severity="warning",
                message="Sigma logsource must be an object.",
                field_path="rule_metadata.logsource",
            )
        )
        return None

    output = {
        "category": _normalize_string(raw.get("category")),
        "product": _normalize_string(raw.get("product")),
        "service": _normalize_string(raw.get("service")),
    }
    output = _remove_none_values(output)
    if not output:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="sigma.logsource.empty",
                severity="warning",
                message="Sigma logsource object is empty.",
                field_path="rule_metadata.logsource",
            )
        )
        return None
    return output


def _extract_sigma_rule_text(payload: dict[str, Any], package_payload: dict[str, Any]) -> str | None:
    return _first_non_empty(
        package_payload.get("full_rule_text"),
        payload.get("full_rule_text"),
        payload.get("rule_text"),
        payload.get("sigma_rule"),
        _nested_get(payload, "rule.text"),
        _nested_get(payload, "alert.rule.text"),
        _nested_get(payload, "rule.raw"),
        _nested_get(payload, "alert.rule.raw"),
    )


def _normalize_sigma_alert_payload(
    *,
    payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
) -> dict[str, Any]:
    alert_block = _coerce_dict(payload.get("alert"))
    base = alert_block if alert_block else payload

    event = {
        "event_id": _first_non_empty(
            base.get("event_id"),
            _nested_get(base, "event.id"),
            payload.get("event_id"),
            payload.get("id"),
        ),
        "timestamp": _first_non_empty(
            base.get("timestamp"),
            base.get("observed_at"),
            _nested_get(base, "event.timestamp"),
            payload.get("timestamp"),
            payload.get("event_time"),
            payload.get("event_time_utc"),
        ),
        "severity": _first_non_empty(base.get("severity"), _nested_get(base, "event.severity"), payload.get("severity")),
        "status": _first_non_empty(base.get("status"), _nested_get(base, "event.status"), payload.get("status")),
        "source": _first_non_empty(
            base.get("source"),
            base.get("source_system"),
            payload.get("source"),
            payload.get("source_system"),
        ),
    }
    event = _remove_none_values(event)

    process = _first_dict(base.get("process"), payload.get("process"))
    if not process:
        process = _remove_none_values(
            {
                "process_guid": _first_non_empty(base.get("process_guid"), payload.get("process_guid")),
                "pid": _first_non_empty(base.get("pid"), payload.get("pid")),
                "image": _first_non_empty(base.get("image"), payload.get("image")),
                "command_line": _first_non_empty(base.get("command_line"), payload.get("command_line")),
                "parent_process_guid": _first_non_empty(base.get("parent_process_guid"), payload.get("parent_process_guid")),
                "parent_pid": _first_non_empty(base.get("parent_pid"), payload.get("parent_pid")),
                "parent_image": _first_non_empty(base.get("parent_image"), payload.get("parent_image")),
            }
        )

    user = _first_dict(base.get("user"), payload.get("user"))
    if not user:
        user = _remove_none_values(
            {
                "user_id": _first_non_empty(base.get("user_id"), payload.get("user_id")),
                "user_name": _first_non_empty(base.get("user_name"), payload.get("user_name")),
                "domain": _first_non_empty(base.get("user_domain"), payload.get("user_domain")),
            }
        )

    host = _first_dict(base.get("host"), payload.get("host"))
    if not host:
        host = _remove_none_values(
            {
                "host_id": _first_non_empty(base.get("host_id"), payload.get("host_id")),
                "hostname": _first_non_empty(base.get("hostname"), payload.get("hostname"), base.get("host"), payload.get("host")),
                "ip": _first_non_empty(base.get("host_ip"), payload.get("host_ip"), base.get("ip"), payload.get("ip")),
            }
        )

    normalized: dict[str, Any] = {}
    if event:
        normalized["event"] = event
    if process:
        normalized["process"] = process
    if user:
        normalized["user"] = user
    if host:
        normalized["host"] = host

    lineage = _extract_lineage(payload=payload, adapter=adapter, diagnostics=diagnostics)
    if lineage:
        normalized["lineage"] = lineage

    if alert_block:
        normalized["original_alert"] = _safe_copy_payload(alert_block)
    elif not normalized:
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="sigma.alert.empty",
                severity="warning",
                message="Alert payload is empty after normalization.",
                field_path="alert",
            )
        )

    return normalized


def _extract_lineage(
    *,
    payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
) -> dict[str, Any] | None:
    output: dict[str, Any] = {}

    process_lineage = _first_non_empty_lineage_sequence(
        _nested_get(payload, "lineage.process"),
        payload.get("process_lineage"),
        _nested_get(payload, "alert.lineage.process"),
        _nested_get(payload, "alert.process_lineage"),
        adapter=adapter,
        diagnostics=diagnostics,
        field_path="lineage.process",
    )
    if not process_lineage:
        process_block = _first_dict(
            payload.get("process"),
            _nested_get(payload, "alert.process"),
            _nested_get(payload, "raw_hit_payload.process"),
        )
        if process_block:
            synthetic_node = _remove_none_values(
                {
                    "process_guid": _first_non_empty(process_block.get("process_guid"), process_block.get("guid")),
                    "pid": _first_non_empty(process_block.get("pid"), process_block.get("process_id")),
                    "image": _normalize_string(process_block.get("image")),
                    "command_line": _normalize_string(process_block.get("command_line")),
                    "parent_process_guid": _first_non_empty(process_block.get("parent_process_guid"), process_block.get("parent_guid")),
                    "parent_pid": _first_non_empty(process_block.get("parent_pid"), process_block.get("ppid")),
                    "parent_image": _normalize_string(process_block.get("parent_image")),
                }
            )
            if synthetic_node:
                process_lineage = [synthetic_node]

    user_lineage = _first_dict(
        _nested_get(payload, "lineage.user"),
        payload.get("user"),
        _nested_get(payload, "alert.lineage.user"),
        _nested_get(payload, "alert.user"),
    )
    host_lineage = _first_dict(
        _nested_get(payload, "lineage.host"),
        payload.get("host"),
        _nested_get(payload, "alert.lineage.host"),
        _nested_get(payload, "alert.host"),
    )

    if process_lineage:
        output["process"] = process_lineage
    if user_lineage:
        output["user"] = user_lineage
    if host_lineage:
        output["host"] = host_lineage

    return output or None


def _first_non_empty_lineage_sequence(
    *values: Any,
    adapter: str,
    diagnostics: list[Diagnostic],
    field_path: str,
) -> list[dict[str, Any]]:
    for value in values:
        if value is None:
            continue
        if isinstance(value, dict):
            return [_safe_copy_payload(value)]
        if isinstance(value, list):
            return _coerce_list_of_dicts(value)
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="lineage.invalid_type",
                severity="warning",
                message="Lineage block must be an object or array of objects.",
                field_path=field_path,
            )
        )
    return []


def _normalize_sigma_object_metadata(
    *,
    payload: dict[str, Any],
    package_payload: dict[str, Any],
    raw_hit_payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic],
    source_system_default: str,
) -> dict[str, Any]:
    existing = _coerce_dict(package_payload.get("object_metadata"))

    object_id = _first_non_empty(
        existing.get("object_id"),
        payload.get("object_id"),
        _nested_get(raw_hit_payload, "process.process_guid"),
        _nested_get(raw_hit_payload, "process.pid"),
        _nested_get(raw_hit_payload, "event.event_id"),
        _nested_get(raw_hit_payload, "host.host_id"),
        payload.get("case_id"),
        payload.get("id"),
    )
    object_type = _first_non_empty(
        existing.get("object_type"),
        payload.get("object_type"),
        _nested_get(raw_hit_payload, "process.object_type"),
    ) or "process_event"
    source_system = _first_non_empty(
        existing.get("source_system"),
        payload.get("source_system"),
        payload.get("source"),
        _nested_get(raw_hit_payload, "event.source"),
        source_system_default,
    )

    labels = _coerce_list_of_strings(existing.get("labels"))
    if source_system and f"source:{source_system}" not in labels:
        labels.append(f"source:{source_system}")

    custom_attributes = _coerce_dict(existing.get("custom_attributes"))
    if _nested_get(raw_hit_payload, "event.event_id"):
        custom_attributes.setdefault("event_id", _nested_get(raw_hit_payload, "event.event_id"))

    metadata: dict[str, Any] = {
        "object_id": object_id,
        "object_type": object_type,
        "source_system": source_system,
        "labels": labels,
        "custom_attributes": custom_attributes,
    }
    metadata = _remove_none_values(metadata)
    if "labels" in metadata and not metadata["labels"]:
        del metadata["labels"]
    if "custom_attributes" in metadata and not metadata["custom_attributes"]:
        del metadata["custom_attributes"]

    if not metadata.get("object_id"):
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="sigma.object_metadata.object_id.missing",
                severity="warning",
                message="Object metadata is missing object_id.",
                field_path="object_metadata.object_id",
            )
        )
    if not metadata.get("object_type"):
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="sigma.object_metadata.object_type.missing",
                severity="warning",
                message="Object metadata is missing object_type.",
                field_path="object_metadata.object_type",
            )
        )

    return metadata


def _normalize_context_candidate(
    *,
    context_name: str,
    adapter: str,
    diagnostics: list[Diagnostic],
    candidates: list[tuple[Any, str]],
    allowed_keys: set[str],
) -> dict[str, Any] | None:
    for value, field_path in candidates:
        if value is None:
            continue
        if not isinstance(value, dict):
            diagnostics.append(
                _diagnostic(
                    adapter=adapter,
                    code=f"{context_name}.invalid_type",
                    severity="warning",
                    message=f"{context_name} must be an object when provided.",
                    field_path=field_path,
                )
            )
            continue

        filtered: dict[str, Any] = {}
        for key in allowed_keys:
            if key in value and value[key] is not None:
                filtered[key] = value[key]

        if filtered:
            return filtered

        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code=f"{context_name}.empty",
                severity="warning",
                message=f"{context_name} was provided but did not contain supported fields.",
                field_path=field_path,
            )
        )
        return None

    return None


def _collect_behavior_reports(
    payload: dict[str, Any],
    package_payload: dict[str, Any],
    adapter: str,
    diagnostics: list[Diagnostic] | None = None,
) -> list[dict[str, Any]]:
    reports: list[dict[str, Any]] = []
    report_blocks: list[tuple[dict[str, Any], str]] = []

    from_package = _nested_get(package_payload, "behavior_report_references.reports")
    if isinstance(from_package, list):
        for idx, raw in enumerate(from_package):
            if isinstance(raw, dict):
                report_blocks.append((raw, f"package_payload.behavior_report_references.reports[{idx}]"))

    from_payload = _nested_get(payload, "behavior_report_references.reports")
    if isinstance(from_payload, list):
        for idx, raw in enumerate(from_payload):
            if isinstance(raw, dict):
                report_blocks.append((raw, f"payload.behavior_report_references.reports[{idx}]"))

    direct_candidates: list[tuple[dict[str, Any], str]] = []
    if _looks_like_behavior_summary(payload):
        direct_candidates.append((payload, "payload"))
    if package_payload and _looks_like_behavior_summary(package_payload):
        direct_candidates.append((package_payload, "package_payload"))

    vt_candidates: list[tuple[dict[str, Any], str]] = []
    vt_raw_candidates = [
        ("payload.virustotal_summary", payload.get("virustotal_summary")),
        ("payload.vt_summary", payload.get("vt_summary")),
        ("payload.vt_behavior_summary", payload.get("vt_behavior_summary")),
        ("payload.virustotal_behavior_summary", payload.get("virustotal_behavior_summary")),
        ("payload.behavior_summary", payload.get("behavior_summary")),
        ("payload.virustotal", payload.get("virustotal")),
        ("payload.vt", payload.get("vt")),
        ("payload.linked_enrichment.virustotal_summary", _nested_get(payload, "linked_enrichment.virustotal_summary")),
    ]
    for field_path, raw in vt_raw_candidates:
        if isinstance(raw, dict):
            vt_candidates.append((raw, field_path))

    for raw, field_path in report_blocks:
        report = (
            _normalize_vt_summary(raw, adapter, field_path=field_path, diagnostics=diagnostics)
            if _looks_like_vt_summary(raw)
            else _normalize_behavior_report(raw, adapter, field_path=field_path, diagnostics=diagnostics)
        )
        if report:
            reports.append(report)

    for raw, field_path in direct_candidates:
        report = (
            _normalize_vt_summary(raw, adapter, field_path=field_path, diagnostics=diagnostics)
            if _looks_like_vt_summary(raw)
            else _normalize_behavior_report(raw, adapter, field_path=field_path, diagnostics=diagnostics)
        )
        if report:
            reports.append(report)

    for raw, field_path in vt_candidates:
        is_vt_context = any(token in field_path for token in ("virustotal", "payload.vt", "linked_enrichment.virustotal"))
        report = (
            _normalize_vt_summary(raw, adapter, field_path=field_path, diagnostics=diagnostics)
            if is_vt_context or _looks_like_vt_summary(raw)
            else _normalize_behavior_report(raw, adapter, field_path=field_path, diagnostics=diagnostics)
        )
        if report:
            reports.append(report)

    deduped: dict[str, dict[str, Any]] = {}
    for report in reports:
        key = f"{report.get('report_id', '')}|{report.get('reference', '')}"
        deduped[key] = report
    return list(deduped.values())


def _normalize_behavior_report(
    raw: dict[str, Any],
    adapter: str,
    *,
    field_path: str = "behavior_report",
    diagnostics: list[Diagnostic] | None = None,
) -> dict[str, Any] | None:
    report_id = _first_non_empty(raw.get("report_id"), raw.get("id"))
    provider = _first_non_empty(raw.get("provider"), raw.get("vendor"))
    source = _first_non_empty(raw.get("source"), provider)
    report_style = _first_non_empty(raw.get("report_style"), raw.get("style"))
    reference = _first_non_empty(raw.get("reference"), raw.get("url"))
    summary = _first_non_empty(raw.get("summary"), _nested_get(raw, "behavioral_summary.high_level"), raw.get("high_level"))
    observed_at = _first_non_empty(raw.get("observed_at"), raw.get("generated_at"), raw.get("timestamp"))

    if not report_id:
        report_id = f"{adapter}-behavior-report"
    if not source:
        source = "behavior_report"
    if not reference:
        reference = f"internal://behavior-reports/{report_id}"

    features, snippets, feature_diagnostics = _extract_behavior_features(
        raw=raw,
        adapter=adapter,
        field_path=field_path,
        force_diagnostics=_looks_like_behavior_summary(raw),
    )
    if diagnostics is not None:
        diagnostics.extend(feature_diagnostics)

    report: dict[str, Any] = {
        "report_id": str(report_id),
        "source": str(source),
        "reference": str(reference),
    }
    if provider:
        report["provider"] = str(provider)
    if report_style:
        report["report_style"] = str(report_style)
    if summary:
        report["summary"] = str(summary)
    if observed_at:
        report["observed_at"] = str(observed_at)
    if features or _looks_like_behavior_summary(raw):
        report["extracted_behavior_features"] = features
    if snippets:
        report["behavior_evidence_snippets"] = snippets
    if feature_diagnostics:
        report["feature_extraction_diagnostics"] = feature_diagnostics
    return report


def _normalize_vt_summary(
    raw: dict[str, Any],
    adapter: str,
    *,
    field_path: str = "virustotal_summary",
    diagnostics: list[Diagnostic] | None = None,
) -> dict[str, Any] | None:
    enriched = dict(raw)
    report_id = _first_non_empty(raw.get("report_id"), raw.get("id")) or f"{adapter}-vt-summary"
    enriched.setdefault("report_id", report_id)
    enriched.setdefault("source", "virustotal")
    if not _normalize_string(enriched.get("report_style")):
        enriched["report_style"] = "virustotal_style_summary"
    report = _normalize_behavior_report(enriched, adapter, field_path=field_path, diagnostics=diagnostics)
    if report:
        report["source"] = "virustotal"
    return report


def _behavior_reports_to_evidence(reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    seen: set[str] = set()

    def _append(item: dict[str, Any]) -> None:
        key = json.dumps(item, sort_keys=True, default=str)
        if key in seen:
            return
        seen.add(key)
        evidence.append(item)

    for report in reports:
        report_id = _normalize_string(report.get("report_id")) or "behavior-report"
        source = _normalize_string(report.get("source")) or "behavior_report"
        summary = _normalize_string(report.get("summary")) or "Referenced behavior report."
        reference = report.get("reference")
        _append(
            {
                "evidence_id": report_id,
                "source": source,
                "summary": summary,
                "reference": reference,
            }
        )
        snippets = _coerce_list_of_strings(report.get("behavior_evidence_snippets"))
        for index, snippet in enumerate(snippets, start=1):
            _append(
                {
                    "evidence_id": f"{report_id}#snippet-{index}",
                    "source": source,
                    "summary": snippet,
                    "reference": reference,
                }
            )
    return evidence


def _looks_like_behavior_summary(raw: dict[str, Any]) -> bool:
    provider = (_normalize_string(raw.get("provider")) or "").lower()
    style = (_normalize_string(raw.get("report_style")) or "").lower()
    if any(token in provider for token in ("cape", "cuckoo", "virus", "sandbox")):
        return True
    if any(token in style for token in ("cape", "cuckoo", "virustotal", "summary")):
        return True
    if any(key in raw for key in BEHAVIOR_SECTION_KEYS):
        return True
    behavioral = raw.get("behavioral_summary")
    return isinstance(behavioral, dict) and bool(behavioral.get("observed_capabilities"))


def _looks_like_vt_summary(raw: dict[str, Any]) -> bool:
    provider = _normalize_string(raw.get("provider"))
    style = _normalize_string(raw.get("report_style"))
    source = _normalize_string(raw.get("source"))
    if provider and "virus" in provider.lower():
        return True
    if style and "virustotal" in style.lower():
        return True
    if source and "virustotal" in source.lower():
        return True
    return False


def _extract_behavior_features(
    *,
    raw: dict[str, Any],
    adapter: str,
    field_path: str,
    force_diagnostics: bool,
) -> tuple[dict[str, Any], list[str], list[Diagnostic]]:
    diagnostics: list[Diagnostic] = []
    features: dict[str, Any] = {}
    snippets: list[str] = []

    behavioral = _coerce_behavior_section(
        raw=raw,
        section_key="behavioral_summary",
        adapter=adapter,
        field_path=field_path,
        diagnostics=diagnostics,
        required=force_diagnostics,
    )
    network = _coerce_behavior_section(
        raw=raw,
        section_key="network_summary",
        adapter=adapter,
        field_path=field_path,
        diagnostics=diagnostics,
        required=force_diagnostics,
    )
    process = _coerce_behavior_section(
        raw=raw,
        section_key="process_summary",
        adapter=adapter,
        field_path=field_path,
        diagnostics=diagnostics,
        required=force_diagnostics,
    )
    sample = _coerce_behavior_section(
        raw=raw,
        section_key="sample",
        adapter=adapter,
        field_path=field_path,
        diagnostics=diagnostics,
        required=False,
    )

    capabilities = _coerce_list_of_strings(behavioral.get("observed_capabilities"))
    capability_texts = [item.lower() for item in capabilities]
    process_tree = process.get("tree")
    process_commands: list[str] = []
    process_images: list[str] = []
    if process_tree is not None and not isinstance(process_tree, list):
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="behavior.process_summary.tree.invalid_type",
                severity="warning",
                message="process_summary.tree must be an array when provided.",
                field_path=f"{field_path}.process_summary.tree",
            )
        )
    process_shape = _summarize_process_tree(process_tree if isinstance(process_tree, list) else [])
    process_images = process_shape.pop("_images", [])
    process_commands = process_shape.pop("_commands", [])
    if process_shape:
        features["process_tree_shape"] = process_shape
        root_list = process_shape.get("root_processes", [])
        if isinstance(root_list, list) and root_list:
            snippets.append(
                f"Process tree roots {', '.join(root_list[:3])} with depth {process_shape.get('max_depth', 0)}."
            )

    raw_api_candidates: list[str] = []
    raw_api_candidates.extend(capabilities)
    raw_api_candidates.extend(_coerce_list_of_strings(raw.get("api_calls")))
    raw_api_candidates.extend(_coerce_list_of_strings(raw.get("system_calls")))
    raw_api_candidates.extend(process_commands)
    api_families = _derive_api_family_hits(raw_api_candidates)
    if api_families:
        features["suspicious_api_system_call_families"] = api_families
        snippets.append(f"Suspicious API/system-call families: {', '.join(api_families[:4])}.")

    persistence_indicators: list[str] = []
    if behavioral.get("persistence_observed") is True:
        persistence_indicators.append("persistence_observed")
    persistence_indicators.extend(_match_keywords(capability_texts + [item.lower() for item in process_commands], PERSISTENCE_KEYWORDS))
    persistence_indicators = _dedupe_strings(persistence_indicators)
    if persistence_indicators:
        features["persistence_indicators"] = persistence_indicators
        snippets.append(f"Persistence indicators observed: {', '.join(persistence_indicators[:4])}.")

    registry_modifications = _dedupe_strings(
        _coerce_list_of_strings(raw.get("registry_modifications"))
        + _coerce_list_of_strings(process.get("registry_modifications"))
        + _extract_registry_hits(process_commands)
    )
    if registry_modifications:
        features["registry_modifications"] = registry_modifications
        snippets.append(f"Registry modification activity captured ({len(registry_modifications)} indicators).")

    dropped_files = _dedupe_strings(_coerce_list_of_strings(process.get("dropped_files")) + _coerce_list_of_strings(raw.get("dropped_files")))
    filesystem_writes = _dedupe_strings(
        _coerce_list_of_strings(raw.get("filesystem_writes"))
        + _coerce_list_of_strings(process.get("filesystem_writes"))
        + dropped_files
    )
    if filesystem_writes:
        features["filesystem_writes"] = filesystem_writes
    if dropped_files:
        features["dropped_files"] = dropped_files
        snippets.append(f"Dropped files observed: {', '.join(dropped_files[:3])}.")

    injected_processes = _dedupe_strings(
        _coerce_list_of_strings(raw.get("injected_processes"))
        + _coerce_list_of_strings(process.get("injected_processes"))
    )
    if not injected_processes and any(keyword in " ".join(raw_api_candidates).lower() for keyword in INJECTION_KEYWORDS):
        injected_processes.append("injection_api_activity")
    if injected_processes:
        features["injected_processes"] = injected_processes
        snippets.append(f"Injected-process indicators: {', '.join(injected_processes[:3])}.")

    network_destinations = _collect_network_destinations(network)
    if network_destinations:
        features["network_destinations"] = network_destinations
        destinations = [item.get("value", "") for item in network_destinations if isinstance(item, dict)]
        snippets.append(f"Network destinations include: {', '.join([item for item in destinations[:3] if item])}.")

    anti_analysis_markers: list[str] = []
    if behavioral.get("evasion_observed") is True:
        anti_analysis_markers.append("evasion_observed")
    anti_analysis_markers.extend(_match_keywords(capability_texts + [item.lower() for item in process_commands], ANTI_ANALYSIS_KEYWORDS))
    anti_analysis_markers = _dedupe_strings(anti_analysis_markers)
    if anti_analysis_markers:
        features["anti_analysis_markers"] = anti_analysis_markers
        snippets.append(f"Anti-analysis markers: {', '.join(anti_analysis_markers[:3])}.")

    signer_contradictions = _extract_signer_publisher_contradictions(sample)
    if signer_contradictions:
        features["signer_publisher_contradictions"] = signer_contradictions
        snippets.append("Signer/publisher contradiction indicators detected.")

    script_usage = _dedupe_strings(_extract_script_interpreter_usage(process_images, process_commands, capabilities))
    if script_usage:
        features["suspicious_script_interpreter_usage"] = script_usage
        snippets.append(f"Suspicious script/interpreter usage: {', '.join(script_usage[:4])}.")

    has_signal = any(_feature_has_signal(value) for value in features.values())
    if force_diagnostics and not has_signal:
        unusable_severity = "error" if adapter == "behavior_report_bundle_parser_v1" else "warning"
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code="behavior.feature_extraction.unusable",
                severity=unusable_severity,
                message="Behavior report block is present but unusable for feature extraction.",
                field_path=field_path,
            )
        )

    return features, _dedupe_strings(snippets), diagnostics


def _coerce_behavior_section(
    *,
    raw: dict[str, Any],
    section_key: str,
    adapter: str,
    field_path: str,
    diagnostics: list[Diagnostic],
    required: bool,
) -> dict[str, Any]:
    value = raw.get(section_key)
    if value is None:
        if required:
            diagnostics.append(
                _diagnostic(
                    adapter=adapter,
                    code=f"behavior.{section_key}.missing",
                    severity="warning",
                    message=f"{section_key} section is missing from behavior report.",
                    field_path=f"{field_path}.{section_key}",
                )
            )
        return {}
    if not isinstance(value, dict):
        diagnostics.append(
            _diagnostic(
                adapter=adapter,
                code=f"behavior.{section_key}.invalid_type",
                severity="warning",
                message=f"{section_key} must be an object when provided.",
                field_path=f"{field_path}.{section_key}",
            )
        )
        return {}
    return value


def _summarize_process_tree(tree: list[Any]) -> dict[str, Any]:
    if not tree:
        return {}

    root_processes: list[str] = []
    commands: list[str] = []
    images: list[str] = []
    process_count = 0
    max_depth = 0
    branching_nodes = 0

    def _walk(node: Any, depth: int) -> None:
        nonlocal process_count, max_depth, branching_nodes
        max_depth = max(max_depth, depth)

        if isinstance(node, str):
            process_count += 1
            command = node.strip()
            if command:
                commands.append(command)
                image = command.split(" ")[0].strip()
                if image:
                    images.append(image.lower())
            return

        if not isinstance(node, dict):
            return

        process_count += 1
        image = _normalize_string(node.get("image")) or _normalize_string(node.get("process_name")) or "unknown_process"
        cmd = _normalize_string(node.get("command_line")) or image
        if image:
            images.append(image.lower())
        if cmd:
            commands.append(cmd)
        if depth == 1:
            root_processes.append(image)

        children = node.get("children")
        if isinstance(children, list) and len(children) > 1:
            branching_nodes += 1
        for child in children or []:
            _walk(child, depth + 1)

    for root in tree:
        _walk(root, 1)

    if process_count == 0:
        return {}
    return {
        "root_processes": _dedupe_strings(root_processes),
        "process_count": process_count,
        "max_depth": max_depth,
        "branching_nodes": branching_nodes,
        "_commands": commands,
        "_images": images,
    }


def _derive_api_family_hits(candidates: list[str]) -> list[str]:
    hits: list[str] = []
    joined = " ".join(item.lower() for item in candidates if isinstance(item, str))
    for family, patterns in API_FAMILY_PATTERNS.items():
        if any(pattern in joined for pattern in patterns):
            hits.append(family)
    return _dedupe_strings(hits)


def _match_keywords(candidates: list[str], keywords: tuple[str, ...]) -> list[str]:
    text = " ".join(item.lower() for item in candidates if isinstance(item, str))
    return _dedupe_strings([keyword for keyword in keywords if keyword in text])


def _extract_registry_hits(commands: list[str]) -> list[str]:
    hits: list[str] = []
    for command in commands:
        lowered = command.lower()
        if "reg add" in lowered or "hklm\\" in lowered or "hkcu\\" in lowered:
            hits.append(command)
    return _dedupe_strings(hits)


def _collect_network_destinations(network: dict[str, Any]) -> list[dict[str, str]]:
    destinations: list[dict[str, str]] = []
    seen: set[str] = set()

    def _append(kind: str, value: str | None) -> None:
        normalized = _normalize_string(value)
        if not normalized:
            return
        key = f"{kind}:{normalized}"
        if key in seen:
            return
        seen.add(key)
        destinations.append({"type": kind, "value": normalized})

    for domain in _coerce_list_of_strings(network.get("domains")):
        _append("domain", domain)
    for ip in _coerce_list_of_strings(network.get("ip_contacts")):
        _append("ip", ip)
    requests = network.get("http_requests")
    if isinstance(requests, list):
        for request in requests:
            if not isinstance(request, dict):
                continue
            _append("domain", _first_non_empty(request.get("host"), request.get("domain")))
            _append("url", _normalize_string(request.get("url")))
            method = _normalize_string(request.get("method")) or "HTTP"
            path = _normalize_string(request.get("uri_path")) or _normalize_string(request.get("path"))
            if path:
                _append("http_path", f"{method.upper()} {path}")
    return destinations


def _extract_signer_publisher_contradictions(sample: dict[str, Any]) -> list[dict[str, str]]:
    contradictions: list[dict[str, str]] = []
    signer = _normalize_string(sample.get("signer"))
    publisher = _normalize_string(sample.get("publisher"))
    signed = _coerce_bool(sample.get("is_signed"))
    if signed is None:
        signed = _coerce_bool(sample.get("signed"))
    signature_valid = _coerce_bool(sample.get("signature_valid"))
    trusted = _coerce_bool(sample.get("trusted"))

    if signed is False and (signer or publisher):
        contradictions.append(
            {
                "issue": "unsigned_with_signer_fields",
                "details": "Sample marked unsigned but signer/publisher metadata is present.",
            }
        )
    if signed is True and signature_valid is False:
        contradictions.append(
            {
                "issue": "signed_but_signature_invalid",
                "details": "Sample indicates signed status while signature validation failed.",
            }
        )
    if trusted is False and publisher and any(token in publisher.lower() for token in ("microsoft", "windows", "google", "apple")):
        contradictions.append(
            {
                "issue": "trusted_publisher_marked_untrusted",
                "details": f"Publisher '{publisher}' appears trusted while sample is marked untrusted.",
            }
        )
    return contradictions


def _extract_script_interpreter_usage(process_images: list[str], process_commands: list[str], capabilities: list[str]) -> list[str]:
    hits: list[str] = []
    lowered_caps = [item.lower() for item in capabilities]
    for image in process_images:
        if any(name == image or image.endswith(f"\\{name}") for name in SCRIPT_INTERPRETER_NAMES):
            hits.append(image.split("\\")[-1])
    for command in process_commands:
        lowered = command.lower()
        for name in SCRIPT_INTERPRETER_NAMES:
            if name in lowered:
                hits.append(name)
    for capability in lowered_caps:
        if "script" in capability or "powershell" in capability:
            hits.append(capability)
    return _dedupe_strings(hits)


def _feature_has_signal(value: Any) -> bool:
    if isinstance(value, dict):
        return any(_feature_has_signal(item) for item in value.values())
    if isinstance(value, list):
        return any(_feature_has_signal(item) for item in value)
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (int, float, bool)):
        return True
    return value is not None


def _dedupe_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        normalized = _normalize_string(value)
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(normalized)
    return output


def _build_adapter_provenance(
    *,
    source: str,
    key: str,
    value: str,
    adapter: str,
    source_file: dict[str, Any],
    evidence_id: str | None = None,
    citation_ref: str | None = None,
) -> dict[str, Any]:
    return {
        "source": source,
        "key": key,
        "value": value,
        "evidence_id": evidence_id,
        "citation_ref": citation_ref or _normalize_string(source_file.get("source_path")),
        "retrieved_at_utc": _utc_now_iso(),
        "retrieved_by": adapter,
        "record_locator": _normalize_string(source_file.get("record_locator")),
    }


def _map_closure_to_adjudication_verdict(label: str | None) -> tuple[str | None, bool]:
    normalized = _normalize_closure_outcome_label(label)
    if normalized is None:
        return None, False
    mapped = CLOSURE_TO_ADJUDICATION_VERDICT.get(normalized)
    if mapped is None:
        return "insufficient_evidence", True
    return mapped, False


def _normalize_closure_outcome_label(label: str | None) -> str | None:
    text = _normalize_string(label)
    if text is None:
        return None
    return text.lower().strip().replace(" ", "_")


def _closure_record_is_final(payload: dict[str, Any], closure_record: dict[str, Any] | None) -> bool:
    explicit = _first_not_none(
        _coerce_bool(payload.get("is_final")),
        _coerce_bool(payload.get("finalized")),
        _coerce_bool(_nested_get(payload, "closure.is_final")),
        _coerce_bool(_nested_get(payload, "analyst_closure.is_final")),
        _coerce_bool(closure_record.get("is_final") if closure_record else None),
        _coerce_bool(closure_record.get("finalized") if closure_record else None),
    )
    if explicit is not None:
        return explicit

    status = _first_non_empty(
        payload.get("status"),
        _nested_get(payload, "closure.status"),
        _nested_get(payload, "analyst_closure.status"),
        closure_record.get("status") if closure_record else None,
    )
    if status:
        status_key = status.lower()
        if status_key in {"final", "closed", "resolved", "complete", "completed"}:
            return True
        if status_key in {"open", "pending", "in_progress", "triage"}:
            return False

    return (
        _first_non_empty(
            payload.get("closed_at"),
            _nested_get(payload, "closure.closed_at"),
            _nested_get(payload, "analyst_closure.closed_at"),
            closure_record.get("closed_at") if closure_record else None,
        )
        is not None
    )


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _first_not_none(*values: Any) -> Any:
    for value in values:
        if value is not None:
            return value
    return None


def _coerce_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return bool(value)
    text = _normalize_string(value)
    if text is None:
        return None
    lowered = text.lower()
    if lowered in {"true", "yes", "1", "final", "closed"}:
        return True
    if lowered in {"false", "no", "0", "open"}:
        return False
    return None


def _first_dict(*values: Any) -> dict[str, Any]:
    for value in values:
        if isinstance(value, dict):
            return value
    return {}


def _remove_none_values(mapping: dict[str, Any]) -> dict[str, Any]:
    output: dict[str, Any] = {}
    for key, value in mapping.items():
        if value is None:
            continue
        output[key] = value
    return output


def _coerce_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _merge_dicts(*mappings: dict[str, Any]) -> dict[str, Any]:
    output: dict[str, Any] = {}
    for mapping in mappings:
        if not isinstance(mapping, dict):
            continue
        for key, value in mapping.items():
            if isinstance(value, dict) and isinstance(output.get(key), dict):
                output[key] = _merge_dicts(_coerce_dict(output[key]), value)
                continue
            output[key] = value
    return output


def _coerce_list_of_dicts(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _coerce_list_of_strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    output: list[str] = []
    for item in value:
        normalized = _normalize_string(item)
        if normalized:
            output.append(normalized)
    return output


def _first_non_empty(*values: Any) -> str | None:
    for value in values:
        normalized = _normalize_string(value)
        if normalized:
            return normalized
    return None


def _normalize_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text


def _nested_get(payload: dict[str, Any], path: str) -> Any:
    current: Any = payload
    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def _diagnostic(
    *,
    adapter: str,
    code: str,
    severity: str,
    message: str,
    field_path: str,
) -> Diagnostic:
    normalized_severity = severity if severity in {"info", "warning", "error"} else "warning"
    return {
        "adapter": adapter,
        "code": code,
        "severity": normalized_severity,
        "message": message,
        "field_path": field_path,
    }


def _safe_copy_payload(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    try:
        serialized = json.dumps(value, default=str)
        parsed = json.loads(serialized)
        if isinstance(parsed, dict):
            return parsed
    except (TypeError, ValueError):
        pass
    return dict(value)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
