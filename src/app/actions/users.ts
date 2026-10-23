"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { firstError, formObject, type ActionState } from "@/lib/forms";
import { Role } from "@/generated/prisma/enums";

const password = z.string().min(10, "must be at least 10 characters");

const createSchema = z.object({
  name: z.string().min(1, "required"),
  email: z.email(),
  role: z.enum(Role),
  password,
});

export async function createUser(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const email = parsed.data.email.toLowerCase();

  if (await db.user.findUnique({ where: { email } })) return { error: "A user with that email already exists." };
  const user = await db.user.create({
    data: { ...parsed.data, email, password: await bcrypt.hash(parsed.data.password, 12) },
  });
  await audit({ action: "CREATE", entity: "User", entityId: user.id, userId: admin.id, details: { email, role: user.role } });
  revalidatePath("/users");
  return undefined;
}

export async function updateUserRole(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const role = z.enum(Role).parse(formData.get("role"));
  if (id === admin.id && role !== "ADMIN") throw new Error("You can't remove your own admin role.");
  await db.user.update({ where: { id }, data: { role } });
  await audit({ action: "UPDATE", entity: "User", entityId: id, userId: admin.id, details: { role } });
  revalidatePath("/users");
}

export async function deleteUser(id: string) {
  const admin = await requireAdmin();
  if (id === admin.id) throw new Error("You can't delete your own account.");
  await db.user.delete({ where: { id } });
  await audit({ action: "DELETE", entity: "User", entityId: id, userId: admin.id });
  revalidatePath("/users");
}

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({ name: z.string().min(1, "required") }).safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/account");
  return undefined;
}

const passwordSchema = z
  .object({ currentPassword: z.string().min(1, "required"), newPassword: password, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, omit: { password: false } });
  if (!(await bcrypt.compare(parsed.data.currentPassword, record.password))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(parsed.data.newPassword, 12) } });
  await audit({ action: "UPDATE", entity: "User", entityId: user.id, userId: user.id, details: { password: "changed" } });
  return undefined;
}
