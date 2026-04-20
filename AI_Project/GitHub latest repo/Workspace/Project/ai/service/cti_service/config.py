from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _repo_ai_root() -> Path:
    return Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class ServiceSettings:
    service_name: str
    environment: str
    artifacts_root: Path
    snapshot_root: Path
    registry_path: Path
    dataset_registry_path: Path
    feedback_store_path: Path
    default_dataset_version: str | None


def load_settings() -> ServiceSettings:
    ai_root = _repo_ai_root()
    artifacts_root = Path(os.getenv("CTI_SIDECAR_ARTIFACTS_ROOT", str(ai_root / "service" / "artifacts")))
    snapshot_root = Path(os.getenv("CTI_SIDECAR_SNAPSHOT_ROOT", str(ai_root / "data" / "snapshots")))
    registry_path = Path(os.getenv("CTI_SIDECAR_REGISTRY_PATH", str(artifacts_root / "model_registry.json")))
    dataset_registry_path = Path(os.getenv("CTI_SIDECAR_DATASET_REGISTRY_PATH", str(artifacts_root / "dataset_registry.json")))
    feedback_store_path = Path(os.getenv("CTI_SIDECAR_FEEDBACK_PATH", str(artifacts_root / "feedback_events.jsonl")))
    default_dataset_version = os.getenv("CTI_SIDECAR_DATASET_VERSION") or None

    return ServiceSettings(
        service_name=os.getenv("CTI_SIDECAR_SERVICE_NAME", "ioc-ingestion-sidecar"),
        environment=os.getenv("CTI_SIDECAR_ENV", "development"),
        artifacts_root=artifacts_root,
        snapshot_root=snapshot_root,
        registry_path=registry_path,
        dataset_registry_path=dataset_registry_path,
        feedback_store_path=feedback_store_path,
        default_dataset_version=default_dataset_version,
    )
