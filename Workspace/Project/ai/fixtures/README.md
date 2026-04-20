# AI Fixtures
<!-- scaffold:ai-v0 -->

Safe local fixture samples for offline development and tests.

Fixtures are non-production placeholders and must not contain sensitive data.

Scenario packs:
- Family scenarios live under `yara/scenarios`, `sigma/scenarios`, and `snort/scenarios`.
- File naming convention is `{family}-{label}.example.json`.
- Every scenario fixture must include a deterministic `object_metadata.labels` marker like `scenario:<label>`.

Safety constraints:
- Do not include live malware payloads, exploit code, shellcode, or operational C2 instructions.
- Use synthetic identifiers, documentation/test domains, and internal-style references only.
