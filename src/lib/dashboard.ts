import "server-only";
import { db } from "@/lib/db";
import type { Brand } from "@/generated/prisma/enums";
import { arrearsSummary, startOfDay } from "@/lib/domain";
import { daysBetween, toNumber } from "@/lib/format";

/** Everything the dashboard shows, in the same shape as the live /api/dashboard stats. */
export async function getDashboard(brand: Brand) {
  const today = startOfDay();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const trendStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const scope = { lease: { unit: { property: { brand } } } };

  const [totalProperties, units, monthPayments, unpaid, trendPayments, expiringLeases, recentPayments, recentLeases] = await Promise.all([
    db.property.count({ where: { brand } }),
    db.unit.findMany({ where: { property: { brand } }, select: { status: true, rentAmount: true, vacantSince: true } }),
    db.payment.findMany({ where: { ...scope, dueDate: { gte: monthStart, lt: monthEnd } }, select: { amount: true, amountPaid: true } }),
    db.payment.findMany({
      where: { ...scope, status: { not: "PAID" }, dueDate: { lt: today } },
      select: {
        status: true,
        dueDate: true,
        amount: true,
        amountPaid: true,
        lease: { select: { tenant: { select: { id: true, firstName: true, lastName: true } } } },
      },
    }),
    db.payment.findMany({ where: { ...scope, dueDate: { gte: trendStart, lt: monthEnd } }, select: { dueDate: true, amount: true, amountPaid: true } }),
    db.lease.count({
      where: { unit: { property: { brand } }, status: "ACTIVE", endDate: { gte: today, lte: new Date(today.getTime() + 30 * 86_400_000) } },
    }),
    db.payment.findMany({
      where: { ...scope, status: "PAID" },
      orderBy: { paidDate: "desc" },
      take: 5,
      select: {
        id: true,
        amountPaid: true,
        paidDate: true,
        lease: { select: { tenant: { select: { firstName: true, lastName: true } }, unit: { select: { unitNumber: true, property: { select: { name: true } } } } } },
      },
    }),
    db.lease.findMany({
      where: { unit: { property: { brand } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        startDate: true,
        rentAmount: true,
        status: true,
        tenant: { select: { firstName: true, lastName: true } },
        unit: { select: { unitNumber: true, property: { select: { name: true } } } },
      },
    }),
  ]);

  const occupiedUnits = units.filter((u) => u.status === "OCCUPIED").length;
  const vacant = units.filter((u) => u.status === "VACANT");
  const arrears = arrearsSummary(unpaid, today);

  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const rows = trendPayments.filter((p) => p.dueDate >= start && p.dueDate < end);
    return {
      month: start.toLocaleString("en-GB", { month: "short" }),
      expected: rows.reduce((s, p) => s + toNumber(p.amount), 0),
      collected: rows.reduce((s, p) => s + toNumber(p.amountPaid), 0),
    };
  });

  return {
    stats: {
      totalProperties,
      totalUnits: units.length,
      occupiedUnits,
      vacantUnits: vacant.length,
      occupancyRate: units.length ? Math.round((occupiedUnits / units.length) * 100) : 0,
      expectedMonthlyRevenue: monthPayments.reduce((s, p) => s + toNumber(p.amount), 0),
      collectedThisMonth: monthPayments.reduce((s, p) => s + toNumber(p.amountPaid), 0),
      overdueAmount: arrears.totalOutstanding,
      overduePaymentsCount: arrears.totalCount,
      expiringLeases,
      avgDaysVacant: vacant.length
        ? Math.round(vacant.reduce((s, u) => s + (u.vacantSince ? daysBetween(u.vacantSince, today) : 0), 0) / vacant.length)
        : null,
      monthlyRevenue,
      arrearsSummary: { ...arrears, topTenants: arrears.tenants.slice(0, 5) },
    },
    recentPayments,
    recentLeases,
  };
}
