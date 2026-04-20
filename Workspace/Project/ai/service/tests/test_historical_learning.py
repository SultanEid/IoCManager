from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import shutil

from cti_service.contracts import SubmitFeedbackRequest
from cti_service.feedback_store import HistoricalLearningStore
from cti_service.historical_learning import HistoricalLearningEngine


def _feedback_payload(*, case_id: str, ioc_value: str, verdict: str = "true_positive", **kwargs: object) -> SubmitFeedbackRequest:
    payload = {
        "caseId": case_id,
        "decisionId": kwargs.pop("decisionId", f"decision-{case_id}"),
        "iocType": "domain",
        "iocValue": ioc_value,
        "sourceSystem": "siem",
        "detectionFamily": "sigma",
        "verdict": verdict,
        "notes": "historical-learning-test",
        "submittedByUserId": "analyst-test",
        **kwargs,
    }
    return SubmitFeedbackRequest.model_validate(payload)


def _new_store(test_name: str) -> HistoricalLearningStore:
    root = Path(__file__).resolve().parent / f"_tmp_{test_name}"
    if root.exists():
        shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    return HistoricalLearningStore(root / "feedback_events.jsonl")


def test_historical_learning_gates_out_non_final_events() -> None:
    store = _new_store("historical_learning_gates")
    engine = HistoricalLearningEngine(store)

    store.append(
        _feedback_payload(
            case_id="legacy",
            ioc_value="strict-gating.example",
            eventType=None,
            occurredAtUtc="2026-04-15T09:00:00Z",
        )
    )
    store.append(
        _feedback_payload(
            case_id="final-accepted",
            ioc_value="strict-gating.example",
            eventType="recommendation_feedback",
            isFinal=True,
            recommendationCode="contain_host",
            recommendationDisposition="accepted",
            occurredAtUtc="2026-04-16T10:00:00Z",
        )
    )

    context = engine.build_context_from_score_request(
        ioc_type="domain",
        ioc_value="strict-gating.example",
        as_of_time=datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc),
    )
    assert context.quality.eligible_count == 1
    assert context.quality.dropped_count >= 1
    assert (
        context.quality.drop_reasons.get("not_finalized", 0)
        + context.quality.drop_reasons.get("unsupported_event_type", 0)
        >= 1
    )


def test_historical_store_exact_match_and_deterministic_top_k_ordering() -> None:
    store = _new_store("historical_store_exact_match")
    engine = HistoricalLearningEngine(store, default_top_k=2)

    store.append(
        _feedback_payload(
            case_id="older",
            ioc_value="exact-match.example",
            decisionId="decision-older",
            eventType="final_closure",
            isFinal=True,
            closureLabel="confirmed_malicious",
            closureVerdict="malicious",
            occurredAtUtc="2026-04-10T10:00:00Z",
        )
    )
    store.append(
        _feedback_payload(
            case_id="newer",
            ioc_value="exact-match.example",
            decisionId="decision-newer",
            eventType="final_closure",
            isFinal=True,
            closureLabel="confirmed_malicious",
            closureVerdict="malicious",
            occurredAtUtc="2026-04-12T10:00:00Z",
        )
    )
    store.append(
        _feedback_payload(
            case_id="other-ioc",
            ioc_value="other.example",
            eventType="final_closure",
            isFinal=True,
            closureLabel="confirmed_malicious",
            closureVerdict="malicious",
            occurredAtUtc="2026-04-13T10:00:00Z",
        )
    )

    rows = store.query_events(
        ioc_type="domain",
        ioc_value="exact-match.example",
        lookback_days=90,
        as_of_time=datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc),
        limit=2,
    )
    assert len(rows) == 2
    assert rows[0]["decisionId"] == "decision-newer"
    assert rows[1]["decisionId"] == "decision-older"

    context = engine.build_context_from_score_request(
        ioc_type="domain",
        ioc_value="exact-match.example",
        as_of_time=datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc),
        top_k=2,
        lookback_days=90,
    )
    assert len(context.similar_detections) == 2
    assert context.similar_detections[0].observed_at >= context.similar_detections[1].observed_at


