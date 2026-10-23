import { ActionForm } from "@/components/action-form";
import { Card, Field } from "@/components/ui";
import { humanize, toNumber } from "@/lib/format";
import { UnitStatus, UnitType } from "@/generated/prisma/enums";
import type { Unit } from "@/generated/prisma/client";
import type { ActionState } from "@/lib/forms";

export function UnitForm({
  action,
  unit,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  unit?: Unit;
  submitLabel: string;
}) {
  return (
    <Card className="max-w-2xl">
      <ActionForm action={action} submitLabel={submitLabel}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Unit Number" required>
            <input name="unitNumber" required defaultValue={unit?.unitNumber} placeholder="e.g. 1203" className="input" />
          </Field>
          <Field label="Floor">
            <input name="floor" type="number" defaultValue={unit?.floor ?? ""} className="input" />
          </Field>
          <Field label="Type" required>
            <select name="type" defaultValue={unit?.type ?? "STUDIO"} className="input">
              {Object.values(UnitType).map((t) => (
                <option key={t} value={t}>{humanize(t)}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={unit?.status ?? "VACANT"} className="input">
              {Object.values(UnitStatus).map((s) => (
                <option key={s} value={s}>{humanize(s)}</option>
              ))}
            </select>
          </Field>
          <Field label="Size (m²)">
            <input name="sizeSqm" type="number" step="0.1" defaultValue={unit?.sizeSqm ? toNumber(unit.sizeSqm) : ""} className="input" />
          </Field>
          <Field label="Monthly Rent (AED)" required>
            <input name="rentAmount" type="number" step="0.01" required defaultValue={unit ? toNumber(unit.rentAmount) : ""} className="input" />
          </Field>
          <Field label="Listing Price (AED)">
            <input name="listingPrice" type="number" step="0.01" defaultValue={unit?.listingPrice ? toNumber(unit.listingPrice) : ""} className="input" />
          </Field>
        </div>
        <Field label="Description">
          <textarea name="description" rows={2} defaultValue={unit?.description ?? ""} className="input" />
        </Field>
        <Field label="Listing Notes">
          <textarea name="listingNotes" rows={2} defaultValue={unit?.listingNotes ?? ""} className="input" />
        </Field>
      </ActionForm>
    </Card>
  );
}
