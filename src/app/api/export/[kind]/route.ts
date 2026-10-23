import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/workspace";
import { audit } from "@/lib/audit";
import { effectiveStatus } from "@/lib/domain";
import { inputDate, toNumber } from "@/lib/format";

function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  // Stop spreadsheet apps from treating a cell as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: unknown[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export async function GET(request: Request, ctx: RouteContext<"/api/export/[kind]">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { kind } = await ctx.params;
  const brand = (await getWorkspace()) ?? "SWISS_PROPERTIES";
  let rows: unknown[][];

  if (kind === "tenants") {
    const tenants = await db.tenant.findMany({
      where: { brand },
      orderBy: { firstName: "asc" },
      include: { leases: { where: { status: "ACTIVE" }, take: 1, include: { unit: { include: { property: true } } } } },
    });
    rows = [
      ["First Name", "Last Name", "Email", "Phone", "Nationality", "Property", "Unit", "Rent"],
      ...tenants.map((t) => {
        const l = t.leases[0];
        return [t.firstName, t.lastName, t.email, t.phone, t.nationality, l?.unit.property.name, l?.unit.unitNumber, l ? toNumber(l.rentAmount) : ""];
      }),
    ];
  } else if (kind === "leases") {
    const leases = await db.lease.findMany({
      where: { unit: { property: { brand } } },
      orderBy: { startDate: "desc" },
      include: { tenant: true, unit: { include: { property: true } } },
    });
    rows = [
      ["Tenant", "Property", "Unit", "Status", "Start", "End", "Rent", "Deposit", "Deposit Paid"],
      ...leases.map((l) => [
        `${l.tenant.firstName} ${l.tenant.lastName}`, l.unit.property.name, l.unit.unitNumber, l.status,
        inputDate(l.startDate), inputDate(l.endDate), toNumber(l.rentAmount), l.depositAmount ? toNumber(l.depositAmount) : "", l.depositPaid ? "yes" : "no",
      ]),
    ];
  } else if (kind === "payments") {
    const year = Number(new URL(request.url).searchParams.get("year")) || undefined;
    const payments = await db.payment.findMany({
      where: { lease: { unit: { property: { brand } } }, ...(year ? { dueDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } } : {}) },
      orderBy: { dueDate: "asc" },
      include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
    });
    rows = [
      ["Tenant", "Property", "Unit", "Due", "Amount", "Paid", "Status", "Paid On", "Method", "Receipt"],
      ...payments.map((p) => [
        `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`, p.lease.unit.property.name, p.lease.unit.unitNumber,
        inputDate(p.dueDate), toNumber(p.amount), toNumber(p.amountPaid), effectiveStatus(p), inputDate(p.paidDate), p.method, p.receiptNumber,
      ]),
    ];
  } else {
    return Response.json({ error: "Unknown export" }, { status: 404 });
  }

  await audit({ action: "EXPORT", entity: kind, userId: user.id, details: { rows: rows.length - 1 } });
  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${inputDate(new Date())}.csv"`,
    },
  });
}