def test_historical_learning_features_have_non_empty_provenance() -> None:
    store = _new_store("historical_learning_provenance")
    engine = HistoricalLearningEngine(store)

    store.append(
        _feedback_payload(
            case_id="event-1",
            ioc_value="provenance.example",
            eventType="recommendation_feedback",
            isFinal=True,
            recommendationCode="contain_host",
            recommendationDisposition="accepted",
            occurredAtUtc="2026-04-14T10:00:00Z",
        )
    )
    store.append(
        _feedback_payload(
            case_id="event-2",
            ioc_value="provenance.example",
            eventType="post_action_outcome",
            isFinal=True,
            postActionOutcome="success",
            occurredAtUtc="2026-04-15T10:00:00Z",
        )
    )
    store.append(
        _feedback_payload(
            case_id="event-3",
            ioc_value="provenance.example",
            eventType="suppression_allowlist_decision",
            isFinal=True,
            suppressionDecision="allowlist",
            verdict="benign",
            occurredAtUtc="2026-04-16T10:00:00Z",
        )
    )

    context = engine.build_context_from_score_request(
        ioc_type="domain",
        ioc_value="provenance.example",
        as_of_time=datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc),
        lookback_days=90,
    )
    assert context.features
    assert context.feature_provenance
    provenance_by_feature: dict[str, list[str]] = {}
    for item in context.feature_provenance:
        provenance_by_feature.setdefault(item.feature, []).append(item.source_event_id)
    for feature_name in context.features:
        event_ids = provenance_by_feature.get(feature_name, [])
        assert event_ids
        assert all(event_id.strip() for event_id in event_ids)


def test_historical_learning_similarity_ranks_and_returns_reasons_and_prior_history() -> None:
    store = _new_store("historical_learning_similarity_rank")
    engine = HistoricalLearningEngine(store)
    as_of = datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc)

    strong_similarity_context = {
        "ruleFamily": "sigma",
        "ruleId": "SIG-ALPHA-1",
        "iocIndicators": [{"indicatorType": "domain", "indicatorValue": "pivot.example"}],
        "behaviorPatterns": ["memory_injection_api", "powershell.exe"],
        "signer": "unknown",
        "publisher": "contoso",
        "assetGroup": "finance",
        "lineageShape": "p3_u1_h1",
        "networkDestinationFamilies": ["example.com"],
        "analystClosurePattern": "confirmed_malicious",
    }
    weak_similarity_context = {
        "ruleFamily": "sigma",
        "ruleId": "SIG-BETA-2",
        "iocIndicators": [{"indicatorType": "domain", "indicatorValue": "different.example"}],
        "behaviorPatterns": ["script_usage"],
        "networkDestinationFamilies": ["other.example"],
        "analystClosurePattern": "likely_malicious",
    }

    store.append(
        _feedback_payload(
            case_id="strong-case-1",
            decisionId="strong-det-1",
            ioc_value="pivot.example",
            eventType="recommendation_feedback",
            isFinal=True,
            recommendationCode="search_fleet",
            recommendationDisposition="accepted",
            occurredAtUtc="2026-04-16T10:00:00Z",
            similarityContext=strong_similarity_context,
        )
    )
    store.append(
        _feedback_payload(
            case_id="strong-case-1-outcome",
            decisionId="strong-det-1",
            ioc_value="pivot.example",
            eventType="post_action_outcome",
            isFinal=True,
            postActionOutcome="success",
            occurredAtUtc="2026-04-17T10:00:00Z",
            similarityContext=strong_similarity_context,
        )
    )
    store.append(
        _feedback_payload(
            case_id="weak-case-1",
            decisionId="weak-det-1",
            ioc_value="different.example",
            eventType="final_closure",
            isFinal=True,
            closureLabel="likely_malicious",
            closureVerdict="likely_malicious",
            occurredAtUtc="2026-04-18T10:00:00Z",
            similarityContext=weak_similarity_context,
        )
    )

    context = engine.build_context_from_score_request(
        ioc_type="domain",
        ioc_value="pivot.example",
        as_of_time=as_of,
        top_k=5,
        rule_context={"ruleFamily": "sigma", "ruleId": "SIG-ALPHA-1"},
        host_context={"assetGroup": "finance"},
        detection_package={
            "rule_family": "sigma",
            "rule_metadata": {"rule_id": "SIG-ALPHA-1"},
            "asset_context": {"business_unit": "finance"},
            "raw_hit_payload": {
                "lineage": {
                    "process": [{"id": "1"}, {"id": "2"}, {"id": "3"}],
                    "user": {"user_id": "u-1"},
                    "host": {"host_id": "h-1"},
                }
            },
            "behavior_report_references": {
                "reports": [
                    {
                        "summary": "memory injection with powershell and beaconing",
                        "extracted_behavior_features": {
                            "suspicious_api_system_call_families": ["memory_injection_api"],
                            "suspicious_script_interpreter_usage": ["powershell.exe"],
                            "network_destinations": [{"type": "domain", "value": "beacon.example.com"}],
                        },
                    }
                ]
            },
            "prior_analyst_outcomes": {"outcomes": [{"verdict": "confirmed_malicious"}]},
        },
    )

    assert len(context.similar_detections) >= 2
    assert context.similar_detections[0].detection_id == "strong-det-1"
    assert context.similar_detections[0].similarity_score >= context.similar_detections[1].similarity_score
    assert "same rule id" in context.similar_detections[0].similarity_reasons
    assert "search_fleet" in context.similar_detections[0].prior_accepted_actions
    assert "success" in context.similar_detections[0].prior_outcomes


