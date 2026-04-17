# UI Planning Contract

This document is a planning contract for the IOC Manager UI. It is intentionally directional, not final. It defines the initial screen set, the responsibilities of each screen, the expected backend dependencies, and the wiring boundaries between frontend and backend before implementation starts.

Use this together with:

- [report-context-sanitized.md](C:\Users\xsspe\Desktop\IOC_Manager\docs\report-context-sanitized.md)
- [backend-minimal-design.md](C:\Users\xsspe\Desktop\IOC_Manager\docs\backend-minimal-design.md)
- [script-contracts.md](C:\Users\xsspe\Desktop\IOC_Manager\docs\script-contracts.md)

## Product Intent

The UI should act as the operational control plane for the system. It should help an analyst or operator:

- understand current environment health
- discover and manage targets
- manage rules and rule sets
- run scans and inspect scan outcomes
- explore normalized IOC data
- surface high-priority detections as alerts
- build reports for operational and leadership use
- configure repeatable scan plans

The UI should not expose scanner quirks directly unless they help with troubleshooting. Most scanner-specific complexity should remain behind the backend service layer.

## Design Principles

### 1. Operational first

The first version should optimize for operator clarity, not visual novelty. Key questions must be answerable quickly:

- What is happening now
- What changed recently
- Which targets are unhealthy
- Which detections matter most
- What scan should I run next

### 2. One canonical workflow

The UI should reflect the actual runtime pipeline:

1. discover or select targets
2. select scanner or plan
3. execute scan
4. normalize and store results
5. review IOCs
6. escalate high-severity findings into alerts
7. summarize through reports

### 3. Separation of concerns

- Views should present data and actions.
- Controllers should coordinate page actions and API-style responses.
- Services should own orchestration, aggregation, and rule/scan logic.
- Scanner scripts remain execution units only.

### 4. Strong drill-down model

Every overview page should allow drill-down into:

- target
- scan result
- IOC
- alert
- rule

### 5. Threat-informed visualization

The UI should not only show counts. It should help an operator understand where detections sit in terms of adversary cost and operational impact. The Pyramid of Pain view is a good fit for that.

## Initial Information Architecture

The first UI set should include:

1. Dashboard
2. Targets / Servers
3. Rules Management
4. Scans
5. IOCs Explorer
6. Alerts
7. Reports
8. Scan Plans
9. Environment Status / Pyramid of Pain
10. Server Visual Map

These can be top-level pages or grouped under fewer nav categories later, but they should be treated as separate functional modules during planning.

## Shared UI Contract

The following patterns should be common across the application.

### Shared components

- top navigation or side navigation
- environment selector or active scope indicator
- time-range picker
- target filter
- scanner filter
- severity filter
- table search
- drill-down drawer or modal
- status badges
- execution progress/status component

### Shared status language

Use a consistent status vocabulary:

- `Online`
- `Offline`
- `Healthy`
- `Warning`
- `Critical`
- `Succeeded`
- `Failed`
- `No Findings`
- `Running`
- `Queued`

### Shared data behavior

- every table page should support filtering, sorting, and pagination
- every details page should show source, timestamp, and relation links
- all user-triggered actions should show execution state and last result

## Page Contracts

## 1. Dashboard

### Purpose

Provide a high-level operational overview of the environment, recent detections, target health, and scan activity.

### Key questions answered

- How healthy is the environment right now
- Are there urgent detections
- Which scanners are producing the most findings
- Which targets changed state recently

### Primary data dependencies

- `Target`
- `NETWORK`
- `IOC`
- `Yara_Details`
- `Sigma_Details`
- `Snort_Suricata_Details`
- later: `ScanJob`, `ScanResult`, `Alert`

### Key UI blocks

- KPI tiles
  - total targets
  - online targets
  - IOC count by time range
  - high-severity alert count
- recent detections timeline
- findings by scanner
- top affected targets
- recent scans or latest scan outcomes
- quick actions
  - run scan
  - discover targets
  - open alerts

### Notes

