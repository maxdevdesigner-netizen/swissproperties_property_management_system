"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { WORKSPACES } from "@/lib/workspace";
import { emailConfigured, sendEmail } from "@/lib/email";
import { paymentReminderEmail } from "@/lib/email-templates";
import { outstanding, startOfDay } from "@/lib/domain";
import { toNumber } from "@/lib/format";

// Emails each selected tenant a list of their overdue payments, then stamps reminderSentAt and
// moves the dunning stage on so staff can see who was chased. Without SMTP settings it only stamps
// ("logs") the reminder, as before. Tenants with no email address are skipped and reported back.
export async function remindTenants(formData: FormData) {
  const user = await requireUser();
  const tenantIds = formData.getAll("tenantIds").filter((v): v is string => typeof v === "string");
  if (tenantIds.length === 0) return;

  const tenants = await db.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      brand: true,
      leases: {
        select: {
          unit: { select: { unitNumber: true, property: { select: { name: true } } } },
          payments: {
            where: { status: { not: "PAID" }, dueDate: { lt: startOfDay() } },
            orderBy: { dueDate: "asc" },
            select: { id: true, status: true, dueDate: true, amount: true, amountPaid: true },
          },
        },
      },
    },
  });

  const sending = emailConfigured();
  const result = { emailed: 0, logged: 0, noEmail: 0, failed: 0 };
  for (const t of tenants) {
    const items = t.leases.flatMap((l) =>
      l.payments
        .filter((p) => outstanding(p) > 0)
        .map((p) => ({ id: p.id, unitNumber: l.unit.unitNumber, propertyName: l.unit.property.name, dueDate: p.dueDate, amount: toNumber(p.amount), outstanding: outstanding(p) })),
    );
    if (items.length === 0) continue;

    if (sending) {
      if (!t.email) {
        result.noEmail++;
        continue;
      }
      try {
        await sendEmail({ to: t.email, ...paymentReminderEmail(`${t.firstName} ${t.lastName}`.trim(), WORKSPACES[t.brand].name, items) });
        result.emailed++;
      } catch (err) {
        console.error("payment reminder email failed", err);
        result.failed++;
        continue;
      }
    } else {
      result.logged++;
    }
    await db.payment.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: { reminderSentAt: new Date(), dunningStage: { increment: 1 } },
    });
  }

  await audit({ action: "UPDATE", entity: "Payment", userId: user.id, details: { reminders: result } });
  revalidatePath("/collections");
  redirect(`/collections?${new URLSearchParams(Object.entries(result).map(([k, v]) => [k, String(v)]))}`);
}
