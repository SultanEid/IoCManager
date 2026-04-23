from __future__ import annotations

import json
from datetime import datetime, timezone

from decision_service import llm_assist_phrasing
from decision_service.contracts import ExplainCaseRequest
from decision_service.explanation import explain_case


def _request() -> ExplainCaseRequest:
    now = datetime.now(timezone.utc).isoformat()
    return ExplainCaseRequest.model_validate(
        {
            "case": {
                "id": "case-1",
                "title": "Suspicious domain",
                "summary": "Summary",
                "ownerUserId": "u-1",
                "state": "triage",
                "openedAtUtc": now,
                "closedAtUtc": None,
            },
            "decision": {
                "id": "d-1",
                "decisionState": "recommend",
                "recommendationCode": "contain_and_monitor",
                "recommendationSummary": "Contain after review",
                "snapshotHash": "abc",
                "modelVersion": "v1-test",
                "policyVersion": "p1",
                "transformationLineageHash": "lineage",
                "decidedAtUtc": now,
            },
            "snapshot": {
                "id": "s-1",
                "snapshotHash": "abc",
                "capturedAtUtc": now,
                "featureWindowStartUtc": now,
                "featureWindowEndUtc": now,
                "capturedByPipeline": "cti-v1",
            },
            "evidenceReferences": [
                {
                    "evidenceAssertionId": "e-1",
                    "evidenceReference": "ref",
                    "assertionType": "ioc",
                    "statement": "IOC seen in telemetry",
                    "confidence": 0.8,
                    "isConflicting": False,
                    "sourceReference": "source://x",
                    "observedAtUtc": now,
                    "referencedAtUtc": now,
                }
            ],
            "sourceTrustValues": [
                {
                    "sourceSystem": "feed-a",
                    "trustScore": 0.62,
                    "historicalPrecision": 0.71,
                    "historicalRecall": 0.66,
                }
            ],
            "assetCriticalityValues": [
                {
                    "assetKey": "host-1",
                    "criticality": "high",
                    "criticalityScore": 0.8,
                }
            ],
        }
    )


def test_explain_case_uses_deterministic_text_when_llm_assist_disabled(monkeypatch) -> None:
    monkeypatch.delenv("CTI_ENABLE_LLM_ASSIST", raising=False)
    monkeypatch.delenv("CTI_LLM_ASSIST_PROVIDER", raising=False)

    response = explain_case(_request(), dataset_version="test-v1")

    assert response.explanation_summary == "Contain after review (state=recommend, policy=p1, model=v1-test)."
    assert response.rationale[0] == "Decision state is 'recommend' with recommendation 'contain_and_monitor'."


def test_explain_case_applies_llm_phrase_when_valid(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")
    monkeypatch.setitem(
        llm_assist_phrasing._PROVIDER_GATEWAY,
        "unit",
        lambda _system, _user, _model, _timeout: json.dumps(
            {
                "abstain": False,
                "abstain_reason": None,
                "summary": "Contain after review with deterministic evidence support.",
                "rationale": [
                    "Deterministic evidence supports the recommendation state.",
                    "Conflicts remain tracked and manually reviewed.",
                ],
            }
        ),
    )

    response = explain_case(_request(), dataset_version="test-v1")

    assert response.explanation_summary == "Contain after review with deterministic evidence support."
    assert response.rationale[0] == "Deterministic evidence supports the recommendation state."
    assert len(response.citations) == 1
    assert response.replay_bundle_hash


def test_explain_case_falls_back_on_malformed_llm_output(monkeypatch) -> None:
    monkeypatch.setenv("CTI_ENABLE_LLM_ASSIST", "true")
    monkeypatch.setenv("CTI_LLM_ASSIST_PROVIDER", "unit")
    monkeypatch.setitem(
        llm_assist_phrasing._PROVIDER_GATEWAY,
        "unit",
        lambda _system, _user, _model, _timeout: "not-json",
    )

    response = explain_case(_request(), dataset_version="test-v1")

    assert response.explanation_summary == "Contain after review (state=recommend, policy=p1, model=v1-test)."
    assert response.rationale[0] == "Decision state is 'recommend' with recommendation 'contain_and_monitor'."

