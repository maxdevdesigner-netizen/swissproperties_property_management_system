import type { ZodError } from "zod";

export type ActionState = { error?: string } | undefined;

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
