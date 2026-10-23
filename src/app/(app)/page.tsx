import Link from "next/link";
import { AlertTriangle, Building2, CreditCard, Home, Plus } from "lucide-react";
import { requireWorkspace } from "@/lib/workspace";
import { getDashboard } from "@/lib/dashboard";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { date, money, moneyShort } from "@/lib/format";

export default async function DashboardPage() {
  const brand = await requireWorkspace();
  const { stats, recentPayments, recentLeases } = await getDashboard(brand);
  const maxRevenue = Math.max(1, ...stats.monthlyRevenue.map((m) => Math.max(m.expected, m.collected)));
  const agingTotal = stats.arrearsSummary.buckets.reduce((s, b) => s + b.amount, 0) || 1;
  const agingColors = ["bg-slate-300", "bg-primary", "bg-amber-400", "bg-orange-500", "bg-danger"];

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <ButtonLink href="/tenants/new" variant="outline"><Plus className="size-4" /> New Tenant</ButtonLink>
            <ButtonLink href="/leases/new" variant="accent"><Plus className="size-4" /> New Lease</ButtonLink>
          </>
        }
      />

      {(stats.expiringLeases > 0 || stats.overduePaymentsCount > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {stats.expiringLeases > 0 && (
            <Link href="/leases?status=EXPIRING_SOON" className="flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-2 text-sm font-medium text-warning">
              <AlertTriangle className="size-4" /> {stats.expiringLeases} lease{stats.expiringLeases > 1 ? "s" : ""} expiring within 30 days
            </Link>
          )}
          {stats.overduePaymentsCount > 0 && (
            <Link href="/payments?status=OVERDUE" className="flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-2 text-sm font-medium text-danger">
              <AlertTriangle className="size-4" /> {stats.overduePaymentsCount} overdue payment{stats.overduePaymentsCount > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <Building2 className="size-6 text-muted" />
          <p className="mt-4 text-xs font-semibold tracking-wider text-muted uppercase">Total Properties</p>
          <p className="mt-1 text-3xl font-bold">{stats.totalProperties}</p>
          <p className="mt-2 text-xs text-muted">{stats.totalUnits} total units</p>
        </Card>
        <Card>
          <Home className="size-6 text-muted" />
          <p className="mt-4 text-xs font-semibold tracking-wider text-muted uppercase">Occupancy Rate</p>
          <div className="mt-1 flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ background: `conic-gradient(var(--text) ${stats.occupancyRate * 3.6}deg, var(--surface-2) 0)` }}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-surface">{stats.occupancyRate}%</span>
            </div>
            <p className="text-3xl font-bold">{stats.occupancyRate}%</p>
            {stats.occupancyRate < 70 && <Badge value="OVERDUE" label="Low" />}
          </div>
          <p className="mt-2 text-xs text-muted">{stats.occupiedUnits} occupied / {stats.vacantUnits} vacant</p>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CreditCard className="size-6 text-primary" />
          <p className="mt-4 text-xs font-semibold tracking-wider text-muted uppercase">Collected This Month</p>
          <p className="mt-1 text-3xl font-bold">{moneyShort(stats.collectedThisMonth)}</p>
          <p className="mt-2 text-xs text-muted">Expected: {moneyShort(stats.expectedMonthlyRevenue)}</p>
        </Card>
        <Card className="border-l-4 border-l-danger">
          <AlertTriangle className="size-6 text-danger" />
          <p className="mt-4 text-xs font-semibold tracking-wider text-muted uppercase">Overdue Payments</p>
          <p className="mt-1 text-3xl font-bold">{moneyShort(stats.overdueAmount)}</p>
          <p className="mt-2 text-xs text-muted">{stats.overduePaymentsCount} overdue payments</p>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
            {stats.arrearsSummary.buckets.map((b, i) => (
              <div key={b.key} className={agingColors[i]} style={{ width: `${(b.amount / agingTotal) * 100}%` }} title={`${b.label}: ${money(b.amount)}`} />
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="font-bold">Revenue — collected vs expected</h2>
          <div className="mt-6 flex h-48 items-end gap-4">
            {stats.monthlyRevenue.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div className="w-1/3 rounded-t bg-surface-2" style={{ height: `${(m.expected / maxRevenue) * 100}%` }} title={`Expected ${money(m.expected)}`} />
                  <div className="w-1/3 rounded-t bg-primary" style={{ height: `${(m.collected / maxRevenue) * 100}%` }} title={`Collected ${money(m.collected)}`} />
                </div>
                <span className="text-xs text-muted">{m.month}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-surface-2" /> Expected</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" /> Collected</span>
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Top arrears</h2>
            <Link href="/collections" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {stats.arrearsSummary.topTenants.length === 0 && <li className="text-muted">Nobody is behind. 🎉</li>}
            {stats.arrearsSummary.topTenants.map((t) => (
              <li key={t.tenantId} className="flex justify-between gap-2">
                <Link href={`/tenants/${t.tenantId}`} className="truncate hover:text-primary">{t.tenantName}</Link>
                <span className="shrink-0 font-semibold text-danger">{money(t.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">Recent payments</h2>
          <ul className="divide-y divide-border text-sm">
            {recentPayments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <Link href={`/payments/${p.id}`} className="hover:text-primary">
                  {p.lease.tenant.firstName} {p.lease.tenant.lastName}
                  <span className="block text-xs text-muted">{p.lease.unit.property.name} · Unit {p.lease.unit.unitNumber} · {date(p.paidDate)}</span>
                </Link>
                <span className="font-semibold text-success">{money(p.amountPaid)}</span>
              </li>
            ))}
            {recentPayments.length === 0 && <li className="text-muted">No payments recorded yet.</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Recent leases</h2>
          <ul className="divide-y divide-border text-sm">
            {recentLeases.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/leases/${l.id}`} className="hover:text-primary">
                  {l.tenant.firstName} {l.tenant.lastName}
                  <span className="block text-xs text-muted">{l.unit.property.name} · Unit {l.unit.unitNumber} · from {date(l.startDate)}</span>
                </Link>
                <Badge value={l.status} />
              </li>
            ))}
            {recentLeases.length === 0 && <li className="text-muted">No leases yet.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
