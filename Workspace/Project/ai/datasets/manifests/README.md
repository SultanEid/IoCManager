# Dataset Manifests

Source manifests for dataset ingestion and enrichment staging.

## Canonical Contract
- Schema: `ai/schemas/dataset-source-manifest.schema.json`
- Key style: `snake_case`
- Scope: source metadata, staging policy, and parser dispatch (no connector logic, no remote pulls)

## Required Fields
- `source_name`: stable source identifier.
- `source_type`: source class (`external_feed` or internal source classes).
- `location`: source reference with `local_path` and/or `remote_reference`.
- `access_notes`: operational and policy notes required before enabling ingestion.
- `ingestion_mode`: onboarding mode (`deferred_remote_import`, `manual_internal_import`, `internal_export_import`).
- `parser_name`: reserved parser identifier for future import jobs.
- `normalization_target`: intended normalized output contract name.
- `provenance_fields`: canonical provenance keys that imports must preserve exactly.
- `enabled`: feature flag. Supported first-wave local sources may be enabled when staged files exist.

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
This folder intentionally excludes connector/auth implementation. Importers may consume these manifests later, but only local/manual staging is in scope for the current dataset build flow.
