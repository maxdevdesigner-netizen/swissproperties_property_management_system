import "server-only";
import { db } from "@/lib/db";
import { startOfDay } from "@/lib/domain";
import { date, money } from "@/lib/format";

/**
 * Creates overdue-payment and expiring-lease alerts. Each alert has a dedupe key,
 * so running this repeatedly is safe. The live app ran it on every page load;
 * here it runs from the Notifications page or a scheduled call to /api/cron/notifications.
 */
export async function generateNotifications() {
  const today = startOfDay();
  const [overdue, expiring] = await Promise.all([
    db.payment.findMany({
      where: { status: { not: "PAID" }, dueDate: { lt: today } },
      select: { id: true, amount: true, dueDate: true, lease: { select: { tenant: { select: { firstName: true, lastName: true } } } } },
    }),
    db.lease.findMany({
      where: { status: "ACTIVE", endDate: { gte: today, lte: new Date(today.getTime() + 30 * 86_400_000) } },
      select: { id: true, endDate: true, tenant: { select: { firstName: true, lastName: true } }, unit: { select: { unitNumber: true } } },
    }),
  ]);

  const data = [
    ...overdue.map((p) => ({
      type: "PAYMENT_OVERDUE" as const,
      title: "Payment overdue",
      message: `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}: ${money(p.amount)} was due ${date(p.dueDate)}`,
      link: `/payments/${p.id}`,
      dedupeKey: `overdue:${p.id}`,
    })),
    ...expiring.map((l) => ({
      type: "LEASE_EXPIRING" as const,
      title: "Lease expiring soon",
      message: `Unit ${l.unit.unitNumber} (${l.tenant.firstName} ${l.tenant.lastName}) ends ${date(l.endDate)}`,
      link: `/leases/${l.id}`,
      dedupeKey: `expiring:${l.id}:${l.endDate?.toISOString().slice(0, 10)}`,
    })),
  ];
  const result = await db.notification.createMany({ data, skipDuplicates: true });
  return result.count;
}
