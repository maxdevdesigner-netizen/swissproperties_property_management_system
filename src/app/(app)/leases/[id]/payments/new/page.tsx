import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { OtherWorkspace } from "@/components/other-workspace";
import { Card, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addPayment } from "@/app/actions/payments";
import { toNumber } from "@/lib/format";

export default async function AddPaymentPage({ params }: PageProps<"/leases/[id]/payments/new">) {
  const brand = await requireWorkspace();
  const { id } = await params;
  const lease = await db.lease.findUnique({ where: { id }, include: { tenant: { select: { firstName: true, lastName: true } }, unit: { select: { property: { select: { brand: true } } } } } });
  if (!lease) notFound();
  if (lease.unit.property.brand !== brand) return <OtherWorkspace brand={lease.unit.property.brand} next={`/leases/${id}/payments/new`} />;

  return (
    <>
      <PageHeader title="Add Payment" subtitle={`${lease.tenant.firstName} ${lease.tenant.lastName}`} />
      <Card className="max-w-xl">
        <ActionForm action={addPayment.bind(null, id)} submitLabel="Add Payment">
          <Field label="Amount (AED)" required>
            <input name="amount" type="number" step="0.01" required defaultValue={toNumber(lease.rentAmount) * (1 + toNumber(lease.vatRate))} className="input" />
          </Field>
          <Field label="Due Date" required>
            <input name="dueDate" type="date" required className="input" />
          </Field>
          <Field label="Notes">
            <input name="notes" placeholder="e.g. Utility charge, late fee" className="input" />
          </Field>
        </ActionForm>
      </Card>
    </>
  );
}
