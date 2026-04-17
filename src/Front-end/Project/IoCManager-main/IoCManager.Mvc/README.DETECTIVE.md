# Detective API

ASP.NET Core API with Identity cookie authentication and SQLite persistence.

## Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/visitors?range=7d|30d|90d`
- `GET /api/dashboard/sections`
- `GET /api/workspace/panels`
- `GET /api/customizer/state`
- `GET /api/system/health`

## Seeded Login
- Email: `admin@detective.local`
- Password: `Detective123!`

## Run
```bash
dotnet restore
dotnet run
```

Database files are created automatically on first run (`detective.dev.db` in Development).
