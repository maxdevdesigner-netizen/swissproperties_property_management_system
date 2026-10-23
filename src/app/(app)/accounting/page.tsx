import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, StatCard, Table } from "@/components/ui";
import { money, toNumber } from "@/lib/format";

// P&L from recorded rent receipts. The live app also tracks STR income, other income,
// adjustments, expenses and journal entries; those need the Expense/JournalEntry
// models (phase 2), so they show as zero here.
export default async function AccountingPage({ searchParams }: PageProps<"/accounting">) {
  const brand = await requireWorkspace();
  const { year: yearParam, propertyId } = (await searchParams) as Record<string, string | undefined>;
  const year = Number(yearParam) || new Date().getFullYear();

  const [payments, properties] = await Promise.all([
    db.payment.findMany({
      where: {
        amountPaid: { gt: 0 },
        paidDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
        lease: { unit: { property: { brand }, ...(propertyId ? { propertyId } : {}) } },
      },
      select: { amountPaid: true, paidDate: true },
    }),
    db.property.findMany({ where: { brand }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(year, i, 1).toLocaleString("en-GB", { month: "short" }),
    rent: payments.filter((p) => p.paidDate!.getMonth() === i).reduce((s, p) => s + toNumber(p.amountPaid), 0),
  }));
  const rentIncome = months.reduce((s, m) => s + m.rent, 0);
  const best = months.reduce((a, b) => (b.rent > a.rent ? b : a), months[0]);
  const max = Math.max(1, ...months.map((m) => m.rent));

  return (
    <>
      <PageHeader
        title="Accounting"
        subtitle="P&L Report"
        actions={
          <a href={`/api/export/payments?year=${year}`} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2">
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      <form className="mb-6 flex flex-wrap gap-3">
        <select name="year" defaultValue={year} className="input max-w-32">
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select name="propertyId" defaultValue={propertyId ?? ""} className="input max-w-56">
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button className="rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">Apply</button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Rent Income" value={money(rentIncome)} tone="success" />
        <StatCard label="Total Expenses" value={money(0)} tone="danger" hint="Expense tracking is phase 2" />
        <StatCard label="Net Profit" value={money(rentIncome)} tone="primary" hint={best.rent > 0 ? `Best month: ${best.label}` : undefined} />
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">Income — {year}</h2>
        <div className="mt-6 flex h-44 items-end gap-2">
          {months.map((m) => (
            <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t bg-success" style={{ height: `${(m.rent / max) * 160}px` }} title={money(m.rent)} />
              <span className="text-xs text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <Table head={["Month", "Rent Income", "Expenses", "Net Profit"]}>
        {months.map((m) => (
          <tr key={m.label}>
            <td className="px-4 py-2.5 font-medium">{m.label}</td>
            <td className="px-4 py-2.5">{m.rent ? money(m.rent) : "—"}</td>
            <td className="px-4 py-2.5">—</td>
            <td className="px-4 py-2.5">{money(m.rent)}</td>
          </tr>
        ))}
        <tr className="bg-surface-2 font-bold">
          <td className="px-4 py-2.5">Total</td>
          <td className="px-4 py-2.5">{money(rentIncome)}</td>
          <td className="px-4 py-2.5">{money(0)}</td>
          <td className="px-4 py-2.5">{money(rentIncome)}</td>
        </tr>
      </Table>
    </>
  );
}
