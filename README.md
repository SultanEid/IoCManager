# IOC Manager

IOC Manager is a brownfield cyber operations workbench for IOC management,
scanner workflows, rule distribution, reporting, and AI-assisted security
decisions.

## Active Application

The canonical active product stack is under `Workspace/Project/`:

- Backend: `Workspace/Project/backend`
- Frontend workbench: `Workspace/Project/frontend/workbench`
- AI sidecar: `Workspace/Project/ai/service`
- Project docs: `Workspace/Project/docs`
- Project scripts: `Workspace/Project/scripts`


## Repository Boundaries

`Archive/`, `AI_Project/`, `tmp/`, `Workspace.local-backup-*`, scanner result
folders, screenshots, logs, and other local output are reference or generated
material, not active product roots. See
`Workspace/Project/docs/repository-boundaries.md` for the cleanup and review
boundary.
