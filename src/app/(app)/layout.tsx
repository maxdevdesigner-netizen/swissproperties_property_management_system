import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ChevronsUpDown, Home, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspace, WORKSPACES } from "@/lib/workspace";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthSessionProvider } from "@/components/session-provider";
import { Logo } from "@/components/logo";
import { humanize } from "@/lib/format";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const workspace = await getWorkspace();
  if (!workspace) redirect("/workspace");

  const unread = await db.notification.count({ where: { read: false, OR: [{ userId: user.id }, { userId: null }] } });

  return (
    <AuthSessionProvider>
      <div className="flex h-screen flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
          <Link href="/" className="w-52">
            <Logo />
          </Link>
          <Link
            href="/workspace"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-surface-2"
          >
            <Home className="size-4" />
            {WORKSPACES[workspace].name}
            <ChevronsUpDown className="size-3.5 text-muted" />
          </Link>
          <form action="/search" className="ml-auto hidden md:block">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted">
              <Search className="size-4" />
              <input name="q" placeholder="Go to…" className="w-40 bg-transparent outline-none placeholder:text-muted" />
            </label>
          </form>
          <ThemeToggle />
          <Link href="/notifications" className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Notifications">
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <Link href="/account" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {(user.name ?? user.email ?? "?")[0].toUpperCase()}
            </span>
            <span className="hidden text-sm leading-tight sm:block">
              <span className="block font-semibold">{user.name ?? user.email}</span>
              <span className="block text-xs text-muted">{humanize(user.role)}</span>
            </span>
          </Link>
        </header>
        <div className="flex min-h-0 flex-1">
          <Sidebar isAdmin={user.role === "ADMIN"} />
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            <main className="flex-1 p-6">{children}</main>
            <footer className="flex flex-wrap items-center gap-4 border-t border-border px-6 py-3 text-xs text-muted">
              <span className="font-semibold text-text">Swiss Properties</span>
              <span>© {new Date().getFullYear()} Management System. All rights reserved.</span>
              <span className="ml-auto flex gap-4">
                <Link href="/api/health" className="hover:text-text">System Status</Link>
                <Link href="/audit" className="hover:text-text">Security &amp; Audit</Link>
                <a href="mailto:support@swissproperties.net" className="hover:text-text">Support Helpdesk</a>
              </span>
            </footer>
          </div>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
