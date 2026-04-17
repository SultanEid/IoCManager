from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from .contracts import (
    EvidenceCitationResponse,
    GraphLinkCandidateRequest,
    GraphLinkCandidateResponse,
    ScoreCaseRequest,
)


class GraphFeatureProvider(Protocol):
    def get_features(self, request: ScoreCaseRequest) -> dict[str, float]:
        """Return optional related-evidence context features in [0, 1]."""


def score_graph_neighbors(request: GraphLinkCandidateRequest) -> list[GraphLinkCandidateResponse]:
    now = datetime.now(timezone.utc)
    seed_type = request.seed_type.strip().lower()
    seed_value = request.seed_value.strip().lower()
    rows: list[GraphLinkCandidateResponse] = []

    for candidate in request.candidate_nodes:
        if candidate.observable_id == request.seed_observable_id:
            continue

        score, reason = _score_candidate(
            seed_type=seed_type,
            seed_value=seed_value,
            candidate_type=candidate.type,
            candidate_value=candidate.value,
            confidence=candidate.confidence,
            source_count=candidate.source_count,
            existing_links=candidate.existing_links,
            last_seen_utc=candidate.last_seen_utc,
            now_utc=now,
        )
        citation = EvidenceCitationResponse(
            source_id=f"observable:{candidate.observable_id}",
            source_type="related_evidence",
            snippet=(
                f"type={candidate.type}, value={candidate.value}, confidence={candidate.confidence}, "
                f"sourceCount={candidate.source_count}, existingLinks={candidate.existing_links}"
            ),
            confidence=min(0.99, max(0.10, score)),
        )
        rows.append(
            GraphLinkCandidateResponse(
                seed_observable_id=request.seed_observable_id,
                candidate_observable_id=candidate.observable_id,
                score=score,
                reason=reason,
                citations=[citation],
            )
        )

    rows.sort(key=lambda item: item.score, reverse=True)
    return rows[: request.top_k]


def _score_candidate(
    seed_type: str,
    seed_value: str,
    candidate_type: str,
    candidate_value: str,
    confidence: int,
    source_count: int,
    existing_links: int,
    last_seen_utc: datetime,
    now_utc: datetime,
) -> tuple[float, str]:
    type_match = 1.0 if seed_type and seed_type == candidate_type.strip().lower() else 0.45
    lexical = _lexical_similarity(seed_value, candidate_value)
    confidence_score = max(0.0, min(1.0, float(confidence) / 100.0))
    source_score = max(0.0, min(1.0, float(source_count) / 20.0))
    link_score = max(0.0, min(1.0, float(existing_links) / 12.0))

    observed = last_seen_utc.astimezone(timezone.utc)
    age_hours = max(0.0, (now_utc - observed).total_seconds() / 3600.0)
    recency_score = max(0.0, 1.0 - min(1.0, age_hours / 240.0))

    score = (
        0.23 * type_match
        + 0.20 * lexical
        + 0.22 * confidence_score
        + 0.11 * source_score
        + 0.14 * link_score
        + 0.10 * recency_score
    )
    score = max(0.0, min(1.0, score))
    reason = (
        f"relatedness(type_match={type_match:.2f}, lexical_similarity={lexical:.2f}, confidence={confidence_score:.2f}, "
        f"link_density={link_score:.2f}, recency={recency_score:.2f})"
    )
    return float(score), reason


def _lexical_similarity(left: str, right: str) -> float:
    a = _tokenize(left.lower())
    b = _tokenize(right.lower())
    if not a or not b:
        return 0.0
    overlap = len(a.intersection(b))
    union = len(a.union(b))
    return float(overlap / union)


def _tokenize(value: str) -> set[str]:
    sanitized = value.replace("://", ".").replace("/", ".").replace(":", ".")
    tokens = {token for token in sanitized.split(".") if token}
    return tokens
