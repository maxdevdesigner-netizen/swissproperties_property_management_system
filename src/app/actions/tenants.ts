"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getWorkspace } from "@/lib/workspace";
import { firstError, formObject, type ActionState } from "@/lib/forms";

const tenantSchema = z.object({
  firstName: z.string().min(1, "required"),
  lastName: z.string().min(1, "required"),
  email: z.email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  nationality: z.string().optional(),
  emiratesId: z
    .string()
    .regex(/^784-?\d{4}-?\d{7}-?\d$/, "should look like 784-XXXX-XXXXXXX-X")
    .optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

function nullify<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? null])) as { [K in keyof T]: Exclude<T[K], undefined> | null };
}

export async function createTenant(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const brand = (await getWorkspace()) ?? "SWISS_PROPERTIES";
  const parsed = tenantSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const tenant = await db.tenant.create({ data: { ...parsed.data, brand } });
  await audit({
    action: "CREATE",
    entity: "Tenant",
    entityId: tenant.id,
    userId: user.id,
    details: { name: `${tenant.firstName} ${tenant.lastName}` },
  });
  redirect(`/tenants/${tenant.id}`);
}

export async function updateTenant(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = tenantSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  // Blank fields clear the stored value.
  await db.tenant.update({ where: { id }, data: nullify(parsed.data) as never });
  await audit({ action: "UPDATE", entity: "Tenant", entityId: id, userId: user.id });
  revalidatePath(`/tenants/${id}`);
  redirect(`/tenants/${id}`);
}

export async function deleteTenant(id: string) {
  const user = await requireUser();
  const leases = await db.lease.count({ where: { tenantId: id } });
  if (leases > 0) throw new Error("This tenant has leases. Delete those first.");
  await db.tenant.delete({ where: { id } });
  await audit({ action: "DELETE", entity: "Tenant", entityId: id, userId: user.id });
  redirect("/tenants");
}

const portalSchema = z.object({ password: z.string().min(8, "must be at least 8 characters") });

export async function setPortalPassword(id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = portalSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  await db.tenant.update({ where: { id }, data: { portalPassword: await bcrypt.hash(parsed.data.password, 12) } });
  await audit({ action: "UPDATE", entity: "Tenant", entityId: id, userId: user.id, details: { portalAccess: "password set" } });
  revalidatePath(`/tenants/${id}`);
  return { error: undefined };
}

export async function revokePortalAccess(id: string) {
  const user = await requireUser();
  await db.tenant.update({ where: { id }, data: { portalPassword: null } });
  await audit({ action: "UPDATE", entity: "Tenant", entityId: id, userId: user.id, details: { portalAccess: "revoked" } });
  revalidatePath(`/tenants/${id}`);
}
