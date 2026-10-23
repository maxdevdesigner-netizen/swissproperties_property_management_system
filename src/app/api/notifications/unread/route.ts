import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { refreshNotifications } from "@/lib/notifications";

/** The bell's unread count, after bringing alerts up to date. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await refreshNotifications();
  } catch (err) {
    // A failed refresh shouldn't hide the alerts that already exist.
    console.error("notification refresh failed", err);
  }
  const unread = await db.notification.count({ where: { read: false, OR: [{ userId: user.id }, { userId: null }] } });
  return Response.json({ unread }, { headers: { "Cache-Control": "no-store" } });
}
