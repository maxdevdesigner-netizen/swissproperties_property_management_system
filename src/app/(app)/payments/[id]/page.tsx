import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge, ButtonLink, Card, Field, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { deletePayment, recordPayment } from "@/app/actions/payments";
import { date, humanize, money, toNumber } from "@/lib/format";
import { effectiveStatus, outstanding } from "@/lib/domain";
import { PaymentMethod } from "@/generated/prisma/enums";

export default async function PaymentPage({ params }: PageProps<"/payments/[id]">) {
  const { id } = await params;
  const p = await db.payment.findUnique({
    where: { id },
    include: {
      lease: {
        select: {
          id: true,
          tenant: { select: { id: true, firstName: true, lastName: true } },
          unit: { select: { unitNumber: true, property: { select: { name: true } } } },
        },
      },
    },
  });
  if (!p) notFound();
  const status = effectiveStatus(p);
  const owed = outstanding(p);

  return (
    <>
      <PageHeader
        title="Payment"
        subtitle={
          <>
            <Link href={`/tenants/${p.lease.tenant.id}`} className="hover:text-text">{p.lease.tenant.firstName} {p.lease.tenant.lastName}</Link> ·{" "}
            <Link href={`/leases/${p.lease.id}`} className="hover:text-text">{p.lease.unit.property.name} · Unit {p.lease.unit.unitNumber}</Link>
          </>
        }
        actions={
          <>
            {p.receiptNumber && <ButtonLink href={`/billing/receipts/${p.id}`} variant="outline">View Receipt</ButtonLink>}
            {toNumber(p.amountPaid) === 0 && <ConfirmButton action={deletePayment.bind(null, id)} label="Delete" confirm="Delete this payment?" />}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <dl className="grid grid-cols-2 gap-4">
            {[
              ["Status", <Badge key="s" value={status} />],
              ["Due Date", date(p.dueDate)],
              ["Amount", money(p.amount)],
              ["Received", money(p.amountPaid)],
              ["Outstanding", money(owed)],
              ["Paid On", date(p.paidDate)],
              ["Method", p.method ? humanize(p.method) : "—"],
              ["Receipt", p.receiptNumber ?? "—"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</dt>
                <dd className="mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
          {p.notes && <p className="mt-4 border-t border-border pt-4 text-sm">{p.notes}</p>}
        </Card>
        {owed > 0 && (
          <Card>
            <h2 className="mb-4 font-bold">Record payment</h2>
            <ActionForm action={recordPayment.bind(null, id)} submitLabel="Record Payment" showCancel={false}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Amount received (AED)" required>
                  <input name="amount" type="number" step="0.01" max={owed} required defaultValue={owed} className="input" />
                </Field>
                <Field label="Method" required>
                  <select name="method" defaultValue="CASH" className="input">
                    {Object.values(PaymentMethod).map((m) => (
                      <option key={m} value={m}>{humanize(m)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Paid on" required>
                  <input name="paidDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
                </Field>
                <Field label="Notes">
                  <input name="notes" placeholder="Cheque no., reference…" className="input" />
                </Field>
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
