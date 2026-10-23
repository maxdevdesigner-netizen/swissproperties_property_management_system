# Swiss Properties PMS — Rebuild Spec

Reconstructed on 2026-10-23 by walking through the live app at https://swissproperties.xyz
as the admin user (read-only: nothing was created, edited or deleted). The original source
code was not available, so everything below is inferred from the UI, the JSON APIs and the
compiled client bundles. Server-side business rules (emails, cron jobs, Stripe webhooks,
dunning logic) are best guesses and need checking against the real behaviour.

## 1. Stack observed

| Layer | Live app | Rebuild |
| --- | --- | --- |
| Framework | Next.js App Router, Turbopack build | Next.js 16 App Router + TypeScript |
| Auth | NextAuth (`/api/auth/session`, credentials email + password, forgot password, 2FA setup/disable) | NextAuth v4 credentials + bcrypt, password reset by email, TOTP 2FA |
| DB / ORM | Prisma-style (cuid ids, Decimal serialised as strings) | Prisma — schema in `prisma/schema.prisma` mirrors live field names |
| Payments | Stripe (`payment.stripeSessionId`) | Stripe Checkout (phase 2) |
| Monitoring | Sentry (CSP allows `*.ingest.sentry.io`) | optional |
| Email | health check reports an email provider | Nodemailer SMTP (password reset, payment reminders) |
| UI | Tailwind, blue primary `#2563eb`, orange CTAs, light/dark theme, Cmd+K "Go to…" | Tailwind CSS v4 |
| Hosting | nginx + ModSecurity, host rate-limits bursts (HTTP 429) | same host, `next start` behind nginx |
| Misc | PWA manifest, `robots: noindex,nofollow`, strict CSP + security headers | same headers in `next.config.ts` |

## 2. Workspaces (brands)

One login, two portfolios. Every Property and Tenant has `brand`:

- `SWISS_PROPERTIES` — "Long-term residential & commercial leasing portfolio."
- `SWISS_HOMES` — "Short-stay & holiday home portfolio."

`/workspace` shows a card per brand with properties / units / occupied %. Choosing one calls
`POST /api/workspace/switch` (sets a cookie). All lists, stats and reports are scoped to the
active brand. A switcher sits in the top bar.

## 3. Data model

Field names are exactly as returned by the live API.

- **User**: id, name, email, password hash, role (`ADMIN`, plus others such as `MANAGER`, `STAFF`), 2FA secret, createdAt
- **Property**: id, name, street, city, emirate, zip, country, description, type, brand, images[], timestamps
  - type: APARTMENT, VILLA, TOWNHOUSE, STUDIO, PENTHOUSE, DUPLEX, LOFT, HOTEL_APARTMENT, OFFICE, RETAIL, WAREHOUSE, MIXED_USE, LAND
  - emirate: Ajman, Dubai, Sharjah, Abu Dhabi, Ras Al Khaimah, Fujairah, Umm Al Quwain
- **Unit**: id, propertyId, unitNumber, floor, type (STUDIO, ONE_BR, TWO_BR, …), sizeSqm?, rentAmount, status (VACANT, OCCUPIED, MAINTENANCE, RESERVED), description?, listingNotes?, listingPrice?, vacantSince?
- **Tenant**: id, brand, firstName, lastName, email?, phone?, dateOfBirth?, nationalId?, nationality?, emiratesId?, emiratesIdCopy? (uploaded file), emergencyContact?, notes, portalPassword? (tenant portal), timestamps
- **Lease**: id, tenantId, unitId, startDate, endDate? (blank = open-ended), rentAmount, depositAmount?, depositPaid, status (ACTIVE, EXPIRED, TERMINATED; "EXPIRING_SOON" is a computed filter), lateFeeGraceDays, lateFeePercent?, vatRate (0 or 0.05), installmentsPerYear, agentName?, agentContact?, commissionRate?, commissionAmount?, commissionPaid, commissionPaidDate?
  - lease basis on create: monthly (month-to-month) or yearly
