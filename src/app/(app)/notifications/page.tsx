import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateNotifications } from "@/lib/notifications";
import { EmptyState, PageHeader, cn } from "@/components/ui";

async function markAllRead() {
  "use server";
  const user = await requireUser();
  await db.notification.updateMany({ where: { read: false, OR: [{ userId: user.id }, { userId: null }] }, data: { read: true } });
  revalidatePath("/", "layout");
}

async function refresh() {
  "use server";
  await requireUser();
  await generateNotifications();
  revalidatePath("/", "layout");
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await db.notification.findMany({
    where: { OR: [{ userId: user.id }, { userId: null }] },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <>
            <form action={refresh}><button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2">Check for new alerts</button></form>
            <form action={markAllRead}><button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2">Mark all read</button></form>
          </>
        }
      />
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {notifications.map((n) => (
            <li key={n.id} className={cn("px-5 py-3", !n.read && "bg-primary-soft/40")}>
              <Link href={n.link ?? "#"} className="block hover:text-primary">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-sm text-muted">{n.message}</p>
                <p className="text-xs text-muted">{n.createdAt.toLocaleString("en-GB")}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
