import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Avatar, Badge, ButtonLink, Card, EmptyState, Table } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { deleteTenant, revokePortalAccess, setPortalPassword } from "@/app/actions/tenants";
import { date, initials, money } from "@/lib/format";
import { effectiveStatus } from "@/lib/domain";
import { requireWorkspace } from "@/lib/workspace";
import { OtherWorkspace } from "@/components/other-workspace";

export default async function TenantPage({ params }: PageProps<"/tenants/[id]">) {
  const brand = await requireWorkspace();
  const { id } = await params;
  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      leases: {
        orderBy: { startDate: "desc" },
        include: { unit: { select: { unitNumber: true, property: { select: { name: true } } } } },
      },
    },
  });
  if (!tenant) notFound();
  if (tenant.brand !== brand) return <OtherWorkspace brand={tenant.brand} next={`/tenants/${id}`} />;

  // Only whether a portal password exists, never the hash itself.
  const portal = await db.tenant.count({ where: { id, portalPassword: { not: null } } });
  const payments = await db.payment.findMany({
    where: { lease: { tenantId: id } },
    orderBy: { dueDate: "desc" },
    take: 12,
  });

  const details: [string, string | null][] = [
    ["Email", tenant.email],
    ["Phone", tenant.phone],
    ["Date of Birth", tenant.dateOfBirth ? date(tenant.dateOfBirth) : null],
    ["Nationality", tenant.nationality],
    ["Emirates ID", tenant.emiratesId],
    ["Emergency Contact", tenant.emergencyContact],
  ];

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/tenants" className="hover:text-text">Tenants</Link> / Details
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar text={initials(tenant.firstName, tenant.lastName)} />
        <h1 className="text-2xl font-bold">{tenant.firstName} {tenant.lastName}</h1>
        <div className="ml-auto flex gap-2">
          <ButtonLink href={`/tenants/${id}/edit`} variant="outline">
            <Pencil className="size-4" /> Edit
          </ButtonLink>
          {tenant.leases.length === 0 && (
            <ConfirmButton action={deleteTenant.bind(null, id)} label="Delete" confirm={`Delete ${tenant.firstName} ${tenant.lastName}?`} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <dl className="grid gap-4 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</dt>
                  <dd className="mt-0.5">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {tenant.notes && <p className="mt-4 border-t border-border pt-4 text-sm whitespace-pre-line">{tenant.notes}</p>}
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Leases</h2>
              <ButtonLink href={`/leases/new?tenantId=${id}`} variant="outline">
                <Plus className="size-4" /> New Lease
              </ButtonLink>
            </div>
            {tenant.leases.length === 0 ? (
              <EmptyState title="No leases yet" />
            ) : (
              <Table head={["Unit", "Start", "End", "Rent", "Status"]}>
                {tenant.leases.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <Link href={`/leases/${l.id}`} className="font-medium hover:text-primary">
                        Unit {l.unit.unitNumber} · {l.unit.property.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{date(l.startDate)}</td>
                    <td className="px-4 py-3">{l.endDate ? date(l.endDate) : "Open-ended"}</td>
                    <td className="px-4 py-3">{money(l.rentAmount)}</td>
                    <td className="px-4 py-3"><Badge value={l.status} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold">Recent Payments</h2>
            {payments.length === 0 ? (
              <EmptyState title="No payments yet" />
            ) : (
              <Table head={["Due", "Amount", "Paid", "Status"]}>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3"><Link href={`/payments/${p.id}`} className="hover:text-primary">{date(p.dueDate)}</Link></td>
                    <td className="px-4 py-3">{money(p.amount)}</td>
                    <td className="px-4 py-3">{money(p.amountPaid)}</td>
                    <td className="px-4 py-3"><Badge value={effectiveStatus(p)} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </div>

        <Card className="h-fit">
          <h2 className="font-bold">Portal Access</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            {portal ? "This tenant can sign in to the tenant portal." : "No portal password set."}
          </p>
          <ActionForm action={setPortalPassword.bind(null, id)} submitLabel={portal ? "Reset Password" : "Enable Access"} showCancel={false}>
            <input name="password" type="password" minLength={8} required placeholder="New portal password" autoComplete="new-password" className="input" />
          </ActionForm>
          {portal > 0 && (
            <div className="mt-3">
              <ConfirmButton action={revokePortalAccess.bind(null, id)} label="Revoke Access" confirm="Revoke this tenant's portal access?" variant="outline" />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
