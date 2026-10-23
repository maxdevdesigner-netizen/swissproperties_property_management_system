# Swiss Properties — Property Management System (rebuild)

A rebuild of the app running at https://swissproperties.xyz. The original source code
wasn't available, so this was reconstructed from the live UI and APIs. See
[docs/REBUILD_SPEC.md](docs/REBUILD_SPEC.md) for everything that was observed.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 + PostgreSQL · NextAuth 4 (email + password, optional 2FA) · Nodemailer (SMTP)

## What's built

| Area | Status |
| --- | --- |
| Login, workspace picker (Swiss Properties / Swiss Homes), roles | ✅ |
| Password reset by email, two-factor sign-in (authenticator app) | ✅ |
| Dashboard (KPIs, alerts, revenue chart, top arrears, recent activity) | ✅ |
| Properties & units (list, filters, create, edit, delete) | ✅ |
| Tenants (list, search, sort, create, edit, portal password, Emirates ID copy link) | ✅ |
| Leases (monthly / yearly, payment schedule, edit terms, renew, terminate) | ✅ |
| Payments (month groups, filters, mark paid, partial payments, bulk paid, receipts) | ✅ |
| Collections (aging buckets, risk levels, payment reminder emails) | ✅ |
| Calendar, Accounting P&L (rent income), Audit log, Users, Account, Notifications, Search | ✅ |
| CSV export (tenants, leases, payments) | ✅ |
| Existing uploaded files (property pictures, Emirates ID copies) at their live URLs | ✅ |
| Contracts / Ejari, Reports PDF + builder, Messages & bulk email, e-signatures, Stripe, new file uploads, CSV import, expenses & journal, tenant portal | ⏳ phase 2 |

## Run locally

```bash
npm install
cp .env.example .env          # then fill in NEXTAUTH_SECRET and SEED_ADMIN_PASSWORD
npm run db:dev                # local Postgres, leave it running; copy its DATABASE_URL into .env
npm run db:push               # create tables in the LOCAL database
npm run db:seed               # admin user + made-up sample data
npm run dev                   # http://localhost:3000
```

Before pushing, run the same checks as CI (`.github/workflows/ci.yml`):

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Going live — read before touching production

1. **Get the live database details** from the server's `.env` (`DATABASE_URL`). Find out whether
   it's PostgreSQL or MySQL. If it's MySQL, change `provider` in `prisma/schema.prisma` and swap
   `@prisma/adapter-pg` for `@prisma/adapter-mariadb` in `src/lib/db.ts`. Receipt numbering
   (`nextReceiptNumber` in `src/app/actions/payments.ts`) also uses a PostgreSQL lock.
2. **Take a backup** of the live database, restore it into a copy, and point `.env` at the copy.
3. Run `npx prisma db pull --print` against the copy and compare it with `prisma/schema.prisma`.
   Adjust this schema to match the real one. **Never run `db push` or `migrate` against production.**
   Check the 2FA column in particular: it's `User.twoFactorSecret` here (base32, as authenticator
   apps use). If the live column has another name, add `@map`; if the live app encrypted it, users
   who had 2FA on need an admin to reset it (Users page) and set it up again.
4. Copy the uploads folder from the server (property pictures, Emirates ID copies) to a folder
   **outside** the app, e.g. `/var/lib/swiss-pms/uploads`, and set `UPLOADS_DIR` to it. Files are
   served at `/api/documents/serve/<file name>`, the URL the live app stored in the database.
   Several live pictures already return 404, most likely lost when a redeploy replaced the app folder.
5. Existing staff passwords must be bcrypt hashes for login to work. Check with `db pull` what the
   live app used.
6. Set `SMTP_*` and `EMAIL_FROM` (see `.env.example`) to the live app's email provider, and
   `NEXTAUTH_URL` to the public `https://` address: password-reset links are built from it.
   Without SMTP settings, "Forgot password?" tells people to ask an admin and reminders are only logged.
7. Deploy to a **staging subdomain** first (`npm run build && npm start` behind nginx), compare
   with the live site, then switch over.
8. Optionally schedule `POST /api/cron/notifications` hourly with header `Authorization: Bearer $CRON_SECRET`.
   The notification bell already refreshes alerts (at most every 5 minutes) as staff move between pages;
   the cron only matters for keeping alerts current when nobody is signed in.
