from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any, Literal

Polarity = Literal["positive", "negative", "neutral"]

CHANNEL_RULE = "rule_semantics"
CHANNEL_HIT = "hit_payload"
CHANNEL_ENV = "environment_context"
CHANNEL_ENRICHMENT = "linked_enrichment"
CHANNEL_BEHAVIOR = "behavior_evidence"
CHANNEL_ANALYST = "analyst_history"

REQUIRED_CHANNELS = (
    CHANNEL_RULE,
    CHANNEL_HIT,
    CHANNEL_ENV,
    CHANNEL_ENRICHMENT,
    CHANNEL_BEHAVIOR,
    CHANNEL_ANALYST,
)


@dataclass(frozen=True, slots=True)
class EvidenceAtom:
    channel: str
    source: str
    evidence_id: str | None
    reference: str | None
    category: str
    polarity: Polarity
    confidence: float | None
    summary: str
    anchor: str
    explicit_contradiction: bool = False


@dataclass(frozen=True, slots=True)
class MissingEvidenceItem:
    gap_id: str
    channel: str
    description: str
    importance: Literal["low", "medium", "high"] = "medium"


@dataclass(frozen=True, slots=True)
class DeduplicationSummary:
    input_count: int
    unique_count: int
    duplicate_count: int


@dataclass(frozen=True, slots=True)
class DeduplicationLedgerItem:
    fingerprint: str
    kept_atom_key: str
    dropped_atom_key: str


@dataclass(frozen=True, slots=True)
class EvidenceFusionResult:
    positive_evidence: list[EvidenceAtom]
    negative_evidence: list[EvidenceAtom]
    contradictory_evidence: list[EvidenceAtom]
    missing_evidence: list[MissingEvidenceItem]
    coverage: dict[str, bool]
    deduplication: DeduplicationSummary
    deduplication_ledger: list[DeduplicationLedgerItem]
    explanation_lines: list[str]


def fuse_evidence(
    *,
    detection_package: dict[str, Any] | None,
    host_context: dict[str, Any] | None = None,
    rule_context: dict[str, Any] | None = None,
    provided_evidence_used: list[dict[str, Any]] | None = None,
    provided_evidence_missing: list[dict[str, Any]] | None = None,
) -> EvidenceFusionResult:
    package = detection_package if isinstance(detection_package, dict) else {}
    host = host_context if isinstance(host_context, dict) else {}
    rule = rule_context if isinstance(rule_context, dict) else {}

    extracted: list[EvidenceAtom] = []
    extracted.extend(_extract_rule_semantics(package))
    extracted.extend(_extract_hit_payload(package, rule))
    extracted.extend(_extract_environment_context(package, host))
    extracted.extend(_extract_enrichment(package))
    extracted.extend(_extract_behavior_evidence(package))
    extracted.extend(_extract_analyst_history(package))
    extracted.extend(_extract_provided_evidence(provided_evidence_used or []))

    deduped, deduplication_ledger = _dedupe_atoms(extracted)
    duplicate_count = len(deduplication_ledger)
    contradictory = _collect_contradictory_atoms(deduped)
    contradictory_keys = {_atom_key(item) for item in contradictory}

    positive = [
        atom
        for atom in deduped
        if atom.polarity == "positive" and _atom_key(atom) not in contradictory_keys
    ]
    negative = [
        atom
        for atom in deduped
        if atom.polarity == "negative" and _atom_key(atom) not in contradictory_keys
    ]

    coverage = {channel: False for channel in REQUIRED_CHANNELS}
    for atom in deduped:
        if atom.channel in coverage:
            coverage[atom.channel] = True

    missing = _collect_missing_evidence(coverage, provided_evidence_missing or [])
    explanation = _build_explanation_lines(
        input_count=len(extracted),
        unique_count=len(deduped),
        duplicate_count=duplicate_count,
        coverage=coverage,
        positive_count=len(positive),
        negative_count=len(negative),
        contradictory_count=len(contradictory),
        missing_count=len(missing),
    )

    return EvidenceFusionResult(
        positive_evidence=positive,
        negative_evidence=negative,
        contradictory_evidence=contradictory,
        missing_evidence=missing,
        coverage=coverage,
        deduplication=DeduplicationSummary(
            input_count=len(extracted),
            unique_count=len(deduped),
            duplicate_count=duplicate_count,
        ),
        deduplication_ledger=deduplication_ledger,
        explanation_lines=explanation,
    )


