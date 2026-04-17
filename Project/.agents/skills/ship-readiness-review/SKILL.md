---
name: ship-readiness-review
description: Use before merge or deployment to review changed files, validation status, startup path, mock-data leakage, and product-scope regressions. Do not use for initial implementation.
---

1. Review only what changed.
2. Verify product scope still matches IoC operations, not CTI-platform drift.
3. Verify no fake operational data leaks into normal mode.
4. Verify startup and health-check instructions still work.
5. Summarize:
   - what changed
   - what was validated
   - what remains risky
   - what should not ship yet