The Dashboard should feel like an SOC landing page, closer to Elastic/Wazuh style operational visibility than a generic admin dashboard.

## 2. Targets / Servers

### Purpose

Show the inventory of discovered and managed targets, their current status, enrichment fields, and scan readiness.

### Primary data dependencies

- `Target`
- `NETWORK`
- later: scan history from `ScanResult`

### Key UI blocks

- target table
  - hostname
  - IP address
  - status
  - OS type
  - network segment
  - last sweep
- target details panel
  - recent scans
  - IOC summary
  - related alerts
- actions
  - run scan
  - rescan target
  - edit metadata
  - assign tags or grouping later

### Notes

This page should become the operational inventory view. It should not just mirror raw ping discovery output.

## 3. Rules Management

### Purpose

Provide a controlled interface for viewing, creating, editing, validating, enabling, and organizing rules used by the supported scanners.

### Scope

This page should cover:

- YARA rule files
- Sigma rule files
- Snort rules
- Suricata rules
- later: rule packs, imports, and rule versioning

### Primary backend dependencies

- script-side rule locations and rule manifests
- later: scan-plan rule references
- later: rules metadata persistence if needed

### Key UI blocks

- rules list with scanner grouping
- rule metadata panel
  - rule name
  - scanner type
  - path or origin
  - enabled/disabled
  - last modified
- rule editor area
  - mini IDE/editor
  - validation/lint result
  - test output panel
- import/export actions
- rule-pack management

### Notes

This should behave more like a rules studio than a plain CRUD page. Inspiration here should come from rule-management UIs where testing and validation are first-class, not hidden.

## 4. Scans

### Purpose

Allow operators to launch manual scans, track execution, and inspect normalized results without leaving the app.

### Primary backend dependencies

- scan orchestration services
- `ScanPlan`
- `ScanJob`
- `ScanResult`
- `IOC`

### Key UI blocks

- run scan panel
  - scanner selection
  - target or network selection
  - rule selection
  - scan mode/options
- current execution status
- recent jobs table
- latest results summary
- drill-down to resulting IOCs

### Notes

This page should clearly separate:

- manual one-off scan
- plan-based execution

It should also make failures visible, especially rule/config or connectivity failures.

## 5. IOCs Explorer

### Purpose

Serve as the main analyst workbench for normalized IOC review.

### Primary data dependencies

- `IOC`
- `Yara_Details`
- `Sigma_Details`
- `Snort_Suricata_Details`
- later: `IOCFile`, `Alert`, `ScanResult`

### Key UI blocks

- IOC table with rich filtering
  - scanner type
  - target
  - rule name
  - timestamp
  - severity where available
- detail drawer
  - base IOC fields
  - scanner-specific detail block
  - raw payload view
  - relations to target, scan result, alert
- actions
  - pivot to target
  - pivot to related rule
  - raise or suppress alert later
  - export selected records

### Notes

This page should feel closer to an investigation/explorer surface than a plain report table.

## 6. Alerts

### Purpose

Display prioritized findings that require operator attention.

### Primary data dependencies

- `Alert`
- `IOC`
- later: `User`

### Key UI blocks

- open alerts queue
- severity buckets
- alert details panel
- status workflow
  - new
  - acknowledged
  - in progress
  - resolved
- ownership or assignee later

### Notes

Alerts should not equal all IOCs. They are a smaller operational queue derived from severity or business logic.

## 7. Reports

### Purpose

Generate and manage report outputs for different audiences.

### Initial report categories

- Executive Summary
- Compliance Snapshot
- Detailed IOC Report
- Target Exposure Summary
- Scan Activity Summary

### Primary data dependencies

- `Report`
- `IOC`
- `Target`
- `NETWORK`
- `ScanResult`
- `Alert`

### Key UI blocks

- report type selector
- report parameter form
  - time range
  - target scope
  - scanner scope
  - severity scope
- report preview
- export actions
  - PDF later
  - CSV later
  - Power BI handoff later

### Notes

Reports should be generated views over normalized data, not manually assembled content.

