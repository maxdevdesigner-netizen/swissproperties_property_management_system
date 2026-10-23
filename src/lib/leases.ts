import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { startOfDay } from "@/lib/domain";

/**
 * Marks active leases whose end date has passed as EXPIRED and frees their units.
 * Runs from the scheduled job; safe to run repeatedly. The first run against existing
 * data catches up on every lease that ended while nothing was expiring them.
 */
export async function expireLeases(today = startOfDay()) {
  const ended = await db.lease.findMany({
    where: { status: "ACTIVE", endDate: { lt: today } },
    select: { id: true, unitId: true, endDate: true },
  });

  let expired = 0;
  for (const lease of ended) {
    const done = await db.$transaction(async (tx) => {
      // Re-checked here so a lease renewed since the lookup is left alone.
      const { count } = await tx.lease.updateMany({
        where: { id: lease.id, status: "ACTIVE", endDate: { lt: today } },
        data: { status: "EXPIRED" },
      });
      if (!count) return false;
      const stillLet = await tx.lease.count({ where: { unitId: lease.unitId, status: "ACTIVE" } });
      // Only an occupied unit becomes vacant; one under maintenance or reserved keeps its status.
      if (!stillLet) {
        await tx.unit.updateMany({ where: { id: lease.unitId, status: "OCCUPIED" }, data: { status: "VACANT", vacantSince: lease.endDate } });
      }
      return true;
    });
    if (done) {
      expired++;
      await audit({ action: "UPDATE", entity: "Lease", entityId: lease.id, details: { status: "EXPIRED", automatic: true } });
    }
  }
  return expired;
}

/** Another active lease on the unit, which would make reactivating or renewing this one a double let. */
export async function unitLetElsewhere(unitId: string, leaseId: string) {
  return (await db.lease.count({ where: { unitId, status: "ACTIVE", id: { not: leaseId } } })) > 0;
}