- **Payment**: id, leaseId, amount, amountPaid, dueDate, paidDate?, status (PENDING, PAID, PARTIAL, OVERDUE), method?, notes?, receiptNumber?, receiptGeneratedAt?, reminderSentAt?, dunningStage (int), stripeSessionId?
- **Notification**: id, type (PAYMENT_OVERDUE, LEASE_EXPIRING, …), title, message, read, link, userId?, createdAt
- **AuditLog**: id, timestamp, action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, VIEW, BULK_RENEW), entity, entityId, userId, details (JSON)
- Also present (audit entity filter / APIs): **Expense**, **Vendor**, **MaintenanceRequest**, **WorkOrder**, **TenantApplication**, **Document**, **JournalEntry**, **Message/Thread**, **Signature**, **EmailCampaign**

## 4. Pages

Layout: top bar (logo, workspace switcher, Go to ⌘K, theme toggle, notification bell with
count, avatar/name/role). Collapsible sidebar groups:
OVERVIEW (Dashboard, Calendar) · PEOPLE & LEASES (Tenants, Leases) · DOCUMENTS (Contracts) ·
FINANCE (Payments, Accounting) · PROPERTIES (Properties) · COMMUNICATIONS (Messages) ·
ADMIN (Reports, Audit Log, Users) · Account · Sign Out. Footer: brand, ©, System Status,
Security & Audit, Support Helpdesk (mailto). Dates are shown as dd/mm/yyyy, money as `AED 1,234.00`.

| Route | Contents |
| --- | --- |
| `/login`, `/forgot-password` | Email + password sign-in, reset link |
| `/workspace` | Brand picker (see §2) |
| `/` Dashboard | KPI cards: total properties (+units), occupancy ring with Low badge (occupied / vacant), collected this month with sparkline vs expected, overdue amount + count + aging bar; alerts for leases expiring within 30 days and overdue payments; recent payments, recent leases, occupancy trend (6 months), monthly revenue collected vs expected, arrears summary; quick links New Tenant / New Lease |
| `/calendar` | Month grid, Mon-first, prev/next; events: Payment Due, Lease Expiry, Maintenance |
| `/tenants` | Pills: Total Tenants, Active Leases, Expiring Soon (60d), Vacant Units, each "+N vs last month"; sort Name/Property/Rent; Export CSV; search; filter; bulk select (reminders, mass email); rows with initials avatar, name, Unit · Property, phone/email, rent/mo, lease status or "No Lease" |
| `/tenants/new`, `/tenants/:id/edit` | First Name*, Last Name*, Email, Phone, Date of Birth, Nationality (list), Emirates ID No (784-XXXX-XXXXXXX-X), Emirates ID Copy (PDF/image upload), Emergency Contact, Notes |
| `/tenants/:id` | Details, Edit, Delete; Leases (+ New Lease); Recent Payments; Portal Access; Documents (Add Document) |
| `/leases` | Stats: Total, Active, Expired/Terminated, Monthly Rent; sort End/Start/Rent/Tenant; Export CSV; filters status + property (`?status=EXPIRING_SOON`); cards: tenant, status, Property · Unit, start/end, rent/mo, deposit, % of term elapsed bar, View Lease |
| `/leases/new` | Tenant*, Unit* (vacant only), Lease Basis* (Monthly open-ended / Yearly), Start*, End (blank = open-ended), Monthly Rent (AED)*, Deposit (AED), VAT Rate (0% exempt/residential, 5%), Deposit received |
| `/leases/:id` | Status, Edit Lease, Delete, Edit Terms; Payments (n) with Generate Next Month + Add Payment; E-Signatures (Request Signature); Documents; renew, deposit refund, commission actions |
| `/contracts` | Contract Generator: pick a lease (All/Active/Expired/Terminated) → generate a Monthly Hosting Contract or a Tasdeeq / Ejari certificate (PDF) |
| `/payments` | Stats: Total This Month, Collected, Overdue (This Month), Pending; search; sort Due/Amount/Tenant; Export CSV; Select all (bulk update); filters status/property/month; Import CSV (`/payments/import`); grouped by month with count + total; row: tenant, Property · Unit, due date, amount, status, Mark Paid |
| `/payments/:id`, `/billing/receipts/:id` | Payment detail, printable receipt |
| `/collections` | "Who owes what, and who's most likely to fall behind": total outstanding, overdue count, high-risk and medium-risk tenant counts; tabs Arrears aging / At-risk tenants; buckets Current, 1–30, 31–60, 61–90, 90+ days; outstanding-by-tenant table (outstanding, payments, oldest days) |
| `/accounting` | Tabs P&L Report / Journal Entries / General Ledger; Monthly Report (PDF); Export; year + property filters; cards Rent Income, STR Income, Other Income, Adjustments, Total Expenses, Net Profit (best month badge); monthly table and Income vs Expenses vs Net Profit chart |
| `/properties` | Count; filters name / type / emirate; Add Property; cards: type, name, address, emirate, country, occupied/vacant, AED/mo, occupancy % |
| `/properties/new`, `/properties/:id/edit` | Name*, Type*, Workspace*, Street*, ZIP*, City*, Emirate*, Country, Description, Pictures (upload or paste URL; preset stock pictures by type) |
| `/properties/:id` | Hero image, Edit, Delete, address; Total Units, Occupied, Monthly Revenue; Units list (unit, floor, status, type, size m², rent, current tenant) + Add Unit |
| `/units/:id` | Unit detail |
| `/messages`, `/messages/:id` | Tabs Conversations / Bulk Email; search; New Message |
| `/reports` | Standard Reports (property + month + year → Load Report → PDF) and Report Builder |
| `/audit` | Paged log (50/page) with filters user, entity, action, from/to; columns timestamp, action, entity (id), user, details JSON with Expand |
| `/users` | User list (name, "You", role, email, joined), Add User |
| `/account` | Tabs Profile (display name, email, role, change password), Company, Notifications, Appearance, Security (2FA) |

