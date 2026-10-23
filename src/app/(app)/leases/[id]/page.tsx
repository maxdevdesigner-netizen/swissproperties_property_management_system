import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Badge, ButtonLink, Card, EmptyState, Field, Table } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { deleteLease, generateNextPayment, renewLease, setLeaseStatus } from "@/app/actions/leases";
import { markPaid } from "@/app/actions/payments";
import { date, money, toNumber } from "@/lib/format";
import { effectiveStatus, leaseProgress } from "@/lib/domain";

export default async function LeasePage({ params }: PageProps<"/leases/[id]">) {
  const { id } = await params;
  const lease = await db.lease.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      unit: { select: { id: true, unitNumber: true, property: { select: { id: true, name: true } } } },
      payments: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!lease) notFound();

  const progress = leaseProgress(lease.startDate, lease.endDate);
  const paid = lease.payments.reduce((s, p) => s + toNumber(p.amountPaid), 0);
  const due = lease.payments.reduce((s, p) => s + toNumber(p.amount), 0);

  const terms: [string, string][] = [
    ["Start Date", date(lease.startDate)],
    ["End Date", lease.endDate ? date(lease.endDate) : "Open-ended"],
    ["Monthly Rent", money(lease.rentAmount)],
    ["VAT", `${toNumber(lease.vatRate) * 100}%`],
    ["Deposit", lease.depositAmount ? `${money(lease.depositAmount)} · ${lease.depositPaid ? "received" : "not received"}` : "—"],
    ["Late fee", lease.lateFeePercent ? `${toNumber(lease.lateFeePercent)}% after ${lease.lateFeeGraceDays} days` : `None (grace ${lease.lateFeeGraceDays} days)`],
    ["Agent", lease.agentName ? `${lease.agentName}${lease.agentContact ? ` · ${lease.agentContact}` : ""}` : "—"],
    [
      "Commission",
      lease.commissionAmount || lease.commissionRate
        ? `${lease.commissionAmount ? money(lease.commissionAmount) : `${toNumber(lease.commissionRate)}%`} · ${lease.commissionPaid ? `paid ${date(lease.commissionPaidDate)}` : "unpaid"}`
        : "—",
    ],
  ];

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/leases" className="hover:text-text">Leases</Link> / Details
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          <Link href={`/tenants/${lease.tenant.id}`} className="hover:text-primary">{lease.tenant.firstName} {lease.tenant.lastName}</Link>
        </h1>
        <Badge value={lease.status} />
        <div className="ml-auto flex flex-wrap gap-2">
          <ButtonLink href={`/leases/${id}/edit`} variant="outline">
            <Pencil className="size-4" /> Edit Terms
          </ButtonLink>
          {lease.status === "ACTIVE" ? (
            <ConfirmButton action={setLeaseStatus.bind(null, id, "TERMINATED")} label="Terminate" confirm="Terminate this lease? Future unpaid installments are removed and the unit becomes vacant." />
          ) : (
            <ConfirmButton action={setLeaseStatus.bind(null, id, "ACTIVE")} label="Reactivate" confirm="Mark this lease active again?" variant="outline" />
          )}
          <ConfirmButton action={deleteLease.bind(null, id)} label="Delete" confirm="Delete this lease and its unpaid installments?" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <p className="mb-4 text-sm text-muted">
              <Link href={`/properties/${lease.unit.property.id}`} className="hover:text-text">{lease.unit.property.name}</Link> · Unit {lease.unit.unitNumber}
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              {terms.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</dt>
                  <dd className="mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
            {progress !== null && (
              <div className="mt-5">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">{progress}% of lease term elapsed</p>
              </div>
            )}
          </Card>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">Payments ({lease.payments.length})</h2>
              <span className="text-sm text-muted">{money(paid)} received of {money(due)}</span>
              <div className="ml-auto flex gap-2">
                <form action={generateNextPayment.bind(null, id)}>
                  <button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2">Generate Next Month</button>
                </form>
                <ButtonLink href={`/leases/${id}/payments/new`} variant="accent">
                  <Plus className="size-4" /> Add Payment
                </ButtonLink>
              </div>
            </div>
            {lease.payments.length === 0 ? (
              <EmptyState title="No payments scheduled" />
            ) : (
              <Table head={["Due", "Amount", "Paid", "Status", ""]}>
                {lease.payments.map((p) => {
                  const status = effectiveStatus(p);
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3"><Link href={`/payments/${p.id}`} className="hover:text-primary">{date(p.dueDate)}</Link></td>
                      <td className="px-4 py-3">{money(p.amount)}</td>
                      <td className="px-4 py-3">{money(p.amountPaid)}</td>
                      <td className="px-4 py-3"><Badge value={status} /></td>
                      <td className="px-4 py-3 text-right">
                        {status !== "PAID" && (
                          <form action={markPaid.bind(null, p.id)}>
                            <button className="text-sm font-semibold text-primary hover:underline">Mark Paid</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-1 font-bold">Renew</h2>
            <p className="mb-4 text-sm text-muted">Extends the end date and schedules the extra installments.</p>
            <ActionForm action={renewLease.bind(null, id)} submitLabel="Renew Lease" showCancel={false}>
              <Field label="Months">
                <input name="months" type="number" min={1} max={60} defaultValue={12} className="input" />
              </Field>
              <Field label="New monthly rent (AED)">
                <input name="rentAmount" type="number" step="0.01" defaultValue={toNumber(lease.rentAmount)} className="input" />
              </Field>
            </ActionForm>
          </Card>
          <Card>
            <h2 className="font-bold">Tenant</h2>
            <p className="mt-2 text-sm">{lease.tenant.phone ?? "—"}</p>
            <p className="text-sm">{lease.tenant.email ?? ""}</p>
            <ButtonLink href={`/contracts?leaseId=${id}`} variant="outline" className="mt-4 w-full">Generate Contract</ButtonLink>
          </Card>
        </div>
      </div>
    </>
  );
}
