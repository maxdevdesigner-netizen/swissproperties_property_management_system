import { db } from "@/lib/db";
import { emailConfigured } from "@/lib/email";

export async function GET() {
  const started = Date.now();
  let dbStatus = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }
  return Response.json(
    {
      status: dbStatus === "ok" ? "ok" : "degraded",
      db: dbStatus,
      email: emailConfigured() ? "configured" : "not configured",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status: dbStatus === "ok" ? 200 : 503 },
  );
}
