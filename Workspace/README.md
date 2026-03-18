# Workspace

This workspace contains the current IOC Manager implementation artifacts needed for the pipeline:

- `backend/IocManager.Api`
  - ASP.NET Core MVC-structured backend
  - scan orchestration, IOC parsing, EF Core persistence, target discovery
- `scripts`
  - PowerShell scanner and discovery scripts used by the backend
- `docs`
  - project design and scanner contract notes

## Notes

- The backend is structured with MVC controllers, but it currently serves API endpoints only.
- `appsettings.json` is sanitized. Replace the database password and local SSH key path before running the app.
- The scanner scripts are intended to run against the VMware lab topology and the `ioc_mgr` relay host.
- Build the backend from `Workspace/backend/IocManager.Api/IocManager.Api.csproj`.
