# Workspace

This workspace contains the current IOC Manager implementation artifacts needed for the pipeline.

`Workspace/Project` is the canonical active application stack. Start there for product work.

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

## Active Entry Points

- Backend solution: `Workspace/Project/backend/Backend.sln`
- Backend setup: `Workspace/Project/backend/README.md`
- Frontend workbench: `Workspace/Project/frontend/workbench`
- AI sidecar package: `Workspace/Project/ai/service`
- Project docs: `Workspace/Project/docs`
- Project scripts: `Workspace/Project/scripts`

## Boundaries and Validation

- Repository boundary policy: `Workspace/Project/docs/repository-boundaries.md`
- Fast and full validation commands: `Workspace/Project/docs/validation.md`

Keep detailed command lists in the validation document so this workspace guide
stays focused on orientation.
