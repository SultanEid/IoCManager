---
name: backend-startup-smoke
description: Use for backend startup failures, restore/build issues, health checks, dependency-down behavior, local bring-up, and smoke tests. Do not use for frontend UX work.
---

1. Goal: API boots cleanly with a documented path.
2. Optional dependencies must fail gracefully, especially the AI sidecar.
3. Add or fix health checks for live and ready.
4. Surface missing configuration clearly.
5. Prefer the smallest production-grade fix.
6. After changes, run build/test/smoke commands and report exact failures.