## 5. API

All under `/api`, JSON, session-protected, scoped to the active workspace.

```
GET  dashboard
GET  calendar
GET  search?q=
GET  health                                  -> {status, db, email, latencyMs, timestamp}
POST workspace/switch

GET  properties            GET/DELETE properties/:id      (POST/PATCH implied)
POST units                 (GET/PATCH/DELETE units/:id implied)
GET  tenants               PATCH/DELETE tenants/:id
POST tenants/remind        POST tenants/mass-email        GET/POST tenants/email-campaign
GET  leases?status=&page=  -> {data,total,page,pageSize}
GET/PATCH/DELETE leases/:id
POST leases/:id/renew | generate-next-payment | deposit-refund | commission | signature
POST leases/bulk-renew
GET/POST payments          GET/PATCH payments/:id         POST payments/bulk-update
GET  contracts/leases      GET contracts/:leaseId/:kind   (PDF)
GET  accounting/pl | ledger | export | monthly-report/pdf
GET/POST accounting/journal   GET/DELETE accounting/journal/:id   GET accounting/journal/:id/pdf
GET  reports/summary | arrears | risk | pdf      POST reports/builder
GET/POST messages
GET/POST documents         DELETE documents/:id           GET documents/serve/:file
POST upload
GET/POST notifications     PATCH notifications/:id        POST notifications/mark-all-read | generate
GET  audit
GET/POST users             PATCH/DELETE users/:id
GET/PATCH users/me         POST users/me/password
POST auth/2fa/setup | auth/2fa/disable
```

## 6. Issues spotted on the live site

1. **`portalPassword` is sent to the browser.** `/api/dashboard` includes each tenant's `portalPassword` field inside `recentPayments` and `recentLeases`. Even if hashed, it should never leave the server. The rebuild selects explicit fields.
2. **Property pictures are missing.** Several `/api/documents/serve/*.jpg|png` requests return 404, so uploaded files are no longer on disk where the app expects them (likely lost on a redeploy). Store uploads outside the app folder.
3. **Notifications are regenerated on every page load** (`POST /api/notifications/generate`). That belongs in a scheduled job.
4. **The host rate-limits bursts (HTTP 429)** after roughly 10 page loads in quick succession, which normal staff use can hit.
5. The Swiss Properties workspace currently has 0 properties; all data is in Swiss Homes.

## 7. Moving to the rebuild

- The new app must point at the **existing database** to keep current data. Get the
  `DATABASE_URL` (and the DB engine: MySQL or PostgreSQL) from the server's `.env`.
- Run `npx prisma db pull` against a **copy** of the live DB first and diff it with
  `prisma/schema.prisma` before ever running migrations. Never run `prisma migrate` or `db push` against production.
- Copy the existing uploads folder from the server.
- Deploy to a staging subdomain first, compare against the live site, then switch.
