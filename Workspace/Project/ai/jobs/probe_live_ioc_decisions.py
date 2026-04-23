from __future__ import annotations

import argparse
import json
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, parse, request


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Probe a live IoC Manager backend with a representative IOC sample and summarize AI decision confidence."
    )
    parser.add_argument("--base-url", default="http://localhost:5127")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--scanner-families", default="suricata,snort,sigma,yara")
    parser.add_argument("--severities", default="Medium,High,Critical")
    parser.add_argument("--per-combination", type=int, default=2)
    parser.add_argument("--poll-seconds", type=float, default=15.0)
    parser.add_argument("--poll-interval-seconds", type=float, default=1.0)
    parser.add_argument("--output-file", type=Path, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    scanner_families = [item.strip().lower() for item in args.scanner_families.split(",") if item.strip()]
    severities = [item.strip() for item in args.severities.split(",") if item.strip()]
    result = probe_live_iocs(
        base_url=args.base_url,
        username=args.username,
        password=args.password,
        scanner_families=scanner_families,
        severities=severities,
        per_combination=max(1, args.per_combination),
        poll_seconds=max(1.0, args.poll_seconds),
        poll_interval_seconds=max(0.25, args.poll_interval_seconds),
    )
    if args.output_file is not None:
        args.output_file.parent.mkdir(parents=True, exist_ok=True)
        args.output_file.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


def probe_live_iocs(
    *,
    base_url: str,
    username: str,
    password: str,
    scanner_families: list[str],
    severities: list[str],
    per_combination: int,
    poll_seconds: float,
    poll_interval_seconds: float,
) -> dict[str, Any]:
    token = _login(base_url=base_url, username=username, password=password)
    selection = _select_ioc_sample(
        base_url=base_url,
        token=token,
        scanner_families=scanner_families,
        severities=severities,
        per_combination=per_combination,
    )
    sample = selection["items"]

    rows: list[dict[str, Any]] = []
    for finding in sample:
        row = {
            "iocId": finding["iocId"],
            "scannerFamily": str(finding.get("scannerFamily", "")).strip().lower(),
            "severity": str(finding.get("severity", "")).strip(),
            "ruleName": finding.get("ruleName"),
            "indicatorValue": finding.get("indicatorValue"),
            "status": "not_started",
        }
        try:
            _generate_decision(base_url=base_url, token=token, ioc_id=finding["iocId"], submitted_by=username)
            latest = _wait_for_latest_decision(
                base_url=base_url,
                token=token,
                ioc_id=finding["iocId"],
                poll_seconds=poll_seconds,
                poll_interval_seconds=poll_interval_seconds,
            )
            result = latest.get("result") or {}
            decision = result.get("decision") or {}
            confidence = _float_or_none(decision.get("confidence"))
            false_positive_risk = _float_or_none(decision.get("falsePositiveRisk"))
            row.update(
                {
                    "status": str(result.get("status") or "unknown"),
                    "modelVersion": result.get("modelVersion"),
                    "datasetVersion": result.get("datasetVersion"),
                    "verdict": decision.get("verdict"),
                    "confidence": confidence,
                    "falsePositiveRisk": false_positive_risk,
                    "confidenceBand": _confidence_band(confidence),
                    "reviewPriority": decision.get("reviewPriority"),
                    "scoredAtUtc": decision.get("scoredAtUtc"),
                }
            )
        except Exception as exc:  # pragma: no cover - exercised in live runs
            row.update(
                {
                    "status": "error",
                    "error": str(exc),
                }
            )
        rows.append(row)

    return {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "baseUrl": base_url.rstrip("/"),
        "scannerFamilies": scanner_families,
        "severities": severities,
        "sampleSize": len(rows),
        "combinationStats": selection["combinationStats"],
        "combinationErrors": selection["combinationErrors"],
        "rows": rows,
        "summary": _summarize_rows(rows),
    }


def _login(*, base_url: str, username: str, password: str) -> str:
    payload = _request_json(
        base_url=base_url,
        path="/api/auth/token",
        method="POST",
        body={"userName": username, "password": password},
    )
    token = str(payload.get("accessToken") or "").strip()
    if not token:
        raise RuntimeError("Auth token response did not include an access token.")
    return token


def _select_ioc_sample(
    *,
    base_url: str,
    token: str,
    scanner_families: list[str],
    severities: list[str],
    per_combination: int,
) -> dict[str, Any]:
    selected: list[dict[str, Any]] = []
    seen: set[str] = set()
    combination_stats: list[dict[str, Any]] = []
    combination_errors: list[dict[str, Any]] = []
    for scanner_family in scanner_families:
        for severity in severities:
            try:
                payload = _request_json(
                    base_url=base_url,
                    path="/api/v2/legacy-pipeline/iocs",
                    token=token,
                    query={
                        "scannerFamily": scanner_family,
                        "severity": severity,
                        "page": 1,
                        "pageSize": max(5, per_combination * 3),
                    },
                )
            except Exception as exc:  # pragma: no cover - exercised in live runs
                combination_errors.append(
                    {
                        "scannerFamily": scanner_family,
                        "severity": severity,
                        "error": str(exc),
                    }
                )
                continue
            items = payload.get("items") or []
            total_count = _coerce_int(payload.get("totalCount"), default=len(items))
            count = 0
            for item in items:
                ioc_id = str(item.get("iocId") or "").strip()
                if not ioc_id or ioc_id in seen:
                    continue
                selected.append(item)
                seen.add(ioc_id)
                count += 1
                if count >= per_combination:
                    break
            combination_stats.append(
                {
                    "scannerFamily": scanner_family,
                    "severity": severity,
                    "totalCount": total_count,
                    "selectedCount": count,
                    "status": "empty" if total_count == 0 else "ok",
                }
            )
    return {
        "items": selected,
        "combinationStats": combination_stats,
        "combinationErrors": combination_errors,
    }


def _generate_decision(*, base_url: str, token: str, ioc_id: str, submitted_by: str) -> dict[str, Any]:
    return _request_json(
        base_url=base_url,
        path=f"/api/v2/ai/decisions/iocs/{ioc_id}/generate",
        token=token,
        method="POST",
        body={"submittedByUserId": submitted_by},
    )


def _wait_for_latest_decision(
    *,
    base_url: str,
    token: str,
    ioc_id: str,
    poll_seconds: float,
    poll_interval_seconds: float,
) -> dict[str, Any]:
    deadline = time.monotonic() + poll_seconds
    while True:
        payload = _request_json(
            base_url=base_url,
            path=f"/api/v2/ai/decisions/iocs/{ioc_id}/latest",
            token=token,
        )
        status = str((payload.get("result") or {}).get("status") or "").strip().lower()
        if status in {"completed", "failed"}:
            return payload
        if time.monotonic() >= deadline:
            return payload
        time.sleep(poll_interval_seconds)


def _request_json(
    *,
    base_url: str,
    path: str,
    token: str | None = None,
    method: str = "GET",
    query: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    url = base_url.rstrip("/") + path
    if query:
        encoded = parse.urlencode({key: value for key, value in query.items() if value is not None})
        url = f"{url}?{encoded}"
    data = None
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:  # pragma: no cover - exercised in live runs
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed with {exc.code}: {detail}") from exc


def _summarize_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    completed = [row for row in rows if row.get("status") == "Completed"]
    by_family: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "avgConfidence": None, "bands": defaultdict(int), "_confidences": []}
    )
    by_severity: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "avgConfidence": None, "bands": defaultdict(int), "_confidences": []}
    )
    confidence_values: list[float] = []
    medium_signal_count = 0

    for row in completed:
        confidence = _float_or_none(row.get("confidence"))
        band = _confidence_band(confidence)
        family = str(row.get("scannerFamily") or "unknown")
        severity = str(row.get("severity") or "unknown")
        by_family[family]["count"] += 1
        by_family[family]["bands"][band] += 1
        by_severity[severity]["count"] += 1
        by_severity[severity]["bands"][band] += 1
        if confidence is not None:
            confidence_values.append(confidence)
            by_family[family]["_confidences"].append(confidence)
            by_severity[severity]["_confidences"].append(confidence)
            if band == "medium":
                medium_signal_count += 1

    for buckets in (by_family, by_severity):
        for value in buckets.values():
            relevant = value.pop("_confidences", [])
            if relevant:
                value["avgConfidence"] = round(sum(relevant) / len(relevant), 4)
            value["bands"] = dict(value["bands"])

    return {
        "completedCount": len(completed),
        "errorCount": sum(1 for row in rows if row.get("status") == "error"),
        "avgConfidence": round(sum(confidence_values) / len(confidence_values), 4) if confidence_values else None,
        "mediumSignalCount": medium_signal_count,
        "confidenceBands": _count_bands(completed),
        "byFamily": dict(by_family),
        "bySeverity": dict(by_severity),
    }


def _count_bands(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {"low": 0, "medium": 0, "high": 0, "unknown": 0}
    for row in rows:
        counts[_confidence_band(_float_or_none(row.get("confidence")))] += 1
    return counts


def _confidence_band(confidence: float | None) -> str:
    if confidence is None:
        return "unknown"
    if confidence < 0.2:
        return "low"
    if confidence <= 0.6:
        return "medium"
    return "high"


def _float_or_none(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


if __name__ == "__main__":
    main()
