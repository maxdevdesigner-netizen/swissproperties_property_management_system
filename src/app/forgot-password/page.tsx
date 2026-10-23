import Link from "next/link";
import { Logo } from "@/components/logo";

// Password-reset emails need an SMTP provider (phase 2). Until then an admin
// resets passwords from the Users page.
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-xl font-bold">Forgot password?</h1>
        <p className="mt-2 text-sm text-muted">
          Ask an administrator to reset your password, or contact{" "}
          <a className="text-primary" href="mailto:support@swissproperties.net">
            support@swissproperties.net
          </a>
          .
        </p>
        <Link href="/login" className="mt-6 block text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
