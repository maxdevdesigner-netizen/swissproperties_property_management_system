import Link from "next/link";
import { Building2, MapPin, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { humanize, money, toNumber } from "@/lib/format";
import { EMIRATES } from "@/lib/options";
import { PropertyType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export default async function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  const brand = await requireWorkspace();
  const { q, type, emirate } = (await searchParams) as Record<string, string | undefined>;

  const where: Prisma.PropertyWhereInput = { brand };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (type && type in PropertyType) where.type = type as PropertyType;
  if (emirate) where.emirate = emirate;

  const properties = await db.property.findMany({
    where,
    orderBy: { name: "asc" },
    include: { units: { select: { status: true, rentAmount: true } } },
  });

  return (
    <>
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} properties in portfolio`}
        actions={
          <ButtonLink href="/properties/new" variant="accent">
            <Plus className="size-4" /> Add Property
          </ButtonLink>
        }
      />
      <form className="mb-6 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Name" className="input max-w-xs" />
        <select name="type" defaultValue={type ?? ""} className="input max-w-48">
          <option value="">All Types</option>
          {Object.values(PropertyType).map((t) => (
            <option key={t} value={t}>{humanize(t)}</option>
          ))}
        </select>
        <select name="emirate" defaultValue={emirate ?? ""} className="input max-w-48">
          <option value="">All Emirates</option>
          {EMIRATES.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <button className="rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">Filter</button>
      </form>

      {properties.length === 0 ? (
        <EmptyState title="No properties yet">Add your first property to start tracking units and leases.</EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => {
            const occupied = p.units.filter((u) => u.status === "OCCUPIED");
            const revenue = occupied.reduce((s, u) => s + toNumber(u.rentAmount), 0);
            const rate = p.units.length ? Math.round((occupied.length / p.units.length) * 100) : null;
            return (
              <Link key={p.id} href={`/properties/${p.id}`} className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm hover:border-primary">
                <div className="relative flex h-36 items-center justify-center bg-surface-2">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="size-10 text-muted" />
                  )}
                  <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">{humanize(p.type)}</span>
                </div>
                <div className="p-5">
                  <h2 className="font-bold group-hover:text-primary">{p.name}</h2>
                  <p className="mt-1 flex items-start gap-1 text-sm text-muted">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {p.street}, {p.city}
                  </p>
                  <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-4 text-center text-xs text-muted">
                    <div><p className="text-base font-bold text-text">{occupied.length}</p>Occupied</div>
                    <div><p className="text-base font-bold text-text">{p.units.length - occupied.length}</p>Vacant</div>
                    <div className="col-span-2"><p className="text-base font-bold text-text">{money(revenue)}</p>per month</div>
                  </div>
                  {rate !== null && (
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-primary" style={{ width: `${rate}%` }} />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
