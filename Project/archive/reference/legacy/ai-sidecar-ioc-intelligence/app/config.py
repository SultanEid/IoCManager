from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    service_name: str = "ioc-intelligence-service"
    environment: str = "development"
    model_dir: Path = Path("artifacts")
    feedback_db_path: Path = Path("artifacts/feedback.sqlite3")
    model_bundle_path: Path = Path("artifacts/model_bundle.joblib")
    model_card_path: Path = Path("artifacts/model_card.json")
    thresholds_path: Path = Path("artifacts/thresholds.json")
    enable_feedback_learning: bool = True
    default_model_version: str = "v1-recall-first"
    uncertainty_floor: float = 0.05
    uncertainty_ceiling: float = 0.40
    calibration_temperature: float = 0.70
    policy_config_path: Path = Path("artifacts/policy_config.json")


def load_settings() -> Settings:
    model_dir = Path(os.getenv("IOC_INTEL_MODEL_DIR", "artifacts"))
    return Settings(
        environment=os.getenv("IOC_INTEL_ENV", "development"),
        model_dir=model_dir,
        feedback_db_path=Path(os.getenv("IOC_INTEL_FEEDBACK_DB", str(model_dir / "feedback.sqlite3"))),
        model_bundle_path=Path(os.getenv("IOC_INTEL_MODEL_BUNDLE", str(model_dir / "model_bundle.joblib"))),
        model_card_path=Path(os.getenv("IOC_INTEL_MODEL_CARD", str(model_dir / "model_card.json"))),
        thresholds_path=Path(os.getenv("IOC_INTEL_THRESHOLDS", str(model_dir / "thresholds.json"))),
        enable_feedback_learning=os.getenv("IOC_INTEL_ENABLE_FEEDBACK", "true").lower() == "true",
        default_model_version=os.getenv("IOC_INTEL_MODEL_VERSION", "v1-recall-first"),
        uncertainty_floor=float(os.getenv("IOC_INTEL_UNCERTAINTY_FLOOR", "0.05")),
        uncertainty_ceiling=float(os.getenv("IOC_INTEL_UNCERTAINTY_CEILING", "0.40")),
        calibration_temperature=float(os.getenv("IOC_INTEL_TEMPERATURE", "0.70")),
        policy_config_path=Path(os.getenv("IOC_INTEL_POLICY_CONFIG", str(model_dir / "policy_config.json"))),
    )
