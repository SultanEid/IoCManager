FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    IOC_MANAGER_AI_ENV=production \
    IOC_MANAGER_AI_ARTIFACTS_ROOT=/app/service/artifacts \
    IOC_MANAGER_AI_SNAPSHOT_ROOT=/app/datasets/processed \
    IOC_MANAGER_AI_REGISTRY_PATH=/app/service/artifacts/model_registry.json \
    IOC_MANAGER_AI_DATASET_REGISTRY_PATH=/app/service/artifacts/dataset_registry.json \
    IOC_MANAGER_AI_FEEDBACK_PATH=/app/service/artifacts/feedback_events.jsonl

WORKDIR /app/service

COPY pyproject.toml requirements.lock.txt README.md ./
COPY decision_service ./decision_service
COPY artifacts ./artifacts

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -e . -c requirements.lock.txt

EXPOSE 8100

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8100/livez', timeout=2).read()"

CMD ["python", "-m", "uvicorn", "decision_service.main:app", "--host", "0.0.0.0", "--port", "8100", "--proxy-headers"]
