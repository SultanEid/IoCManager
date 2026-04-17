---
name: contract-sync
description: Use when frontend types, backend DTOs, and AI output schemas must be aligned. Do not use for isolated visual polish.
---

1. Treat backend contracts as explicit and versioned.
2. Ensure TypeScript, API DTOs, and AI outputs use the same field names and enum semantics.
3. Add adapters only when necessary; do not hide contract drift with loose typing.
4. If a contract changes, update tests and documentation.
5. Report every touched contract surface.
