# Report Context

This note captures useful engineering context from the archived project report while deliberately excluding personal information and academic metadata. Treat it as design input, not a fixed specification.

## Core Problem

The report frames the system as a lightweight control plane for multi-scanner IOC operations:

- centralize IOC and rule management
- discover and track reachable servers
- distribute scanner rules to target hosts
- trigger scans and collect results
- normalize heterogeneous outputs into one data model
- present detections through a single dashboard/reporting surface

This aligns well with the current codebase direction.

## Stable Ideas Worth Keeping

### Scanner scope

The report consistently treats these as the main supported engines:

- YARA for file-based detection
- Sigma for log/event detection
- Snort for network detection

The report also mentions Loki in several places, but that appears inconsistent with the current implementation and should not be treated as a required scanner.

### Discovery and orchestration model

The useful operational model is:

- discover hosts with ICMP sweep
- store discovered targets in the database
- distribute rules and command payloads over SSH/SCP
- run scans remotely
- collect result files or outputs centrally
- normalize detections into a shared schema for querying and visualization

This is compatible with the current `ioc_mgr` execution model.

### Functional themes that still make sense

- IOC ingestion and normalization
- target discovery and status tracking
- rule distribution
- centralized collection of scanner results
- filtering/search by scanner, server, time, status
- export/report generation

These are good product pillars even if the exact implementation changes.

## Requirements to Carry Forward Carefully

### Discovery

The report assumes:

- ICMP sweep over a user-defined range
- storing host reachability results
- discovered servers can later receive scanner rules

Useful takeaway:

- discovery should feed a target inventory
- discovery is not just a one-time ping output; it is part of the operational workflow

### Result normalization

The report expects different scanners to land in a common internal model. That is still correct. The current backend already follows this pattern for IOC persistence.

### Database intent

The report clearly separates:

- inventory and orchestration tables
- IOC/result tables
- alert/report/dashboard-facing query data

That separation is still the right direction even if the exact table names evolve.

## Parts That Are Not Reliable Enough To Adopt Directly

### Broad schema ambition

The report proposes a much broader schema and object model than the current working system, including entities such as:

- sweeper
- scheduler
- scan plan
- scan job
- report
- alert
- user/access control

These are useful backlog signals, but not trustworthy as-is for direct implementation. They should be re-designed from the live code and actual workflow rather than copied.

### Placeholder implementation chapter

The implementation chapter is mostly a template/placeholder and not a reliable description of the shipped system. It should not drive engineering decisions.

### UI-heavy assumptions

The dashboard/reporting/UI sections are useful for feature ideas, but they are high level. They are not detailed enough to act as frontend specs without refinement.

### Tooling drift

The report references a mixed stack that includes .NET, Python, Bash, PowerShell, and SSH/HTTP integrations. The current working implementation is more specifically:

- ASP.NET backend
- PowerShell orchestration
- Azure SQL persistence
- Windows host plus `ioc_mgr` relay model

Keep the report's stack discussion as directional only.

## Current Alignment With The Live System

The live codebase already matches several report themes:

- centralized backend orchestration
- remote execution on `ioc_mgr`
- YARA, Sigma, Snort, and Suricata handling
- normalized persistence into Azure SQL
- target discovery with enrichment and target inventory storage

Main gaps versus report vision:

- no mature scan planning model yet
- no full alerting subsystem yet
- no RBAC/auth implementation in the current backend
- no finalized reporting module yet
- dashboard/UI is still separate from the backend workflow decisions

## Practical Backlog Signals From The Report

If the report is used as planning input, the most credible next layers are:

1. refine target inventory and network grouping
2. formalize scan plan / scan scheduling
3. add alert generation on high-priority detections
4. add report/export endpoints from normalized IOC data
5. add auth/RBAC only after scanner and data workflows stabilize

## Guidance

Use the report for:

- product intent
- workflow framing
- terminology
- backlog ideas

Do not use it as authority for:

- exact schema
- exact class model
- exact implemented behavior
- finished UI requirements
- finished performance claims
