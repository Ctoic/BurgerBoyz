# Open Source burgers ;)

## Local development
- Frontend expects `VITE_API_URL` (defaults to `http://localhost:3001/api`).
- Backend is in `backend/` (NestJS + Prisma).

## Security
- Keep real secrets only in `.env` files (ignored by git).
- Keep placeholders only in `.env.example` files.
- Validate examples before push:
  - `npm run check:env-example`

## Deployment docs
- Railway backend production guide: `docs/railway-backend-deployment-guide.md`
- Deployment UML diagram: `docs/deployment-uml.puml`
