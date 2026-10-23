# Swiss Properties — Property Management System (rebuild)

A rebuild of the app running at https://swissproperties.xyz. The original source code
wasn't available, so this was reconstructed from the live UI and APIs. See
[docs/REBUILD_SPEC.md](docs/REBUILD_SPEC.md) for everything that was observed.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 + PostgreSQL · NextAuth 4 (email + password)

## What's built

| Area | Status |
| --- | --- |
| Login, workspace picker (Swiss Properties / Swiss Homes), roles | ✅ |
| Dashboard (KPIs, alerts, revenue chart, top arrears, recent activity) | ✅ |
| Properties & units (list, filters, create, edit, delete) | ✅ |
| Tenants (list, search, sort, create, edit, portal password) | ✅ |
| Leases (monthly / yearly, payment schedule, edit terms, renew, terminate) | ✅ |
| Payments (month groups, filters, mark paid, partial payments, bulk paid, receipts) | ✅ |
| Collections (aging buckets, risk levels, reminder log) | ✅ |
| Calendar, Accounting P&L (rent income), Audit log, Users, Account, Notifications, Search | ✅ |
| CSV export (tenants, leases, payments) | ✅ |
| Contracts / Ejari, Reports PDF + builder, Messages & bulk email, e-signatures, Stripe, 2FA, file uploads, CSV import, expenses & journal | ⏳ phase 2 |

## Run locally

```bash
npm install
cp .env.example .env          # then fill in NEXTAUTH_SECRET and SEED_ADMIN_PASSWORD
npm run db:dev                # local Postgres, leave it running; copy its DATABASE_URL into .env
npm run db:push               # create tables in the LOCAL database
npm run db:seed               # admin user + made-up sample data
npm run dev                   # http://localhost:3000
```

## Going live — read before touching production

1. **Get the live database details** from the server's `.env` (`DATABASE_URL`). Find out whether
   it's PostgreSQL or MySQL. If it's MySQL, change `provider` in `prisma/schema.prisma` and swap
   `@prisma/adapter-pg` for `@prisma/adapter-mariadb` in `src/lib/db.ts`.
2. **Take a backup** of the live database, restore it into a copy, and point `.env` at the copy.
3. Run `npx prisma db pull --print` against the copy and compare it with `prisma/schema.prisma`.
   Adjust this schema to match the real one. **Never run `db push` or `migrate` against production.**
4. Copy the uploads folder from the server (property pictures, Emirates ID copies).
5. Existing staff passwords must be bcrypt hashes for login to work. Check with `db pull` what the
   live app used.
6. Deploy to a **staging subdomain** first (`npm run build && npm start` behind nginx), compare
   with the live site, then switch over.
7. Schedule `POST /api/cron/notifications` hourly with header `Authorization: Bearer $CRON_SECRET`.
   It marks leases past their end date as expired (freeing their units) and creates alerts.
   The first run catches up on every lease that has already ended, so try it on the database copy first.