def to_dataset_evidence_item(atom: EvidenceAtom) -> dict[str, Any]:
    return {
        "evidence_id": atom.evidence_id or atom.anchor,
        "source": atom.source,
        "summary": atom.summary,
        "reference": atom.reference,
        "confidence": atom.confidence,
        "category": atom.category,
        "polarity": atom.polarity,
        "channel": atom.channel,
    }


def to_dataset_missing_item(item: MissingEvidenceItem) -> dict[str, Any]:
    return {
        "gap_id": item.gap_id,
        "description": item.description,
        "importance": item.importance,
        "channel": item.channel,
    }


def _extract_rule_semantics(package: dict[str, Any]) -> list[EvidenceAtom]:
    output: list[EvidenceAtom] = []
    metadata = _effective_rule_metadata(package)
    full_rule_text = _normalize_string(package.get("full_rule_text"))
    if not metadata and not full_rule_text:
        return output

    source = _normalize_string(metadata.get("source")) or "rule_metadata"
    rule_id = _normalize_string(metadata.get("rule_id")) or _normalize_string(metadata.get("id"))
    title = _normalize_string(metadata.get("title")) or _normalize_string(metadata.get("name")) or "Rule semantics"
    tags = _coerce_list_of_strings(metadata.get("tags"))
    severity = _normalize_string(metadata.get("level")) or _normalize_string(metadata.get("severity"))
    summary_parts = [title]
    if severity:
        summary_parts.append(f"severity={severity}")
    if tags:
        summary_parts.append(f"tags={','.join(tags[:4])}")
    if full_rule_text and not tags:
        summary_parts.append("rule_text_present")

    polarity = _polarity_from_text(" ".join(tags + [title, severity or "", full_rule_text or ""]))
    confidence_hint = _float_or_none(metadata.get("confidence"))
    if confidence_hint is None:
        confidence_hint = 0.65 if polarity == "positive" else 0.55 if polarity == "negative" else None

    output.append(
        EvidenceAtom(
            channel=CHANNEL_RULE,
            source=source,
            evidence_id=rule_id,
            reference=None,
            category="rule_semantics",
            polarity=polarity,
            confidence=confidence_hint,
            summary="; ".join(part for part in summary_parts if part),
            anchor=rule_id or title.lower(),
        )
    )
    return output


def _extract_hit_payload(package: dict[str, Any], rule_context: dict[str, Any]) -> list[EvidenceAtom]:
    output: list[EvidenceAtom] = []
    hit = _effective_hit_payload(package)
    object_metadata = package.get("object_metadata") if isinstance(package.get("object_metadata"), dict) else {}
    if not hit and not rule_context:
        return output

    source = _normalize_string(object_metadata.get("source_system")) or "hit_payload"
    evidence_id = _normalize_string(object_metadata.get("object_id")) or _normalize_string(hit.get("event_id"))

    confidence = _float_or_none(hit.get("confidence"))
    if confidence is None:
        confidence = _float_or_none(object_metadata.get("confidence_hint"))

    summary_tokens = [
        _normalize_string(hit.get("event_id")),
        _normalize_string(hit.get("host")),
        _normalize_string(hit.get("command_line")),
        _normalize_string(hit.get("alert")),
    ]
    summary = "; ".join(item for item in summary_tokens if item) or "Raw hit payload observed."
    summary_text = " ".join(item for item in [summary, _json_fragment(hit), _json_fragment(rule_context)] if item)
    polarity = _polarity_from_text(summary_text)

    output.append(
        EvidenceAtom(
            channel=CHANNEL_HIT,
            source=source,
            evidence_id=evidence_id,
            reference=None,
            category="hit_payload",
            polarity=polarity,
            confidence=confidence,
            summary=summary[:240],
            anchor=evidence_id or _stable_text_anchor(summary),
        )
    )
    return output


def _effective_rule_metadata(package: dict[str, Any]) -> dict[str, Any]:
    metadata = package.get("rule_metadata") if isinstance(package.get("rule_metadata"), dict) else {}
    if metadata:
        return metadata
    alert = package.get("alert") if isinstance(package.get("alert"), dict) else {}
    alert_rule = alert.get("rule") if isinstance(alert.get("rule"), dict) else {}
    if alert_rule:
        return alert_rule
    return {}


