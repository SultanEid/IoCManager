from __future__ import annotations

import argparse
import json
from pathlib import Path

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from decision_service.registry import ModelRegistryStore
from decision_service.promotion_gates import evaluate_promotion_gates


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Promote a candidate model to active status in the registry.")
    parser.add_argument("--registry-path", type=Path, required=True)
    parser.add_argument("--model-version", required=True)
    parser.add_argument(
        "--evaluation-report",
        type=Path,
        default=None,
        help="Evaluation report JSON produced by evaluate_model.py for the candidate model.",
    )
    parser.add_argument(
        "--skip-artifact-validation",
        action="store_true",
        help="Promote without checking registered artifact hashes. Intended only for legacy local registries.",
    )
    parser.add_argument(
        "--skip-promotion-gates",
        action="store_true",
        help="Promote without checking evaluation metrics. Intended only for controlled local recovery.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    store = ModelRegistryStore(args.registry_path)
    gate_result = None
    if not args.skip_promotion_gates:
        if args.evaluation_report is None:
            raise RuntimeError("--evaluation-report is required unless --skip-promotion-gates is set.")
        report = json.loads(args.evaluation_report.read_text(encoding="utf-8"))
        if str(report.get("modelVersion", "")).strip() != args.model_version:
            raise RuntimeError(
                f"Evaluation report modelVersion '{report.get('modelVersion')}' does not match '{args.model_version}'."
            )
        gate_result = evaluate_promotion_gates(report)
        if not gate_result.passed:
            raise RuntimeError("Promotion gates failed: " + "; ".join(gate_result.failures))

    promoted = store.promote(
        args.model_version,
        validate_artifacts=not args.skip_artifact_validation,
        require_artifact_hashes=not args.skip_artifact_validation,
    )
    print(
        json.dumps(
            {
                "modelVersion": promoted.model_version,
                "status": promoted.status,
                "publishedAtUtc": promoted.published_at_utc.isoformat() if promoted.published_at_utc else None,
                "promotionGates": gate_result.to_dict() if gate_result is not None else {"skipped": True},
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()


