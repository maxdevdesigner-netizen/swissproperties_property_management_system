import Link from "next/link";
import { Logo } from "@/components/logo";
import { Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { userForResetToken } from "@/lib/auth";
import { resetPassword } from "@/app/actions/password-reset";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = (await searchParams) as Record<string, string | undefined>;
  const user = await userForResetToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-xl font-bold">Choose a new password</h1>
        {user && token ? (
          <>
            <p className="mt-1 mb-6 text-sm text-muted">For {user.email}</p>
            <ActionForm action={resetPassword.bind(null, token)} submitLabel="Set password" showCancel={false}>
              <Field label="New Password">
                <input name="newPassword" type="password" required minLength={10} autoComplete="new-password" className="input" />
              </Field>
              <Field label="Confirm New Password">
                <input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" className="input" />
              </Field>
            </ActionForm>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            This link has expired or has already been used.{" "}
            <Link href="/forgot-password" className="text-primary hover:underline">Ask for a new one</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
