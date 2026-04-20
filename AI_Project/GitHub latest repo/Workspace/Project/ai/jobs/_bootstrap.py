from __future__ import annotations

import sys
from pathlib import Path


def bootstrap_service_path() -> Path:
    jobs_dir = Path(__file__).resolve().parent
    service_dir = jobs_dir.parent / "service"
    if str(service_dir) not in sys.path:
        sys.path.insert(0, str(service_dir))
    return service_dir

