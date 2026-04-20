# Dataset Manifests
<!-- scaffold:ai-v0 -->

Metadata-only source manifest placeholders for future ingestion and enrichment.

## Canonical Contract
- Schema: `ai/schemas/dataset-source-manifest.schema.json`
- Key style: `snake_case`
- Scope: template metadata only (no connector logic, no remote pulls, no parser execution in this phase)

## Required Fields
- `source_name`: stable source identifier.
- `source_type`: source class (`external_feed` or internal source classes).
- `location`: source reference with `local_path` and/or `remote_reference`.
- `access_notes`: operational and policy notes required before enabling ingestion.
- `ingestion_mode`: onboarding mode (`deferred_remote_import`, `manual_internal_import`, `internal_export_import`).
- `parser_name`: reserved parser identifier for future import jobs.
- `normalization_target`: intended normalized output contract name.
- `provenance_fields`: canonical provenance keys that imports must preserve exactly.
- `enabled`: feature flag, defaults to `false` in all templates.

## Canonical Provenance Fields
The following ordered list is required in every source manifest:
- `source`
- `key`
- `value`
- `evidence_id`
- `citation_ref`
- `retrieved_at_utc`
- `retrieved_by`
- `record_locator`

## Phase Boundary
This folder intentionally excludes connector/auth implementation. Importers may consume these manifests later, but no active ingestion behavior is introduced in Phase 0.
