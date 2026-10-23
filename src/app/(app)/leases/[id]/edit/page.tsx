import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { updateLeaseTerms } from "@/app/actions/leases";
import { inputDate, toNumber } from "@/lib/format";

export default async function EditLeasePage({ params }: PageProps<"/leases/[id]/edit">) {
  const { id } = await params;
  const lease = await db.lease.findUnique({ where: { id }, include: { tenant: { select: { firstName: true, lastName: true } } } });
  if (!lease) notFound();
  const num = (v: unknown) => (v == null ? "" : toNumber(v as never));

  return (
    <>
      <PageHeader title="Edit Terms" subtitle={`${lease.tenant.firstName} ${lease.tenant.lastName}`} />
      <Card className="max-w-3xl">
        <ActionForm action={updateLeaseTerms.bind(null, id)} submitLabel="Save Terms">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="End Date" hint="Blank = open-ended">
              <input name="endDate" type="date" defaultValue={inputDate(lease.endDate)} className="input" />
            </Field>
            <Field label="Monthly Rent (AED)" required>
              <input name="rentAmount" type="number" step="0.01" required defaultValue={num(lease.rentAmount)} className="input" />
            </Field>
            <Field label="Deposit (AED)">
              <input name="depositAmount" type="number" step="0.01" defaultValue={num(lease.depositAmount)} className="input" />
            </Field>
            <Field label="VAT Rate">
              <select name="vatRate" defaultValue={String(toNumber(lease.vatRate))} className="input">
                <option value="0">0% — Exempt / Residential</option>
                <option value="0.05">5% — Commercial</option>
              </select>
            </Field>
            <Field label="Late fee grace (days)">
              <input name="lateFeeGraceDays" type="number" min={0} defaultValue={lease.lateFeeGraceDays} className="input" />
            </Field>
            <Field label="Late fee (%)">
              <input name="lateFeePercent" type="number" step="0.01" defaultValue={num(lease.lateFeePercent)} className="input" />
            </Field>
            <Field label="Agent name">
              <input name="agentName" defaultValue={lease.agentName ?? ""} className="input" />
            </Field>
            <Field label="Agent contact">
              <input name="agentContact" defaultValue={lease.agentContact ?? ""} className="input" />
            </Field>
            <Field label="Commission rate (%)">
              <input name="commissionRate" type="number" step="0.01" defaultValue={num(lease.commissionRate)} className="input" />
            </Field>
            <Field label="Commission amount (AED)">
              <input name="commissionAmount" type="number" step="0.01" defaultValue={num(lease.commissionAmount)} className="input" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="depositPaid" defaultChecked={lease.depositPaid} className="size-4" /> Deposit received
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="commissionPaid" defaultChecked={lease.commissionPaid} className="size-4" /> Commission paid
            </label>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