def _effective_hit_payload(package: dict[str, Any]) -> dict[str, Any]:
    hit = package.get("raw_hit_payload") if isinstance(package.get("raw_hit_payload"), dict) else {}
    if hit:
        return hit

    alert = package.get("alert") if isinstance(package.get("alert"), dict) else {}
    flow = package.get("flow") if isinstance(package.get("flow"), dict) else {}
    pcap = package.get("pcap") if isinstance(package.get("pcap"), dict) else {}
    if not alert and not flow and not pcap:
        return {}

    alert_rule = alert.get("rule") if isinstance(alert.get("rule"), dict) else {}
    derived = {
        "event_id": alert.get("event_id"),
        "timestamp": alert.get("timestamp"),
        "sensor": alert.get("sensor"),
        "src_ip": alert.get("src_ip") or flow.get("src_ip"),
        "src_port": alert.get("src_port") or flow.get("src_port"),
        "dst_ip": alert.get("dst_ip") or flow.get("dst_ip"),
        "dst_port": alert.get("dst_port") or flow.get("dst_port"),
        "protocol": alert.get("protocol") or flow.get("protocol") or alert_rule.get("protocol"),
        "flow": alert.get("flow") or flow.get("directionality"),
        "flow_id": flow.get("flow_id"),
        "observed_at": flow.get("observed_at"),
        "threshold": alert.get("threshold"),
        "message": alert_rule.get("msg"),
        "pcap_metadata": pcap,
    }
    return {key: value for key, value in derived.items() if value is not None}


def _extract_environment_context(package: dict[str, Any], host_context: dict[str, Any]) -> list[EvidenceAtom]:
    output: list[EvidenceAtom] = []
    asset = package.get("asset_context") if isinstance(package.get("asset_context"), dict) else {}
    prevalence = package.get("time_prevalence_context") if isinstance(package.get("time_prevalence_context"), dict) else {}
    allowlist = package.get("allowlist_baseline_context") if isinstance(package.get("allowlist_baseline_context"), dict) else {}
    object_metadata = package.get("object_metadata") if isinstance(package.get("object_metadata"), dict) else {}
    custom_attrs = object_metadata.get("custom_attributes") if isinstance(object_metadata.get("custom_attributes"), dict) else {}
    env_custom = custom_attrs.get("environment_context") if isinstance(custom_attrs.get("environment_context"), dict) else {}

    merged: dict[str, Any] = {}
    for block in (asset, prevalence, allowlist, env_custom, host_context):
        if not isinstance(block, dict):
            continue
        merged.update(block)

    if not merged:
        return output

    source = _normalize_string(object_metadata.get("source_system")) or "environment_context"
    anchor = _normalize_string(asset.get("asset_id")) or _normalize_string(object_metadata.get("object_id")) or "environment"

    polarity = "neutral"
    if _truthy(allowlist.get("allowlisted")) or _truthy(allowlist.get("baseline_match")):
        polarity = "negative"
    elif str(merged.get("criticality", "")).strip().lower() in {"high", "critical"}:
        polarity = "positive"
    elif str(merged.get("trend", "")).strip().lower() in {"increasing", "new"}:
        polarity = "positive"

    summary_parts = []
    for key in ("criticality", "environment", "trend", "recency_bucket", "allowlisted", "baseline_match"):
        if key not in merged:
            continue
        summary_parts.append(f"{key}={merged[key]}")
    summary = "; ".join(summary_parts) or "Environment context observed."

    output.append(
        EvidenceAtom(
            channel=CHANNEL_ENV,
            source=source,
            evidence_id=_normalize_string(asset.get("asset_id")) or _normalize_string(object_metadata.get("object_id")),
            reference=None,
            category="environment_context",
            polarity=polarity,
            confidence=_float_or_none(object_metadata.get("confidence_hint")),
            summary=summary,
            anchor=anchor,
        )
    )
    return output


