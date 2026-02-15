# Railway Backend Deployment Guide (Production)

This guide is tailored for this repo:
- Backend: NestJS in `backend/`
- DB: Supabase Postgres
- Frontend: Netlify

## 1. Prerequisites

1. Railway account and project.
2. Supabase project and Postgres credentials.
3. GitHub repo connected to Railway.
4. Netlify frontend URL ready (for CORS), e.g. `https://your-site.netlify.app`.

## 2. Important Production Rules

1. Never use `prisma migrate dev` in production.
2. Use `npx prisma migrate deploy` in production.
3. Set a strong `JWT_SECRET`.
4. Set `COOKIE_SECURE=true` under HTTPS.
5. Do not leave default admin seed credentials.
6. Keep `DATABASE_URL` and `DIRECT_URL` configured and correct.
7. Keep health checks enabled (`/api/health`) for safer deploys.

## 3. Create Railway Service

1. In Railway, create a new service from your GitHub repo.
2. Set **Root Directory** to `backend` (monorepo requirement).
3. In service settings, set:
   - Build Command: `npm ci && npm run prisma:generate && npm run build`
   - Start Command: `npm run start:prod`
4. Set Healthcheck Path to `/api/health`.
5. Confirm Railway **Root Directory** is `backend`.
6. Optionally set Watch Paths to `backend/**` so frontend-only commits do not trigger backend deploys.

## 4. Configure Environment Variables

Set these in Railway service variables:

### Required

- `DATABASE_URL`  
Use a Supabase Postgres connection string for app runtime.

- `DIRECT_URL`  
Use a Supabase connection string that works for Prisma migrations.

- `JWT_SECRET`  
Generate a long random secret.

- `FRONTEND_ORIGIN`  
Set your Netlify origin(s), comma-separated if multiple.
Example:  
`https://your-site.netlify.app,https://your-custom-domain.com`

- `COOKIE_SECURE`  
`true`

- `COOKIE_SAME_SITE`  
`none` for Netlify (different domain) + Railway API cookie auth.

### Strongly recommended

- `JWT_EXPIRES_IN`  
Example: `7d`

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

### Optional

- `COOKIE_DOMAIN`  
Leave unset unless you intentionally need a specific cookie domain.

- `PORT`  
Do not hardcode. Railway injects it automatically and this backend already listens on `process.env.PORT`.

## 5. Supabase Connection Notes (Important)

1. Use SSL-enabled connection strings (`sslmode=require`).
2. For persistent backend containers, direct or session-style pooled connections are common.
3. Prisma migrations rely on `DIRECT_URL`; keep it stable and valid.
4. If you change DB passwords/strings in Supabase, update Railway variables immediately.

## 6. Deploy and Migrate

After first successful Railway build/start:

1. Open Railway service shell (or run a one-off command in deploy workflow).
2. Run:

```bash
npx prisma migrate deploy
```

3. Run seed once for admin bootstrap/settings/initial zone:

```bash
npm run prisma:seed
```

This project’s seed script:
- creates/updates admin user
- ensures store settings exist
- creates a default Manchester delivery zone if missing

## 7. Verify Production

Run these checks after deployment:

1. Health endpoint:

```bash
curl https://<your-railway-domain>/api/health
```

Expected:

```json
{"status":"ok"}
```

2. Admin login works (seeded credentials).
3. Customer signup/login works (cookie auth).
4. Orders can be created/read.
5. Netlify frontend can call backend with credentials (no CORS errors).

## 8. Netlify Frontend Alignment

On Netlify, set:

- `VITE_API_URL=https://<your-railway-domain>/api`

Then redeploy frontend.

## 9. Safe Rollout Checklist

1. Deploy backend to a staging Railway environment first.
2. Run `npx prisma migrate deploy` in staging.
3. Smoke test API and auth.
4. Promote same process to production.
5. Keep DB backups/snapshots enabled in Supabase.

## 10. Common Issues and Fixes

### 1) CORS or cookie not sent
- Confirm `FRONTEND_ORIGIN` exactly matches Netlify origin.
- Confirm frontend fetch uses `credentials: "include"` (already set in this repo).
- Confirm `COOKIE_SECURE=true` in HTTPS production.
- For cross-domain frontend/backend, set `COOKIE_SAME_SITE=none`.

### 2) Prisma cannot connect
- Re-check `DATABASE_URL` and `DIRECT_URL`.
- Confirm Supabase project is running and accepts your connection type.
- Ensure SSL params are present when required.

### 3) Migration failures on deploy
- Use `npx prisma migrate deploy`, not `migrate dev`.
- Check migration history consistency in `backend/prisma/migrations`.

### 4) Railway deploy unhealthy
- Ensure app binds to `PORT` (already implemented in `backend/src/main.ts`).
- Verify health check path is `/api/health`.

### 5) `bun install --frozen-lockfile` error on Railway
- Cause: Railway is building the repo root (frontend) and auto-detecting `bun.lockb`.
- Fix:
  1. Open Railway service settings.
  2. Set **Root Directory** to `backend`.
  3. Set build/start explicitly:
     - Build: `npm ci && npm run prisma:generate && npm run build`
     - Start: `npm run start:prod`
  4. Redeploy.

### 6) `Cannot find module '/app/dist/main.js'`
- Cause: Nest build in this project outputs `dist/src/main.js`.
- Fix:
  1. Set start command to `npm run start:prod`.
  2. Or explicitly use `node dist/src/main.js`.
  3. Redeploy.

## 11. Official References

- Railway healthchecks: https://docs.railway.com/reference/healthchecks
- Railway build/start commands: https://docs.railway.com/reference/build-and-start-commands
- Railway start command override: https://docs.railway.com/deployments/start-command
- Railway monorepo/root directory: https://docs.railway.com/guides/monorepo
- Supabase Postgres connection strings: https://supabase.com/docs/reference/postgres/connection-strings
- Prisma production migrations (`migrate deploy`): https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production

---

## Exact Commands Used by This Backend

From `backend/package.json`:

- Build: `npm run build`
- Generate Prisma client: `npm run prisma:generate`
- Seed: `npm run prisma:seed`

Recommended Railway build/start:

- Build: `npm ci && npm run prisma:generate && npm run build`
- Start: `npm run start:prod`
