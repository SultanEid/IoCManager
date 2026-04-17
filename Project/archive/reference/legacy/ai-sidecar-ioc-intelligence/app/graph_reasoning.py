from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from .schemas import (
    EvidenceCitation,
    GraphCandidateObservableInput,
    GraphLinkCandidateRequest,
    GraphLinkCandidateResponse,
)


def score_link_candidates(request: GraphLinkCandidateRequest) -> list[GraphLinkCandidateResponse]:
    seed_type = request.seed_type.lower().strip()
    seed_value = request.seed_value.lower().strip()
    now = datetime.now(timezone.utc)
    responses: list[GraphLinkCandidateResponse] = []

    for candidate in request.candidate_nodes:
        if candidate.observable_id == request.seed_observable_id:
            continue

        score, reason = _candidate_score(seed_type, seed_value, candidate, now)
        citation = EvidenceCitation(
            source_id=f"observable:{candidate.observable_id}",
            source_type="graph",
            snippet=(
                f"Candidate {candidate.value} (type={candidate.type}) "
                f"confidence={candidate.confidence}, links={candidate.existing_links}, source_count={candidate.source_count}"
            ),
            confidence=min(0.95, max(0.35, score)),
        )
        responses.append(
            GraphLinkCandidateResponse(
                seed_observable_id=request.seed_observable_id,
                candidate_observable_id=candidate.observable_id,
                score=score,
                reason=reason,
                citations=[citation],
            )
        )

    responses.sort(key=lambda row: row.score, reverse=True)
    return responses[: request.top_k]


def _candidate_score(
    seed_type: str,
    seed_value: str,
    candidate: GraphCandidateObservableInput,
    now: datetime,
) -> tuple[float, str]:
    type_match = 1.0 if seed_type and seed_type == candidate.type.lower() else 0.45
    lexical_similarity = _lexical_similarity(seed_value, candidate.value.lower())
    conf_norm = min(1.0, max(0.0, candidate.confidence / 100.0))
    source_norm = min(1.0, candidate.source_count / 20.0)
    link_norm = min(1.0, candidate.existing_links / 12.0)
    recency_hours = max(0.0, (now - candidate.last_seen_utc.astimezone(timezone.utc)).total_seconds() / 3600.0)
    recency = max(0.0, 1.0 - min(1.0, recency_hours / 240.0))

    score = (
        0.22 * type_match
        + 0.18 * lexical_similarity
        + 0.25 * conf_norm
        + 0.12 * source_norm
        + 0.13 * link_norm
        + 0.10 * recency
    )
    score = max(0.0, min(1.0, score))
    reason = (
        f"type_match={type_match:.2f}, lexical_similarity={lexical_similarity:.2f}, "
        f"confidence={conf_norm:.2f}, link_density={link_norm:.2f}, recency={recency:.2f}"
    )
    return score, reason


def _lexical_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    a_tokens = set(a.replace("://", ".").replace("/", ".").split("."))
    b_tokens = set(b.replace("://", ".").replace("/", ".").split("."))
    a_tokens.discard("")
    b_tokens.discard("")
    if not a_tokens or not b_tokens:
        return 0.0
    inter = len(a_tokens.intersection(b_tokens))
    union = len(a_tokens.union(b_tokens))
    return inter / union

