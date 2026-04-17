# Detective Frontend

Shadcn-style production frontend for Detective (Indicator of Compromise classification and management).
This app is wired to the ASP.NET backend APIs.

## Routes
- `/auth`
- `/dashboard`
- `/activity`
- `/reports`
- `/analytics/trends`
- `/analytics/stats`
- `/audit`
- `/settings`
- `/snort`
- `/sigma`
- `/yara`
- `/feeds`
- `/servers`
- `/distribution`
- `/credits` (hidden)

## Environment
Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://localhost:7241
```

## Run
```bash
npm install
npm run dev
```

The frontend uses cookie-based authentication against the ASP.NET Identity backend.

## Seeded Login (Backend Seeder)
- Username: `admin`
- Password: `Detective123!`
