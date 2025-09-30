# ISPSUPER (Backend)
Backend Node + TypeScript + Express + Prisma (PostgreSQL).

## Variables de entorno
Ver `.env.example`. En Railway: agrega `DATABASE_URL`, `PORT` (8080), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`.

## Comandos
- `npm install`
- `npm run build`
- `npm run start`
- `npm run prisma:deploy` (aplica migraciones en producción)
- `npm run seed` (carga admin y datos demo)

## Endpoints
- `GET /` → API funcionando 🚀
- `POST /api/auth/login` → { email, password } → { token }
- `GET /api/admin/commerces`
- `POST /api/admin/commerces`
- `GET /api/admin/clients?dni=&name=`
- `POST /api/admin/clients/import` → array JSON
- `POST /api/caja/ventas`
- `GET /api/caja/ventas?commerceId=&startDate=&endDate=`

### Deploy en Railway (resumen)
1. Crear proyecto → Postgres + Servicio Node.
2. En el servicio Node: Variables: `DATABASE_URL` (de Postgres), `PORT=8080`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`.
3. Deploy; luego corre `npm run prisma:deploy` y `npm run seed` desde “Run Command”.
# ISPSUPER