"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { userForResetToken } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
import { createResetToken } from "@/lib/reset-token";
import { firstError, formObject, newPassword, type ActionState } from "@/lib/forms";

export type ResetRequestState = { error?: string; sent?: boolean } | undefined;

export async function requestPasswordReset(_: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const parsed = z.object({ email: z.email() }).safeParse(formObject(formData));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const secret = process.env.NEXTAUTH_SECRET;
  // The link must use the configured site address, never the request's Host header, which a caller can forge.
  const siteUrl = process.env.NEXTAUTH_URL;
  if (!emailConfigured() || !secret || !siteUrl) {
    return { error: "Password reset by email isn't set up yet. Ask an administrator to reset your password." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, omit: { password: false } });
  // The same answer whether or not the account exists, so the form can't be used to find out who has one.
  if (user) {
    const link = new URL(`/reset-password?token=${createResetToken(secret, user)}`, siteUrl).toString();
    try {
      await sendEmail({ to: user.email, ...passwordResetEmail(user.name, link) });
    } catch (err) {
      console.error("password reset email failed", err);
      return { error: "We couldn't send the email. Try again later, or ask an administrator to reset your password." };
    }
    await audit({ action: "UPDATE", entity: "User", entityId: user.id, details: { passwordReset: "link emailed" } });
  }
  return { sent: true };
}

const resetSchema = z
  .object({ newPassword, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

export async function resetPassword(token: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const user = await userForResetToken(token);
  if (!user) return { error: "This reset link has expired or has already been used. Ask for a new one." };
  await db.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(parsed.data.newPassword, 12) } });
  await audit({ action: "UPDATE", entity: "User", entityId: user.id, userId: user.id, details: { password: "reset by email" } });
  redirect("/login?reset=1");
}
