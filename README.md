# BillEasy — Multi-Tenant POS Billing App (Microservices)

A billing app for small shop owners (POS-style) with multi-tenant support, staff
logins, and an admin console for managing tenant subscriptions. The backend is
built as **5 independent microservices + an API gateway**, each service owning
its **own MySQL 8.0 database**.

**Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 · **Backend:**
Node.js + Express + mysql2 · **Auth:** JWT (jose, HS256) + httpOnly cookie

---

## Features

**Shop owner (POS)**
- New Sale — add items by barcode (camera scan), set qty/price, pay via
  Cash / UPI / Card / Credit
- Bill Preview — print, download as PDF, export via WhatsApp
- Products — full CRUD with price, stock, unit, category (searchable)
- Staff Logins — create/delete staff accounts (login handled by auth-service)
- Account Info — shop logo, name/address, GST toggle + GSTIN + rate, UPI ID,
  default bill footer message, license validity
- Reports — sales summary (total + per payment type) and transactions filtered
  by date range

**Super admin**
- Report/tenant management: all tenants, search, activate / extend / undo-extend /
  suspend / reactivate / soft-delete / force-delete (with full data fan-out)

**Auth**
- Register, login (single active session per user), logout, forgot-password
  with OTP verification, 3 roles (`owner`, `staff`, `admin`)

---

## Architecture

```
Browser ──▶ Next.js web app (port 3200, SSR + rewrites)
                 │  next.config.ts rewrites  /api/*  → gateway
                 ▼
        API Gateway (port 4000, http-proxy, no prefix stripping)
            │ /api/auth/*        ─▶ auth-service    (4001)
            │ /api/account, /api/admin/accounts ─▶ account-service (4002)
            │ /api/products/*    ─▶ product-service (4003)
            │ /api/bills, /api/reports ─▶ bill-service   (4004)
            │ /api/staff/*       ─▶ staff-service   (4005)
            ▼
    5 microservices, each with its own MySQL 8.0 database
```

Service-to-service traffic uses private `/internal/*` endpoints (not exposed by
the gateway):

| From            | To              | Endpoint                                   | Purpose                          |
| --------------- | --------------- | ------------------------------------------ | -------------------------------- |
| any service     | auth-service    | `POST /internal/users/sessions/validate`   | per-request session check        |
| auth-service    | account-service | `POST /internal/accounts`                  | create shop account on register  |
| bill-service    | account-service | `GET /internal/accounts/:tenantId`         | read GST settings when billing   |
| staff-service   | auth-service    | `POST/DELETE /internal/users`              | create/delete staff login        |
| account-service | all services    | `POST/DELETE /internal/tenant/:tenantId`   | suspend / hard-delete tenant data |

Every authenticated business request therefore costs **2 HTTP hops and 2 DB
round-trips** (one at the service, one at auth-service for session validation).

Each service verifies the shared `billeasy_token` JWT locally, then confirms the
session is still active (not revoked/expired) against the auth-service database.

### Services and databases

| Service            | Port | Database             | Mounts                                               |
| ------------------ | ---- | -------------------- | ---------------------------------------------------- |
| auth-service       | 4001 | `billeasy_auth`      | `/api/auth`, `/internal/users`, `/internal/tenant`   |
| account-service    | 4002 | `billeasy_accounts`  | `/api/account`, `/api/admin/accounts`, `/internal/accounts` |
| product-service    | 4003 | `billeasy_products`  | `/api/products`, `/internal/tenant`                  |
| bill-service       | 4004 | `billeasy_bills`     | `/api/bills`, `/api/reports`, `/internal/tenant`     |
| staff-service      | 4005 | `billeasy_staff`     | `/api/staff`, `/internal/tenant`                     |
| gateway-service    | 4000 | —                    | reverse-proxies `/api/*`                             |

Each service folder contains a `db.sql` with `CREATE DATABASE`, `CREATE TABLE`
and demo seed data.

---

## Tech stack

| Layer          | Tech                                                                 |
| -------------- | -------------------------------------------------------------------- |
| Frontend       | Next.js 16.3.5 (App Router + middleware), React 19.2.8, TypeScript 5 |
| Styling        | Tailwind CSS 4 + custom CSS in `app/globals.css`                     |
| API gateway    | Node.js + Express 4 + `http-proxy` (port 4000)                       |
| Microservices  | Node.js + Express 4 + `mysql2` pooling                               |
| Database       | MySQL 8.0 (one schema per service)                                   |
| Auth           | `jose` JWT (HS256, 7-day), httpOnly `billeasy_token` cookie, sessions table |
| Utils          | `html2canvas` + `jspdf` (PDF), `html5-qrcode` (barcode camera scan)  |

---

## Getting started

### Prerequisites

- Node.js 20+ (Node 22 ships `fetch` and `--watch`)
- MySQL 8.0 running locally

### 1. Install

```bash
npm install          # frontend
npm run install:services   # installs all 6 backend services
```

### 2. Set up databases

Import each `db.sql` once:

```bash
mysql -u root -p < backend/auth-service/db.sql
mysql -u root -p < backend/account-service/db.sql
mysql -u root -p < backend/product-service/db.sql
mysql -u root -p < backend/bill-service/db.sql
mysql -u root -p < backend/staff-service/db.sql
```

### 3. Configure environment variables

Copy `.env.example` → `.env` in the repo root and in every service. Defaults:

- Repo root — `GATEWAY_URL=http://localhost:4000`, `JWT_SECRET=...`
- Each service — `PORT`, `MYSQL_*`, `JWT_SECRET`, plus outbound URLs
  (`AUTH_SERVICE_URL`, `ACCOUNT_SERVICE_URL`, etc. — see `backend/<service>/.env.example`)
