# Workspace

This workspace contains the current IOC Manager implementation artifacts needed for the pipeline:

- `Project`
  - current canonical IOC Manager application stack
  - merged backend, frontend, AI sidecar, and supporting docs
- `scripts`
  - PowerShell scanner and discovery scripts used by the application
- `docs`
  - project design and scanner contract notes

## Notes

- The legacy `src/IocManager.Web` application has been removed from the repo.
- Use the `Workspace/Project` stack as the only active application.
- `appsettings.json` and development settings are sanitized. Replace local secrets and machine-specific paths before running the app.
- The scanner scripts are intended to run against the VMware lab topology and the `ioc_mgr` relay host.
- Backend solution entry point: `Workspace/Project/backend/Backend.sln`.
