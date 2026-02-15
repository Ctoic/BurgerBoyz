# BurgerBoyz Backend (NestJS)

## Setup
1. Create a Supabase Postgres database and copy the connection string.
2. Create `backend/.env` based on `backend/.env.example`.
3. Install dependencies and run migrations:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Run
```bash
npm run start:dev
```

API base: `http://localhost:3001/api`

## Auth
- Admin login: `POST /api/admin/login`
- Cookie: `admin_token` (httpOnly)

## Cash Only
Backend rejects non-cash payments for now.
