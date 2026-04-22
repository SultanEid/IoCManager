from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from fastapi.testclient import TestClient

from cti_service.api import create_app

FAMILIES = ("sigma", "snort", "yara")
POSITIVE_VERDICTS = {"malicious", "likely_malicious", "suspicious"}
NEGATIVE_VERDICTS = {"benign", "likely_benign", "false_positive", "stale_or_revoked"}
ABSTAIN_VERDICTS = {"insufficient_evidence"}


@dataclass(frozen=True, slots=True)
class FixtureCase:
    family: str
    path: Path
    expected_verdict: str
    payload: dict[str, Any]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark the real /score_case path against shipped AI fixtures.")
    parser.add_argument(
        "--fixtures-root",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "fixtures",
        help="Root directory containing shipped fixture families.",
    )
    parser.add_argument(
        "--output-file",
        type=Path,
        default=None,
        help="Optional file path for the machine-readable report.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cases = load_fixture_cases(args.fixtures_root)
    report = benchmark_cases(cases)
    rendered = json.dumps(report, indent=2)
    if args.output_file is not None:
        args.output_file.parent.mkdir(parents=True, exist_ok=True)
        args.output_file.write_text(rendered, encoding="utf-8")
    print(rendered)


def load_fixture_cases(fixtures_root: Path) -> list[FixtureCase]:
    cases: list[FixtureCase] = []
    for family in FAMILIES:
        family_root = fixtures_root / family
        for path in sorted(family_root.rglob("*.example.json")):
            payload = json.loads(path.read_text(encoding="utf-8-sig"))
            expected_verdict = _extract_scenario_label(payload)
            if expected_verdict is None:
                continue
            cases.append(
                FixtureCase(
                    family=family,
                    path=path,
                    expected_verdict=expected_verdict,
                    payload=payload,
                )
            )
    return cases


def benchmark_cases(cases: list[FixtureCase]) -> dict[str, Any]:
    app = create_app()
    client = TestClient(app)

    predictions: list[dict[str, Any]] = []
    for index, case in enumerate(cases, start=1):
        request = _build_score_case_request(case=case, index=index)
        response = client.post("/score_case", json=request)
        response.raise_for_status()
        body = response.json()
        grounded = body["groundedDecision"]
        predicted = grounded["verdict"]
        predictions.append(
            {
                "family": case.family,
                "path": str(case.path),
                "expectedVerdict": case.expected_verdict,
                "predictedVerdict": predicted,
                "expectedBucket": _coarse_bucket(case.expected_verdict),
                "predictedBucket": _coarse_bucket(predicted),
                "abstained": predicted in ABSTAIN_VERDICTS,
                "abstainReason": grounded.get("abstainReason"),
                "confidence": grounded.get("confidence"),
                "falsePositiveRisk": grounded.get("falsePositiveRisk"),
                "reasons": grounded.get("reasons", []),
                "request": request,
            }
        )

    overall = _summarize_predictions(predictions)
    by_family = {
        family: _summarize_predictions([row for row in predictions if row["family"] == family])
        for family in FAMILIES
    }
    confusion = _confusion_matrix(predictions)
    mismatches = [
        {
            "family": row["family"],
            "path": row["path"],
            "expectedVerdict": row["expectedVerdict"],
            "predictedVerdict": row["predictedVerdict"],
            "abstainReason": row["abstainReason"],
            "confidence": row["confidence"],
            "falsePositiveRisk": row["falsePositiveRisk"],
            "reasons": row["reasons"][:4],
        }
        for row in predictions
        if row["expectedVerdict"] != row["predictedVerdict"]
    ]

    return {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "sampleSize": len(predictions),
        "overall": overall,
        "families": by_family,
        "confusion": confusion,
        "mismatches": mismatches,
    }


def _summarize_predictions(rows: list[dict[str, Any]]) -> dict[str, Any]:
    total = max(1, len(rows))
    exact_matches = sum(1 for row in rows if row["expectedVerdict"] == row["predictedVerdict"])
    coarse_matches = sum(1 for row in rows if row["expectedBucket"] == row["predictedBucket"])
    abstained = sum(1 for row in rows if row["abstained"])
    return {
        "count": len(rows),
        "exactAccuracy": round(exact_matches / total, 4),
        "coarseAccuracy": round(coarse_matches / total, 4),
        "abstainRate": round(abstained / total, 4),
        "predictedVerdicts": dict(sorted(Counter(row["predictedVerdict"] for row in rows).items())),
    }


def _confusion_matrix(rows: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    matrix: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        matrix[row["expectedVerdict"]][row["predictedVerdict"]] += 1
    return {
        expected: dict(sorted(counter.items()))
        for expected, counter in sorted(matrix.items(), key=lambda item: item[0])
    }


def _extract_scenario_label(payload: dict[str, Any]) -> str | None:
    labels = payload.get("object_metadata", {}).get("labels", [])
    for label in labels:
        if isinstance(label, str) and label.startswith("scenario:"):
            return label.split(":", 1)[1].strip()
    return None


def _coarse_bucket(verdict: str) -> str:
    if verdict in POSITIVE_VERDICTS:
        return "positive"
    if verdict in NEGATIVE_VERDICTS:
        return "negative"
    return "abstain"


def _build_score_case_request(*, case: FixtureCase, index: int) -> dict[str, Any]:
    ioc_type, ioc_value = _infer_ioc(case.payload)
    return {
        "caseId": f"fixture-{case.family}-{index}",
        "asOfTime": datetime(2026, 4, 22, 12, 0, tzinfo=timezone.utc).isoformat(),
        "sourceSystem": case.payload.get("object_metadata", {}).get("source_system", "fixture"),
        "iocType": ioc_type,
        "iocValue": ioc_value,
        "hostContext": _build_host_context(case.payload),
        "ruleContext": _build_rule_context(case.family, case.payload),
        "detectionPackage": case.payload,
    }


def _infer_ioc(payload: dict[str, Any]) -> tuple[str, str]:
    raw_hit = payload.get("raw_hit_payload", {})
    object_metadata = payload.get("object_metadata", {})
    if isinstance(raw_hit, dict):
        for key in ("dst_ip", "src_ip", "source_ip", "destination_ip"):
            value = raw_hit.get(key)
            if isinstance(value, str) and value.strip():
                return "ip", value.strip()
        for key in ("domain", "query_name", "hostname"):
            value = raw_hit.get(key)
            if isinstance(value, str) and value.strip():
                return "domain", value.strip()
        for key in ("url", "uri_path", "target_path"):
            value = raw_hit.get(key)
            if isinstance(value, str) and value.strip():
                inferred_type = "url" if "://" in value or value.startswith("/") else "file"
                return inferred_type, value.strip()
    object_id = object_metadata.get("object_id")
    if isinstance(object_id, str) and object_id.strip():
        object_type = str(object_metadata.get("object_type", "artifact")).strip().lower() or "artifact"
        return object_type, object_id.strip()
    return "artifact", f"{payload.get('rule_family', 'fixture')}-fixture"


def _build_host_context(payload: dict[str, Any]) -> dict[str, Any]:
    asset_context = payload.get("asset_context", {})
    if not isinstance(asset_context, dict):
        return {}
    criticality = str(asset_context.get("criticality", "")).strip().lower()
    exposure = 1.0 if asset_context.get("internet_exposed") else 0.25
    criticality_map = {
        "critical": 1.0,
        "high": 0.85,
        "medium": 0.55,
        "low": 0.3,
    }
    return {
        "criticality": criticality_map.get(criticality, 0.5),
        "assetExposure": exposure,
    }


def _build_rule_context(family: str, payload: dict[str, Any]) -> dict[str, Any]:
    rule_metadata = payload.get("rule_metadata", {})
    prevalence = payload.get("time_prevalence_context", {})
    linked_enrichment = payload.get("linked_enrichment", {}).get("enrichments", [])
    if not isinstance(rule_metadata, dict):
        rule_metadata = {}
    if not isinstance(prevalence, dict):
        prevalence = {}
    severity = str(rule_metadata.get("meta", {}).get("severity", rule_metadata.get("priority", ""))).strip().lower()
    severity_map = {
        "critical": 0.95,
        "high": 0.8,
        "medium": 0.6,
        "low": 0.35,
        "1": 0.95,
        "2": 0.75,
        "3": 0.55,
    }
    source_trust = 0.8 if linked_enrichment else 0.45
    hit_count = 0.0
    try:
        hit_count = float(prevalence.get("hit_count_24h", 0.0))
    except (TypeError, ValueError):
        hit_count = 0.0
    distinct_sources = 1
    related = payload.get("related_detections", {}).get("detections", [])
    if isinstance(related, list) and related:
        distinct_sources = min(5, len(related) + 1)
    return {
        "ruleFamily": payload.get("rule_family", family),
        "rule_family": payload.get("rule_family", family),
        "severityScore": severity_map.get(severity, 0.65),
        "scannerAgreement": 0.75 if distinct_sources >= 2 else 0.4,
        "sourceTrust": source_trust,
        "sightingsCount": max(1.0, hit_count),
        "sightingsDistinctSources": distinct_sources,
        "evidenceConflict": 0.05,
    }


if __name__ == "__main__":
    main()
