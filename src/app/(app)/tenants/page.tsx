import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { Avatar, Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { initials, money, toNumber } from "@/lib/format";
import { isExpiringSoon } from "@/lib/domain";
import type { Prisma } from "@/generated/prisma/client";
import { DownloadLink } from "@/components/download-link";

export default async function TenantsPage({ searchParams }: PageProps<"/tenants">) {
  const brand = await requireWorkspace();
  const { q, filter, sort = "name" } = (await searchParams) as Record<string, string | undefined>;

  const where: Prisma.TenantWhereInput = { brand };
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (filter === "active") where.leases = { some: { status: "ACTIVE" } };
  if (filter === "none") where.leases = { none: { status: "ACTIVE" } };

  const [tenants, vacantUnits] = await Promise.all([
    db.tenant.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      include: {
        leases: {
          where: { status: "ACTIVE" },
          orderBy: { startDate: "desc" },
          take: 1,
          include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } } },
        },
      },
    }),
    db.unit.count({ where: { property: { brand }, status: "VACANT" } }),
  ]);

  if (sort === "property") {
    tenants.sort((a, b) => (a.leases[0]?.unit.property.name ?? "~").localeCompare(b.leases[0]?.unit.property.name ?? "~"));
  } else if (sort === "rent") {
    tenants.sort((a, b) => toNumber(b.leases[0]?.rentAmount) - toNumber(a.leases[0]?.rentAmount));
  }

  const active = tenants.filter((t) => t.leases.length > 0);
  const expiring = active.filter((t) => isExpiringSoon(t.leases[0], 60));
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(q ? { q } : {}), ...(filter ? { filter } : {}), sort, ...extra }).toString();

  return (
    <>
      <PageHeader title="Tenants" />
      <div className="mb-6 flex flex-wrap gap-3">
        {[
          [tenants.length, "Total Tenants"],
          [active.length, "Active Leases"],
          [expiring.length, "Expiring Soon (60d)"],
          [vacantUnits, "Vacant Units"],
        ].map(([value, label]) => (
          <span key={label} className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
            <b className="mr-1 text-base">{value}</b> {label}
          </span>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Sort by:</span>
        {["name", "property", "rent"].map((s) => (
          <Link key={s} href={`/tenants?${qs({ sort: s })}`} className={`rounded-lg border px-3 py-1 capitalize ${sort === s ? "border-primary bg-primary-soft text-primary" : "border-border"}`}>
            {s}
          </Link>
        ))}
        <DownloadLink href="/api/export/tenants">
          <Download className="size-3.5" /> Export CSV
        </DownloadLink>
      </div>

      <form className="mb-5 flex flex-wrap gap-3">
        <input type="hidden" name="sort" value={sort} />
        <input name="q" defaultValue={q} placeholder="Search tenants..." className="input max-w-sm" />
        <select name="filter" defaultValue={filter ?? ""} className="input max-w-48">
          <option value="">All Tenants</option>
          <option value="active">With active lease</option>
          <option value="none">No lease</option>
        </select>
        <button className="rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">Apply</button>
        <ButtonLink href="/tenants/new" variant="accent" className="ml-auto">
          <Plus className="size-4" /> Add Tenant
        </ButtonLink>
      </form>

      {tenants.length === 0 ? (
        <EmptyState title="No tenants found" />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {tenants.map((t) => {
            const lease = t.leases[0];
            return (
              <Link key={t.id} href={`/tenants/${t.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-surface-2">
                <Avatar text={initials(t.firstName, t.lastName)} />
                <div className="min-w-48 flex-1">
                  <p className="font-semibold">{t.firstName} {t.lastName}</p>
                  {lease && <p className="text-sm text-muted">Unit {lease.unit.unitNumber} · {lease.unit.property.name}</p>}
                </div>
                <div className="min-w-40 text-sm text-muted">
                  {t.email && <p>{t.email}</p>}
                  {t.phone && <p>{t.phone}</p>}
                </div>
                {lease ? (
                  <>
                    <span className="w-36 text-right text-sm font-semibold">{money(lease.rentAmount)}/mo</span>
                    <Badge value="ACTIVE" />
                  </>
                ) : (
                  <Badge value="NONE" label="No Lease" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
