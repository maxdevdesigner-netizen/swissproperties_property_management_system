import type { PaymentStatus } from "@/generated/prisma/enums";
import { toNumber, daysBetween } from "@/lib/format";

type PaymentLike = {
  status: PaymentStatus;
  dueDate: Date;
  amount: unknown;
  amountPaid: unknown;
};

export function startOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysFromToday(days: number): Date {
  const d = startOfDay();
  d.setDate(d.getDate() + days);
  return d;
}

/** A payment past its due date that isn't fully paid counts as overdue, whatever is stored. */
export function effectiveStatus(p: PaymentLike, today = startOfDay()): PaymentStatus {
  if (p.status === "PAID") return "PAID";
  if (p.dueDate < today) return "OVERDUE";
  return p.status;
}

export function outstanding(p: PaymentLike): number {
  return Math.max(0, toNumber(p.amount as never) - toNumber(p.amountPaid as never));
}

export const AGING_BUCKETS = [
  { key: "current", label: "Current", min: -Infinity, max: 0 },
  { key: "1-30", label: "1–30 days", min: 1, max: 30 },
  { key: "31-60", label: "31–60 days", min: 31, max: 60 },
  { key: "61-90", label: "61–90 days", min: 61, max: 90 },
  { key: "90+", label: "90+ days", min: 91, max: Infinity },
] as const;

export function daysOverdue(p: { dueDate: Date }, today = startOfDay()): number {
  return Math.max(0, daysBetween(p.dueDate, today));
}

export type ArrearsRow = {
  tenantId: string;
  tenantName: string;
  amount: number;
  count: number;
  oldestDaysOverdue: number;
};

type ArrearsPayment = PaymentLike & {
  lease: { tenant: { id: string; firstName: string; lastName: string } };
};

export function arrearsSummary(payments: ArrearsPayment[], today = startOfDay()) {
  const overdue = payments.filter((p) => effectiveStatus(p, today) === "OVERDUE" && outstanding(p) > 0);

  const buckets = AGING_BUCKETS.map((b) => ({ key: b.key, label: b.label, amount: 0, count: 0 }));
  const byTenant = new Map<string, ArrearsRow>();

  for (const p of overdue) {
    const days = daysOverdue(p, today);
    const owed = outstanding(p);
    const bucket = buckets[AGING_BUCKETS.findIndex((b) => days >= b.min && days <= b.max)];
    bucket.amount += owed;
    bucket.count += 1;

    const t = p.lease.tenant;
    const row = byTenant.get(t.id) ?? {
      tenantId: t.id,
      tenantName: `${t.firstName} ${t.lastName}`.trim(),
      amount: 0,
      count: 0,
      oldestDaysOverdue: 0,
    };
    row.amount += owed;
    row.count += 1;
    row.oldestDaysOverdue = Math.max(row.oldestDaysOverdue, days);
    byTenant.set(t.id, row);
  }

  const tenants = [...byTenant.values()].sort((a, b) => b.amount - a.amount);
  return {
    totalOutstanding: tenants.reduce((s, t) => s + t.amount, 0),
    totalCount: overdue.length,
    buckets,
    tenants,
  };
}

/** Simple risk score: several missed payments or anything 60+ days late is high risk. */
export function riskLevel(row: ArrearsRow): "HIGH" | "MEDIUM" | "LOW" {
  if (row.count >= 3 || row.oldestDaysOverdue > 60) return "HIGH";
  if (row.count >= 2 || row.oldestDaysOverdue > 30) return "MEDIUM";
  return "LOW";
}

export function leaseProgress(start: Date, end: Date | null, today = new Date()): number | null {
  if (!end) return null;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((today.getTime() - start.getTime()) / total) * 100)));
}

export function isExpiringSoon(lease: { status: string; endDate: Date | null }, days: number, today = startOfDay()) {
  if (lease.status !== "ACTIVE" || !lease.endDate) return false;
  const left = daysBetween(today, lease.endDate);
  return left >= 0 && left <= days;
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + months);
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDay));
  return r;
}
