# Validation

**Last updated:** 2026-04-26

This document defines the fast PR gate and fuller validation path for the
canonical IOC Manager stack under `Workspace/Project/`.

The commands below avoid local `.env` files and must not print secret values.
Use active roots by default; see `Workspace/Project/docs/repository-boundaries.md`
for archive and generated-output policy.

## Fast PR Gate

Run these checks for pull requests and focused implementation work.

### Repository boundary

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Workspace/Project/scripts/check-repository-boundaries.ps1
```

### Frontend scope wording guard

```powershell
Push-Location Workspace/Project/frontend/workbench
npm run scope:check
Pop-Location
```

### Backend restore, build, and tests

The backend currently uses the MSBuild workload resolver workaround documented
in `Workspace/Project/backend/README.md`.

```powershell
Push-Location Workspace/Project/backend
dotnet restore Backend.sln -p:MSBuildEnableWorkloadResolver=false /m:1
dotnet build Backend.sln -c Debug --no-restore -p:MSBuildEnableWorkloadResolver=false /m:1
dotnet test tests/Backend.Tests/Backend.Tests.csproj -c Debug --no-build -p:MSBuildEnableWorkloadResolver=false
Pop-Location
```

### Frontend lint, typecheck, and unit tests

```powershell
Push-Location Workspace/Project/frontend/workbench
npm ci
npm run lint
npm run typecheck
npm run test:run
Pop-Location
```

### AI sidecar tests

Use Python 3.11 or newer.

```powershell
Push-Location Workspace/Project/ai/service
python -m pip install -e ".[dev]"
pytest
Pop-Location
```

### Secret scan

CI runs a lightweight tracked-file pattern scan across active roots and planning
docs. For local work, prefer a dedicated scanner such as gitleaks when
available, then run the lightweight fallback:

```powershell
$patterns = @(
  'sk-[a-zA-Z0-9]{20,}',
  'sk_live_[a-zA-Z0-9]+',
  'sk_test_[a-zA-Z0-9]+',
  'ghp_[a-zA-Z0-9]{36}',
  'gho_[a-zA-Z0-9]{36}',
  'glpat-[a-zA-Z0-9_-]+',
  'AKIA[A-Z0-9]{16}',
  'xox[baprs]-[a-zA-Z0-9-]+',
  ('-----BEGIN.*' + 'PRIVATE' + ' KEY'),
  'eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.'
)
$files = git ls-files AGENTS.md README.md .planning Workspace/README.md Workspace/Project
foreach ($pattern in $patterns) {
  $matches = $files | ForEach-Object { Select-String -Path $_ -Pattern $pattern -ErrorAction SilentlyContinue }
  if ($matches) {
    $matches | ForEach-Object { "{0}:{1}" -f $_.Path, $_.LineNumber }
    throw "Potential secret pattern detected."
  }
}
```

## Full Validation Path

Run the full path before major merges, releases, or changes that touch shared
contracts, auth, scanner execution, persistence, deployment, or the workbench
gateway.

1. Run the full fast PR gate above.
2. Run frontend coverage if the change touches frontend behavior:

   ```powershell
   Push-Location Workspace/Project/frontend/workbench
   npm run test:coverage
   Pop-Location
   ```

3. Run frontend E2E where route behavior, auth flow, shell behavior, or
   operator workflows changed:

   ```powershell
   Push-Location Workspace/Project/frontend/workbench
   npm run test:e2e
   Pop-Location
   ```

4. Start the AI sidecar locally only for manual or integration checks that need
   sidecar-dependent endpoints:

   ```powershell
   Push-Location Workspace/Project/ai/service
   python -m pip install -e ".[dev]"
   uvicorn decision_service.main:app --host 127.0.0.1 --port 8100
   Pop-Location
   ```

5. Start the backend with configured non-secret local settings when manual API
   smoke testing is required:

   ```powershell
   Push-Location Workspace/Project/backend
   dotnet run --project src/Backend.Api --no-build --no-restore
   Pop-Location
   ```

## CI Behavior

`.github/workflows/validation.yml` implements the fast gate:

- repository-boundary guard
- backend restore/build/test with the MSBuild workaround
- frontend install, lint, typecheck, and unit tests
- AI sidecar install and pytest
- lightweight active-root secret scan

CI must not require local `.env` files. If a test requires external secrets, it
does not belong in the fast gate.

## Troubleshooting

- Keep `-p:MSBuildEnableWorkloadResolver=false /m:1` on backend restore and
  build commands until the backend README removes that workaround.
- If frontend E2E fails because browsers are missing, run Playwright browser
  installation in that environment before `npm run test:e2e`.
- If the boundary guard fails, inspect the reported paths and decide whether to
  untrack, move, or explicitly target them. Do not delete user material by
  default.
