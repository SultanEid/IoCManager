from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

MATRIX_ENV_VAR = "CTI_SIDECAR_ACTION_POLICY_MATRIX_PATH"

ALLOWED_VERDICTS = {
    "benign",
    "likely_benign",
    "suspicious",
    "likely_malicious",
    "malicious",
    "false_positive",
    "insufficient_evidence",
    "stale_or_revoked",
}
ALLOWED_ASSET_CRITICALITY = {"low", "medium", "high", "critical", "unknown"}
ALLOWED_OBJECT_TYPES = {"file", "host", "process", "network", "unknown"}
ALLOWED_ACTIONS = {
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
ALLOWED_ESCALATION_TARGETS = {
    "none",
    "analyst_queue",
    "security_admin",
    "it_operator",
    "incident_response",
}
ALLOWED_REVIEWER_ROLES = {
    "tier1_analyst",
    "tier2_detection_engineer",
    "incident_responder",
}


def _default_policy_matrix_path() -> Path:
    service_root = Path(__file__).resolve().parents[1]
    return service_root / "artifacts" / "action_policy_matrix.v1.json"


@dataclass(frozen=True, slots=True)
class BucketDefinition:
    name: str
    minimum: float
    maximum: float
    minimum_inclusive: bool
    maximum_inclusive: bool

    def contains(self, value: float) -> bool:
        min_pass = value >= self.minimum if self.minimum_inclusive else value > self.minimum
        max_pass = value <= self.maximum if self.maximum_inclusive else value < self.maximum
        return min_pass and max_pass


@dataclass(frozen=True, slots=True)
class ActionPolicyMatrixRow:
    id: str
    priority: int
    family: str
    verdict: str
    confidence_bucket: str
    false_positive_risk_bucket: str
    asset_criticality: str
    object_type: str
    allowed_actions: tuple[str, ...]
    escalation_target: str
    required_reviewer_role: str
    index: int


@dataclass(frozen=True, slots=True)
class ActionPolicyMatrix:
    version: str
    confidence_buckets: tuple[BucketDefinition, ...]
    false_positive_risk_buckets: tuple[BucketDefinition, ...]
    rows: tuple[ActionPolicyMatrixRow, ...]
    path: Path


@dataclass(frozen=True, slots=True)
class ActionPolicySelection:
    matrix_version: str
    row_id: str
    row_priority: int
    confidence_bucket: str
    false_positive_risk_bucket: str
    allowed_actions: tuple[str, ...]
    escalation_target: str
    required_reviewer_role: str


def clear_action_policy_matrix_cache() -> None:
    _load_action_policy_matrix_cached.cache_clear()


def get_action_policy_matrix(path: str | Path | None = None) -> ActionPolicyMatrix:
    resolved = _resolve_path(path)
    return _load_action_policy_matrix_cached(str(resolved))


@lru_cache(maxsize=8)
def _load_action_policy_matrix_cached(path_str: str) -> ActionPolicyMatrix:
    path = Path(path_str)
    payload = json.loads(path.read_text(encoding="utf-8"))
    return _parse_matrix(payload, path=path)


def select_action_policy(
    *,
    matrix: ActionPolicyMatrix,
    family: str,
    verdict: str,
    confidence: float,
    false_positive_risk: float,
    asset_criticality: str,
    object_type: str,
) -> ActionPolicySelection:
    normalized_family = (family or "unknown").strip().lower() or "unknown"
    normalized_verdict = (verdict or "insufficient_evidence").strip().lower() or "insufficient_evidence"
    normalized_asset_criticality = (asset_criticality or "unknown").strip().lower() or "unknown"
    normalized_object_type = (object_type or "unknown").strip().lower() or "unknown"
    confidence_bucket = _resolve_bucket_name(_clip01(confidence), matrix.confidence_buckets, "confidence")
    fp_risk_bucket = _resolve_bucket_name(
        _clip01(false_positive_risk),
        matrix.false_positive_risk_buckets,
        "false_positive_risk",
    )

    matches = [
        row
        for row in matrix.rows
        if _selector_matches(row.family, normalized_family)
        and _selector_matches(row.verdict, normalized_verdict)
        and _selector_matches(row.confidence_bucket, confidence_bucket)
        and _selector_matches(row.false_positive_risk_bucket, fp_risk_bucket)
        and _selector_matches(row.asset_criticality, normalized_asset_criticality)
        and _selector_matches(row.object_type, normalized_object_type)
    ]
    if not matches:
        raise ValueError(
            "No action policy matrix row matched context "
            f"(family={normalized_family}, verdict={normalized_verdict}, "
            f"confidence_bucket={confidence_bucket}, false_positive_risk_bucket={fp_risk_bucket}, "
            f"asset_criticality={normalized_asset_criticality}, object_type={normalized_object_type})."
        )

    selected_row = sorted(matches, key=lambda row: (-row.priority, row.index))[0]
    return ActionPolicySelection(
        matrix_version=matrix.version,
        row_id=selected_row.id,
        row_priority=selected_row.priority,
        confidence_bucket=confidence_bucket,
        false_positive_risk_bucket=fp_risk_bucket,
        allowed_actions=selected_row.allowed_actions,
        escalation_target=selected_row.escalation_target,
        required_reviewer_role=selected_row.required_reviewer_role,
    )


def _resolve_path(path: str | Path | None) -> Path:
    configured = str(path).strip() if path is not None else os.getenv(MATRIX_ENV_VAR, "").strip()
    if configured:
        candidate = Path(configured)
        if not candidate.is_absolute():
            candidate = (Path(__file__).resolve().parents[1] / candidate).resolve()
        return candidate
    return _default_policy_matrix_path().resolve()


def _parse_matrix(payload: object, *, path: Path) -> ActionPolicyMatrix:
    if not isinstance(payload, dict):
        raise ValueError(f"Action policy matrix at '{path}' must be an object.")

    version = str(payload.get("version", "")).strip()
    if not version:
        raise ValueError(f"Action policy matrix at '{path}' is missing non-empty 'version'.")

    confidence_buckets = _parse_bucket_list(payload.get("confidence_buckets"), label="confidence_buckets", path=path)
    fp_risk_buckets = _parse_bucket_list(
        payload.get("false_positive_risk_buckets"),
        label="false_positive_risk_buckets",
        path=path,
    )
    confidence_names = {bucket.name for bucket in confidence_buckets}
    fp_risk_names = {bucket.name for bucket in fp_risk_buckets}

    rows_raw = payload.get("rows")
    if not isinstance(rows_raw, list) or not rows_raw:
        raise ValueError(f"Action policy matrix at '{path}' must define a non-empty 'rows' list.")

    rows: list[ActionPolicyMatrixRow] = []
    for index, row_raw in enumerate(rows_raw):
        rows.append(
            _parse_row(
                row_raw,
                index=index,
                confidence_bucket_names=confidence_names,
                fp_risk_bucket_names=fp_risk_names,
                path=path,
            )
        )

    if not any(
        row.family == "*"
        and row.verdict == "*"
        and row.confidence_bucket == "*"
        and row.false_positive_risk_bucket == "*"
        and row.asset_criticality == "*"
        and row.object_type == "*"
        for row in rows
    ):
        raise ValueError(f"Action policy matrix at '{path}' must include an all-wildcard catch-all row.")

    return ActionPolicyMatrix(
        version=version,
        confidence_buckets=tuple(confidence_buckets),
        false_positive_risk_buckets=tuple(fp_risk_buckets),
        rows=tuple(rows),
        path=path,
    )


def _parse_bucket_list(raw: object, *, label: str, path: Path) -> list[BucketDefinition]:
    if not isinstance(raw, list) or not raw:
        raise ValueError(f"Action policy matrix at '{path}' must define non-empty '{label}'.")

    seen_names: set[str] = set()
    buckets: list[BucketDefinition] = []
    for idx, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f"Bucket '{label}[{idx}]' in '{path}' must be an object.")
        name = str(item.get("name", "")).strip().lower()
        if not name:
            raise ValueError(f"Bucket '{label}[{idx}]' in '{path}' is missing non-empty 'name'.")
        if name in seen_names:
            raise ValueError(f"Bucket '{label}[{idx}]' in '{path}' has duplicate name '{name}'.")

        minimum = _as_float(item.get("min"), f"{label}[{idx}].min", path=path)
        maximum = _as_float(item.get("max"), f"{label}[{idx}].max", path=path)
        if minimum > maximum:
            raise ValueError(
                f"Bucket '{label}[{idx}]' in '{path}' must satisfy min <= max (got {minimum} > {maximum})."
            )
        minimum_inclusive = bool(item.get("min_inclusive", True))
        maximum_inclusive = bool(item.get("max_inclusive", False))

        seen_names.add(name)
        buckets.append(
            BucketDefinition(
                name=name,
                minimum=minimum,
                maximum=maximum,
                minimum_inclusive=minimum_inclusive,
                maximum_inclusive=maximum_inclusive,
            )
        )
    return buckets


