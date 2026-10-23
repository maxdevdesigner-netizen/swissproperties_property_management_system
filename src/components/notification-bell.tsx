"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

/**
 * The layout renders once and doesn't re-render on navigation, so the count it passes in would go
 * stale. This re-checks it on every page change, which also brings alerts up to date.
 */
export function NotificationBell({ initial }: { initial: number }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(initial);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/notifications/unread", { signal: controller.signal, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { unread?: number } | null) => {
        if (typeof data?.unread === "number") setUnread(data.unread);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pathname]);

  return (
    <Link href="/notifications" className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Notifications">
      <Bell className="size-4" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
