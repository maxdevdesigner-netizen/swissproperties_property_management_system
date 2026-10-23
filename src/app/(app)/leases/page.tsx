import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { Badge, ButtonLink, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { date, money, toNumber } from "@/lib/format";
import { daysFromToday, isExpiringSoon, leaseProgress } from "@/lib/domain";
import { DownloadLink } from "@/components/download-link";
import type { Prisma } from "@/generated/prisma/client";

const sorts: Record<string, Prisma.LeaseOrderByWithRelationInput> = {
  end: { endDate: { sort: "asc", nulls: "last" } },
  start: { startDate: "desc" },
  rent: { rentAmount: "desc" },
  tenant: { tenant: { firstName: "asc" } },
};

export default async function LeasesPage({ searchParams }: PageProps<"/leases">) {
  const brand = await requireWorkspace();
  const { status, propertyId, sort = "end" } = (await searchParams) as Record<string, string | undefined>;

  const base: Prisma.LeaseWhereInput = { unit: { property: { brand } } };
  const where: Prisma.LeaseWhereInput = { ...base };
  if (status === "ACTIVE" || status === "EXPIRED" || status === "TERMINATED") where.status = status;
  if (status === "EXPIRING_SOON") {
    where.status = "ACTIVE";
    where.endDate = { gte: daysFromToday(0), lte: daysFromToday(30) };
  }
  if (propertyId) where.unit = { propertyId, property: { brand } };

  const [leases, all, properties] = await Promise.all([
    db.lease.findMany({
      where,
      orderBy: sorts[sort] ?? sorts.end,
      include: {
        tenant: { select: { firstName: true, lastName: true } },
        unit: { select: { unitNumber: true, property: { select: { name: true } } } },
      },
    }),
    db.lease.findMany({ where: base, select: { status: true, rentAmount: true } }),
    db.property.findMany({ where: { brand }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const active = all.filter((l) => l.status === "ACTIVE");
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({ ...(status ? { status } : {}), ...(propertyId ? { propertyId } : {}), sort, ...extra }).toString();

  return (
    <>
      <PageHeader title="Leases" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leases" value={all.length} />
        <StatCard label="Active" value={active.length} tone="success" />
        <StatCard label="Expired / Terminated" value={all.length - active.length} />
        <StatCard label="Monthly Rent" value={money(active.reduce((s, l) => s + toNumber(l.rentAmount), 0))} tone="primary" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Sort by:</span>
        {[["end", "End Date"], ["start", "Start Date"], ["rent", "Rent"], ["tenant", "Tenant"]].map(([key, label]) => (
          <Link key={key} href={`/leases?${qs({ sort: key })}`} className={`rounded-lg border px-3 py-1 ${sort === key ? "border-primary bg-primary-soft text-primary" : "border-border"}`}>
            {label}
          </Link>
        ))}
        <DownloadLink href="/api/export/leases">
          <Download className="size-3.5" /> Export CSV
        </DownloadLink>
      </div>
      <form className="mb-5 flex flex-wrap gap-3">
        <input type="hidden" name="sort" value={sort} />
        <select name="status" defaultValue={status ?? ""} className="input max-w-48">
          <option value="">All Leases</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRING_SOON">Expiring within 30 days</option>
          <option value="EXPIRED">Expired</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <select name="propertyId" defaultValue={propertyId ?? ""} className="input max-w-56">
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button className="rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">Apply</button>
        <ButtonLink href="/leases/new" variant="accent" className="ml-auto">
          <Plus className="size-4" /> New Lease
        </ButtonLink>
      </form>

      {leases.length === 0 ? (
        <EmptyState title="No leases found" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {leases.map((l) => {
            const progress = leaseProgress(l.startDate, l.endDate);
            return (
              <Link key={l.id} href={`/leases/${l.id}`} className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-primary">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{l.tenant.firstName} {l.tenant.lastName}</p>
                    <p className="text-sm text-muted">{l.unit.property.name} · Unit {l.unit.unitNumber}</p>
                  </div>
                  {isExpiringSoon(l, 30) ? <Badge value="PENDING" label="Expiring soon" /> : <Badge value={l.status} />}
                </div>
                <dl className="mt-4 grid grid-cols-4 gap-2 text-xs text-muted">
                  <div><dt className="uppercase">Start</dt><dd className="font-semibold text-text">{date(l.startDate)}</dd></div>
                  <div><dt className="uppercase">End</dt><dd className="font-semibold text-text">{l.endDate ? date(l.endDate) : "Open"}</dd></div>
                  <div><dt className="uppercase">Rent/mo</dt><dd className="font-semibold text-text">{money(l.rentAmount)}</dd></div>
                  <div><dt className="uppercase">Deposit</dt><dd className="font-semibold text-text">{l.depositAmount ? money(l.depositAmount) : "—"}</dd></div>
                </dl>
                {progress !== null && (
                  <>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted">{progress}% of lease term elapsed</p>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
