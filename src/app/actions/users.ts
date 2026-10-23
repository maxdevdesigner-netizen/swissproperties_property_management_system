"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { firstError, formObject, newPassword as password, type ActionState } from "@/lib/forms";
import { Role } from "@/generated/prisma/enums";
import { verifyTotp } from "@/lib/totp";

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

const codeSchema = z.object({ code: z.string().min(1, "required") });

/** Turns on two-factor sign-in once the user proves their app has the secret shown on the Account page. */
export async function enableTwoFactor(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = codeSchema.extend({ secret: z.string().regex(/^[A-Z2-7]{32}$/) }).safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!verifyTotp(parsed.data.secret, parsed.data.code)) return { error: "That code didn't match. Scan the QR code again and enter the current code." };

  await db.user.update({ where: { id: user.id }, data: { twoFactorSecret: parsed.data.secret } });
  await audit({ action: "UPDATE", entity: "User", entityId: user.id, userId: user.id, details: { twoFactor: "enabled" } });
  redirect("/account");
}

export async function disableTwoFactor(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = codeSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, omit: { twoFactorSecret: false } });
  if (!record.twoFactorSecret || !verifyTotp(record.twoFactorSecret, parsed.data.code)) return { error: "That code didn't work." };
  await db.user.update({ where: { id: user.id }, data: { twoFactorSecret: null } });
  await audit({ action: "UPDATE", entity: "User", entityId: user.id, userId: user.id, details: { twoFactor: "disabled" } });
  revalidatePath("/account");
  return undefined;
}

/** For a user who has lost their phone: they can sign in with just their password and set it up again. */
export async function resetTwoFactor(id: string) {
  const admin = await requireAdmin();
  await db.user.update({ where: { id }, data: { twoFactorSecret: null } });
  await audit({ action: "UPDATE", entity: "User", entityId: id, userId: admin.id, details: { twoFactor: "reset by admin" } });
  revalidatePath("/users");
}
