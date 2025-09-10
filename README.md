# QR Order POS Monorepo

A minimal QR ordering and table management system for restaurants.  This monorepo uses **pnpm** workspaces with TypeScript across the stack.

## Getting Started

```bash
pnpm i
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

Apps run on suggested ports:
- customer: `5173`
- staff: `5174`
- kds: `5175`
- server API: `3000`

## Scripts
- `pnpm dev` – start server and all apps with Vite.
- `pnpm build` – build all packages and apps.
- `pnpm test` – run unit tests with Vitest.
- `pnpm e2e` – run Playwright end‑to‑end tests.
- `pnpm prisma:migrate` – run Prisma migrations (SQLite dev / PostgreSQL prod).
- `pnpm prisma:seed` – seed database with demo data and QR URLs.

## Environment
Copy `.env.example` to `.env` and adjust as needed.

```ini
PORT=3000
DATABASE_URL="file:./dev.db"
PRINTER_ENABLED=false
EASYPaisa_API_KEY=
JAZZCASH_API_KEY=
```

## Packages
- `packages/types` – Shared TypeScript types & Zod schemas.
- `packages/api-client` – Type‑safe API client.
- `packages/ui` – Tailwind‑styled web components.

## Apps
- `apps/customer` – customer PWA for table ordering and payment.
- `apps/staff` – staff dashboard.
- `apps/kds` – kitchen display system.

## Server
Express + WebSocket API with Prisma ORM.  See `server/`.

## Testing
Vitest is used for unit tests and Playwright for end‑to‑end tests.  Example scenarios are included under `tests/` directories.

## Printing
When `PRINTER_ENABLED=true` and a printer is configured, tickets and receipts are printed via ESC/POS.  Otherwise, printable HTML is produced.
