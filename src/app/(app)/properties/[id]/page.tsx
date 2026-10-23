import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin, Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { OtherWorkspace } from "@/components/other-workspace";
import { Avatar, Badge, ButtonLink, Card, EmptyState, StatCard } from "@/components/ui";
import { ConfirmButton } from "@/components/action-form";
import { deleteProperty } from "@/app/actions/properties";
import { humanize, initials, money, toNumber } from "@/lib/format";

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const brand = await requireWorkspace();
  const { id } = await params;
  const property = await db.property.findUnique({
    where: { id },
    include: {
      units: {
        orderBy: { unitNumber: "asc" },
        include: {
          leases: {
            where: { status: "ACTIVE" },
            take: 1,
            include: { tenant: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      },
    },
  });
  if (!property) notFound();
  if (property.brand !== brand) return <OtherWorkspace brand={property.brand} next={`/properties/${id}`} />;

  const occupied = property.units.filter((u) => u.status === "OCCUPIED");
  const revenue = occupied.reduce((s, u) => s + toNumber(u.rentAmount), 0);

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/properties" className="hover:text-text">Properties</Link> / Details
      </p>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative flex h-56 items-end bg-gradient-to-b from-surface-2 to-slate-700">
          {property.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={property.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Building2 className="absolute top-1/2 left-1/2 size-12 -translate-1/2 text-muted" />
          )}
          <div className="relative p-6">
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">{humanize(property.type)}</span>
            <h1 className="mt-2 text-3xl font-bold text-white drop-shadow">{property.name}</h1>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <ButtonLink href={`/properties/${id}/edit`} variant="outline">
              <Pencil className="size-4" /> Edit
            </ButtonLink>
            <ConfirmButton action={deleteProperty.bind(null, id)} label="Delete" confirm={`Delete ${property.name}? This can't be undone.`} />
          </div>
        </div>
        <p className="flex items-center gap-2 p-4 text-sm text-muted">
          <MapPin className="size-4" /> {property.street}, {property.zip} {property.city} · {property.emirate} · {property.country}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Units" value={property.units.length} />
        <StatCard label="Occupied Units" value={`${occupied.length} / ${property.units.length}`} />
        <StatCard label="Monthly Revenue" value={money(revenue)} tone="success" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Units</h2>
        <ButtonLink href={`/properties/${id}/units/new`} variant="accent">
          <Plus className="size-4" /> Add Unit
        </ButtonLink>
      </div>
      {property.units.length === 0 ? (
        <EmptyState title="No units yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {property.units.map((u) => {
            const tenant = u.leases[0]?.tenant;
            return (
              <Card key={u.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/units/${u.id}`} className="font-bold hover:text-primary">Unit {u.unitNumber}</Link>
                    {u.floor != null && <p className="text-xs text-muted">Floor {u.floor}</p>}
                  </div>
                  <Badge value={u.status} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted">
                  <div><dt>Type</dt><dd className="font-semibold text-text">{humanize(u.type)}</dd></div>
                  <div><dt>Size</dt><dd className="font-semibold text-text">{u.sizeSqm ? `${toNumber(u.sizeSqm)} m²` : "—"}</dd></div>
                  <div><dt>Rent</dt><dd className="font-semibold text-text">{money(u.rentAmount)}/mo</dd></div>
                </dl>
                {tenant && (
                  <Link href={`/tenants/${tenant.id}`} className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-sm hover:text-primary">
                    <Avatar text={initials(tenant.firstName, tenant.lastName)} />
                    {tenant.firstName} {tenant.lastName}
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
