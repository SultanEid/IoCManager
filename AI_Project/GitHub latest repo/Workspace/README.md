# Workspace

This workspace contains the current IOC Manager implementation artifacts needed for the pipeline:

- `src/IocManager.Web`
  - ASP.NET Core MVC-structured web application
  - scan orchestration, IOC parsing, EF Core persistence, and target discovery
- `scripts`
  - PowerShell scanner and discovery scripts used by the application
- `docs`
  - project design and scanner contract notes

## Notes

- The MVC application currently serves API endpoints only.
- `appsettings.json` is sanitized. Replace the database password and local SSH key path before running the app.
- The scanner scripts are intended to run against the VMware lab topology and the `ioc_mgr` relay host.
- Build the app from `Workspace/src/IocManager.Web/IocManager.Web.csproj`.
