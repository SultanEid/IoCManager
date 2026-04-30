# IoC Manager Frontend

Operational IoC Manager UI built with Next.js + TypeScript + Tailwind + shadcn/ui.

## Scope

- Separate app at `frontend/workbench`
- ASP.NET backend integration via JWT (`/api/auth/token` + Bearer)
- Deterministic mock provider for design/testing
- Optional ASP.NET live mode without changing frontend contracts

## Canonical Routes

- `/auth`
- `/overview`
- `/queue`
- `/alerts`
- `/alerts/[alertId]`
- `/rules`
- `/rules/review`
- `/rules/simulation`
- `/rules/canary-rollouts`
- `/rules/rollback-history`
- `/servers`
- `/servers/subnets`
- `/servers/asset-groups`
- `/servers/scanner-fleet`
- `/servers/servers/[serverId]`
- `/distribution`
- `/ioc-ingestion`
- `/ioc-ingestion/feed-explorer`
- `/results-ingestion`
- `/reporting`
- `/settings`

## Compatibility Aliases

Legacy slugs are retained for one release cycle and redirect to canonical IoC Manager routes:
`/cases`, `/cases/*`, `/matches`, `/investigations`, `/graph-relationships`, `/operations`, `/operations/*`, `/deployments`, `/detection-studio`, `/detection-studio/*`, `/rules-studio`, `/rules-studio/*`, `/ingestion-feeds`, `/ingestion-feeds/*`, `/threat-intel`, `/reports-ingestion`, `/coverage`, `/coverage/*`, `/coverage-pain-analysis`, `/ioc-registry`, `/ioc-registry/*`, `/reports`, `/admin`, `/settings-admin`.

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://localhost:7244
# Set to 1 to use ASP.NET gateway instead of frontend mock provider
NEXT_PUBLIC_USE_ASPNET_GATEWAY=0
```

See the shared env reference: [Environment Reference](../../docs/environment-reference.md).

## Commands

```bash
npm run dev
npm run lint
npm run scope:check
npm run typecheck
npm run test:run
npm run build
```

`npm test` and `npm run test:run` run the clean validation lane: lint plus TypeScript. The old Vitest lane is retired for this repo because it was not reliable enough for active validation. Use `npm run test:e2e` only when a Playwright browser pass is needed and no competing Next dev server is holding the project lock.

## Architecture

- `src/shared/api`: typed fetch client + zod runtime schemas
- `src/shared/auth`: session lifecycle + role parsing from JWT claims
- `src/shared/gateway`: `AspNetGateway` + `AugmentedGateway`
- `src/components/workbench`: shell, command palette, timeline, operations panels
- `src/app/(workbench)`: route surfaces

## Notes

- Admin orchestration actions are role-gated in UI (`Admin` role).
- Mock mode uses deterministic scenario packs and local workflow transitions.
- Legacy graph and investigation surfaces are intentionally removed from active IoC Manager UX.
