from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource


AI_ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_DIR = AI_ROOT / "schemas"
FIXTURES_DIR = AI_ROOT / "fixtures"

SCHEMA_FILES = {
    "detection": "detection-package.schema.json",
    "yara": "yara-package.schema.json",
    "sigma": "sigma-package.schema.json",
    "snort": "snort-package.schema.json",
}

SCENARIO_LABELS = {
    "yara": {
        "benign",
        "likely_benign",
        "suspicious",
        "likely_malicious",
        "malicious",
        "false_positive",
        "insufficient_evidence",
    },
    "sigma": {
        "benign",
        "suspicious",
        "malicious",
        "false_positive",
        "insufficient_evidence",
    },
    "snort": {
        "benign",
        "suspicious",
        "malicious",
        "false_positive",
        "insufficient_evidence",
    },
}

EXPECTED_ACTION_PLAN_LABELS = {
    "isolate_host",
    "quarantine_file",
    "block_hash",
    "block_domain",
    "block_url",
    "block_ip",
    "search_fleet",
    "collect_memory",
    "collect_process_tree",
    "collect_persistence_artifacts",
    "collect_network_context",
    "tighten_rule",
    "suppress_rule_candidate",
    "open_review",
    "notify_admin",
    "notify_analyst",
    "notify_it_operator",
    "no_immediate_action",
}

EXPECTED_ANALYST_CLOSURE_LABELS = {
    "true_positive",
    "false_positive",
    "benign",
    "insufficient_evidence",
    "escalated",
    "needs_review",
}

EXPECTED_BEHAVIOR_REPORT_FILES = {
    "cape-summary.example.json",
    "cuckoo-summary.example.json",
    "virustotal-summary.example.json",
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


def _scenario_files_for_family(family: str) -> list[Path]:
    return sorted((FIXTURES_DIR / family / "scenarios").glob(f"{family}-*.example.json"))


def _extract_scenario_label(path: Path, family: str) -> str:
    prefix = f"{family}-"
    suffix = ".example.json"
    name = path.name
    assert name.startswith(prefix), f"Unexpected scenario filename prefix for {path}"
    assert name.endswith(suffix), f"Unexpected scenario filename suffix for {path}"
    return name[len(prefix) : -len(suffix)]


def test_scenario_fixtures_validate_and_cover_expected_labels() -> None:
    referenced_report_ids: set[str] = set()

    for family, required_labels in SCENARIO_LABELS.items():
        files = _scenario_files_for_family(family)
        discovered_labels = {_extract_scenario_label(path, family) for path in files}
        assert discovered_labels == required_labels, f"{family} scenario labels mismatch."

        for path in files:
            payload = _read_json(path)
            _validator(family).validate(payload)

            for key in ("rule_family", "full_rule_text", "rule_metadata", "raw_hit_payload", "object_metadata"):
                assert key in payload, f"{path.name} missing required key: {key}"

            rule_metadata = payload["rule_metadata"]
            assert "source" in rule_metadata
            assert "rule_id" in rule_metadata

            object_metadata = payload["object_metadata"]
            assert "object_id" in object_metadata
            assert "object_type" in object_metadata

            scenario_label = _extract_scenario_label(path, family)
            labels = object_metadata.get("labels", [])
            assert f"scenario:{scenario_label}" in labels, f"{path.name} must contain scenario label marker."

            report_refs = payload.get("behavior_report_references", {}).get("reports", [])
            for report_ref in report_refs:
                referenced_report_ids.add(report_ref["report_id"])

    assert referenced_report_ids, "Expected at least one behavior report reference in scenario fixtures."


def test_behavior_reports_have_required_shape_and_are_referenced_consistently() -> None:
    reports_dir = FIXTURES_DIR / "behavior" / "reports"
    files = sorted(reports_dir.glob("*.json"))
    discovered_filenames = {path.name for path in files}
    assert discovered_filenames == EXPECTED_BEHAVIOR_REPORT_FILES

    report_ids: set[str] = set()
    for path in files:
        payload = _read_json(path)

        for key in (
            "provider",
            "report_id",
            "sample",
            "behavioral_summary",
            "network_summary",
            "process_summary",
            "confidence",
        ):
            assert key in payload, f"{path.name} missing required key: {key}"

        sample = payload["sample"]
        for key in ("sha256", "file_name", "file_type", "size_bytes"):
            assert key in sample, f"{path.name} sample missing required key: {key}"

        behavior = payload["behavioral_summary"]
        for key in ("high_level", "observed_capabilities"):
            assert key in behavior, f"{path.name} behavioral_summary missing required key: {key}"

        network = payload["network_summary"]
        for key in ("domains", "ip_contacts", "http_requests"):
            assert key in network, f"{path.name} network_summary missing required key: {key}"

        process = payload["process_summary"]
        assert "tree" in process, f"{path.name} process_summary missing required key: tree"

        confidence = payload["confidence"]
        assert isinstance(confidence, (float, int))
        assert 0.0 <= float(confidence) <= 1.0

        report_ids.add(payload["report_id"])

    referenced_report_ids: set[str] = set()
    for family in SCENARIO_LABELS:
        for scenario_file in _scenario_files_for_family(family):
            payload = _read_json(scenario_file)
            for report_ref in payload.get("behavior_report_references", {}).get("reports", []):
                referenced_report_ids.add(report_ref["report_id"])

    assert referenced_report_ids.issubset(report_ids)


def test_action_plan_label_catalog_contains_all_allowed_actions() -> None:
    payload = _read_json(FIXTURES_DIR / "labels" / "action-plan-labels.example.json")
    assert payload["label_type"] == "action_plan_labels"
    assert isinstance(payload["actions"], list)

    actions: set[str] = set()
    for entry in payload["actions"]:
        for key in (
            "action",
            "category",
            "requires_human_approval",
            "execution_mode",
        ):
            assert key in entry
        assert entry["requires_human_approval"] is True
        assert entry["execution_mode"] == "manual_only"
        actions.add(entry["action"])

    assert actions == EXPECTED_ACTION_PLAN_LABELS


def test_action_policy_matrix_allowed_actions_align_with_catalog() -> None:
    payload = _read_json(FIXTURES_DIR.parents[0] / "service" / "artifacts" / "action_policy_matrix.v1.json")
    rows = payload.get("rows", [])
    assert isinstance(rows, list) and rows

    matrix_actions: set[str] = set()
    for row in rows:
        allowed_actions = row.get("allowed_actions")
        assert isinstance(allowed_actions, list) and allowed_actions
        matrix_actions.update(allowed_actions)

    assert matrix_actions.issubset(EXPECTED_ACTION_PLAN_LABELS)
    assert "no_immediate_action" in matrix_actions


def test_analyst_closure_label_catalog_contains_expected_labels() -> None:
    payload = _read_json(FIXTURES_DIR / "labels" / "analyst-closure-labels.example.json")
    assert payload["label_type"] == "analyst_closure_labels"
    assert isinstance(payload["labels"], list)

    labels: set[str] = set()
    for entry in payload["labels"]:
        for key in ("label", "title", "description", "maps_to_verdict", "requires_case_note"):
            assert key in entry
        labels.add(entry["label"])

    assert labels == EXPECTED_ANALYST_CLOSURE_LABELS