- Gateway — `GATEWAY_PORT`, the five `*_SERVICE_URL` targets

All services **must share the same `JWT_SECRET`**.

### 4. Run

```bash
npm run dev:all     # frontend + gateway + all 5 services (concurrently)
```

Or separately: `npm run services` (backends only) / `npm run dev` (frontend only).

Open **http://localhost:3200** and log in:

| Role  | Email                 | Password  |
| ----- | --------------------- | --------- |
| Owner | `demo@billeasy.com`   | `demo123` |
| Staff | `rahul@freshmart.com` | `staff123`|
| Admin | `admin@billeasy.com`  | `admin123`|

> OTP for password reset is printed to the auth-service console (no email
> provider configured).

---

## Repository layout

```
├── app/                  Next.js pages (auth pages + (dashboard)/ group)
│   └── (dashboard)/       new-sale, bill-preview, products, staff, reports,
│                          account, settings, tenants, layout
├── components/            Sidebar, BarcodeScanner
├── lib/                   auth.ts (JWT sign/verify), apiClient.ts (401 handling),
│                          clientAuth.ts (client-side role from cookie)
├── proxy.ts               Next.js middleware — route protection / role guard
├── next.config.ts         rewrites /api/* → gateway
└── backend/
    ├── gateway-service/   reverse proxy router
    ├── auth-service/      users, sessions, OTPs, register/login
    ├── account-service/   shop account, GST/license, tenant lifecycle management
    ├── product-service/   product CRUD
    ├── bill-service/      bills + items, sales reports
    └── staff-service/     staff membership (login lives in auth-service)
```

Each service follows: `src/config/env.js` → `src/middleware/` → `src/routes/` →
`src/controllers/` → `src/services/` → `src/repositories/` → `src/db/index.js`.

---

## Security model & current caveats

- JWT is stored in an **httpOnly, SameSite=Lax cookie** (`billeasy_token`, 7-day TTL).
- One **active session per user** — logging in on a new device revokes the old one.
- Admin operations use a short-lived **service token** (10 min, `role: admin`) sent as
  the cookie to other services' `/internal/tenant/*` endpoints.
- **Known limitations** (worth fixing before production):
  - Passwords are stored **plaintext** in `users` and `staff` tables.
  - A **single shared `JWT_SECRET`** across all services — one leak compromises all.
  - `/internal/*` endpoints are **not authenticated** (auth-service sessions/validate,
    account-service internal GET/POST) and rely on the network boundary.
  - Add a network ACL / internal-only vhost / auth token on internal routes.
  - Registration does not roll back the account-service row if session issuance fails.
  - Bill-report aggregation loads all bills into memory (fine at small scale).

---

## Hosting on cPanel — expected capacity

cPanel shared hosting runs Node.js under **Passenger** with a per-account CPU/RAM cap
(typically ~1–2 vCPU and ~2–4 GB RAM shared across your account, Node memory often
capped at 512 MB–1 GB). MySQL is usually shared pool on the same box, and there is
**no Redis, load balancer, or horizontal scaling** on typical shared plans.

### What the app runs at idle

| Process                | Rough memory |
| ---------------------- | ------------ |
| Next.js (SSR + proxy)  | 250–400 MB   |
| 5 services + gateway   | 450–700 MB   |
| MySQL (5 schemas)      | 300–600 MB   |
| **Total idle**         | **~1–1.7 GB** |

On the cheapest shared plan (~1 GB usable) you are already at the limit before any
users log in — so memory, **not CPU**, is what will bottleneck you first.

### Realistic concurrent users ("actively using it at the same time")

| Scenario                    | Concurrent active users | Notes                                  |
| --------------------------- | ----------------------- | -------------------------------------- |
| Comfortable (no slow-down)  | **15–30** (≈ 15–30 small shops at their peak) | POS traffic is bursty — a few requests per user per minute |
| Acceptable (some latency)   | **50–80**               | Still functional, slower during rush   |
| Ceiling on shared cPanel    | ~100+                   | Memory/MySQL connections and CPU throttle bite |

Each request already does 2 HTTP hops + 2 DB queries (local JWT verify + remote
session validation), which roughly halves effective throughput versus a monolith.
Shared-plan MySQL also limits concurrent connections (~150), so many parallel
keep-alive sockets from the browsers add up quickly.

### How to get more out of cPanel (before buying a VPS)

1. **Drop the per-request remote session check** — the biggest single win. Verify the
   JWT locally with a short TTL (or cache session validation in memory for ~60 s) and
   remove the `POST /internal/users/sessions/validate` call from
   `src/middleware/auth.middleware.js`. Halves DB load and removes a hop.
2. **Cache the GST/account lookup** in bill-service (`fetchAccount`) with an in-memory
   TTL cache instead of hitting account-service every bill.
3. Bump the Passenger memory limit and ensure keep-alive + gzip at the Apache/Nginx layer.
4. Serve a `npm run build` + `next start` standalone build, static assets via Nginx.
5. If you outgrow it: move to a **VPS (2 GB+)** — same code, just more Node/DB headroom —
   or a container platform where each service can scale independently.

---

## Scripts

| Command                 | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Next.js dev server (port 3200)                 |
| `npm run services`      | all 6 backend services concurrently            |
| `npm run dev:all`       | frontend + all backends together               |
| `npm run install:services` | installs dependencies for all 6 services    |
| `npm run lint`          | ESLint the frontend                            |
| `npm run build`         | production build of the frontend               |