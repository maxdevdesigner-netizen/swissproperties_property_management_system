import { z, type ZodError } from "zod";

export type ActionState = { error?: string } | undefined;

/** Rules for any password a staff member chooses. */
export const newPassword = z.string().min(10, "must be at least 10 characters");

export function firstError(err: ZodError): string {
  const issue = err.issues[0];
  const field = issue?.path.join(".");
  return field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input");
}

/** Turns FormData into a plain object, mapping empty strings to undefined. */
export function formObject(formData: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$")) continue;
    const v = value.trim();
    out[key] = v === "" ? undefined : v;
  }
  return out;
}
