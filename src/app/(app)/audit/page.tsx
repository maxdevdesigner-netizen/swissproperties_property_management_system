import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Table } from "@/components/ui";
import { AuditAction } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;
const ENTITIES = ["Property", "Unit", "Tenant", "Lease", "Payment", "User"];

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requireAdmin();
  const { entity, action, from, to, page: pageParam } = (await searchParams) as Record<string, string | undefined>;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.AuditLogWhereInput = {};
  if (entity) where.entity = entity;
  if (action && action in AuditAction) where.action = action as AuditAction;
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(new Date(to).getTime() + 86_400_000) } : {}) };

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/audit?${new URLSearchParams({ ...Object.fromEntries(Object.entries({ entity, action, from, to }).filter(([, v]) => v)), page: String(p) } as Record<string, string>)}`;

  return (
    <>
      <PageHeader title="Audit Log" subtitle={`${total} records · Page ${page} of ${pages}`} />
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="entity" defaultValue={entity ?? ""} className="input max-w-44">
          <option value="">All entities</option>
          {ENTITIES.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select name="action" defaultValue={action ?? ""} className="input max-w-44">
          <option value="">All actions</option>
          {Object.values(AuditAction).map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <input name="from" type="date" defaultValue={from} className="input max-w-44" aria-label="From" />
        <input name="to" type="date" defaultValue={to} className="input max-w-44" aria-label="To" />
        <button className="rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">Apply</button>
      </form>
      <Table head={["Timestamp", "Action", "Entity", "User", "Details"]}>
        {logs.map((log) => (
          <tr key={log.id} className="align-top">
            <td className="px-4 py-2.5 whitespace-nowrap">{log.createdAt.toLocaleString("en-GB")}</td>
            <td className="px-4 py-2.5 font-semibold">{log.action}</td>
            <td className="px-4 py-2.5">{log.entity}<span className="block text-xs text-muted">{log.entityId?.slice(0, 8)}</span></td>
            <td className="px-4 py-2.5">{log.user?.name ?? log.user?.email ?? "System"}</td>
            <td className="max-w-md px-4 py-2.5 font-mono text-xs break-all text-muted">{log.details ? JSON.stringify(log.details) : ""}</td>
          </tr>
        ))}
      </Table>
      <div className="mt-4 flex justify-end gap-2 text-sm">
        {page > 1 && <Link href={link(page - 1)} className="rounded-lg border border-border px-3 py-1.5">Previous</Link>}
        {page < pages && <Link href={link(page + 1)} className="rounded-lg border border-border px-3 py-1.5">Next</Link>}
      </div>
    </>
  );
}