## 8. Scan Plans

### Purpose

Allow users to define reusable scan templates instead of rebuilding the same scan configuration every time.

### Primary data dependencies

- `ScanPlan`
- `Target`
- `NETWORK`
- later: rules metadata

### Key UI blocks

- plans list
- plan editor
  - scanner config
  - target scope
  - rule set
  - schedule later
- run-now action
- last run metadata

### Notes

This page should represent the operational template layer of the system. It is one of the most important pages for long-term workflow maturity.

## 9. Environment Status / Pyramid of Pain

### Purpose

Visualize the environment’s detection posture and the strategic value of current detections.

### Why this page matters

The Pyramid of Pain is useful because it frames detections by how disruptive they are to an adversary. This creates a more meaningful view than raw IOC counts alone.

### Initial mapping idea

Map detections into buckets such as:

- Hash values
- IP addresses
- Domain names
- Network or host artifacts
- Tools
- TTPs

### Key UI blocks

- pyramid visualization
- counts per layer
- trend per layer over time
- click-through to underlying IOCs
- top contributing rules or scanners per layer

### Notes

This page should be treated as an analytical overlay, not just a decorative infographic.

## 10. Server Visual Map

### Purpose

Provide a visually intuitive map of the lab or environment where servers can be inspected as entities and their health or detection state can be explored.

### Primary data dependencies

- `Target`
- `NETWORK`
- `IOC`
- `Alert`
- later: relation data if target links become richer

### Key UI blocks

- topology canvas or card map
- per-node health state
- online/offline marker
- alert marker
- click-through to target details

### Notes

This page should be interactive, not static. It can start simple with cards or node tiles before a fully dynamic network graph is justified.

## Shared Backend Expectations

The UI will later need backend support in these broad areas:

- aggregated dashboard endpoints
- target inventory queries and filters
- scan execution and job status endpoints
- IOC search and detail endpoints
- alert generation and alert workflow endpoints
- report generation endpoints
- scan plan CRUD and execution endpoints
- rules listing, validation, edit, import, export endpoints
- environment posture and pyramid aggregation endpoints

These should be added deliberately as page contracts are implemented, not all at once.

## Suggested Build Order

Recommended implementation order:

1. Dashboard
2. Targets / Servers
3. Scans
4. IOCs Explorer
5. Alerts
6. Scan Plans
7. Reports
8. Rules Management
9. Environment Status / Pyramid of Pain
10. Server Visual Map

Reasoning:

- Dashboard, Targets, Scans, and IOCs Explorer cover the most immediate operational workflow.
- Alerts and Scan Plans unlock real operator efficiency.
- Reports, Rules Management, and posture-heavy views benefit from the earlier foundations.

## Open Questions

These should be resolved before implementation of the corresponding module:

- Should the dashboard be analyst-centric, operator-centric, or mixed
- Should rules be stored only on disk at first, or also have metadata persisted in the DB
- Should alerts be generated synchronously during IOC ingestion or asynchronously later
- What is the exact relationship between `ScanJob`, `ScanResult`, and IOC drill-down views
- How much of Power BI is embedded versus linked out
- Should the server visual map be topology-driven or a simpler status board first

## Implementation Guardrails

- Do not let page structure drift away from the real backend pipeline.
- Do not expose raw script internals as primary UX unless in troubleshooting mode.
- Do not design the rules UI as simple file CRUD only.
- Do not make every IOC an alert.
- Do not treat the report document as an exact frontend specification.

## External Design Signals

Useful external patterns to keep in mind:

- Elastic Security shows the value of separating dashboard, rules, alerts, and investigations into clear operational surfaces.
- Elastic’s rules UI shows that import/export, bulk actions, and rule prerequisites should be first-class concerns in a rules page.
- Wazuh’s ruleset test tool is a strong signal that rule validation/testing belongs in the UI for custom rule work.
- Security Onion’s dashboard approach shows the value of prebuilt dashboards, time filtering, and click-through hunting workflows.

These are inspirations, not templates to copy blindly.
