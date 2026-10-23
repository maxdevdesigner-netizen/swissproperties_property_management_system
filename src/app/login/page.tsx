import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Enter your credentials to access the system</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <Link href="/forgot-password" className="mt-4 block text-center text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
