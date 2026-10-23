import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { Card, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createLease } from "@/app/actions/leases";
import { money, toNumber } from "@/lib/format";

export default async function NewLeasePage({ searchParams }: PageProps<"/leases/new">) {
  const brand = await requireWorkspace();
  const { tenantId, unitId } = (await searchParams) as Record<string, string | undefined>;

  const [tenants, units] = await Promise.all([
    db.tenant.findMany({ where: { brand }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
    db.unit.findMany({
      where: { property: { brand }, status: "VACANT" },
      select: { id: true, unitNumber: true, rentAmount: true, property: { select: { name: true } } },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
    }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="New Lease" subtitle="New Lease Agreement" />
      <Card className="max-w-3xl">
        <ActionForm action={createLease} submitLabel="Create Lease">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Tenant" required>
              <select name="tenantId" required defaultValue={tenantId ?? ""} className="input">
                <option value="" disabled>Select tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            </Field>
            <Field label="Unit" required hint={units.length === 0 ? "No vacant units in this workspace." : undefined}>
              <select name="unitId" required defaultValue={unitId ?? ""} className="input">
                <option value="" disabled>Select vacant unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.property.name} · Unit {u.unitNumber} ({money(u.rentAmount)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lease Basis" required>
              <select name="basis" defaultValue="monthly" className="input">
                <option value="monthly">Monthly — Month-to-month (open-ended)</option>
                <option value="yearly">Yearly — 12 monthly installments</option>
              </select>
            </Field>
            <Field label="VAT Rate">
              <select name="vatRate" defaultValue="0" className="input">
                <option value="0">0% — Exempt / Residential</option>
                <option value="0.05">5% — Commercial</option>
              </select>
            </Field>
            <Field label="Start Date" required>
              <input name="startDate" type="date" required defaultValue={today} className="input" />
            </Field>
            <Field label="End Date" hint="Leave blank for open-ended. Yearly leases default to 12 months.">
              <input name="endDate" type="date" className="input" />
            </Field>
            <Field label="Monthly Rent (AED)" required>
              <input
                name="rentAmount"
                type="number"
                step="0.01"
                required
                placeholder="1800"
                defaultValue={unitId ? toNumber(units.find((u) => u.id === unitId)?.rentAmount) || "" : ""}
                className="input"
              />
            </Field>
            <Field label="Deposit (AED)">
              <input name="depositAmount" type="number" step="0.01" placeholder="3600" className="input" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="depositPaid" className="size-4" /> Deposit received
          </label>
        </ActionForm>
      </Card>
    </>
  );
}
