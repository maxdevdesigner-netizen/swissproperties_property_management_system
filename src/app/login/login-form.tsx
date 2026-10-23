"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Field, FormError } from "@/components/ui";
import { localPath } from "@/lib/safe-redirect";

// Error codes thrown by the credentials check in lib/auth.ts.
const LOGIN_ERRORS: Record<string, string> = {
  "2FA_INVALID": "That code didn't work. Check your authenticator app and try again.",
  "2FA_LOCKED": "Too many wrong codes. Wait 15 minutes and try again.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needCode, setNeedCode] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      code: form.get("code") ?? "",
      redirect: false,
    });
    setPending(false);
    if (res?.error === "2FA_REQUIRED") {
      setNeedCode(true);
      return;
    }
    if (!res || res.error) {
      setError(LOGIN_ERRORS[res?.error ?? ""] ?? "Invalid email or password.");
      return;
    }
    router.replace(localPath(params.get("callbackUrl"), "/workspace"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {params.get("reset") === "1" && !error && (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Password updated. Sign in with your new password.</p>
      )}
      <FormError message={error} />
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className="input" />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </Field>
      {needCode && (
        <Field label="Authentication code" hint="The 6-digit code from your authenticator app.">
          <input name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} className="input" />
        </Field>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
