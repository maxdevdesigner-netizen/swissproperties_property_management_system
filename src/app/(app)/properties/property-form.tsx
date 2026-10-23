import { ActionForm } from "@/components/action-form";
import { Card, Field } from "@/components/ui";
import { EMIRATES } from "@/lib/options";
import { humanize } from "@/lib/format";
import { WORKSPACES } from "@/lib/workspace";
import { PropertyType } from "@/generated/prisma/enums";
import type { Brand, Property } from "@/generated/prisma/client";
import type { ActionState } from "@/lib/forms";

export function PropertyForm({
  action,
  property,
  defaultBrand,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  property?: Property;
  defaultBrand: Brand;
  submitLabel: string;
}) {
  return (
    <Card className="max-w-3xl">
      <ActionForm action={action} submitLabel={submitLabel}>
        <Field label="Property Name" required>
          <input name="name" required defaultValue={property?.name} placeholder="e.g. Al Hamidiya Residences" className="input" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" required>
            <select name="type" required defaultValue={property?.type ?? ""} className="input">
              <option value="" disabled>Select type</option>
              {Object.values(PropertyType).map((t) => (
                <option key={t} value={t}>{humanize(t)}</option>
              ))}
            </select>
          </Field>
          <Field label="Workspace" required>
            <select name="brand" defaultValue={property?.brand ?? defaultBrand} className="input">
              {Object.entries(WORKSPACES).map(([key, w]) => (
                <option key={key} value={key}>{w.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Street Address" required>
          <input name="street" required defaultValue={property?.street} placeholder="e.g. Al Hamidiya 1, Street 5" className="input" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="ZIP" required>
            <input name="zip" required defaultValue={property?.zip ?? "00000"} className="input" />
          </Field>
          <Field label="City" required>
            <input name="city" required defaultValue={property?.city} placeholder="Ajman" className="input" />
          </Field>
          <Field label="Emirate" required>
            <select name="emirate" required defaultValue={property?.emirate ?? ""} className="input">
              <option value="" disabled>Select emirate</option>
              {EMIRATES.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Country">
          <input name="country" defaultValue={property?.country ?? "United Arab Emirates"} className="input" />
        </Field>
        <Field label="Description">
          <textarea name="description" rows={3} defaultValue={property?.description ?? ""} placeholder="Optional notes about this property..." className="input" />
        </Field>
        <Field label="Property Pictures" hint="One picture URL per line (https://…). File uploads come in phase 2.">
          <textarea name="images" rows={2} defaultValue={property?.images.join("\n")} placeholder="Paste picture URL here..." className="input" />
        </Field>
      </ActionForm>
    </Card>
  );
}
