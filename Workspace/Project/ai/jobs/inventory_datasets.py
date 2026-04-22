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

from cti_service.adjudication_dataset_builder import build_dataset_inventory


def parse_args() -> argparse.Namespace:
    ai_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description=(
            "Report staged raw dataset sources, manifest readiness, parser coverage, processed bundles, "
            "and dataset registry state for IoC Manager AI datasets."
        )
    )
    parser.add_argument("--manifests-dir", type=Path, default=ai_root / "datasets" / "manifests")
    parser.add_argument("--raw-root", type=Path, default=ai_root / "datasets" / "raw")
    parser.add_argument("--processed-root", type=Path, default=ai_root / "datasets" / "processed")
    parser.add_argument("--dataset-registry-path", type=Path, default=ai_root / "service" / "artifacts" / "dataset_registry.json")
    parser.add_argument("--output-file", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = build_dataset_inventory(
        manifests_dir=args.manifests_dir,
        raw_root=args.raw_root,
        processed_root=args.processed_root,
        dataset_registry_path=args.dataset_registry_path,
    )
    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
