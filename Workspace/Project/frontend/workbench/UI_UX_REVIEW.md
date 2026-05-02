# UI/UX Production Review

Date: 2026-05-02  
Scope: active browser assessment of the local Workbench app at `http://127.0.0.1:3000`  
Branch observed: `Mohammed/v0.7`

This file replaces the previous UI/UX findings file.

## Executive Verdict

The app is meaningfully more coherent than the earlier pass. Dashboard, Alerts, Agents, Reports, Settings, and the scanner areas now feel like one SOC workbench instead of separate experiments. The first-screen dashboard is finally operationally useful: posture, active pressure, next actions, detection mix, and Power BI are in the right order.

It is not production-clean yet. The biggest remaining issues are interaction density, archive/list scaling, and loading-state polish. The app is usable by someone who already knows the system, but a new analyst would still hit too many dense control surfaces with too many equally weighted actions.

## Assessment Method

- Used the in-app browser through Browser Use.
- Walked the app as an authenticated operator.
- Checked primary routes, loading behavior, control counts, visible text, and console health.
- Used a Vercel-style end-to-end verification lens: page load, UI state, data hydration, and user flow continuity.
- No code changes were made as part of this review.

## Route Evidence

| Route | Result | Evidence |
| --- | --- | --- |
| Dashboard `/overview` | Mostly strong | Hydrates in about 1 second. Shows security posture, active severity counts, indexed cases, targets, detections, reports, next actions, detection mix, recent activity, and Power BI. |
| Alerts `/alerts` | Usable, still busy | Shows 10 cases, status breakdown, filters, table, owner and progress data. 29 buttons and 7 inputs after hydration. |
| Agents Hub `/agents` | Improved | Compact Zira/Aegis launcher is understandable. Diagnostics remain secondary. |
| Zira `/agents/zira` | Good structure, still slightly noisy | Ask, Proposal, Activity, and Guardrails sections are present. 19 buttons and 4 inputs after hydration. |
| Aegis `/agents/aegis` | Better but dense | Create plan, Active plan, and Library model is present. Saved scan-run list still makes the first screen heavy. |
| Scans `/scans` | Good entry point | Run scan and History split is clear. The route is understandable before advanced configuration appears. |
| Scan Plan `/scan-plan` | Major density problem | 161 saved packs render as 816 button targets. This is the worst control-count issue in the app. |
| Reports `/reports` | Stronger than before, archive needs work | Builder is usable. Library shows latest 12 of 39, but opening it creates 166 button targets. |
| IOC Explorer `/ioc-ingestion` | Powerful but overwhelming | Hydrates to 50 loaded findings / 2089 total, with 121 buttons and 109 inputs. This is too much surface area for one page. |
| Servers `/servers` | Functional but admin-heavy | Inventory and discovery actions are visible. 35 buttons and 8 inputs. Needs stronger grouping for repeated subnet/target actions. |
| Settings `/settings` | Improved but still crowded | Owner routing, email delivery, lifecycle, access, scanner fleet, and health are grouped, but 22 buttons and 21 inputs remain high for a settings landing page. |
| Coverage Pain `/coverage-pain-analysis` | Good analytical page | 19 buttons, no inputs, clear analytics purpose. |

Console check: no browser console errors or warnings were captured during the review.

## Findings

### P1 - Scan Plan Library Does Not Scale

The scan plan route renders 161 saved packs with 816 button targets. This is not production-grade. Keyboard navigation, screen-reader traversal, and visual scanning all become exhausting.

Fix:
- Replace the full visible pack list with a paginated/searchable library.
- Show 10-20 packs per page.
- Collapse per-pack actions behind one `More` menu.
- Add filters for scanner family, active/draft, manual/scheduled, and last run state.
- Keep `Create plan` as the primary action, not one of hundreds of controls.

### P1 - IOC Explorer Is Too Dense Once Hydrated

IOC Explorer loads useful data, but after hydration it exposes 121 buttons and 109 input controls. A normalized findings table should feel like a fast investigation surface, not a spreadsheet with every operation exposed at once.

