import { ActionForm } from "@/components/action-form";
import { Card, Field } from "@/components/ui";
import { NATIONALITIES } from "@/lib/options";
import { inputDate } from "@/lib/format";
import type { Tenant } from "@/generated/prisma/client";
import type { ActionState } from "@/lib/forms";

export function TenantForm({
  action,
  tenant,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  tenant?: Omit<Tenant, "portalPassword">;
  submitLabel: string;
}) {
  return (
    <Card className="max-w-3xl">
      <ActionForm action={action} submitLabel={submitLabel}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First Name" required>
            <input name="firstName" required defaultValue={tenant?.firstName} placeholder="Ahmed" className="input" />
          </Field>
          <Field label="Last Name" required>
            <input name="lastName" required defaultValue={tenant?.lastName} placeholder="Al Mansoori" className="input" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={tenant?.email ?? ""} placeholder="ahmed@email.com" className="input" />
          </Field>
          <Field label="Phone">
            <input name="phone" defaultValue={tenant?.phone ?? ""} placeholder="+971 50 123 4567" className="input" />
          </Field>
          <Field label="Date of Birth">
            <input name="dateOfBirth" type="date" defaultValue={inputDate(tenant?.dateOfBirth)} className="input" />
          </Field>
          <Field label="Nationality">
            <select name="nationality" defaultValue={tenant?.nationality ?? ""} className="input">
              <option value="">Select nationality…</option>
              {NATIONALITIES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Emirates ID No">
            <input name="emiratesId" defaultValue={tenant?.emiratesId ?? ""} placeholder="784-XXXX-XXXXXXX-X" className="input" />
          </Field>
          <Field label="Emergency Contact">
            <input name="emergencyContact" defaultValue={tenant?.emergencyContact ?? ""} placeholder="Name and phone number" className="input" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea name="notes" rows={3} defaultValue={tenant?.notes ?? ""} placeholder="Additional notes..." className="input" />
        </Field>
      </ActionForm>
    </Card>
  );
}
