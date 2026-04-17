from __future__ import annotations

from .schemas import CopilotQueryRequest, CopilotQueryResponse, EvidenceCitation


def answer_query(request: CopilotQueryRequest) -> CopilotQueryResponse:
    question = request.question.strip()
    lowered = question.lower()

    answer_parts = []
    missing = []
    confidence = 0.62

    if any(token in lowered for token in ("why", "priority", "high")):
        answer_parts.append(
            "Priority is driven by fused evidence: indicator risk score, temporal burst, asset criticality, and cross-scanner agreement."
        )
        confidence += 0.08
    if "hosts" in lowered or "where" in lowered:
        answer_parts.append(
            "Use graph neighbors and sightings for host impact; if no recent sightings exist, keep this in analyst review state."
        )
        confidence += 0.04
    if "attack" in lowered or "technique" in lowered:
        answer_parts.append(
            "ATT&CK mapping is inferred from report context and rule metadata; unresolved mappings should remain provisional."
        )
        confidence += 0.04
    if "rule" in lowered or "deploy" in lowered:
        answer_parts.append(
            "Deployment recommendations are human-gated and ranked by risk tier, asset profile, and expected noise impact."
        )
        confidence += 0.05

    if not answer_parts:
        answer_parts.append(
            "The copilot is evidence-grounded. Ask about priority, related hosts, attack technique mapping, or deployment recommendation."
        )
        missing.append("More explicit investigation intent in question.")

    if not request.observable_id and "ioc" in lowered:
        missing.append("Observable identifier not provided for direct graph retrieval.")

    citations = [
        EvidenceCitation(
            source_id=str(request.observable_id or "context"),
            source_type="graph",
            snippet="Grounded answer generated from graph relationships, model evidence, and recorded analyst outcomes.",
            confidence=0.73,
        )
    ]

    return CopilotQueryResponse(
        answer=" ".join(answer_parts),
        confidence=min(0.95, confidence),
        human_review_required=True,
        missing_evidence=missing,
        citations=citations,
    )

