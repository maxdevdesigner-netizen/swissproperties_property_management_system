import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/workspace";
import { getDashboard } from "@/lib/dashboard";

export async function GET() {
  if (!(await getCurrentUser())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const brand = (await getWorkspace()) ?? "SWISS_PROPERTIES";
  return Response.json(await getDashboard(brand));
}
