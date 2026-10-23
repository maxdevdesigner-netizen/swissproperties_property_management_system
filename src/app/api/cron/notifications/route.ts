import { generateNotifications } from "@/lib/notifications";

// Call from the host's cron (e.g. hourly):
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/notifications
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ created: await generateNotifications() });
}
