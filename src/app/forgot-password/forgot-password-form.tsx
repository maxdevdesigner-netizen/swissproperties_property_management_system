"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/password-reset";
import { Field, FormError } from "@/components/ui";
import { SubmitButton } from "@/components/action-form";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, undefined);

  if (state?.sent) {
    return (
      <p className="mt-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
        If an account exists for that email, we&apos;ve sent it a link to reset the password. The link works for one hour.
      </p>
    );
  }
  return (
    <form action={formAction} className="mt-4 space-y-4">
      <p className="text-sm text-muted">Enter your email and we&apos;ll send you a link to choose a new password.</p>
      <FormError message={state?.error} />
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className="input" />
      </Field>
      <SubmitButton label="Send reset link" />
    </form>
  );
}
