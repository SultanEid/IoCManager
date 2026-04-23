from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from _bootstrap import bootstrap_service_path
except ModuleNotFoundError:
    import importlib.util

    _bootstrap_path = Path(__file__).with_name("_bootstrap.py")
    _bootstrap_spec = importlib.util.spec_from_file_location("_bootstrap", _bootstrap_path)
    if _bootstrap_spec is None or _bootstrap_spec.loader is None:
        raise
    _bootstrap_module = importlib.util.module_from_spec(_bootstrap_spec)
    _bootstrap_spec.loader.exec_module(_bootstrap_module)
    bootstrap_service_path = _bootstrap_module.bootstrap_service_path

bootstrap_service_path()

from decision_service.decision_dataset_builder import (
    DatasetBuildConfig,
    build_decision_dataset,
    register_dataset_build,
)


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    project_root = ai_root.parent
    artifacts_root = ai_root / "service" / "artifacts"

    parser = argparse.ArgumentParser(
        description=(
            "Build decision datasets by ingesting manifests, fixture scenarios, and imported rows, "
            "then producing canonical/task JSONL outputs and leakage-safe splits."
        )
    )
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--manifests-dir", type=Path, default=ai_root / "datasets" / "manifests")
    parser.add_argument("--fixtures-dir", type=Path, default=ai_root / "fixtures")
    parser.add_argument("--imports-root", type=Path, default=project_root)
    parser.add_argument("--output-root", type=Path, default=ai_root / "datasets" / "processed")
    parser.add_argument("--dataset-registry-path", type=Path, default=artifacts_root / "dataset_registry.json")
    parser.add_argument("--split-train", type=float, default=0.80)
    parser.add_argument("--split-validation", type=float, default=0.10)
    parser.add_argument("--split-test", type=float, default=0.10)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--include-disabled-manifests", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = build_decision_dataset(
        DatasetBuildConfig(
            dataset_version=args.dataset_version,
            manifests_dir=args.manifests_dir,
            fixtures_dir=args.fixtures_dir,
            imports_root=args.imports_root,
            output_root=args.output_root,
            split_train_ratio=args.split_train,
            split_validation_ratio=args.split_validation,
            split_test_ratio=args.split_test,
            seed=args.seed,
            include_disabled_manifests=args.include_disabled_manifests,
        )
    )
    registry_result = register_dataset_build(
        dataset_registry_path=args.dataset_registry_path,
        dataset_version=args.dataset_version,
        snapshot_manifest_path=Path(result["snapshotManifestPath"]),
        source_files=result["snapshotFiles"],
        notes="Persisted by build_decision_dataset job.",
    )
    result["registry"] = registry_result
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()


