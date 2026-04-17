# Lab Seeding Payloads

This folder intentionally contains only narrow, human-readable payload files and notes.

Design rules:
- no generic copy-and-run engine
- no arbitrary command manifest execution
- no remote self-delete behavior
- payloads are staged and invoked explicitly

Current payload families live under:
- `payloads/windows`
- `payloads/linux`

Typical flow:
1. Copy a specific payload to `ioc_mgr`.
2. Copy it from `ioc_mgr` to the target.
3. Run it with a short explicit command.
4. Trigger the scanner through the MVC backend.
