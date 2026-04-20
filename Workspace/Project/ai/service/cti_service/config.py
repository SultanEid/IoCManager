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
    action_policy_matrix_path: Path
    snapshot_root: Path
    registry_path: Path
    dataset_registry_path: Path
    feedback_store_path: Path
    default_dataset_version: str | None
    historical_learning_default_top_k: int = 10
    historical_learning_default_lookback_days: int = 90
    historical_learning_decay_half_life_days: float = 45.0


def _env_value(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value.strip()
    return default


def load_settings() -> ServiceSettings:
    ai_root = _repo_ai_root()
    artifacts_root = Path(
        _env_value(
            "IOC_MANAGER_AI_ARTIFACTS_ROOT",
            "CTI_SIDECAR_ARTIFACTS_ROOT",
            default=str(ai_root / "service" / "artifacts"),
        )
    )
    action_policy_matrix_path = Path(
        _env_value(
            "IOC_MANAGER_AI_ACTION_POLICY_MATRIX_PATH",
            "CTI_SIDECAR_ACTION_POLICY_MATRIX_PATH",
            default=str(artifacts_root / "action_policy_matrix.v1.json"),
        )
    )
    snapshot_root = Path(
        _env_value(
            "IOC_MANAGER_AI_SNAPSHOT_ROOT",
            "CTI_SIDECAR_SNAPSHOT_ROOT",
            default=str(ai_root / "data" / "snapshots"),
        )
    )
    registry_path = Path(
        _env_value(
            "IOC_MANAGER_AI_REGISTRY_PATH",
            "CTI_SIDECAR_REGISTRY_PATH",
            default=str(artifacts_root / "model_registry.json"),
        )
    )
    dataset_registry_path = Path(
        _env_value(
            "IOC_MANAGER_AI_DATASET_REGISTRY_PATH",
            "CTI_SIDECAR_DATASET_REGISTRY_PATH",
            default=str(artifacts_root / "dataset_registry.json"),
        )
    )
    feedback_store_path = Path(
        _env_value(
            "IOC_MANAGER_AI_FEEDBACK_PATH",
            "CTI_SIDECAR_FEEDBACK_PATH",
            default=str(artifacts_root / "feedback_events.jsonl"),
        )
    )
    default_dataset_version = _env_value("IOC_MANAGER_AI_DATASET_VERSION", "CTI_SIDECAR_DATASET_VERSION") or None
    historical_learning_default_top_k = int(
        _env_value("IOC_MANAGER_AI_HISTORICAL_DEFAULT_TOP_K", "CTI_SIDECAR_HISTORICAL_DEFAULT_TOP_K", default="10")
    )
    historical_learning_default_lookback_days = int(
        _env_value("IOC_MANAGER_AI_HISTORICAL_LOOKBACK_DAYS", "CTI_SIDECAR_HISTORICAL_LOOKBACK_DAYS", default="90")
    )
    historical_learning_decay_half_life_days = float(
        _env_value(
            "IOC_MANAGER_AI_HISTORICAL_DECAY_HALF_LIFE_DAYS",
            "CTI_SIDECAR_HISTORICAL_DECAY_HALF_LIFE_DAYS",
            default="45",
        )
    )

    return ServiceSettings(
        service_name=_env_value("IOC_MANAGER_AI_SERVICE_NAME", "CTI_SIDECAR_SERVICE_NAME", default="ioc-manager-ai-sidecar"),
        environment=_env_value("IOC_MANAGER_AI_ENV", "CTI_SIDECAR_ENV", default="development"),
        artifacts_root=artifacts_root,
        action_policy_matrix_path=action_policy_matrix_path,
        snapshot_root=snapshot_root,
        registry_path=registry_path,
        dataset_registry_path=dataset_registry_path,
        feedback_store_path=feedback_store_path,
        default_dataset_version=default_dataset_version,
        historical_learning_default_top_k=max(1, min(historical_learning_default_top_k, 100)),
        historical_learning_default_lookback_days=max(1, min(historical_learning_default_lookback_days, 3650)),
        historical_learning_decay_half_life_days=max(1.0, historical_learning_decay_half_life_days),
    )
