from __future__ import annotations

import argparse
import json
from pathlib import Path

from _bootstrap import bootstrap_service_path

bootstrap_service_path()

from decision_service.registry import ModelRegistryStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Promote a candidate model to active status in the registry.")
    parser.add_argument("--registry-path", type=Path, required=True)
    parser.add_argument("--model-version", required=True)
    parser.add_argument(
        "--skip-artifact-validation",
        action="store_true",
        help="Promote without checking registered artifact hashes. Intended only for legacy local registries.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    store = ModelRegistryStore(args.registry_path)
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
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()


