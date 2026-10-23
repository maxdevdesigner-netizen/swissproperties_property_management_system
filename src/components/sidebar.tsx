"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Building2,
  Calculator,
  CalendarDays,
  CreditCard,
  FileSignature,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ScrollText,
  Settings,
  Users,
  UserCog,
  Wallet,
} from "lucide-react";
import { cn } from "@/components/ui";

const groups = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "People & Leases",
    items: [
      { href: "/tenants", label: "Tenants", icon: Users },
      { href: "/leases", label: "Leases", icon: FileText },
    ],
  },
  { label: "Documents", items: [{ href: "/contracts", label: "Contracts", icon: FileSignature }] },
  {
    label: "Finance",
    items: [
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/collections", label: "Collections", icon: Wallet },
      { href: "/accounting", label: "Accounting", icon: Calculator },
    ],
  },
  { label: "Properties", items: [{ href: "/properties", label: "Properties", icon: Building2 }] },
  { label: "Communications", items: [{ href: "/messages", label: "Messages", icon: MessageSquare }] },
  {
    label: "Admin",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/audit", label: "Audit Log", icon: ScrollText },
      { href: "/users", label: "Users", icon: UserCog },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => {
          const items = group.label === "Admin" && !isAdmin ? group.items.filter((i) => i.href === "/account") : group.items;
          return (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{group.label}</p>
              {items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "mt-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    active(href) ? "bg-primary text-white" : "text-text hover:bg-surface-2",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
