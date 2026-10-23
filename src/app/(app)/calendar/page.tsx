import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, cn } from "@/components/ui";
import { effectiveStatus, startOfDay } from "@/lib/domain";
import { monthLabel } from "@/lib/format";

type Event = { href: string; label: string; kind: "payment" | "overdue" | "lease" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const brand = await requireWorkspace();
  const { m } = (await searchParams) as Record<string, string | undefined>;
  const today = startOfDay();
  const [y, mo] = m && /^\d{4}-\d{2}$/.test(m) ? m.split("-").map(Number) : [today.getFullYear(), today.getMonth() + 1];
  const first = new Date(y, mo - 1, 1);
  const next = new Date(y, mo, 1);

  const [payments, leases] = await Promise.all([
    db.payment.findMany({
      where: { lease: { unit: { property: { brand } } }, dueDate: { gte: first, lt: next } },
      select: { id: true, dueDate: true, status: true, amount: true, amountPaid: true, lease: { select: { tenant: { select: { firstName: true } }, unit: { select: { unitNumber: true } } } } },
    }),
    db.lease.findMany({
      where: { unit: { property: { brand } }, endDate: { gte: first, lt: next } },
      select: { id: true, endDate: true, tenant: { select: { firstName: true } }, unit: { select: { unitNumber: true } } },
    }),
  ]);

  const events = new Map<number, Event[]>();
  const add = (d: Date, e: Event) => events.set(d.getDate(), [...(events.get(d.getDate()) ?? []), e]);
  for (const p of payments) {
    add(p.dueDate, {
      href: `/payments/${p.id}`,
      label: `${p.lease.unit.unitNumber} · ${p.lease.tenant.firstName}`,
      kind: effectiveStatus(p, today) === "OVERDUE" ? "overdue" : "payment",
    });
  }
  for (const l of leases) add(l.endDate!, { href: `/leases/${l.id}`, label: `Lease ends · ${l.unit.unitNumber}`, kind: "lease" });

  const offset = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(y, mo, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const colors = { payment: "bg-primary-soft text-primary", overdue: "bg-danger-soft text-danger", lease: "bg-warning-soft text-warning" };

  return (
    <>
      <PageHeader title="Calendar" />
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{monthLabel(first)}</h2>
          <div className="flex gap-1">
            <Link href={`/calendar?m=${fmt(new Date(y, mo - 2, 1))}`} className="rounded-lg p-2 hover:bg-surface-2" aria-label="Previous month"><ChevronLeft className="size-4" /></Link>
            <Link href={`/calendar?m=${fmt(next)}`} className="rounded-lg p-2 hover:bg-surface-2" aria-label="Next month"><ChevronRight className="size-4" /></Link>
          </div>
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border text-sm">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="border-b border-border bg-surface-2 py-2 text-center text-xs font-semibold text-muted uppercase">{d}</div>
          ))}
          {cells.map((day, i) => {
            const isToday = day && y === today.getFullYear() && mo === today.getMonth() + 1 && day === today.getDate();
            return (
              <div key={i} className={cn("min-h-28 border-r border-b border-border p-1.5", !day && "bg-surface-2/50")}>
                {day && (
                  <>
                    <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", isToday && "bg-primary font-bold text-white")}>{day}</span>
                    <div className="mt-1 space-y-1">
                      {(events.get(day) ?? []).slice(0, 4).map((e, j) => (
                        <Link key={j} href={e.href} className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] font-medium", colors[e.kind])}>{e.label}</Link>
                      ))}
                      {(events.get(day)?.length ?? 0) > 4 && <p className="px-1 text-[11px] text-muted">+{events.get(day)!.length - 4} more</p>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" /> Payment Due</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-danger" /> Overdue</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" /> Lease Expiry</span>
        </p>
      </div>
    </>
  );
}
