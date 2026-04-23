# Raw Dataset Staging

Manual local staging root for dataset imports.

Phase 1 expected layout:
- `ai/datasets/raw/malwarebazaar/`
- `ai/datasets/raw/yaraify/`
- `ai/datasets/raw/threatfox/`
- `ai/datasets/raw/urlhaus/`
- `ai/datasets/raw/sigmahq/`
- `ai/datasets/raw/snort-community/`
- `ai/datasets/raw/et-open-suricata/`
- `ai/datasets/raw/internal-clean-baselines/`
- `ai/datasets/raw/internal-allowlists/`

Rules:
- stage metadata exports only; do not store binaries or live malware samples here
- preserve provider record IDs, timestamps, URLs, and other provenance anchors
- keep files local/manual; this phase does not add remote retrieval or connector auth
- official Sigma/Snort/Suricata staging is produced by `ai/jobs/stage_reliable_source_exports.py`