def _extract_enrichment(package: dict[str, Any]) -> list[EvidenceAtom]:
    output: list[EvidenceAtom] = []
    linked = package.get("linked_enrichment") if isinstance(package.get("linked_enrichment"), dict) else {}
    enrichments = linked.get("enrichments") if isinstance(linked.get("enrichments"), list) else []
    for item in enrichments:
        if not isinstance(item, dict):
            continue
        source = _normalize_string(item.get("source")) or "enrichment"
        kind = _normalize_string(item.get("kind")) or "other"
        reference = _normalize_string(item.get("reference"))
        confidence = _float_or_none(item.get("confidence"))
        value_blob = item.get("value")
        value_text = _json_fragment(value_blob)
        summary = f"{kind} enrichment: {value_text or 'value_present'}"
        polarity = _polarity_from_text(f"{kind} {value_text}")
        stable_id = f"{source}:{kind}:{_stable_text_anchor(value_text or 'value_present')}"

        output.append(
            EvidenceAtom(
                channel=CHANNEL_ENRICHMENT,
                source=source,
                evidence_id=stable_id,
                reference=reference,
                category="linked_enrichment",
                polarity=polarity,
                confidence=confidence,
                summary=summary[:240],
                anchor=reference or stable_id,
            )
        )
    return output


def _extract_behavior_evidence(package: dict[str, Any]) -> list[EvidenceAtom]:
    output: list[EvidenceAtom] = []
    behavior_refs = package.get("behavior_report_references") if isinstance(package.get("behavior_report_references"), dict) else {}
    reports = behavior_refs.get("reports") if isinstance(behavior_refs.get("reports"), list) else []
    for report in reports:
        if not isinstance(report, dict):
            continue
        report_id = _normalize_string(report.get("report_id")) or "behavior-report"
        source = _normalize_string(report.get("source")) or "behavior_report"
        reference = _normalize_string(report.get("reference"))
        summary = _normalize_string(report.get("summary")) or "Behavior report reference."
        feature_blob = _json_fragment(report.get("extracted_behavior_features"))
        polarity = _polarity_from_text(f"{summary} {feature_blob}")
        if polarity == "neutral" and feature_blob:
            polarity = "positive"

        output.append(
            EvidenceAtom(
                channel=CHANNEL_BEHAVIOR,
                source=source,
                evidence_id=report_id,
                reference=reference,
                category="behavior_report",
                polarity=polarity,
                confidence=_float_or_none(report.get("confidence")),
                summary=summary,
                anchor=report_id,
            )
        )

        snippets = _coerce_list_of_strings(report.get("behavior_evidence_snippets"))
        for index, snippet in enumerate(snippets[:4], start=1):
            output.append(
                EvidenceAtom(
                    channel=CHANNEL_BEHAVIOR,
                    source=source,
                    evidence_id=f"{report_id}#snippet-{index}",
                    reference=reference,
                    category="behavior_snippet",
                    polarity=_polarity_from_text(snippet),
                    confidence=_float_or_none(report.get("confidence")),
                    summary=snippet,
                    anchor=report_id,
                )
            )

    related = package.get("related_detections") if isinstance(package.get("related_detections"), dict) else {}
    detections = related.get("detections") if isinstance(related.get("detections"), list) else []
    for item in detections:
        if not isinstance(item, dict):
            continue
        detection_id = _normalize_string(item.get("detection_id")) or "related-detection"
        relation_type = _normalize_string(item.get("relation_type")) or "supporting_signal"
        source = _normalize_string(item.get("rule_family")) or "related_detection"

        polarity: Polarity = "neutral"
        if relation_type in {"supporting_signal", "same_rule", "same_campaign", "same_object", "same_asset"}:
            polarity = "positive"
        elif relation_type == "contradictory_signal":
            polarity = "negative"

        output.append(
            EvidenceAtom(
                channel=CHANNEL_BEHAVIOR,
                source=source,
                evidence_id=detection_id,
                reference=None,
                category="related_detection",
                polarity=polarity,
                confidence=_float_or_none(item.get("confidence")),
                summary=f"Related detection {item.get('rule_id', 'unknown')} relation={relation_type}",
                anchor=detection_id,
                explicit_contradiction=relation_type == "contradictory_signal",
            )
        )

    return output


def _extract_analyst_history(package: dict[str, Any]) -> list[EvidenceAtom]:
    output: list[EvidenceAtom] = []
    history = package.get("prior_analyst_outcomes") if isinstance(package.get("prior_analyst_outcomes"), dict) else {}
    outcomes = history.get("outcomes") if isinstance(history.get("outcomes"), list) else []
    for index, item in enumerate(outcomes, start=1):
        if not isinstance(item, dict):
            continue
        verdict = _normalize_string(item.get("verdict")) or "needs_review"
        source = _normalize_string(item.get("analyst_id")) or "analyst_history"
        case_or_decision = _normalize_string(item.get("decision_id")) or _normalize_string(item.get("case_id")) or f"history-{index}"
        notes = _normalize_string(item.get("notes")) or f"Analyst verdict {verdict}."

        polarity: Polarity = "neutral"
        lowered = verdict.lower()
        if lowered in {"confirmed_malicious", "likely_malicious", "true_positive", "escalated"}:
            polarity = "positive"
        elif lowered in {"false_positive", "benign", "likely_benign"}:
            polarity = "negative"

        output.append(
            EvidenceAtom(
                channel=CHANNEL_ANALYST,
                source=source,
                evidence_id=case_or_decision,
                reference=None,
                category="analyst_history",
                polarity=polarity,
                confidence=None,
                summary=notes,
                anchor=case_or_decision,
            )
        )

    return output


