# Legacy Merge Audit

Canonical codebase: `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project`

Removed legacy codebase: `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web`

The legacy MVC app has been removed from the repo. This document remains as a historical extraction map for logic that was ported or intentionally left behind.

The two applications were not synced and should not have remained active for the same behavior surface. The current `Workspace/Project` stack is canonical, with selective extraction of reusable legacy logic already captured below.

## Exact reusable files

| Legacy file | Value | Target location in `Project` | Merge status |
| --- | --- | --- | --- |
| `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Services\ScannerOutputParser.cs` | Raw scanner stdout cleanup, ANSI stripping, JSON object extraction | `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\LegacyScannerEnvelopeParser.cs` | Ported |
| `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Services\TargetDiscoveryService.cs` | CIDR-range discovery flow, DNS enrichment, target normalization | `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\DiscoveryRunWorker.cs` plus `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\DiscoveryObservationProvider.cs` | Ported selectively |
| `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Services\ScanOrchestrator.cs` | Script argument-building for YARA, Sigma, Snort, Suricata | `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\Execution\LegacyScriptScanExecutor.cs` and `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\ScanExecutionDispatcher.cs` | Ported selectively |
| `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Services\IocExtractionService.cs` | Legacy scanner-envelope to IOC extraction rules | `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\LegacyScannerResultExtractor.cs` | Ported selectively |
| `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Data\IocDbContext.cs` | Old Azure SQL table mapping knowledge for `IOC`, `ScanResult`, `Target`, `NETWORK` | `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Infrastructure\Compatibility\LegacyAzure\LegacyAzureCompatibilityReader.cs` | Ported selectively |
| `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Services\EfTargetInventoryRepository.cs` | Old Azure target/network persistence | New compatibility read adapters under `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Infrastructure\Compatibility` | Later |
| `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Services\EfScanRunRepository.cs` | Old Azure scan-result persistence | New compatibility write adapter under `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Infrastructure\Compatibility` | Later |

## Files that should not be merged directly

These should not be copied into `Workspace/Project` as active runtime code:

- `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Program.cs`
- `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Controllers\ScansController.cs`
- `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Controllers\TargetsController.cs`
- `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Controllers\NetworksController.cs`
- `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\src\IocManager.Web\Data\IocDbContext.cs` as the active `Workspace/Project` DbContext

Reason: `Workspace/Project` already has richer domain entities, controllers, scheduling, authentication, and route contracts. Copying the legacy MVC/API surface would create duplicate execution paths.

## Merge order

1. Keep `Workspace/Project` as the only active application.
2. Port compatibility utilities that do not create duplicate runtime behavior.
3. Add compatibility adapters only where the old Azure schema is still needed.
4. Map old Azure-backed modules incrementally into current `Workspace/Project` contracts.
5. Retire the legacy app from the repo once the needed pieces are extracted.

## Completed slices

The compatibility merge now has four clean slices in `Workspace/Project`:

1. Legacy scanner-envelope parsing in `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\LegacyScannerEnvelopeParser.cs`
2. Legacy raw-result extraction in `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\LegacyScannerResultExtractor.cs`
3. Discovery and script-primary execution in `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\DiscoveryObservationProvider.cs` and `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Api\Infrastructure\Execution\LegacyScriptScanExecutor.cs`
4. Read-only Azure compatibility adapters in `C:\Users\xsspe\Desktop\IOC_Manager\Workspace\Project\backend\src\Backend.Infrastructure\Compatibility\LegacyAzure\LegacyAzureCompatibilityReader.cs`

These slices keep `Workspace/Project` as the only active runtime while reusing the useful legacy implementation logic.
