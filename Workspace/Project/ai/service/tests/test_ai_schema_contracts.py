from __future__ import annotations

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from referencing import Registry, Resource


AI_ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_DIR = AI_ROOT / "schemas"
FIXTURES_DIR = AI_ROOT / "fixtures"

SCHEMA_FILES = {
    "detection": "detection-package.schema.json",
    "yara": "yara-package.schema.json",
    "sigma": "sigma-package.schema.json",
    "snort": "snort-package.schema.json",
    "adjudication": "adjudication-result.schema.json",
    "action_plan": "action-plan.schema.json",
}

FIXTURE_FILES = {
    "detection": FIXTURES_DIR / "behavior" / "detection-package.example.json",
    "yara": FIXTURES_DIR / "yara" / "yara-package.example.json",
    "sigma": FIXTURES_DIR / "sigma" / "sigma-package.example.json",
    "snort": FIXTURES_DIR / "snort" / "snort-package.example.json",
    "adjudication": FIXTURES_DIR / "labels" / "adjudication-result.example.json",
    "action_plan": FIXTURES_DIR / "labels" / "action-plan.example.json",
}


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _load_schemas() -> dict[str, dict]:
    return {name: _read_json(SCHEMAS_DIR / filename) for name, filename in SCHEMA_FILES.items()}


def _build_registry(schemas: dict[str, dict]) -> Registry:
    registry = Registry()
    for schema in schemas.values():
        registry = registry.with_resource(schema["$id"], Resource.from_contents(schema))
    return registry


SCHEMAS = _load_schemas()
REGISTRY = _build_registry(SCHEMAS)


def _validator(schema_name: str) -> Draft202012Validator:
    return Draft202012Validator(SCHEMAS[schema_name], registry=REGISTRY)


def test_schema_documents_compile_under_draft_2020_12() -> None:
    for schema in SCHEMAS.values():
        Draft202012Validator.check_schema(schema)


def test_schema_embedded_examples_are_valid() -> None:
    for schema_name, schema in SCHEMAS.items():
        validator = _validator(schema_name)
        for example in schema.get("examples", []):
            validator.validate(example)


def test_canonical_fixture_examples_validate() -> None:
    for schema_name, fixture_path in FIXTURE_FILES.items():
        payload = _read_json(fixture_path)
        _validator(schema_name).validate(payload)


def test_detection_package_rejects_bare_string() -> None:
    with pytest.raises(ValidationError):
        _validator("detection").validate("not-a-detection-package")


def test_family_schema_rejects_mismatched_family_payload() -> None:
    sigma_payload = _read_json(FIXTURE_FILES["sigma"])
    with pytest.raises(ValidationError):
        _validator("yara").validate(sigma_payload)


def test_adjudication_rejects_out_of_range_confidence_and_fp_risk() -> None:
    payload = _read_json(FIXTURE_FILES["adjudication"])
    payload["confidence"] = 1.4
    payload["false_positive_risk"] = -0.1
    with pytest.raises(ValidationError):
        _validator("adjudication").validate(payload)


def test_adjudication_rejects_invalid_decision_state() -> None:
    payload = _read_json(FIXTURE_FILES["adjudication"])
    payload["promotion_decision"]["state"] = "approve_now"
    with pytest.raises(ValidationError):
        _validator("adjudication").validate(payload)


def test_action_plan_requires_never_auto_executes_field() -> None:
    payload = _read_json(FIXTURE_FILES["action_plan"])
    payload.pop("never_auto_executes")
    with pytest.raises(ValidationError):
        _validator("action_plan").validate(payload)


def test_detection_package_accepts_extended_behavior_report_reference_fields() -> None:
    payload = _read_json(FIXTURE_FILES["detection"])
    report = payload["behavior_report_references"]["reports"][0]
    report["report_style"] = "cape_summary"
    report["provider"] = "CAPE"
    report["extracted_behavior_features"] = {
        "process_tree_shape": {
            "root_processes": ["invoice_viewer_stub.exe"],
            "process_count": 3,
            "max_depth": 2,
            "branching_nodes": 1,
        },
        "suspicious_api_system_call_families": ["memory_injection_api"],
        "persistence_indicators": ["persistence_observed"],
        "registry_modifications": ["reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run ..."],
        "filesystem_writes": ["C:\\ProgramData\\SystemHealth\\svc-host.dat"],
        "dropped_files": ["C:\\ProgramData\\SystemHealth\\svc-host.dat"],
        "injected_processes": ["injection_api_activity"],
        "network_destinations": [{"type": "domain", "value": "control.sync-queue.example"}],
        "anti_analysis_markers": ["evasion_observed"],
        "signer_publisher_contradictions": [
            {"issue": "unsigned_with_signer_fields", "details": "Signer metadata exists while sample is unsigned."}
        ],
        "suspicious_script_interpreter_usage": ["powershell.exe"],
    }
    report["behavior_evidence_snippets"] = ["Suspicious script/interpreter usage: powershell.exe."]
    report["feature_extraction_diagnostics"] = [
        {
            "adapter": "behavior_report_bundle_parser_v1",
            "code": "behavior.network_summary.missing",
            "severity": "warning",
            "message": "network_summary section is missing from behavior report.",
            "field_path": "payload.network_summary",
        }
    ]

    _validator("detection").validate(payload)


def test_detection_package_rejects_unknown_behavior_report_reference_fields() -> None:
    payload = _read_json(FIXTURE_FILES["detection"])
    report = payload["behavior_report_references"]["reports"][0]
    report["unexpected_field"] = "not-allowed"
    with pytest.raises(ValidationError):
        _validator("detection").validate(payload)


def test_detection_package_accepts_historical_learning_context() -> None:
    payload = _read_json(FIXTURE_FILES["detection"])
    payload["historical_learning_context"] = {
        "features": {
            "history_support_signal": 0.73,
            "history_recommendation_accept_rate": 0.68,
        },
        "feature_provenance": [
            {
                "feature": "history_support_signal",
                "source_event_id": "evt-1",
                "event_type": "recommendation_feedback",
                "occurred_at_utc": "2026-04-16T10:00:00Z",
                "contribution": 0.73,
                "detail": "recommendation_accepted",
            }
        ],
        "quality": {
            "eligible_count": 2,
            "dropped_count": 1,
            "drop_reasons": {"not_finalized": 1},
            "lookback_days": 90,
        },
        "similar_detections": [
            {
                "detection_id": "det-h1",
                "rule_family": "sigma",
                "rule_id": "SIG-H1",
                "relation_type": "supporting_signal",
                "observed_at": "2026-04-16T10:00:00Z",
                "confidence": 0.74,
            }
        ],
    }
    _validator("detection").validate(payload)


def test_detection_package_rejects_out_of_range_historical_contribution() -> None:
    payload = _read_json(FIXTURE_FILES["detection"])
    payload["historical_learning_context"] = {
        "features": {"history_support_signal": 0.73},
        "feature_provenance": [
            {
                "feature": "history_support_signal",
                "source_event_id": "evt-1",
                "event_type": "recommendation_feedback",
                "occurred_at_utc": "2026-04-16T10:00:00Z",
                "contribution": 1.4,
            }
        ],
        "quality": {"eligible_count": 1, "dropped_count": 0, "drop_reasons": {}, "lookback_days": 90},
        "similar_detections": [],
    }
    with pytest.raises(ValidationError):
        _validator("detection").validate(payload)