def _extract_provided_evidence(items: list[dict[str, Any]]) -> list[EvidenceAtom]:
    output: list[EvidenceAtom] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        source = _normalize_string(item.get("source")) or "provided_evidence"
        evidence_id = _normalize_string(item.get("evidence_id"))
        reference = _normalize_string(item.get("reference"))
        summary = _normalize_string(item.get("summary")) or "Provided evidence item."
        channel = _infer_channel_from_source(source)
        polarity_value = _normalize_string(item.get("polarity"))
        polarity: Polarity
        if polarity_value in {"positive", "negative", "neutral"}:
            polarity = polarity_value  # type: ignore[assignment]
        else:
            polarity = _polarity_from_text(summary)

        output.append(
            EvidenceAtom(
                channel=channel,
                source=source,
                evidence_id=evidence_id,
                reference=reference,
                category=_normalize_string(item.get("category")) or "provided_evidence",
                polarity=polarity,
                confidence=_float_or_none(item.get("confidence")),
                summary=summary,
                anchor=evidence_id or reference or _stable_text_anchor(summary),
            )
        )
    return output


def _infer_channel_from_source(source: str) -> str:
    key = source.lower()
    if any(token in key for token in ("analyst", "closure")):
        return CHANNEL_ANALYST
    if any(token in key for token in ("sandbox", "behavior", "cape", "cuckoo", "related_detection", "sigma", "snort", "yara")):
        return CHANNEL_BEHAVIOR
    if any(token in key for token in ("enrich", "reputation", "intel", "whois", "dns")):
        return CHANNEL_ENRICHMENT
    if any(token in key for token in ("allowlist", "baseline", "asset", "environment")):
        return CHANNEL_ENV
    return CHANNEL_HIT


def _collect_missing_evidence(
    coverage: dict[str, bool],
    provided_missing: list[dict[str, Any]],
) -> list[MissingEvidenceItem]:
    missing: list[MissingEvidenceItem] = []
    for channel in REQUIRED_CHANNELS:
        if coverage.get(channel):
            continue
        importance: Literal["low", "medium", "high"] = "high" if channel in {CHANNEL_ENRICHMENT, CHANNEL_BEHAVIOR, CHANNEL_ANALYST} else "medium"
        missing.append(
            MissingEvidenceItem(
                gap_id=f"missing_{channel}",
                channel=channel,
                description=f"No usable {channel.replace('_', ' ')} evidence was provided.",
                importance=importance,
            )
        )

    for item in provided_missing:
        if not isinstance(item, dict):
            continue
        gap_id = _normalize_string(item.get("gap_id")) or "provided_gap"
        description = _normalize_string(item.get("description")) or "Missing evidence requires follow-up."
        importance_text = (_normalize_string(item.get("importance")) or "medium").lower()
        importance: Literal["low", "medium", "high"] = "medium"
        if importance_text in {"low", "medium", "high"}:
            importance = importance_text  # type: ignore[assignment]
        channel = _normalize_string(item.get("channel")) or "provided"
        missing.append(
            MissingEvidenceItem(
                gap_id=gap_id,
                channel=channel,
                description=description,
                importance=importance,
            )
        )

    seen: set[str] = set()
    unique: list[MissingEvidenceItem] = []
    for item in sorted(missing, key=lambda m: (m.gap_id, m.channel, m.description, m.importance)):
        key = f"{item.gap_id.lower()}|{item.channel.lower()}|{item.description.lower()}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def _collect_contradictory_atoms(atoms: list[EvidenceAtom]) -> list[EvidenceAtom]:
    by_anchor: dict[str, set[Polarity]] = {}
    for atom in atoms:
        by_anchor.setdefault(atom.anchor, set()).add(atom.polarity)

    contradictory: list[EvidenceAtom] = []
    for atom in atoms:
        if atom.explicit_contradiction:
            contradictory.append(atom)
            continue
        polarities = by_anchor.get(atom.anchor, set())
        if "positive" in polarities and "negative" in polarities and atom.polarity in {"positive", "negative"}:
            contradictory.append(atom)
            continue
        text = atom.summary.lower()
        if "contradict" in text or "conflict" in text:
            contradictory.append(atom)

    seen: set[str] = set()
    unique: list[EvidenceAtom] = []
    for atom in sorted(contradictory, key=_sort_key):
        key = _atom_key(atom)
        if key in seen:
            continue
        seen.add(key)
        unique.append(atom)
    return unique


