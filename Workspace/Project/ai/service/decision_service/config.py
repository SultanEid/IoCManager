from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _repo_ai_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_local_env(ai_root: Path) -> None:
    for env_path in (ai_root / "service" / ".env", ai_root / ".env"):
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            normalized_key = key.strip()
            if not normalized_key or os.getenv(normalized_key):
                continue
            os.environ[normalized_key] = value.strip().strip('"').strip("'")


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
    max_score_batch_items: int = 100
    max_expensive_request_body_bytes: int = 1_048_576
    enable_http_model_evaluation: bool = True
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_planner_model: str = "gpt-5.4-mini"
    openai_timeout_seconds: float = 25.0


def _env_value(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value.strip()
    return default


def _env_int(*names: str, default: int) -> int:
    value = _env_value(*names, default=str(default))
    try:
        return int(value or default)
    except ValueError as exc:
        joined = ", ".join(names)
        raise ValueError(f"Invalid integer environment value for one of: {joined}") from exc


def _env_bool(*names: str, default: bool) -> bool:
    value = _env_value(*names)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    joined = ", ".join(names)
    raise ValueError(f"Invalid boolean environment value for one of: {joined}")


def _default_http_model_evaluation_enabled(environment: str) -> bool:
    return environment.strip().lower() in {"development", "dev", "local", "test"}


def load_settings() -> ServiceSettings:
    ai_root = _repo_ai_root()
    _load_local_env(ai_root)
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
    environment = _env_value("IOC_MANAGER_AI_ENV", "CTI_SIDECAR_ENV", default="development")
    historical_learning_default_top_k = _env_int(
        "IOC_MANAGER_AI_HISTORICAL_DEFAULT_TOP_K", "CTI_SIDECAR_HISTORICAL_DEFAULT_TOP_K", default=10
    )
    historical_learning_default_lookback_days = _env_int(
        "IOC_MANAGER_AI_HISTORICAL_LOOKBACK_DAYS", "CTI_SIDECAR_HISTORICAL_LOOKBACK_DAYS", default=90
    )
    historical_learning_decay_half_life_days = float(
        _env_value(
            "IOC_MANAGER_AI_HISTORICAL_DECAY_HALF_LIFE_DAYS",
            "CTI_SIDECAR_HISTORICAL_DECAY_HALF_LIFE_DAYS",
            default="45",
        )
    )
    openai_api_key = _env_value("OPENAI_API_KEY", "IOC_MANAGER_OPENAI_API_KEY")
    openai_base_url = _env_value("OPENAI_BASE_URL", "IOC_MANAGER_OPENAI_BASE_URL", default="https://api.openai.com/v1")
    openai_planner_model = _env_value(
        "IOC_MANAGER_AI_SCAN_ANALYST_MODEL",
        "IOC_MANAGER_OPENAI_MODEL",
        default="gpt-5.4-mini",
    )
    openai_timeout_seconds = float(
        _env_value("IOC_MANAGER_OPENAI_TIMEOUT_SECONDS", "OPENAI_TIMEOUT_SECONDS", default="25")
    )
    max_score_batch_items = _env_int(
        "IOC_MANAGER_AI_MAX_SCORE_BATCH_ITEMS",
        "CTI_SIDECAR_MAX_SCORE_BATCH_ITEMS",
        default=100,
    )
    max_expensive_request_body_bytes = _env_int(
        "IOC_MANAGER_AI_MAX_EXPENSIVE_REQUEST_BODY_BYTES",
        "CTI_SIDECAR_MAX_EXPENSIVE_REQUEST_BODY_BYTES",
        default=1_048_576,
    )
    enable_http_model_evaluation = _env_bool(
        "IOC_MANAGER_AI_ENABLE_HTTP_MODEL_EVALUATION",
        "CTI_SIDECAR_ENABLE_HTTP_MODEL_EVALUATION",
        default=_default_http_model_evaluation_enabled(environment or "development"),
    )

    return ServiceSettings(
        service_name=_env_value("IOC_MANAGER_AI_SERVICE_NAME", "CTI_SIDECAR_SERVICE_NAME", default="ioc-manager-ai-sidecar"),
        environment=environment or "development",
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
        max_score_batch_items=max(1, min(max_score_batch_items, 1000)),
        max_expensive_request_body_bytes=max(1024, min(max_expensive_request_body_bytes, 10_485_760)),
        enable_http_model_evaluation=enable_http_model_evaluation,
        openai_api_key=openai_api_key,
        openai_base_url=openai_base_url.rstrip("/"),
        openai_planner_model=openai_planner_model,
        openai_timeout_seconds=max(5.0, openai_timeout_seconds),
    )
