from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Iterable

from .schemas import EvidenceCitation, ExtractedIoc, ReportIngestionRequest, ReportIngestionResponse

IOC_PATTERNS = {
    "ip": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "domain": re.compile(r"\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,24}\b"),
    "url": re.compile(r"\b(?:https?|hxxps?)://[^\s<>\"]+\b", re.IGNORECASE),
    "hash": re.compile(r"\b(?:[A-Fa-f0-9]{32}|[A-Fa-f0-9]{40}|[A-Fa-f0-9]{64})\b"),
}

ATTACK_PATTERN = re.compile(r"\bT\d{4}(?:\.\d{3})?\b", re.IGNORECASE)
CVE_PATTERN = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)

CAMPAIGN_HINT_KEYWORDS = {
    "phishing": "phishing",
    "ransomware": "ransomware",
    "c2": "command-and-control",
    "command and control": "command-and-control",
    "credential": "credential-theft",
    "loader": "loader-campaign",
}

MALWARE_HINT_KEYWORDS = {
    "emotet": "emotet",
    "qakbot": "qakbot",
    "dridex": "dridex",
    "lokibot": "lokibot",
    "agenttesla": "agenttesla",
    "trickbot": "trickbot",
}


def ingest_report(request: ReportIngestionRequest) -> ReportIngestionResponse:
    text = request.document_text
    lines = text.splitlines()
    indexed_lines = list(enumerate(lines))

    extracted: list[ExtractedIoc] = []
    dedupe: set[tuple[str, str]] = set()

    attack_refs = sorted({match.group(0).upper() for match in ATTACK_PATTERN.finditer(text)})
    cve_refs = sorted({match.group(0).upper() for match in CVE_PATTERN.finditer(text)})

    for ioc_type, pattern in IOC_PATTERNS.items():
        for line_no, line in indexed_lines:
            for match in pattern.finditer(line):
                raw_value = normalize_ioc(ioc_type, match.group(0))
                if not raw_value:
                    continue
                key = (ioc_type, raw_value.lower())
                if key in dedupe:
                    continue
                dedupe.add(key)

                citation = EvidenceCitation(
                    source_id=request.document_id,
                    source_type="report",
                    snippet=line.strip()[:400],
                    source_uri=request.document_url,
                    start_offset=match.start(),
                    end_offset=match.end(),
                    confidence=0.78,
                )
                extracted.append(
                    ExtractedIoc(
                        ioc_type=ioc_type,
                        ioc_value=raw_value,
                        label="candidate_malicious" if ioc_type != "domain" else "candidate",
                        confidence=score_candidate(ioc_type, line, attack_refs, cve_refs),
                        attack_techniques=attack_refs[:5],
                        cve_refs=cve_refs[:5],
                        citations=[citation],
                    )
                )

    campaign_hints = infer_hints(text, CAMPAIGN_HINT_KEYWORDS)
    malware_hints = infer_hints(text, MALWARE_HINT_KEYWORDS)

    return ReportIngestionResponse(
        report_id=request.document_id,
        human_review_required=True,
        extracted_iocs=sorted(extracted, key=lambda item: item.confidence, reverse=True),
        campaign_hints=campaign_hints,
        malware_family_hints=malware_hints,
        processed_at=datetime.now(timezone.utc),
    )


def normalize_ioc(ioc_type: str, value: str) -> str:
    normalized = value.strip()
    if ioc_type == "url":
        return normalized.replace("hxxps://", "https://").replace("hxxp://", "http://")
    if ioc_type == "domain":
        value_lower = normalized.lower().strip(".")
        if value_lower.startswith("www."):
            value_lower = value_lower[4:]
        return value_lower
    if ioc_type == "hash":
        return normalized.lower()
    return normalized


def score_candidate(ioc_type: str, line: str, attack_refs: list[str], cve_refs: list[str]) -> float:
    base = {
        "ip": 0.74,
        "domain": 0.68,
        "url": 0.80,
        "hash": 0.85,
    }.get(ioc_type, 0.6)
    context_boost = 0.0
    lower = line.lower()
    if any(word in lower for word in ("malicious", "phishing", "payload", "beacon", "trojan", "ransom")):
        context_boost += 0.08
    if attack_refs:
        context_boost += 0.04
    if cve_refs:
        context_boost += 0.03
    return max(0.05, min(0.99, base + context_boost))


def infer_hints(text: str, map_: dict[str, str]) -> list[str]:
    lower = text.lower()
    hints = [hint for keyword, hint in map_.items() if keyword in lower]
    return sorted(set(hints))