Fix:
- Keep filters visible, but move advanced columns, export options, row actions, and batch operations into a command bar/drawer.
- Use one row action menu instead of repeated visible buttons.
- Add saved filter presets such as `High severity`, `Windows hosts`, `Last 24h`, and `Unreviewed`.
- Keep selected-row actions hidden until rows are selected.

### P1 - Reports Library Still Feels Like A Button Wall

The Reports Builder is now coherent, but the Library tab opens into a dense archive with 166 buttons. Showing the latest 12 is a good cap, but the page admits older snapshots only through direct links or future archive search, which is not enough for production.

Fix:
- Add actual search, type filter, author/source filter, and date range.
- Use compact report rows with one primary `Preview` action and a secondary overflow menu.
- Add pagination or infinite paging.
- Keep the latest 12 as a default view, not the only navigable archive.

### P1 - Loading States Are Too Raw

Most routes briefly show `Checking session...` and then a route-level `Loading ...` state before hydrating. The delay is usually short, but the visible text feels like implementation state rather than product UI.

Fix:
- Replace raw `Checking session...` with an app-shell skeleton that preserves navigation and page layout.
- Use route-specific skeletons for Dashboard, Alerts, Reports, Settings, and Explorer.
- Avoid swapping from full blank text to finished UI; keep the shell stable.
- Add a timeout state only when a route actually fails.

### P2 - Dashboard Is Good, But Power BI Remains Visually Fragile

The native SOC command section is now the right first screen. The Power BI frame is correctly lower on the page, but it remains visually fragile because external embed content controls its own whitespace, sign-in behavior, and internal layout. App-side cropping helps but cannot make the embed feel native.

Fix:
- Keep the loading spinner and crop mask.
- Put Power BI behind an `Analytics` disclosure or a dedicated full-width analytics route.
- Show a native summary card above the frame so the dashboard remains useful if Power BI is slow, signed out, or visually mismatched.
- Consider embedding only a focused report page instead of a full Power BI canvas.

### P2 - Alert Detail Navigation Needs Better Feedback

Clicking an alert title routes toward case detail, but the transition still exposes `Loading alert detail...`. On a repeated title list, the user can easily wonder whether they clicked the right duplicate case.

Fix:
- Make the whole case row/card visibly clickable.
- Add a stable case ID and owner/status summary to the row's primary line.
- Use a detail-page skeleton with the selected case ID/title immediately visible.
- Add a breadcrumb back to the filtered alert queue.

### P2 - Alerts Page Uses Useful Counts But Still Has Weak Hierarchy

The Alerts page status cards are cleaner now, and the color-coded Open/Investigating/Resolved/Closed block is a good pattern. The queue still stacks a lot of repeated text: title, scanner, target, owner, severity, status, progress.

Fix:
- Make row structure stricter: title and target first, severity/status chips second, owner/progress third.
- Reduce repeated scanner labels by using a compact scanner chip.
- Add row density modes: `Comfortable` and `Compact`.

### P2 - Settings Landing Page Still Mixes Monitoring And Administration

Settings is better organized, but it combines system health, owner routing, email delivery, access control, scanner fleet, data lifecycle, and operational actions. That is a lot of authority and context on one page.

Fix:
- Split Settings into top-level sections with one visible section at a time.
- Make `System health` read-only by default.
- Put admin writes such as owner directory changes, access control, and lifecycle policy edits behind section-specific edit panels.
- Keep SMTP status visible but do not let it compete with unrelated settings.

### P2 - Aegis First Screen Is Still Heavy

Aegis now has the right conceptual split, but the Create Plan section immediately exposes many saved scan runs. The user has to parse failures, timestamps, counts, and evidence source options before deciding what to do.

Fix:
- Default Create Plan to a concise evidence-source selector.
- Move saved scan run search/results into a side panel or expandable section.
- Show only the top 3 relevant scan runs until the user searches.
- Keep Active Plan and Library visually separate from source selection.

### P2 - Zira Should Hide Operational Metadata Earlier

