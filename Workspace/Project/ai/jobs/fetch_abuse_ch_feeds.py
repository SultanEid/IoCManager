from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


THREATFOX_API_URL = "https://threatfox-api.abuse.ch/api/v1/"
MALWAREBAZAAR_API_URL = "https://mb-api.abuse.ch/api/v1/"


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Fetch abuse.ch feed snapshots into local raw dataset staging.")
    parser.add_argument("--raw-root", type=Path, default=ai_root / "datasets" / "raw")
    parser.add_argument("--auth-key-env", default="ABUSE_CH_AUTH_KEY")
    parser.add_argument("--threatfox-days", type=int, default=7)
    parser.add_argument("--malwarebazaar-selector", choices=["time", "100"], default="time")
    parser.add_argument("--limit", type=int, default=0, help="Optional per-feed row cap for local staging.")
    parser.add_argument("--skip-threatfox", action="store_true")
    parser.add_argument("--skip-malwarebazaar", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    auth_key = os.getenv(args.auth_key_env)
    if not auth_key:
        raise SystemExit(f"Missing auth key in environment variable {args.auth_key_env}.")

    fetched_at = datetime.now(timezone.utc)
    stamp = fetched_at.strftime("%Y%m%dT%H%M%SZ")
    report: dict[str, Any] = {
        "fetchedAtUtc": fetched_at.isoformat(),
        "rawRoot": str(args.raw_root.resolve()),
        "feeds": {},
    }

    if not args.skip_threatfox:
        payload = post_json(
            THREATFOX_API_URL,
            auth_key=auth_key,
            payload={"query": "get_iocs", "days": max(1, min(args.threatfox_days, 7))},
        )
        rows = normalize_response_rows(payload)
        report["feeds"]["threatfox"] = write_feed(
            root=args.raw_root / "threatfox",
            basename=f"recent-iocs-api-{stamp}",
            payload=payload,
            rows=rows,
            limit=args.limit,
        )

    if not args.skip_malwarebazaar:
        payload = post_form(
            MALWAREBAZAAR_API_URL,
            auth_key=auth_key,
            form={"query": "get_recent", "selector": args.malwarebazaar_selector},
        )
        rows = normalize_response_rows(payload)
        report["feeds"]["malwarebazaar"] = write_feed(
            root=args.raw_root / "malwarebazaar",
            basename=f"recent-api-{stamp}",
            payload=payload,
            rows=rows,
            limit=args.limit,
        )

    report_path = args.raw_root / f"abuse-ch-fetch-report-{stamp}.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    report["reportPath"] = str(report_path.resolve())
    print(json.dumps(report, indent=2))


def post_json(url: str, *, auth_key: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={"Auth-Key": auth_key, "Content-Type": "application/json", "User-Agent": "ioc-manager-dataset-fetcher"},
        method="POST",
    )
    return request_json(request)


def post_form(url: str, *, auth_key: str, form: dict[str, str]) -> dict[str, Any]:
    body = "&".join(f"{key}={value}" for key, value in form.items()).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={
            "Auth-Key": auth_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "ioc-manager-dataset-fetcher",
        },
        method="POST",
    )
    return request_json(request)


def request_json(request: Request) -> dict[str, Any]:
    try:
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8-sig"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"abuse.ch request failed with HTTP {exc.code}: {detail[:500]}") from exc
    except URLError as exc:
        raise RuntimeError(f"abuse.ch request failed: {exc}") from exc


def normalize_response_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    return []


def write_feed(
    *,
    root: Path,
    basename: str,
    payload: dict[str, Any],
    rows: list[dict[str, Any]],
    limit: int,
) -> dict[str, Any]:
    root.mkdir(parents=True, exist_ok=True)
    staged_rows = rows[:limit] if limit > 0 else rows
    raw_path = root / f"{basename}-raw.json"
    jsonl_path = root / f"{basename}.jsonl"
    metadata_path = root / f"{basename}-metadata.json"

    raw_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    with jsonl_path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in staged_rows:
            handle.write(json.dumps(row, sort_keys=True))
            handle.write("\n")
    metadata = {
        "queryStatus": payload.get("query_status"),
        "rowsReturned": len(rows),
        "rowsStaged": len(staged_rows),
        "rawJson": str(raw_path.resolve()),
        "jsonl": str(jsonl_path.resolve()),
    }
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    metadata["metadata"] = str(metadata_path.resolve())
    return metadata


if __name__ == "__main__":
    main()