def test_historical_learning_similarity_order_is_deterministic_on_ties() -> None:
    store = _new_store("historical_learning_similarity_ties")
    engine = HistoricalLearningEngine(store)
    as_of = datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc)

    tie_context = {
        "ruleFamily": "sigma",
        "ruleId": "SIG-TIE",
        "iocIndicators": [{"indicatorType": "domain", "indicatorValue": "tie.example"}],
    }
    store.append(
        _feedback_payload(
            case_id="tie-case-a",
            decisionId="tie-det-a",
            ioc_value="tie.example",
            eventType="final_closure",
            isFinal=True,
            closureLabel="confirmed_malicious",
            closureVerdict="malicious",
            occurredAtUtc="2026-04-18T10:00:00Z",
            similarityContext=tie_context,
        )
    )
    store.append(
        _feedback_payload(
            case_id="tie-case-b",
            decisionId="tie-det-b",
            ioc_value="tie.example",
            eventType="final_closure",
            isFinal=True,
            closureLabel="confirmed_malicious",
            closureVerdict="malicious",
            occurredAtUtc="2026-04-18T10:00:00Z",
            similarityContext=tie_context,
        )
    )

    first = engine.build_context_from_score_request(
        ioc_type="domain",
        ioc_value="tie.example",
        as_of_time=as_of,
        top_k=5,
        rule_context={"ruleFamily": "sigma", "ruleId": "SIG-TIE"},
        host_context={},
        detection_package={"rule_family": "sigma", "rule_metadata": {"rule_id": "SIG-TIE"}},
    )
    second = engine.build_context_from_score_request(
        ioc_type="domain",
        ioc_value="tie.example",
        as_of_time=as_of,
        top_k=5,
        rule_context={"ruleFamily": "sigma", "ruleId": "SIG-TIE"},
        host_context={},
        detection_package={"rule_family": "sigma", "rule_metadata": {"rule_id": "SIG-TIE"}},
    )
    assert [item.detection_id for item in first.similar_detections] == [item.detection_id for item in second.similar_detections]