Zira's tabbed structure is a clear improvement. The page still surfaces details such as operator IDs, autonomous pass state, and backend activity in places where an analyst mainly needs to ask, review, and run.

Fix:
- Keep operator/autonomy metadata in a compact status footer or Guardrails section.
- Treat backend/sidecar failures as actionable states with retry, not as raw system messages.
- Use plain analyst-facing copy for validation, for example `Add more detail to continue` instead of technical gating text.

### P2 - Servers Page Exposes Too Many Repeated Actions

Server inventory is functional, but subnet rows and target rows expose many actions. The page feels like an admin console rather than an operations workspace.

Fix:
- Move per-row secondary actions into overflow menus.
- Add a subnet detail panel for discovery, SSH defaults, and target review.
- Keep one primary action visible per row: `View targets` or `Run discovery`, depending on state.

### P3 - The App Needs A Stronger Global Empty/Error State System

Different pages use different language and density for loading, unavailable data, optional service degradation, and empty states. This makes the app feel less intentional.

Fix:
- Define shared components for `Loading`, `Empty`, `Unavailable`, `Dependency degraded`, and `No permission`.
- Make each state include one clear next action when possible.
- Avoid raw dependency names in front-line UI unless the page is explicitly diagnostic.

### P3 - Some Labels Are Still Internally Oriented

Several labels are correct technically but not ideal for a production SOC operator: `Build: W2 Agents build`, `Optional services are degraded`, `ai_sidecar`, `direct report links and future archive search`.

Fix:
- Reserve build/runtime labels for footer/tooltips/settings health.
- Use operator-facing labels in main workflows.
- Replace future-looking copy with available actions.

## Best Existing Patterns To Keep

- Dashboard security posture is now based on alert risk, which is the correct product logic.
- Dashboard no longer lets Power BI dominate the first screen.
- Alerts status cards with Open/Investigating/Resolved/Closed are a good reusable pattern.
- Color-coding severities and status is working in the right direction.
- Zira and Aegis are conceptually separated in a way that matches user intent.
- Settings owner email directory and SMTP status belong in Settings; this is the right mental model.
- Reports Builder now has a clear sequence: choose type, scope evidence, preview/export.

## Recommended Fix Order

1. Fix Scan Plan library scaling: search, pagination, row action menu.
2. Fix IOC Explorer density: command bar, row action menu, selected-row drawer.
3. Fix Reports Library archive controls: search/filter/pagination and fewer visible buttons.
4. Replace raw auth/session/loading text with route skeletons.
5. Split Settings into stricter read-only health vs admin edit sections.
6. Clean Aegis evidence selection so the first screen is not a scan-run dump.
7. Improve alert row/detail transition and duplicate-case disambiguation.

## Production Readiness Snapshot

| Area | Grade | Notes |
| --- | --- | --- |
| Dashboard | B+ | Strong SOC command direction; Power BI still visually external. |
| Alerts | B | Useful and improving; row hierarchy and detail transition need polish. |
| Agents Hub | B | Good launcher; agent pages need density reduction. |
| Zira | B- | Good tabs; metadata and sidecar states need product copy. |
| Aegis | C+ | Correct model, but source selection is still too heavy. |
| Scans | B- | Clear entry; advanced config should stay progressively disclosed. |
| Scan Plan | D | Functionally present but not scalable at current saved-pack count. |
| Reports | B- | Builder works; Library archive needs real navigation controls. |
| IOC Explorer | C | Powerful but control-heavy and overwhelming. |
| Servers | C+ | Functional admin surface; needs action grouping. |
| Settings | C+ | Improved IA, still too much write surface on one landing page. |
| Overall | B- | Good foundation; main gap is production-grade information architecture at scale. |

## Final Assessment

The app is no longer blocked by obvious visual polish issues. The remaining work is product maturity: scaling lists, reducing visible controls, making loading states feel intentional, and keeping operational pages focused on the next useful action.

The most important cleanup is not color or spacing. It is reducing exposed action count on pages that now have real data volume.
