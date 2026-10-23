"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Email delivery needs SMTP settings (phase 2). For now this stamps
// reminderSentAt and moves the dunning stage on, so staff can see who was chased.
export async function remindTenants(formData: FormData) {
  const user = await requireUser();
  const tenantIds = formData.getAll("tenantIds").filter((v): v is string => typeof v === "string");
  if (tenantIds.length === 0) return;

  const result = await db.payment.updateMany({
    where: { lease: { tenantId: { in: tenantIds } }, status: { not: "PAID" }, dueDate: { lt: new Date() } },
    data: { reminderSentAt: new Date(), dunningStage: { increment: 1 } },
  });
  await audit({ action: "UPDATE", entity: "Payment", userId: user.id, details: { reminders: tenantIds.length, payments: result.count } });
  revalidatePath("/collections");
}
