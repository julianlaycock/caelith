# Railway Deployment Notes

## Services
- **cheerful-solace** (frontend): Next.js on `www.caelith.tech`
- **caelith-api** (backend): Express via `npx tsx src/backend/server.ts`
- **Postgres**: Internal, `postgres.railway.internal:5432`

## Critical Config

### caelith-api start command
```
npx tsx src/backend/server.ts
```
Do NOT use compiled `dist/` path — tsc output structure differs between local and Railway.
Do NOT run migrations in the start command — they add ~4 min to startup.

### Healthcheck
Currently **disabled**. If re-enabling, set timeout ≥ 600s. 
tsx compilation takes significant time on cold start.

### Migrations
Run manually when needed:
```
railway run npx tsx scripts/migrate.ts
```

### Key env vars (caelith-api)
- `DATABASE_URL` — points to internal Postgres
- `PG_SSL_REJECT_UNAUTHORIZED=false` — required for Railway's self-signed certs
- `ADMIN_PASSWORD` — must be set in production or server exits
- `PORT=3001`

### Key env vars (cheerful-solace)
- `BACKEND_API_REWRITE_TARGET=http://caelith-api.railway.internal:3001/api`
- `NEXT_PUBLIC_API_URL=/api`
- `NEXT_PUBLIC_SSR_API_URL=http://caelith-api.railway.internal:3001/api`

## Lessons Learned
- Railway healthcheck kills deploys that don't respond in time
- `dist/` paths differ between local and Railway builds — don't hardcode
- Missing `ADMIN_PASSWORD` in production = `process.exit(1)`
- SSL cert rejection breaks DB connections on Railway internal network
