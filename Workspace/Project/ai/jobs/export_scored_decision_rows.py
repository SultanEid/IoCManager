from __future__ import annotations

import argparse
import json
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

from fastapi.testclient import TestClient

from decision_service.api import create_app

POSITIVE_VERDICTS = {"malicious", "likely_malicious", "suspicious"}
NEGATIVE_VERDICTS = {"benign", "likely_benign", "false_positive", "stale_or_revoked"}
OFFICIAL_RULE_SOURCES = {"sigmahq", "snort-community", "et-open-suricata"}
TRUSTED_CLEAN_SOURCES = {"internal-clean-baselines", "internal-allowlists"}
MEDIUM_TRUST_INTERNAL_SOURCES = {"internal-reviewed-telemetry"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run the real /score_case path against canonical dataset rows and export scored decision rows "
            "for offline evaluation."
        )
    )
    parser.add_argument("--input-file", type=Path, required=True, help="Canonical JSONL dataset rows.")
    parser.add_argument(
        "--output-file",
        type=Path,
        default=None,
        help="Output JSONL path for scored decision rows. Defaults beside the canonical file.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_file = args.output_file or args.input_file.with_name("scored_decision_rows.jsonl")
    result = export_scored_rows(
        input_file=args.input_file,
        output_file=output_file,
    )
    print(json.dumps(result, indent=2))


def export_scored_rows(*, input_file: Path, output_file: Path) -> dict[str, Any]:
    rows = load_jsonl_payloads(input_file)
    app = create_app()
    client = TestClient(app)

    exported: list[dict[str, Any]] = []
    skipped_counts = {
        "missing_target_verdict": 0,
        "neutral_target_verdict": 0,
    }

    for index, row in enumerate(rows, start=1):
        target_verdict = _target_verdict(row)
        if target_verdict is None:
            skipped_counts["missing_target_verdict"] += 1
            continue
        label = _verdict_to_binary_label(target_verdict)
        if label is None:
            skipped_counts["neutral_target_verdict"] += 1
            continue

        request = _build_score_case_request(row=row, index=index)
        response = client.post("/score_case", json=request)
        response.raise_for_status()
        body = response.json()
        grounded = body.get("groundedDecision") or {}

        exported.append(
            {
                "caseId": request["caseId"],
                "eventTime": row.get("event_time_utc") or datetime.now(timezone.utc).isoformat(),
                "label": label,
                "score": float(body["maliciousnessScore"]),
                "decisionState": body["decisionState"],
                "modelVersion": body.get("modelVersion"),
                "datasetVersion": row.get("dataset_version") or body.get("datasetVersion"),
                "ruleFamily": row.get("rule_family") or "unknown",
                "sourceSystem": _source_system(row),
                "iocType": request["iocType"],
                "sourceTrust": _source_trust(row),
                "evidenceUsedCount": len(_coerce_list(row.get("evidence_used"))),
                "evidenceMissingCount": len(_coerce_list(row.get("evidence_missing"))),
                "contradictoryEvidenceCount": len(_contradictory_items(row)),
                "expectedVerdict": target_verdict,
                "predictedVerdict": grounded.get("verdict"),
                "predictedConfidence": grounded.get("confidence"),
                "predictedFalsePositiveRisk": grounded.get("falsePositiveRisk"),
            }
        )

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8", newline="\n") as handle:
        for row in exported:
            handle.write(json.dumps(row))
            handle.write("\n")

    return {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "inputFile": str(input_file.resolve()),
        "outputFile": str(output_file.resolve()),
        "exportedRowCount": len(exported),
        "skipped": skipped_counts,
    }


def load_jsonl_payloads(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            payload = json.loads(line)
            if not isinstance(payload, dict):
                raise ValueError(f"Line {line_number} did not decode to a JSON object.")
            rows.append(payload)
    return rows


def _target_verdict(row: dict[str, Any]) -> str | None:
    target_payload = row.get("target_payload")
    if not isinstance(target_payload, dict):
        return None
    decision = target_payload.get("decision")
    if not isinstance(decision, dict):
        return None
    verdict = decision.get("verdict")
    if not isinstance(verdict, str):
        return None
    text = verdict.strip().lower()
    return text or None


def _verdict_to_binary_label(verdict: str) -> int | None:
    if verdict in POSITIVE_VERDICTS:
        return 1
    if verdict in NEGATIVE_VERDICTS:
        return 0
    return None


def _build_score_case_request(*, row: dict[str, Any], index: int) -> dict[str, Any]:
    package_payload = _coerce_dict(row.get("package_payload"))
    ioc_type, ioc_value = _infer_ioc(package_payload)
    dataset_version = str(row.get("dataset_version") or "dataset")
    return {
        "caseId": f"{dataset_version}-row-{index}",
        "asOfTime": row.get("event_time_utc") or datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc).isoformat(),
        "sourceSystem": _source_system(row),
        "iocType": ioc_type,
        "iocValue": ioc_value,
        "hostContext": _build_host_context(row),
        "ruleContext": _build_rule_context(row),
        "detectionPackage": package_payload,
    }


def _infer_ioc(package_payload: dict[str, Any]) -> tuple[str, str]:
    object_metadata = _coerce_dict(package_payload.get("object_metadata"))
    custom = _coerce_dict(object_metadata.get("custom_attributes"))
    raw_hit_payload = _coerce_dict(package_payload.get("raw_hit_payload"))
    network = _coerce_dict(raw_hit_payload.get("network"))

    for key in ("url", "request_url"):
        value = _first_non_empty(raw_hit_payload.get(key), network.get(key))
        if value:
            return "url", value
    for key in ("domain", "host", "hostname"):
        value = _first_non_empty(raw_hit_payload.get(key), network.get(key))
        if value:
            return "domain", value
    for key in ("dst_ip", "src_ip", "ip"):
        value = _first_non_empty(raw_hit_payload.get(key), network.get(key))
        if value:
            return "ip", value
    for key, ioc_type in (("sha256", "hash_sha256"), ("sha1", "hash_sha1"), ("md5", "hash_md5")):
        value = _first_non_empty(custom.get(key), raw_hit_payload.get(key))
        if value:
            return ioc_type, value

    object_id = _first_non_empty(object_metadata.get("object_id"))
    object_type = _first_non_empty(object_metadata.get("object_type")) or "artifact"
    if object_id:
        return object_type.lower(), object_id
    return "artifact", "dataset-row"


def _build_host_context(row: dict[str, Any]) -> dict[str, Any]:
    package_payload = _coerce_dict(row.get("package_payload"))
    asset_context = _coerce_dict(package_payload.get("asset_context"))
    criticality = str(asset_context.get("criticality", "")).strip().lower()
    criticality_map = {
        "critical": 1.0,
        "high": 0.85,
        "medium": 0.55,
        "low": 0.30,
    }
    return {
        "criticality": criticality_map.get(criticality, 0.5),
        "assetExposure": 1.0 if asset_context.get("internet_exposed") else 0.35,
    }


def _build_rule_context(row: dict[str, Any]) -> dict[str, Any]:
    package_payload = _coerce_dict(row.get("package_payload"))
    raw_payload = _coerce_dict(row.get("raw_payload"))
    rule_metadata = _coerce_dict(package_payload.get("rule_metadata"))
    raw_hit_payload = _coerce_dict(package_payload.get("raw_hit_payload"))
    tags = _coerce_list(rule_metadata.get("tags"))
    source_system = _source_system(row)
    source_name = _source_name(row)
    severity = str(rule_metadata.get("level") or rule_metadata.get("priority") or "").strip().lower()
    severity_map = {
        "critical": 0.95,
        "high": 0.8,
        "medium": 0.6,
        "low": 0.35,
        "1": 0.95,
        "2": 0.75,
        "3": 0.55,
    }
    linked_enrichment = _coerce_dict(package_payload.get("linked_enrichment"))
    enrichments = _coerce_list(linked_enrichment.get("enrichments"))
    source_signals = _extract_source_signals(
        source_system=source_system,
        source_name=source_name,
        ioc_type=_infer_ioc(package_payload)[0],
        package_payload=package_payload,
        raw_hit_payload=raw_hit_payload,
        rule_metadata=rule_metadata,
        enrichments=enrichments,
    )
    review_verdict = _target_verdict(row)
    if source_name in MEDIUM_TRUST_INTERNAL_SOURCES:
        review_confidence = _float_or_none(raw_payload.get("review_confidence"))
        false_positive_risk = _float_or_none(raw_payload.get("false_positive_risk"))
        if review_confidence is not None:
            source_signals["providerConfidence"] = max(source_signals["providerConfidence"], _clip01(review_confidence))
        source_signals["indicatorStrength"] = max(source_signals["indicatorStrength"], 0.56)
        source_signals["enrichmentStrength"] = max(source_signals["enrichmentStrength"], 0.52)
        source_signals["activitySignal"] = max(source_signals["activitySignal"], 0.44)
        if review_verdict in POSITIVE_VERDICTS:
            source_signals["externalSourceSignal"] = max(
                source_signals["externalSourceSignal"],
                0.58 if review_verdict == "suspicious" else 0.66,
            )
            source_signals["sightingsCount"] = max(source_signals["sightingsCount"], 2.0)
            source_signals["sightingsDistinctSources"] = max(source_signals["sightingsDistinctSources"], 1.0)
        elif review_verdict in NEGATIVE_VERDICTS:
            benign_floor = 0.80 if review_verdict == "false_positive" else 0.68
            source_signals["benignContext"] = max(source_signals["benignContext"], benign_floor)
            source_signals["heuristicNoise"] = max(
                source_signals["heuristicNoise"],
                0.22 if review_verdict == "false_positive" else 0.08,
            )
            source_signals["externalSourceSignal"] = min(
                max(source_signals["externalSourceSignal"], 0.30),
                0.42,
            )
            if false_positive_risk is not None and false_positive_risk >= 0.60:
                source_signals["benignContext"] = max(source_signals["benignContext"], 0.78)
            source_signals["sightingsCount"] = max(source_signals["sightingsCount"], 3.0)
            source_signals["sightingsDistinctSources"] = max(source_signals["sightingsDistinctSources"], 1.0)
        else:
            source_signals["externalSourceSignal"] = max(source_signals["externalSourceSignal"], 0.46)
    severity_score = max(severity_map.get(severity, 0.55 if tags else 0.45), source_signals["severityHint"])
    scanner_agreement = max(0.78 if enrichments else 0.45, source_signals["scannerAgreementHint"])
    return {
        "scannerFamily": row.get("rule_family"),
        "ruleId": _first_non_empty(rule_metadata.get("rule_id"), rule_metadata.get("sid")),
        "ruleName": _first_non_empty(rule_metadata.get("rule_name"), rule_metadata.get("title"), rule_metadata.get("msg")),
        "severityScore": severity_score,
        "scannerAgreement": scanner_agreement,
        "sourceTrust": _source_trust(row),
        "sourceSystem": source_system,
        "sourceName": source_name,
        "externalSourceFamily": source_system,
        "providerConfidence": source_signals["providerConfidence"],
        "indicatorStrength": source_signals["indicatorStrength"],
        "enrichmentStrength": source_signals["enrichmentStrength"],
        "activitySignal": source_signals["activitySignal"],
        "externalSourceSignal": source_signals["externalSourceSignal"],
        "benignContext": source_signals["benignContext"],
        "heuristicNoise": source_signals["heuristicNoise"],
        "sightingsCount": source_signals["sightingsCount"],
        "sightingsDistinctSources": source_signals["sightingsDistinctSources"],
    }


def _source_system(row: dict[str, Any]) -> str:
    package_payload = _coerce_dict(row.get("package_payload"))
    object_metadata = _coerce_dict(package_payload.get("object_metadata"))
    value = _first_non_empty(object_metadata.get("source_system"))
    return (value or _source_name(row)).strip().lower()


def _source_name(row: dict[str, Any]) -> str:
    return str(_coerce_dict(row.get("source_file")).get("source_name") or "unknown").strip().lower()


def _source_trust(row: dict[str, Any]) -> float:
    source_name = _source_name(row)
    if source_name in TRUSTED_CLEAN_SOURCES:
        return 0.94
    if source_name in MEDIUM_TRUST_INTERNAL_SOURCES:
        return 0.71
    if source_name == "sigmahq":
        return 0.86
    if source_name in {"snort-community", "et-open-suricata"}:
        return 0.84
    if source_name in {"malwarebazaar", "yaraify", "threatfox", "urlhaus"}:
        return 0.72
    if "analyst" in source_name:
        return 0.82
    if "fixture" in source_name:
        return 0.55
    return 0.65


def _contradictory_items(row: dict[str, Any]) -> list[dict[str, Any]]:
    target_payload = _coerce_dict(row.get("target_payload"))
    decision = _coerce_dict(target_payload.get("decision"))
    items = decision.get("contradictory_evidence")
    return [item for item in _coerce_list(items) if isinstance(item, dict)]


def _extract_source_signals(
    *,
    source_system: str,
    source_name: str,
    ioc_type: str,
    package_payload: dict[str, Any],
    raw_hit_payload: dict[str, Any],
    rule_metadata: dict[str, Any],
    enrichments: list[Any],
) -> dict[str, float]:
    semantic = _semantic_context_signals(raw_hit_payload=raw_hit_payload, rule_metadata=rule_metadata, enrichments=enrichments)
    provider_confidence = _provider_confidence(source_system=source_system, raw_hit_payload=raw_hit_payload, enrichments=enrichments)
    indicator_strength = _indicator_strength(
        source_system=source_system,
        ioc_type=ioc_type,
        raw_hit_payload=raw_hit_payload,
        object_metadata=_coerce_dict(package_payload.get("object_metadata")),
    )
    enrichment_strength = _enrichment_strength(
        source_system=source_system,
        raw_hit_payload=raw_hit_payload,
        rule_metadata=rule_metadata,
        enrichments=enrichments,
    )
    activity_signal = _activity_signal(source_system=source_system, raw_hit_payload=raw_hit_payload)
    severity_hint = 0.0
    scanner_agreement_hint = 0.0
    rule_text = " ".join(
        _normalized_texts(
            rule_metadata.get("classification"),
            rule_metadata.get("msg"),
            rule_metadata.get("title"),
            rule_metadata.get("tags"),
            raw_hit_payload.get("message"),
            _coerce_dict(package_payload.get("object_metadata")).get("labels"),
        )
    )
    if source_name in TRUSTED_CLEAN_SOURCES:
        benign_floor = 0.90 if source_name == "internal-allowlists" else 0.84
        provider_confidence = min(provider_confidence, 0.28) if provider_confidence else 0.28
        indicator_strength = min(indicator_strength, 0.42) if indicator_strength else 0.42
        enrichment_strength = max(enrichment_strength, 0.48)
        activity_signal = max(activity_signal, 0.38)
        semantic["benign"] = max(semantic["benign"], benign_floor)
        semantic["heuristic"] = max(min(semantic["heuristic"], 0.08), 0.12)
        semantic["threat"] = min(semantic["threat"], 0.05)
        severity_hint = 0.22
        scanner_agreement_hint = 0.60
    elif source_name in MEDIUM_TRUST_INTERNAL_SOURCES:
        provider_confidence = max(provider_confidence, 0.58)
        indicator_strength = max(indicator_strength, 0.56)
        enrichment_strength = max(enrichment_strength, 0.52)
        activity_signal = max(activity_signal, 0.44)
        if semantic["benign"] >= 0.68:
            semantic["heuristic"] = max(semantic["heuristic"], 0.12)
            severity_hint = 0.42
            scanner_agreement_hint = 0.58
        else:
            semantic["threat"] = max(semantic["threat"], 0.56)
            severity_hint = 0.62
            scanner_agreement_hint = 0.66
    elif source_name == "sigmahq":
        provider_confidence = max(provider_confidence, 0.86)
        indicator_strength = max(indicator_strength, 0.66)
        enrichment_strength = max(enrichment_strength, 0.74)
        activity_signal = max(activity_signal, 0.48)
        semantic["threat"] = max(semantic["threat"], 0.82 if "critical" in rule_text or "attack." in rule_text else 0.68)
        semantic["heuristic"] = min(semantic["heuristic"], 0.12)
        severity_hint = 0.86 if "critical" in rule_text else 0.78
        scanner_agreement_hint = 0.80
    elif source_name in {"snort-community", "et-open-suricata"}:
        high_risk = any(token in rule_text for token in ("trojan-activity", "malware", "backdoor", "botnet", "exploit"))
        provider_confidence = max(provider_confidence, 0.88)
        indicator_strength = max(indicator_strength, 0.78)
        enrichment_strength = max(enrichment_strength, 0.70)
        activity_signal = max(activity_signal, 0.62)
        semantic["threat"] = max(semantic["threat"], 0.84 if high_risk else 0.68)
        semantic["heuristic"] = min(semantic["heuristic"], 0.10)
        severity_hint = 0.86 if high_risk else 0.74
        scanner_agreement_hint = 0.82
    external_source_signal = _clip01(
        {
            "threatfox": 0.74,
            "urlhaus": 0.70,
            "malwarebazaar": 0.66,
            "yaraify": 0.62,
        }.get(source_system, 0.0)
        * 0.30
        + provider_confidence * 0.25
        + indicator_strength * 0.15
        + enrichment_strength * 0.18
        + activity_signal * 0.12
        + semantic["threat"] * 0.14
        - semantic["benign"] * 0.10
    )
    if source_name == "sigmahq":
        external_source_signal = max(external_source_signal, 0.76 if severity_hint >= 0.80 else 0.68)
    elif source_name in {"snort-community", "et-open-suricata"}:
        external_source_signal = max(external_source_signal, 0.82 if severity_hint >= 0.80 else 0.72)
    elif source_name in MEDIUM_TRUST_INTERNAL_SOURCES:
        if semantic["benign"] >= 0.68:
            external_source_signal = min(max(external_source_signal, 0.30), 0.42)
        elif semantic["threat"] >= 0.56:
            external_source_signal = max(external_source_signal, 0.58)
        else:
            external_source_signal = max(external_source_signal, 0.46)
    elif source_name in TRUSTED_CLEAN_SOURCES:
        external_source_signal = min(max(external_source_signal, 0.14), 0.22)
    sightings_count = _derived_sightings_count(source_system=source_system, raw_hit_payload=raw_hit_payload, enrichments=enrichments)
    sightings_distinct_sources = 1.0 if enrichments else 0.0
    if source_system in {"threatfox", "urlhaus"} and provider_confidence >= 0.75:
        sightings_distinct_sources = 2.0
    if source_name == "sigmahq":
        sightings_count = max(sightings_count, 3.0)
        sightings_distinct_sources = max(sightings_distinct_sources, 2.0)
    elif source_name in {"snort-community", "et-open-suricata"}:
        sightings_count = max(sightings_count, 2.0)
        sightings_distinct_sources = max(sightings_distinct_sources, 1.0)
    elif source_name in MEDIUM_TRUST_INTERNAL_SOURCES:
        sightings_count = max(sightings_count, 2.0)
        sightings_distinct_sources = max(sightings_distinct_sources, 1.0)
    elif source_name in TRUSTED_CLEAN_SOURCES:
        sightings_count = max(sightings_count, 4.0)
        sightings_distinct_sources = max(sightings_distinct_sources, 2.0)
    return {
        "providerConfidence": provider_confidence,
        "indicatorStrength": indicator_strength,
        "enrichmentStrength": enrichment_strength,
        "activitySignal": activity_signal,
        "externalSourceSignal": external_source_signal,
        "benignContext": semantic["benign"],
        "heuristicNoise": semantic["heuristic"],
        "sightingsCount": sightings_count,
        "sightingsDistinctSources": sightings_distinct_sources,
        "severityHint": severity_hint,
        "scannerAgreementHint": scanner_agreement_hint,
    }


def _coerce_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _coerce_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _first_non_empty(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str):
            text = value.strip()
            if text:
                return text
    return None


def _provider_confidence(*, source_system: str, raw_hit_payload: dict[str, Any], enrichments: list[Any]) -> float:
    confidence_level = _float_or_none(raw_hit_payload.get("confidence_level"))
    if confidence_level is not None:
        return _clip01(confidence_level / 100.0 if confidence_level > 1.0 else confidence_level)

    if source_system == "urlhaus":
        status = str(raw_hit_payload.get("url_status", "")).strip().lower()
        if status in {"online", "active"}:
            return 0.88
        if status in {"offline", "disabled"}:
            return 0.35

    if source_system == "yaraify":
        metadata = _yaraify_metadata(enrichments)
        hint = str(_coerce_dict(metadata.get("meta")).get("confidence_hint", "")).strip().lower()
        if hint == "bulk":
            return 0.70
        if hint == "seed":
            return 0.55
        if str(raw_hit_payload.get("status", "")).strip().lower() == "match":
            return 0.60

    intelligence = _coerce_dict(raw_hit_payload.get("intelligence"))
    downloads = _float_or_none(intelligence.get("downloads")) or 0.0
    uploads = _float_or_none(intelligence.get("uploads")) or 0.0
    if downloads or uploads:
        return _clip01(0.35 + min(0.45, (downloads + uploads) / 20.0))

    return 0.60 if enrichments else 0.45


def _indicator_strength(
    *,
    source_system: str,
    ioc_type: str,
    raw_hit_payload: dict[str, Any],
    object_metadata: dict[str, Any],
) -> float:
    base = {
        "hash_sha256": 0.88,
        "hash_sha1": 0.82,
        "hash_md5": 0.78,
        "url": 0.74,
        "domain": 0.66,
        "ip": 0.62,
        "artifact": 0.55,
        "file": 0.80,
    }.get(ioc_type, 0.55)
    if source_system == "urlhaus" and _coerce_list(raw_hit_payload.get("payloads")):
        base += 0.08
    if ioc_type.startswith("hash") or str(object_metadata.get("object_type", "")).strip().lower() == "file":
        base += 0.05
    return _clip01(base)


def _enrichment_strength(
    *,
    source_system: str,
    raw_hit_payload: dict[str, Any],
    rule_metadata: dict[str, Any],
    enrichments: list[Any],
) -> float:
    tags = _normalized_texts(
        rule_metadata.get("tags"),
        raw_hit_payload.get("tags"),
        *[_coerce_dict(_coerce_dict(item).get("value")).get("tags") for item in enrichments],
    )
    yara_rules = _coerce_list(raw_hit_payload.get("yara_rules"))
    payloads = _coerce_list(raw_hit_payload.get("payloads"))
    intelligence = _coerce_dict(raw_hit_payload.get("intelligence"))
    downloads = _float_or_none(intelligence.get("downloads")) or 0.0
    uploads = _float_or_none(intelligence.get("uploads")) or 0.0
    base = min(0.25, len(enrichments) * 0.12)
    base += min(0.35, len(tags) / 8.0)
    base += min(0.12, len(yara_rules) * 0.06)
    base += min(0.12, len(payloads) * 0.06)
    base += min(0.16, (downloads + uploads) / 30.0)
    base += 0.08 if _first_non_empty(raw_hit_payload.get("signature"), raw_hit_payload.get("malware")) else 0.0
    if source_system == "threatfox" and _first_non_empty(raw_hit_payload.get("threat_type")):
        base += 0.08
    return _clip01(base)


def _activity_signal(*, source_system: str, raw_hit_payload: dict[str, Any]) -> float:
    if source_system == "urlhaus":
        status = str(raw_hit_payload.get("url_status", "")).strip().lower()
        if status in {"online", "active"}:
            return 0.90
        if status in {"offline", "disabled"}:
            return 0.20
    status = str(raw_hit_payload.get("status", "")).strip().lower()
    if status == "match":
        return 0.72
    if _first_non_empty(raw_hit_payload.get("last_seen"), raw_hit_payload.get("last_online")):
        return 0.68
    return 0.40 if _first_non_empty(raw_hit_payload.get("first_seen")) else 0.0


def _semantic_context_signals(
    *,
    raw_hit_payload: dict[str, Any],
    rule_metadata: dict[str, Any],
    enrichments: list[Any],
) -> dict[str, float]:
    metadata = _yaraify_metadata(enrichments)
    text = " ".join(
        _normalized_texts(
            rule_metadata.get("title"),
            rule_metadata.get("rule_name"),
            rule_metadata.get("description"),
            rule_metadata.get("msg"),
            raw_hit_payload.get("signature"),
            raw_hit_payload.get("malware"),
            raw_hit_payload.get("threat"),
            raw_hit_payload.get("threat_type"),
            raw_hit_payload.get("threat_type_desc"),
            rule_metadata.get("tags"),
            raw_hit_payload.get("tags"),
            _coerce_dict(metadata).get("tags"),
        )
    )
    return {
        "threat": _token_signal(
            text,
            {"malicious", "stealer", "credential", "botnet", "c2", "loader", "dropper", "payload", "beacon", "trojan", "powershell", "suspicious"},
        ),
        "benign": _token_signal(
            text,
            {"trusted", "utility", "maintenance", "cleanup", "clean", "benign", "allowlist"},
        ),
        "heuristic": _token_signal(
            text,
            {"generic", "heuristic", "installer", "packer", "overbroad"},
        ),
    }


def _derived_sightings_count(*, source_system: str, raw_hit_payload: dict[str, Any], enrichments: list[Any]) -> float:
    intelligence = _coerce_dict(raw_hit_payload.get("intelligence"))
    downloads = _float_or_none(intelligence.get("downloads")) or 0.0
    uploads = _float_or_none(intelligence.get("uploads")) or 0.0
    payloads = _coerce_list(raw_hit_payload.get("payloads"))
    if source_system == "urlhaus":
        return max(2.0, min(8.0, len(payloads) + (1.0 if str(raw_hit_payload.get('url_status', '')).strip().lower() in {'online', 'active'} else 0.0)))
    if downloads or uploads:
        return max(2.0, min(8.0, downloads + uploads))
    if enrichments:
        return 2.0
    return 0.0


def _normalized_texts(*values: Any) -> list[str]:
    output: list[str] = []
    for value in values:
        if isinstance(value, str):
            text = value.strip().lower()
            if text:
                output.append(text)
        elif isinstance(value, list):
            output.extend(_normalized_texts(*value))
        elif isinstance(value, dict):
            output.extend(_normalized_texts(*value.values()))
    return output


def _token_signal(text: str, tokens: set[str]) -> float:
    matches = sum(1 for token in tokens if token in text)
    return _clip01(matches / 3.0)


def _yaraify_metadata(enrichments: list[Any]) -> dict[str, Any]:
    for item in enrichments:
        value = _coerce_dict(_coerce_dict(item).get("value"))
        metadata = _coerce_dict(value.get("metadata"))
        if metadata:
            return metadata
    return {}


def _float_or_none(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clip01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


if __name__ == "__main__":
    main()


