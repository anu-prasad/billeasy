# BillEasy — Microservice Backend (MySQL)

The monolith's JSON-file backend (`lib/db.ts` + `app/api/*`) has been replaced by
**5 independent microservices**, each backed by its **own MySQL 8.0 database**.
The Next.js frontend stays as the web app and routes `/api/*` calls to the services
through rewrites (see `next.config.ts`).

## Architecture

```
Browser ──▶ Next.js web app (frontend, port 3200)
                 │  rewrites in next.config.ts
                 ▼
        ┌──────────────────────────────────────────────────┐
        │ /api/auth/*    ─▶ auth-service     (port 4001)   │
        │ /api/account   ─▶ account-service  (port 4002)   │
        │ /api/products  ─▶ product-service  (port 4003)   │
        │ /api/bills     ─▶ bill-service     (port 4004)   │
        │ /api/reports   ─▶ bill-service     (port 4004)   │
        │ /api/staff     ─▶ staff-service    (port 4005)   │
        └──────────────────────────────────────────────────┘

Service-to-service calls (internal /internal/* endpoints):
  auth-service  ──creates account──▶  account-service   (register)
  bill-service  ──reads account────▶  account-service   (GST settings)
  staff-service ──creates login────▶  auth-service      (staff users)

Databases (one per service, files db.sql contain all SQL):
  billeasy_auth     (users, otps)            auth-service
  billeasy_accounts (accounts)               account-service
  billeasy_products (products)               product-service
  billeasy_bills    (bills, bill_items)      bill-service
  billeasy_staff    (staff)                  staff-service
```

Each service shares the SAME `JWT_SECRET` and verifies the `billeasy_token` cookie
set by the auth-service, so every service is independently secure.

## Folder layout (per service)

```
backend/<service>/
  server.js        Express app + route handlers
  db.js            MySQL connection pool (mysql2)
  jwt.js           JWT cookie verification helpers (shared secret)
  db.sql           ALL MySQL commands for this service, ready for `mysql < db.sql`
  .env.example     Copy to .env and adjust credentials
```

## Requirements

- Node.js 20+ (Node 22 ships `fetch` and `--watch` used by `npm run dev`)
- MySQL 8.0 running locally (default `root` on `localhost:3306`, no password —
  override with `MYSQL_PASSWORD`)

## Setup

```bash
# 1. install service dependencies
npm run install:services

# 2a. run the 5 backend services only
npm run services

# 2b. OR run frontend + all services together
npm run dev:all
```

Open http://localhost:3200 and log in with the demo tenant:

- Owner : `demo@billeasy.com` / `demo123`
- Staff : `rahul@freshmart.com` / `staff123`

## Talking to the DB directly

Connect with any MySQL client and run `mysql -u root -p < backend/<service>/db.sql`.
Each `db.sql` includes: `CREATE DATABASE`, `USE`, `CREATE TABLE`, and demo seed data.


1. Remove/reduce per-request Auth DB validation
          ↓
2. Add proper MySQL indexes
          ↓
3. Use TanStack Query
          ↓
4. Fix report SQL aggregation
          ↓
5. Cache Account/GST data
          ↓
6. Add server-side pagination/search
          ↓
7. Optimize MySQL connection pools
          ↓
8. Add Gateway rate limiting
          ↓
9. Production-build Next.js
          ↓
10. Only then consider Redis/VPS