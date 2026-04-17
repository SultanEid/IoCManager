# Detective Rebuild Run Setup

## 1) Backend (ASP.NET)
Path: `IoCManager-main/IoCManager.Mvc`

```bash
dotnet restore
dotnet run
```

## 2) Frontend (Next.js)
Path: `detective-frontend`

```bash
cp .env.example .env.local
npm install
npm run dev
```

Default API base URL in `.env.example` is `https://localhost:7241`.

## Seeded Credentials
- Email: `admin@detective.local`
- Password: `Detective123!`