def _parse_row(
    raw: object,
    *,
    index: int,
    confidence_bucket_names: set[str],
    fp_risk_bucket_names: set[str],
    path: Path,
) -> ActionPolicyMatrixRow:
    if not isinstance(raw, dict):
        raise ValueError(f"Row 'rows[{index}]' in '{path}' must be an object.")

    row_id = str(raw.get("id", "")).strip()
    if not row_id:
        raise ValueError(f"Row 'rows[{index}]' in '{path}' is missing non-empty 'id'.")

    priority_raw = raw.get("priority")
    if not isinstance(priority_raw, int):
        raise ValueError(f"Row '{row_id}' in '{path}' requires integer 'priority'.")

    family = _parse_selector(raw.get("family"), "family", row_id=row_id, path=path)
    verdict = _parse_enum_selector(raw.get("verdict"), ALLOWED_VERDICTS, "verdict", row_id=row_id, path=path)
    confidence_bucket = _parse_enum_selector(
        raw.get("confidence_bucket"),
        confidence_bucket_names,
        "confidence_bucket",
        row_id=row_id,
        path=path,
    )
    fp_risk_bucket = _parse_enum_selector(
        raw.get("false_positive_risk_bucket"),
        fp_risk_bucket_names,
        "false_positive_risk_bucket",
        row_id=row_id,
        path=path,
    )
    asset_criticality = _parse_enum_selector(
        raw.get("asset_criticality"),
        ALLOWED_ASSET_CRITICALITY,
        "asset_criticality",
        row_id=row_id,
        path=path,
    )
    object_type = _parse_enum_selector(
        raw.get("object_type"),
        ALLOWED_OBJECT_TYPES,
        "object_type",
        row_id=row_id,
        path=path,
    )

    allowed_actions_raw = raw.get("allowed_actions")
    if not isinstance(allowed_actions_raw, list) or not allowed_actions_raw:
        raise ValueError(f"Row '{row_id}' in '{path}' requires non-empty 'allowed_actions'.")
    allowed_actions = tuple(str(item).strip().lower() for item in allowed_actions_raw if str(item).strip())
    if len(allowed_actions) != len(set(allowed_actions)):
        raise ValueError(f"Row '{row_id}' in '{path}' contains duplicate 'allowed_actions'.")
    unknown_actions = sorted(set(allowed_actions) - ALLOWED_ACTIONS)
    if unknown_actions:
        raise ValueError(f"Row '{row_id}' in '{path}' includes unknown allowed actions: {unknown_actions}.")
    if "no_immediate_action" not in allowed_actions:
        raise ValueError(
            f"Row '{row_id}' in '{path}' must include 'no_immediate_action' to keep deterministic fallback behavior."
        )

    escalation_target = str(raw.get("escalation_target", "")).strip().lower()
    if escalation_target not in ALLOWED_ESCALATION_TARGETS:
        raise ValueError(
            f"Row '{row_id}' in '{path}' has invalid escalation_target '{escalation_target}'. "
            f"Expected one of {sorted(ALLOWED_ESCALATION_TARGETS)}."
        )

    required_reviewer_role = str(raw.get("required_reviewer_role", "")).strip().lower()
    if required_reviewer_role not in ALLOWED_REVIEWER_ROLES:
        raise ValueError(
            f"Row '{row_id}' in '{path}' has invalid required_reviewer_role '{required_reviewer_role}'. "
            f"Expected one of {sorted(ALLOWED_REVIEWER_ROLES)}."
        )

    return ActionPolicyMatrixRow(
        id=row_id,
        priority=priority_raw,
        family=family,
        verdict=verdict,
        confidence_bucket=confidence_bucket,
        false_positive_risk_bucket=fp_risk_bucket,
        asset_criticality=asset_criticality,
        object_type=object_type,
        allowed_actions=allowed_actions,
        escalation_target=escalation_target,
        required_reviewer_role=required_reviewer_role,
        index=index,
    )


def _parse_selector(raw: object, label: str, *, row_id: str, path: Path) -> str:
    value = str(raw or "").strip().lower()
    if not value:
        raise ValueError(f"Row '{row_id}' in '{path}' is missing non-empty '{label}'.")
    return value


def _parse_enum_selector(
    raw: object,
    allowed: set[str],
    label: str,
    *,
    row_id: str,
    path: Path,
) -> str:
    value = _parse_selector(raw, label, row_id=row_id, path=path)
    if value != "*" and value not in allowed:
        raise ValueError(f"Row '{row_id}' in '{path}' has invalid {label}='{value}'.")
    return value


def _resolve_bucket_name(value: float, buckets: tuple[BucketDefinition, ...], label: str) -> str:
    for bucket in buckets:
        if bucket.contains(value):
            return bucket.name
    raise ValueError(f"Value {value:.6f} did not match any configured {label} bucket.")


def _selector_matches(selector: str, value: str) -> bool:
    return selector == "*" or selector == value


def _as_float(raw: object, label: str, *, path: Path) -> float:
    if not isinstance(raw, (int, float)):
        raise ValueError(f"Field '{label}' in '{path}' must be numeric.")
    return float(raw)


def _clip01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)
