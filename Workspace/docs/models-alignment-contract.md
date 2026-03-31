# Models Alignment Contract

This note records how the conceptual MVC `Models` work maps onto the live IOC Manager application.

The goal is to preserve useful concepts without reintroducing discarded architecture.

## Decision Summary

### Keep

- `ErrorViewModel`

### Adapt into the MVC app

- `IOC` -> `IocModel`
- `IOCFile` -> `IocFileModel`
- `Target` -> `TargetModel`
- `Network` -> `NetworkModel`
- `Report` -> `ReportModel`
- `ScanPlan` -> `ScanPlanModel`

### Discard for current implementation

- `Scanner`
- `Scheduler`
- `Sweeper`
- `IOCManager`

## Why

The application already has working runtime layers for:

- scanner execution
- IOC extraction
- persistence
- target discovery
- Azure SQL integration

The teammate files are most useful as conceptual MVC/domain inputs for the UI, not as direct runtime replacements.

## Local MVC Model Rules

- Models must stay free of orchestration logic.
- Models must not contain `Console.WriteLine` workflow behavior.
- Models must reflect the live database and UI needs, not old placeholder pipelines.
- Scanner execution and scheduling stay in services.
- Discovery stays in services.

## Local Model Set

The app now treats these as the core MVC-side models:

- `ErrorViewModel`
- `IocModel`
- `IocFileModel`
- `TargetModel`
- `NetworkModel`
- `ReportModel`
- `ScanPlanModel`

## Mapping Notes

### IOC -> IocModel

Adapted to the live normalized IOC schema:

- base IOC fields
- optional scanner-specific fields
- no validation or matching behavior in the model itself

### IOCFile -> IocFileModel

Retained only as a future grouping/clustering concept. It is no longer tied to CSV import behavior.

### Target -> TargetModel

Aligned to current target inventory:

- single `IPAddress`
- `HostName`
- `Status`
- `TargetOsType`
- `NetworkId`
- `LastSweep`

### Network -> NetworkModel

Aligned to current network inventory:

- `NetworkId`
- `Name`
- `SubNet`

### Report -> ReportModel

Kept as report metadata for future reporting UI and backend features.

### ScanPlan -> ScanPlanModel

Kept as a UI/domain representation of reusable scan configuration.

## Non-Adopted Models

These were intentionally not kept:

- `Scanner`
- `Scheduler`
- `Sweeper`
- `IOCManager`

## Usage Guidance

Use the new `Models` folder for:

- UI-friendly page/domain models
- future server-rendered MVC screen composition
- clean boundaries between entities, DTOs, and page-facing models

Do not use it for:

- scanner execution
- scheduling engines
- discovery orchestration
- database persistence behavior
