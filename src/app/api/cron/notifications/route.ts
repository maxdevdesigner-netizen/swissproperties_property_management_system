import { expireLeases } from "@/lib/leases";
import { generateNotifications } from "@/lib/notifications";

// Call from the host's cron (e.g. hourly):
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/notifications
// Expires ended leases first, so they don't raise "expiring soon" alerts.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expired = await expireLeases();
  return Response.json({ expired, created: await generateNotifications() });
}
