import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { Badge, Card, PageHeader, StatCard, Table } from "@/components/ui";
import { money } from "@/lib/format";
import { arrearsSummary, riskLevel, startOfDay } from "@/lib/domain";
import { remindTenants } from "@/app/actions/reminders";

export default async function CollectionsPage() {
  const brand = await requireWorkspace();
  const today = startOfDay();
  const [unpaid, activeLeases] = await Promise.all([
    db.payment.findMany({
      where: { lease: { unit: { property: { brand } } }, status: { not: "PAID" }, dueDate: { lt: today } },
      select: {
        status: true,
        dueDate: true,
        amount: true,
        amountPaid: true,
        lease: { select: { tenant: { select: { id: true, firstName: true, lastName: true } } } },
      },
    }),
    db.lease.count({ where: { unit: { property: { brand } }, status: "ACTIVE" } }),
  ]);
  const summary = arrearsSummary(unpaid, today);
  const rows = summary.tenants.map((t) => ({ ...t, risk: riskLevel(t) }));

  return (
    <>
      <PageHeader title="Collections" subtitle="Who owes what, and who's most likely to fall behind." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Outstanding" value={money(summary.totalOutstanding)} tone="danger" />
        <StatCard label="Overdue Payments" value={summary.totalCount} hint="across all tenants" />
        <StatCard label="High-Risk Tenants" value={rows.filter((r) => r.risk === "HIGH").length} hint={`of ${activeLeases} active leases`} tone="danger" />
        <StatCard label="Medium Risk" value={rows.filter((r) => r.risk === "MEDIUM").length} tone="warning" />
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-bold">Aging buckets</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          {summary.buckets.map((b) => (
            <div key={b.key} className="rounded-xl bg-surface-2 p-4">
              <p className="text-xs font-semibold text-muted uppercase">{b.label}</p>
              <p className="mt-1 text-lg font-bold">{money(b.amount)}</p>
              <p className="text-xs text-muted">{b.count} payments</p>
            </div>
          ))}
        </div>
      </Card>

      <form action={remindTenants}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Outstanding by tenant</h2>
          <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">Log reminder for selected</button>
        </div>
        <Table head={["", "Tenant", "Outstanding", "Payments", "Oldest", "Risk"]}>
          {rows.map((r) => (
            <tr key={r.tenantId}>
              <td className="px-4 py-3"><input type="checkbox" name="tenantIds" value={r.tenantId} className="size-4" aria-label="Select" /></td>
              <td className="px-4 py-3"><Link href={`/tenants/${r.tenantId}`} className="font-medium hover:text-primary">{r.tenantName}</Link></td>
              <td className="px-4 py-3 font-semibold text-danger">{money(r.amount)}</td>
              <td className="px-4 py-3">{r.count}</td>
              <td className="px-4 py-3">{r.oldestDaysOverdue}d</td>
              <td className="px-4 py-3"><Badge value={r.risk} /></td>
            </tr>
          ))}
        </Table>
      </form>
    </>
  );
}
