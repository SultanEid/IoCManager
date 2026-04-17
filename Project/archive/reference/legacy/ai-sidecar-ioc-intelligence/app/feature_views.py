from __future__ import annotations

import math
import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

from .schemas import FeatureViewSnapshot, IocEvent

SUSPICIOUS_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".work", ".click"}
SUSPICIOUS_KEYWORDS = {"login", "verify", "account", "secure", "update", "auth", "wallet"}


def _entropy(value: str) -> float:
    if not value:
        return 0.0
    counts = Counter(value)
    length = float(len(value))
    return -sum((count / length) * math.log2(count / length) for count in counts.values())


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _extract_lexical(event: IocEvent) -> dict[str, float]:
    value = event.ioc_value.lower()
    parsed = urlparse(value) if event.ioc_type == "url" else None
    host = parsed.netloc.lower() if parsed else value

    has_suspicious_tld = float(any(host.endswith(tld) for tld in SUSPICIOUS_TLDS))
    has_suspicious_keyword = float(any(token in host for token in SUSPICIOUS_KEYWORDS))
    digits = sum(ch.isdigit() for ch in value)
    letters = sum(ch.isalpha() for ch in value)
    special = sum(not ch.isalnum() for ch in value)
    length = max(1, len(value))

    return {
        "entropy": _entropy(value),
        "length": float(length),
        "digit_ratio": digits / length,
        "letter_ratio": letters / length,
        "special_ratio": special / length,
        "subdomain_depth": float(host.count(".")),
        "has_ip_like_pattern": float(bool(re.search(r"\d+\.\d+\.\d+\.\d+", value))),
        "has_suspicious_tld": has_suspicious_tld,
        "has_suspicious_keyword": has_suspicious_keyword,
        "uses_https": float(value.startswith("https://")),
    }


def _extract_tabular(event: IocEvent) -> dict[str, float]:
    host = event.host_context
    rule = event.rule_context

    return {
        "host_criticality": _safe_float(host.get("criticality", host.get("host_criticality", 0.5)), 0.5),
        "asset_exposure": _safe_float(host.get("asset_exposure", 0.5), 0.5),
        "scanner_agreement": _safe_float(rule.get("scanner_agreement", 0.0)),
        "rule_severity": _safe_float(rule.get("severity_score", rule.get("rule_severity", 0.0))),
        "protocol_risk": _safe_float(rule.get("protocol_risk", 0.0)),
        "path_risk": _safe_float(rule.get("path_risk", 0.0)),
        "historical_hits": _safe_float(rule.get("historical_hits", 0.0)),
        "source_reputation": _safe_float(rule.get("source_reputation", 0.5), 0.5),
    }


def _extract_graph(event: IocEvent) -> dict[str, float]:
    rule = event.rule_context
    return {
        "shared_host_count": _safe_float(rule.get("shared_host_count", 0.0)),
        "shared_rule_count": _safe_float(rule.get("shared_rule_count", 0.0)),
        "cluster_density": _safe_float(rule.get("cluster_density", 0.0)),
        "campaign_link_score": _safe_float(rule.get("campaign_link_score", 0.0)),
        "neighbor_malicious_ratio": _safe_float(rule.get("neighbor_malicious_ratio", 0.0)),
    }


def _extract_temporal(event: IocEvent, history: dict[str, Any]) -> dict[str, float]:
    now = event.event_time.astimezone(timezone.utc)
    first_seen = history.get("first_seen")
    last_seen = history.get("last_seen")
    seen_count = _safe_float(history.get("seen_count", 0.0))

    age_hours = 0.0
    if first_seen:
        age_hours = max(0.0, (now - first_seen).total_seconds() / 3600.0)

    since_last_hours = 0.0
    if last_seen:
        since_last_hours = max(0.0, (now - last_seen).total_seconds() / 3600.0)

    return {
        "seen_count": seen_count,
        "age_hours": age_hours,
        "since_last_hours": since_last_hours,
        "burst_1h": _safe_float(history.get("burst_1h", 0.0)),
        "burst_24h": _safe_float(history.get("burst_24h", 0.0)),
        "scanner_consensus_24h": _safe_float(history.get("scanner_consensus_24h", 0.0)),
    }


def _extract_anti_database(event: IocEvent, history: dict[str, Any], feedback_stats: dict[str, Any]) -> dict[str, float]:
    now = event.event_time.astimezone(timezone.utc)
    is_new = 0.0 if history else 1.0
    last_seen = history.get("last_seen") if history else None

    freshness_hours = 0.0
    if last_seen:
        freshness_hours = max(0.0, (now - last_seen).total_seconds() / 3600.0)

    contradiction_signal = 0.0
    tp = _safe_float(feedback_stats.get("true_positive", 0.0))
    fp = _safe_float(feedback_stats.get("false_positive", 0.0))
    benign = _safe_float(feedback_stats.get("benign", 0.0))
    total = max(1.0, tp + fp + benign)
    contradiction_signal = (fp + benign) / total

    return {
        "novelty_score": is_new,
        "evidence_freshness_hours": freshness_hours,
        "confidence_decay": min(1.0, freshness_hours / 72.0),
        "contradiction_signal": contradiction_signal,
    }


def build_feature_snapshot(
    event: IocEvent,
    history: dict[str, Any] | None,
    feedback_stats: dict[str, Any] | None,
) -> FeatureViewSnapshot:
    history = history or {}
    feedback_stats = feedback_stats or {}

    lexical = _extract_lexical(event)
    tabular = _extract_tabular(event)
    graph = _extract_graph(event)
    temporal = _extract_temporal(event, history)
    anti_database = _extract_anti_database(event, history, feedback_stats)

    return FeatureViewSnapshot(
        lexical=lexical,
        tabular=tabular,
        graph=graph,
        temporal=temporal,
        anti_database=anti_database,
    )

