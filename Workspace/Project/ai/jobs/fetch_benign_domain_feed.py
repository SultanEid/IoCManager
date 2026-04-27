from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


MAJESTIC_MILLION_URL = "https://downloads.majestic.com/majestic_million.csv"


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Fetch a benign-domain popularity feed for supervised negative rows.")
    parser.add_argument("--raw-root", type=Path, default=ai_root / "datasets" / "raw")
    parser.add_argument("--limit", type=int, default=3000)
    parser.add_argument("--url", default=MAJESTIC_MILLION_URL)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    fetched_at = datetime.now(timezone.utc)
    stamp = fetched_at.strftime("%Y%m%dT%H%M%SZ")
    output_dir = args.raw_root / "majestic-million"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"top-domains-{stamp}.jsonl"

    request = Request(args.url, headers={"User-Agent": "ioc-manager-dataset-fetcher"})
    rows_written = 0
    with urlopen(request, timeout=60) as response, output_path.open("w", encoding="utf-8", newline="\n") as output:
        decoded = (line.decode("utf-8-sig", errors="replace") for line in response)
        reader = csv.DictReader(decoded)
        for row in reader:
            domain = str(row.get("Domain") or "").strip().lower()
            rank = str(row.get("GlobalRank") or row.get("Rank") or "").strip()
            if not domain:
                continue
            output.write(
                json.dumps(
                    {
                        "source": "majestic-million",
                        "domain": domain,
                        "rank": int(rank) if rank.isdigit() else None,
                        "retrieved_at_utc": fetched_at.isoformat(),
                    },
                    sort_keys=True,
                )
            )
            output.write("\n")
            rows_written += 1
            if args.limit > 0 and rows_written >= args.limit:
                break

    report = {
        "fetchedAtUtc": fetched_at.isoformat(),
        "source": "majestic-million",
        "url": args.url,
        "rowsStaged": rows_written,
        "jsonl": str(output_path.resolve()),
    }
    report_path = output_dir / f"fetch-report-{stamp}.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    report["reportPath"] = str(report_path.resolve())
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
