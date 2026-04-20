Use plan mode first. Before implementing, inspect the current routes, components, services, entities, DTOs, background jobs, gateway layer, mocks, and docs relevant to this task and propose a short plan. Then implement in small, high-quality steps.

Hard constraints:

Turn this product back into an IoC Manager aligned to the PDF, not a full CTI platform.
Keep ASP.NET on the backend.
Migrate persistence to MS SQL / EF Core SQL Server.
Power BI will be used for charts/visual analytics.
AI is deferred; do not expand AI scope right now.
Keep the unique design identity and keep using shadcn/ui.
Remove light mode entirely and make the UI dark-only.
Remove mock data and fake operational state from normal mode.
Replace all placeholder real names or fake person names with neutral role labels like Analyst, Admin, IT Operator, or system-owned labels.
Prefer honest empty, loading, degraded, and error states over invented data.
Do not add graph analytics, campaign reasoning, or broad CTI features.
Lean hard into the PDF scope: IoC ingestion, rule management, server discovery, rule distribution, detection collection, dashboard, reporting, search, RBAC, audit, retention. IoC.pdf will be in the folder.
Keep changes incremental, test-backed, and production-minded for a lab/prototype environment.
At the end, summarize what changed, what remains, and any contract gaps.