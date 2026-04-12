# Legacy Merge Audit

Canonical codebase: `C:\Users\xsspe\Desktop\IOC_Manager\Project`

Reference-only legacy codebase: `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web`

The two applications are not synced. They should not both remain active for the same behavior surface. The current `Project` stack should stay canonical, with selective extraction of reusable legacy logic.

## Exact reusable files

| Legacy file | Value | Target location in `Project` | Merge status |
| --- | --- | --- | --- |
| `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Services\ScannerOutputParser.cs` | Raw scanner stdout cleanup, ANSI stripping, JSON object extraction | `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\LegacyScannerEnvelopeParser.cs` | Ported |
| `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Services\TargetDiscoveryService.cs` | CIDR-range discovery flow, DNS enrichment, target normalization | `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\DiscoveryRunWorker.cs` plus `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\DiscoveryObservationProvider.cs` | Ported selectively |
| `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Services\ScanOrchestrator.cs` | Script argument-building for YARA, Sigma, Snort, Suricata | `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\Execution\LegacyScriptScanExecutor.cs` and `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\ScanExecutionDispatcher.cs` | Ported selectively |
| `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Services\IocExtractionService.cs` | Legacy scanner-envelope to IOC extraction rules | `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\LegacyScannerResultExtractor.cs` | Ported selectively |
| `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Data\IocDbContext.cs` | Old Azure SQL table mapping knowledge for `IOC`, `ScanResult`, `Target`, `NETWORK` | `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Infrastructure\Compatibility\LegacyAzure\LegacyAzureCompatibilityReader.cs` | Ported selectively |
| `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Services\EfTargetInventoryRepository.cs` | Old Azure target/network persistence | New compatibility read adapters under `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Infrastructure\Compatibility` | Later |
| `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Services\EfScanRunRepository.cs` | Old Azure scan-result persistence | New compatibility write adapter under `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Infrastructure\Compatibility` | Later |

## Files that should not be merged directly

These should not be copied into `Project` as active runtime code:

- `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Program.cs`
- `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Controllers\ScansController.cs`
- `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Controllers\TargetsController.cs`
- `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Controllers\NetworksController.cs`
- `C:\Users\xsspe\Desktop\IOC_Manager\src\IocManager.Web\Data\IocDbContext.cs` as the active `Project` DbContext

Reason: `Project` already has richer domain entities, controllers, scheduling, authentication, and route contracts. Copying the legacy MVC/API surface would create duplicate execution paths.

## Merge order

1. Keep `Project` as the only active application.
2. Port compatibility utilities that do not create duplicate runtime behavior.
3. Add compatibility adapters only where the old Azure schema is still needed.
4. Map old Azure-backed modules incrementally into current `Project` contracts.
5. Retire the legacy app from active use once the needed pieces are extracted.

## Completed slices

The compatibility merge now has four clean slices in `Project`:

1. Legacy scanner-envelope parsing in `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\LegacyScannerEnvelopeParser.cs`
2. Legacy raw-result extraction in `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\LegacyScannerResultExtractor.cs`
3. Discovery and script-primary execution in `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\DiscoveryObservationProvider.cs` and `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Api\Infrastructure\Execution\LegacyScriptScanExecutor.cs`
4. Read-only Azure compatibility adapters in `C:\Users\xsspe\Desktop\IOC_Manager\Project\backend\src\Backend.Infrastructure\Compatibility\LegacyAzure\LegacyAzureCompatibilityReader.cs`

These slices keep `Project` as the only active runtime while reusing the useful legacy implementation logic.
