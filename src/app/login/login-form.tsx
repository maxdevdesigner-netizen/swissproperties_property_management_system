"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Field, FormError } from "@/components/ui";
import { localPath } from "@/lib/safe-redirect";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setPending(false);
    if (!res || res.error) {
      setError("Invalid email or password.");
      return;
    }
    router.replace(localPath(params.get("callbackUrl"), "/workspace"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError message={error} />
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className="input" />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
