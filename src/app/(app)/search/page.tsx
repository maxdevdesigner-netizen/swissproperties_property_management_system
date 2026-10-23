import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { EmptyState, PageHeader } from "@/components/ui";

const PAGES = [
  ["Dashboard", "/"], ["Calendar", "/calendar"], ["Tenants", "/tenants"], ["Leases", "/leases"],
  ["Contracts", "/contracts"], ["Payments", "/payments"], ["Collections", "/collections"], ["Accounting", "/accounting"],
  ["Properties", "/properties"], ["Messages", "/messages"], ["Reports", "/reports"], ["Audit Log", "/audit"],
  ["Users", "/users"], ["Account", "/account"], ["New Tenant", "/tenants/new"], ["New Lease", "/leases/new"],
];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const brand = await requireWorkspace();
  const q = (((await searchParams) as Record<string, string | undefined>).q ?? "").trim();
  if (!q) return <EmptyState title="Type something to search" />;

  const contains = { contains: q, mode: "insensitive" as const };
  const [tenants, properties, units] = await Promise.all([
    db.tenant.findMany({ where: { brand, OR: [{ firstName: contains }, { lastName: contains }, { email: contains }, { phone: { contains: q } }] }, take: 10 }),
    db.property.findMany({ where: { brand, name: contains }, take: 10 }),
    db.unit.findMany({ where: { property: { brand }, unitNumber: contains }, take: 10, include: { property: { select: { name: true } } } }),
  ]);
  const pages = PAGES.filter(([label]) => label.toLowerCase().includes(q.toLowerCase()));

  const sections: [string, { href: string; label: string }[]][] = [
    ["Pages", pages.map(([label, href]) => ({ label, href }))],
    ["Tenants", tenants.map((t) => ({ label: `${t.firstName} ${t.lastName}`, href: `/tenants/${t.id}` }))],
    ["Properties", properties.map((p) => ({ label: p.name, href: `/properties/${p.id}` }))],
    ["Units", units.map((u) => ({ label: `Unit ${u.unitNumber} · ${u.property.name}`, href: `/units/${u.id}` }))],
  ];
  const found = sections.some(([, items]) => items.length);

  return (
    <>
      <PageHeader title={`Results for “${q}”`} />
      {!found && <EmptyState title="Nothing matched" />}
      <div className="space-y-6">
        {sections.filter(([, items]) => items.length).map(([title, items]) => (
          <section key={title}>
            <h2 className="mb-2 text-sm font-semibold tracking-wider text-muted uppercase">{title}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {items.map((i) => (
                <li key={i.href}><Link href={i.href} className="block px-5 py-3 hover:bg-surface-2">{i.label}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
