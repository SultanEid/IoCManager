from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DatasetRegistryModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DatasetRegistryEntry(DatasetRegistryModel):
    dataset_version: str
    created_at_utc: datetime
    manifest_path: str
    manifest_hash: str
    source_files: dict[str, str] = Field(default_factory=dict)
    notes: str | None = None


class DatasetRegistryDocument(DatasetRegistryModel):
    schema_version: int = 1
    updated_at_utc: datetime
    entries: list[DatasetRegistryEntry] = Field(default_factory=list)


class DatasetRegistryStore:
    def __init__(self, path: Path) -> None:
        self._path = path

    @property
    def path(self) -> Path:
        return self._path

    def load(self) -> DatasetRegistryDocument:
        if not self._path.exists():
            return DatasetRegistryDocument(updated_at_utc=_utcnow(), entries=[])
        payload = json.loads(self._path.read_text(encoding="utf-8"))
        return DatasetRegistryDocument.model_validate(payload)

    def save(self, document: DatasetRegistryDocument) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        updated = document.model_copy(update={"updated_at_utc": _utcnow()})
        self._path.write_text(updated.model_dump_json(indent=2), encoding="utf-8")

    def upsert(self, entry: DatasetRegistryEntry) -> DatasetRegistryDocument:
        document = self.load()
        replaced = False
        entries: list[DatasetRegistryEntry] = []
        for item in document.entries:
            if item.dataset_version == entry.dataset_version:
                entries.append(entry)
                replaced = True
            else:
                entries.append(item)
        if not replaced:
            entries.append(entry)
        self.save(document.model_copy(update={"entries": entries}))
        return self.load()

    def get_by_version(self, dataset_version: str) -> DatasetRegistryEntry | None:
        document = self.load()
        for entry in document.entries:
            if entry.dataset_version == dataset_version:
                return entry
        return None

    def get_latest(self) -> DatasetRegistryEntry | None:
        document = self.load()
        if not document.entries:
            return None
        return sorted(document.entries, key=lambda item: item.created_at_utc)[-1]
