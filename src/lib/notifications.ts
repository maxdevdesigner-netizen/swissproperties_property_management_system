import "server-only";
import { db } from "@/lib/db";
import { startOfDay } from "@/lib/domain";
import { date, money } from "@/lib/format";

const REFRESH_MS = 5 * 60 * 1000;
let lastRefresh = 0;
let refreshing: Promise<void> | null = null;

/**
 * Regenerates alerts at most every 5 minutes. The bell calls this as staff move between pages,
 * so it stays current without a cron job; concurrent callers share one run.
 */
export async function refreshNotifications() {
  if (Date.now() - lastRefresh < REFRESH_MS) return;
  refreshing ??= generateNotifications()
    .then(() => {
      lastRefresh = Date.now();
    })
    .finally(() => {
      refreshing = null;
    });
  await refreshing;
}

/**
 * Creates overdue-payment and expiring-lease alerts. Each alert has a dedupe key,
 * so running this repeatedly is safe. The live app ran it on every page load;
 * here it runs via refreshNotifications, the Notifications page, or /api/cron/notifications.
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
