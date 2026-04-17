from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from .schemas import EvidenceCitation, RuleProposalRequest, RuleProposalResponse


ATTACK_BY_TYPE = {
    "ip": ["T1071", "T1041"],
    "domain": ["T1566", "T1583.001"],
    "url": ["T1566.002", "T1204.001"],
    "hash": ["T1027", "T1059"],
}


def propose_rule(request: RuleProposalRequest) -> RuleProposalResponse:
    family = choose_family(request)
    severity = normalize_severity(request.risk_tier)
    title = f"CTI Auto Proposal - {request.ioc_type.upper()} {request.ioc_value}"
    body = build_rule_body(family, request.ioc_type, request.ioc_value, severity)

    citation = EvidenceCitation(
        source_id=f"ioc:{request.ioc_type}:{request.ioc_value}",
        source_type="ioc",
        snippet=f"Rule generated from {request.ioc_type} indicator {request.ioc_value}",
        confidence=0.71,
    )

    confidence = 0.72
    if request.risk_tier.lower() == "critical":
        confidence = 0.84
    elif request.risk_tier.lower() == "high":
        confidence = 0.79

    return RuleProposalResponse(
        proposal_id=f"rp-{uuid4().hex[:12]}",
        human_review_required=True,
        rule_family=family,
        title=title,
        rule_body=body,
        severity=severity,
        confidence=confidence,
        attack_techniques=ATTACK_BY_TYPE.get(request.ioc_type.lower(), []),
        citations=[citation],
    )


def choose_family(request: RuleProposalRequest) -> str:
    if request.preferred_family:
        return request.preferred_family.lower()
    t = request.ioc_type.lower()
    if t in {"ip", "url"}:
        return "snort"
    if t == "hash":
        return "yara"
    return "sigma"


def normalize_severity(risk_tier: str) -> str:
    risk = risk_tier.lower()
    if risk in {"critical", "high", "medium", "low"}:
        return risk
    return "medium"


def build_rule_body(family: str, ioc_type: str, ioc_value: str, severity: str) -> str:
    if family == "sigma":
        return (
            "title: CTI auto proposal\n"
            f"id: {uuid4()}\n"
            "status: experimental\n"
            f"description: Auto-generated from indicator {ioc_value}\n"
            "logsource:\n  category: process_creation\n"
            "detection:\n"
            f"  selection:\n    CommandLine|contains: '{ioc_value}'\n"
            "  condition: selection\n"
            f"level: {severity}\n"
            "tags:\n  - attack.t1566\n"
        )
    if family == "yara":
        escaped = ioc_value.replace("\\", "\\\\").replace('"', '\\"')
        return (
            "rule CTI_Auto_Proposal {\n"
            "  meta:\n"
            "    author = \"cti-intelligence\"\n"
            f"    severity = \"{severity}\"\n"
            "  strings:\n"
            f"    $ioc = \"{escaped}\" ascii nocase\n"
            "  condition:\n"
            "    $ioc\n"
            "}\n"
        )
    # snort default
    msg = f"CTI auto proposal match for {ioc_type} {ioc_value}"
    return (
        f'alert tcp any any -> any any (msg:"{msg}"; content:"{ioc_value}"; nocase; sid:{int(uuid4().int % 9000000) + 1000000}; rev:1;)'
    )

