import Link from "next/link";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { Avatar, Badge, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { bulkMarkPaid, markPaid } from "@/app/actions/payments";
import { date, initials, money, monthLabel, toNumber } from "@/lib/format";
import { effectiveStatus, outstanding, startOfDay } from "@/lib/domain";
import type { Prisma } from "@/generated/prisma/client";
import { DownloadLink } from "@/components/download-link";

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const brand = await requireWorkspace();
  const { q, status, propertyId, month, sort = "due" } = (await searchParams) as Record<string, string | undefined>;
  const today = startOfDay();

  const where: Prisma.PaymentWhereInput = { lease: { unit: { property: { brand } } } };
  if (propertyId) where.lease = { unit: { propertyId, property: { brand } } };
  if (q) {
    where.lease = {
      ...(where.lease as Prisma.LeaseWhereInput),
      OR: [
        { tenant: { firstName: { contains: q, mode: "insensitive" } } },
        { tenant: { lastName: { contains: q, mode: "insensitive" } } },
        { unit: { unitNumber: { contains: q, mode: "insensitive" } } },
        { unit: { property: { name: { contains: q, mode: "insensitive" } } } },
      ],
    };
  }
  if (status === "PAID") where.status = "PAID";
  if (status === "OVERDUE") Object.assign(where, { status: { not: "PAID" }, dueDate: { lt: today } });
  if (status === "PENDING") Object.assign(where, { status: { not: "PAID" }, dueDate: { gte: today } });
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    where.dueDate = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  const orderBy: Prisma.PaymentOrderByWithRelationInput[] =
    sort === "amount" ? [{ amount: "desc" }] : sort === "tenant" ? [{ lease: { tenant: { firstName: "asc" } } }] : [{ dueDate: "desc" }];

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const [payments, thisMonth, properties] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy,
      take: 500,
      include: {
        lease: {
          select: {
            tenant: { select: { firstName: true, lastName: true } },
            unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          },
        },
      },
    }),
    db.payment.findMany({
      where: { lease: { unit: { property: { brand } } }, dueDate: { gte: monthStart, lt: monthEnd } },
      select: { amount: true, amountPaid: true, status: true, dueDate: true },
    }),
    db.property.findMany({ where: { brand }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const total = thisMonth.reduce((s, p) => s + toNumber(p.amount), 0);
  const collected = thisMonth.reduce((s, p) => s + toNumber(p.amountPaid), 0);
  const overdue = thisMonth.filter((p) => effectiveStatus(p, today) === "OVERDUE").reduce((s, p) => s + outstanding(p), 0);

  // Group by due month, like the live app.
  const groups = new Map<string, typeof payments>();
  for (const p of payments) {
    const key = sort === "due" ? monthLabel(p.dueDate) : "All payments";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({ ...Object.fromEntries(Object.entries({ q, status, propertyId, month }).filter(([, v]) => v)), sort, ...extra } as Record<string, string>).toString();

  return (
    <>
      <PageHeader title="Payments" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total This Month" value={money(total)} />
        <StatCard label="Collected" value={money(collected)} tone="success" />
        <StatCard label="Overdue (This Month)" value={money(overdue)} tone="danger" />
        <StatCard label="Pending" value={money(Math.max(0, total - collected - overdue))} tone="warning" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Sort by:</span>
        {[["due", "Due Date"], ["amount", "Amount"], ["tenant", "Tenant"]].map(([key, label]) => (
          <Link key={key} href={`/payments?${qs({ sort: key })}`} className={`rounded-lg border px-3 py-1 ${sort === key ? "border-primary bg-primary-soft text-primary" : "border-border"}`}>
            {label}
          </Link>
        ))}
        <DownloadLink href="/api/export/payments">
          <Download className="size-3.5" /> Export CSV
        </DownloadLink>
      </div>
      <form className="mb-5 flex flex-wrap gap-3">
        <input type="hidden" name="sort" value={sort} />
        <input name="q" defaultValue={q} placeholder="Search tenant, unit, or property" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-40">
          <option value="">All Payments</option>
          <option value="PENDING">Pending</option>
          <option value="OVERDUE">Overdue</option>
          <option value="PAID">Paid</option>
        </select>
        <select name="propertyId" defaultValue={propertyId ?? ""} className="input max-w-52">
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input name="month" type="month" defaultValue={month} className="input max-w-44" />
        <button className="rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">Apply</button>
      </form>

      {payments.length === 0 ? (
        <EmptyState title="No payments found" />
      ) : (
        <form action={bulkMarkPaid} className="space-y-6">
          <div className="flex justify-end">
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">Mark selected paid</button>
          </div>
          {[...groups.entries()].map(([label, rows]) => (
            <section key={label}>
              <h2 className="mb-2 font-bold">
                {label}{" "}
                <span className="text-sm font-normal text-muted">
                  · {rows.length} payments · {money(rows.reduce((s, p) => s + toNumber(p.amount), 0))} total
                </span>
              </h2>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {rows.map((p) => {
                  const s = effectiveStatus(p, today);
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                      {s !== "PAID" ? <input type="checkbox" name="ids" value={p.id} className="size-4" aria-label="Select" /> : <span className="w-4" />}
                      <Avatar text={initials(p.lease.tenant.firstName, p.lease.tenant.lastName)} />
                      <Link href={`/payments/${p.id}`} className="min-w-48 flex-1 hover:text-primary">
                        <p className="font-semibold">{p.lease.tenant.firstName} {p.lease.tenant.lastName}</p>
                        <p className="text-sm text-muted">{p.lease.unit.property.name} · Unit {p.lease.unit.unitNumber}</p>
                      </Link>
                      <span className="text-sm text-muted">Due {date(p.dueDate)}</span>
                      <span className="w-32 text-right font-semibold">{money(p.amount)}</span>
                      <Badge value={s} />
                      {s !== "PAID" && (
                        <button formAction={markPaid.bind(null, p.id)} className="text-sm font-semibold text-primary hover:underline">
                          Mark Paid
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </form>
      )}
    </>
  );
}