def _dedupe_atoms(atoms: list[EvidenceAtom]) -> tuple[list[EvidenceAtom], list[DeduplicationLedgerItem]]:
    seen: dict[str, str] = {}
    unique: list[EvidenceAtom] = []
    duplicates: list[DeduplicationLedgerItem] = []
    for atom in sorted(atoms, key=_sort_key):
        fingerprint = _fingerprint(atom)
        atom_key = _atom_key(atom)
        if fingerprint in seen:
            duplicates.append(
                DeduplicationLedgerItem(
                    fingerprint=fingerprint,
                    kept_atom_key=seen[fingerprint],
                    dropped_atom_key=atom_key,
                )
            )
            continue
        seen[fingerprint] = atom_key
        unique.append(atom)
    return unique, duplicates


def _fingerprint(atom: EvidenceAtom) -> str:
    summary = " ".join(atom.summary.lower().split()) or atom.category.lower()
    return "|".join(
        (
            atom.source.lower(),
            atom.anchor.lower(),
            summary,
            atom.category.lower(),
            atom.polarity.lower(),
        )
    )


def _atom_key(atom: EvidenceAtom) -> str:
    return "|".join((atom.channel, atom.source, atom.evidence_id or "", atom.reference or "", atom.summary))


def _sort_key(atom: EvidenceAtom) -> tuple[str, str, str, str, str, str]:
    return (
        atom.channel,
        atom.source,
        atom.category,
        atom.evidence_id or "",
        atom.reference or "",
        atom.summary,
    )


def _build_explanation_lines(
    *,
    input_count: int,
    unique_count: int,
    duplicate_count: int,
    coverage: dict[str, bool],
    positive_count: int,
    negative_count: int,
    contradictory_count: int,
    missing_count: int,
) -> list[str]:
    coverage_summary = ", ".join(
        f"{channel}={'present' if coverage.get(channel) else 'missing'}"
        for channel in REQUIRED_CHANNELS
    )
    return [
        f"Fused {unique_count} unique evidence atoms from {input_count} inputs with {duplicate_count} duplicates removed.",
        f"Coverage: {coverage_summary}.",
        (
            "Polarity counts: "
            f"positive={positive_count}, negative={negative_count}, contradictory={contradictory_count}, missing={missing_count}."
        ),
    ]


def _polarity_from_text(text: str) -> Polarity:
    normalized = text.lower()
    positive_tokens = (
        "malicious",
        "suspicious",
        "trojan",
        "phishing",
        "attack",
        "c2",
        "beacon",
        "supporting_signal",
        "confirmed",
        "high_risk",
    )
    negative_tokens = (
        "benign",
        "false_positive",
        "allowlist",
        "allowlisted",
        "known_good",
        "baseline_match",
        "suppression",
        "approved",
    )

    if any(token in normalized for token in positive_tokens):
        return "positive"
    if any(token in normalized for token in negative_tokens):
        return "negative"
    return "neutral"


def _coerce_list_of_strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    output: list[str] = []
    for item in value:
        text = _normalize_string(item)
        if text:
            output.append(text)
    return output


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    text = _normalize_string(value)
    return bool(text and text.lower() in {"true", "1", "yes", "y"})


def _json_fragment(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (dict, list, tuple)):
        try:
            return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
        except (TypeError, ValueError):
            pass
    try:
        blob = str(value)
    except Exception:
        return ""
    return blob.strip()


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed < 0:
        return 0.0
    if parsed > 1:
        return 1.0
    return parsed


def _normalize_string(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text


def _stable_text_anchor(summary: str) -> str:
    return "anchor:" + "-".join(summary.lower().split()[:6])
